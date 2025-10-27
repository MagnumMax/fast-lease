"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import type { OpsClientRecord } from "@/lib/supabase/queries/operations";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getWorkspacePaths } from "@/lib/workspace/routes";

const inputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.union([z.literal("Active"), z.literal("Blocked")]).default("Active"),
});

type CreateOperationsClientInput = z.infer<typeof inputSchema>;

export type CreateOperationsClientResult =
  | { data: OpsClientRecord; error?: undefined }
  | { data?: undefined; error: string };

type ProfileMetadata = Record<string, unknown> & {
  ops_email?: string;
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeEmail(email?: string) {
  if (!email) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function sanitizePhone(phone?: string) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  return `+${digits}`;
}

function parseNameParts(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ");
  const firstName = parts[0] ?? normalized;
  const lastName = parts.slice(1).join(" ") || null;
  return { fullName: normalized, firstName, lastName };
}

function formatClientRecord(
  profile: { phone: string | null; status: string },
  name: string,
  email: string | null,
): OpsClientRecord {
  return {
    id: `CL-${Math.floor(Date.now() / 1000).toString().slice(-4).padStart(4, "0")}`,
    name,
    email: email ?? "",
    phone: profile.phone ?? "+971 50 000 0000",
    status: profile.status === "suspended" ? "Blocked" : "Active",
    scoring: "—",
    overdue: 0,
    limit: "—",
    detailHref: `/ops/clients/${toSlug(name) || "client-104"}`,
  };
}

async function resolveUserId(
  email: string | null,
  phone: string | null,
  serviceClient: Awaited<ReturnType<typeof createSupabaseServiceClient>>,
) {
  let page: number | null = 1;

  while (page !== null) {
    const currentPage = page;
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page: currentPage,
      perPage: 200,
    });

    if (error) {
      console.error("[operations] failed to lookup auth user", { email, phone, error });
      return null;
    }

    const users = data?.users ?? [];
    const match = users.find((user) => {
      const matchesEmail =
        email && user.email?.toLowerCase() === email;
      if (matchesEmail) return true;

      if (!phone) return false;
      const userPhoneDigits = (user.phone ?? "").replace(/\D/g, "");
      const inputPhoneDigits = phone.replace(/\D/g, "");
      if (!inputPhoneDigits) return false;
      return userPhoneDigits === inputPhoneDigits;
    });

    if (match) {
      return match.id ?? null;
    }

    page = data?.nextPage ?? null;
    if (!page) break;
  }

  return null;
}

function generateRandomPassword() {
  return randomBytes(18).toString("base64url");
}

export async function createOperationsClient(
  input: CreateOperationsClientInput,
): Promise<CreateOperationsClientResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Введите корректные данные клиента." };
  }

  const { name, email, phone, status } = parsed.data;
  const { fullName, firstName, lastName } = parseNameParts(name);
  const normalizedEmail = normalizeEmail(email);
  const sanitizedPhone = sanitizePhone(phone);
  const userStatus = status === "Blocked" ? "suspended" : "active";

  try {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServiceClient();

    if (!normalizedEmail && !sanitizedPhone) {
      return {
        error: "Укажите email или телефон клиента.",
      };
    }

    let userId = await resolveUserId(normalizedEmail, sanitizedPhone, serviceClient);

    if (!userId) {
      const createPayload: {
        email?: string;
        email_confirm?: boolean;
        phone?: string;
        phone_confirm?: boolean;
        password: string;
        user_metadata: Record<string, unknown>;
        app_metadata: Record<string, unknown>;
      } = {
        password: generateRandomPassword(),
        user_metadata: {
          full_name: fullName,
          source: "ops_dashboard",
        },
        app_metadata: {
          roles: ["CLIENT"],
        },
      };

      if (normalizedEmail) {
        createPayload.email = normalizedEmail;
        createPayload.email_confirm = true;
      }

      if (sanitizedPhone) {
        createPayload.phone = sanitizedPhone;
        createPayload.phone_confirm = true;
      }

      const { data: created, error: createError } =
        await serviceClient.auth.admin.createUser(createPayload);

      if (createError) {
        console.error("[operations] failed to create auth user", {
          email: normalizedEmail,
          phone: sanitizedPhone,
          error: createError,
        });
        return {
          error: "Не удалось создать пользователя в Supabase. Попробуйте позже.",
        };
      }

      userId = created.user?.id ?? null;
    }

    if (!userId) {
      return {
        error: "Не удалось определить учетную запись клиента.",
      };
    }

    const {
      data: existingProfile,
      error: existingProfileError,
    } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfileError) {
      console.error("[operations] failed to load existing profile metadata", {
        userId,
        error: existingProfileError,
      });
    }

    const metadata: ProfileMetadata = {
      ...((existingProfile?.metadata as ProfileMetadata | null) ?? {}),
      ...(normalizedEmail ? { ops_email: normalizedEmail } : {}),
    };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone: sanitizedPhone,
          status: userStatus,
          metadata,
        },
        { onConflict: "user_id" },
      )
      .select("full_name, phone, status, metadata")
      .single();

    if (profileError) {
      console.error("[operations] failed to upsert profile", profileError);
      return {
        error: "Не удалось сохранить профиль клиента.",
      };
    }

    const { error: roleError } = await serviceClient
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: "CLIENT",
        },
        { onConflict: "user_id,role" },
      );

    if (roleError) {
      console.error("[operations] failed to ensure client role", roleError);
    }

    for (const path of getWorkspacePaths("clients")) {
      revalidatePath(path);
    }

    const profileMetadata =
      (profile?.metadata as ProfileMetadata | null) ?? null;
    const emailFromProfile =
      (profileMetadata?.ops_email as string | undefined) ?? normalizedEmail ?? null;

    const record = formatClientRecord(
      { phone: profile.phone, status: profile.status },
      fullName,
      emailFromProfile,
    );

    return { data: record };
  } catch (error) {
    console.error("[operations] unexpected error while creating client", error);
    return {
      error: "Произошла ошибка при создании клиента.",
    };
  }
}
