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
import { buildSlugWithId } from "@/lib/utils/slugs";

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
  ops_phone?: string;
};

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

function normalizeOptionalString(value?: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function formatMonthYear(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
}

function parseNameParts(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ");
  const firstName = parts[0] ?? normalized;
  const lastName = parts.slice(1).join(" ") || null;
  return { fullName: normalized, firstName, lastName };
}

function formatClientRecord(
  profile: {
    phone: string | null;
    status: string;
    created_at?: string | null;
    residency_status?: string | null;
  },
  name: string,
  email: string | null,
  userId: string,
): OpsClientRecord {
  const statusLabel =
    profile.status === "suspended" || profile.status === "blocked"
      ? "Blocked"
      : "Active";

  const memberSince = formatMonthYear(profile.created_at);
  const detailSlug = buildSlugWithId(name, userId) || userId;

  return {
    userId,
    id: `CL-${Math.floor(Date.now() / 1000).toString().slice(-4).padStart(4, "0")}`,
    name,
    email: email ?? "",
    phone: profile.phone ?? "+971 50 000 0000",
    status: statusLabel === "Blocked" ? "Blocked" : "Active",
    statusLabel,
    scoring: "—",
    overdue: 0,
    limit: "—",
    detailHref: `/ops/clients/${detailSlug}`,
    memberSince,
    segment: null,
    tags: statusLabel === "Blocked" ? ["Blocked"] : ["Active"],
    metricsSummary: {
      scoring: "—",
      limit: "—",
      overdue: "Нет данных",
    },
    residencyStatus: profile.residency_status ?? null,
    leasing: undefined,
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
      ...(sanitizedPhone ? { ops_phone: sanitizedPhone } : {}),
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
      .select("full_name, phone, status, residency_status, metadata, created_at")
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
      { phone: profile.phone, status: profile.status, created_at: profile.created_at },
      fullName,
      emailFromProfile,
      userId,
    );

    return { data: record };
  } catch (error) {
    console.error("[operations] unexpected error while creating client", error);
    return {
      error: "Произошла ошибка при создании клиента.",
    };
  }
}

const updateInputSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1),
  status: z.union([z.literal("Active"), z.literal("Blocked")]).default("Active"),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  emiratesId: z.string().optional(),
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  residencyStatus: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      community: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  employment: z
    .object({
      employer: z.string().optional(),
      position: z.string().optional(),
      years: z.string().optional(),
    })
    .optional(),
  financial: z
    .object({
      monthlyIncome: z.string().optional(),
      existingLoans: z.string().optional(),
      creditScore: z.string().optional(),
      riskGrade: z.string().optional(),
    })
    .optional(),
});

export type UpdateOperationsClientInput = z.infer<typeof updateInputSchema>;

export type UpdateOperationsClientResult =
  | { success: true }
  | { success: false; error: string };

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function updateOperationsClient(
  input: UpdateOperationsClientInput,
): Promise<UpdateOperationsClientResult> {
  const parsed = updateInputSchema.safeParse({
    ...input,
    email: input.email ?? undefined,
  });

  if (!parsed.success) {
    console.warn("[operations] invalid client update payload", parsed.error.flatten());
    return { success: false, error: "Проверьте корректность введённых данных." };
  }

  const {
    userId,
    fullName,
    status,
    email,
    phone,
    emiratesId,
    passportNumber,
    nationality,
    residencyStatus,
    dateOfBirth,
    address,
    employment,
    financial,
  } = parsed.data;

  const { firstName, lastName } = parseNameParts(fullName);
  const normalizedEmail = normalizeEmail(email || undefined);
  const sanitizedPhone = sanitizePhone(phone);
  const profileStatus = status === "Blocked" ? "suspended" : "active";
  const detailSlug = buildSlugWithId(fullName, userId) || userId;

  try {
    const supabase = await createSupabaseServerClient();

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileLookupError) {
      console.error("[operations] failed to load profile metadata before update", profileLookupError);
      return { success: false, error: "Не удалось загрузить профиль клиента." };
    }

    const metadata: ProfileMetadata = {
      ...((existingProfile?.metadata as ProfileMetadata | null) ?? {}),
    };

    if (normalizedEmail) {
      metadata.ops_email = normalizedEmail;
    } else {
      delete metadata.ops_email;
    }

    if (sanitizedPhone) {
      metadata.ops_phone = sanitizedPhone;
    } else {
      delete metadata.ops_phone;
    }

    const addressPayload = {
      street: normalizeOptionalString(address?.street),
      community: normalizeOptionalString(address?.community),
      city: normalizeOptionalString(address?.city),
      country: normalizeOptionalString(address?.country),
    };

    const employmentPayload = {
      employer: normalizeOptionalString(employment?.employer),
      position: normalizeOptionalString(employment?.position),
      years: parseNumber(normalizeOptionalString(employment?.years)),
    };

    const financialPayload = {
      monthly_income: parseNumber(normalizeOptionalString(financial?.monthlyIncome)),
      existing_loans: parseNumber(normalizeOptionalString(financial?.existingLoans)),
      credit_score: parseNumber(normalizeOptionalString(financial?.creditScore)),
      risk_grade: normalizeOptionalString(financial?.riskGrade),
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        status: profileStatus,
        phone: sanitizedPhone,
        emirates_id: normalizeOptionalString(emiratesId),
        passport_number: normalizeOptionalString(passportNumber),
        nationality: normalizeOptionalString(nationality),
        residency_status: normalizeOptionalString(residencyStatus),
        date_of_birth: dateOfBirth ? dateOfBirth : null,
        address: addressPayload,
        employment_info: employmentPayload,
        financial_profile: financialPayload,
        metadata,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[operations] failed to update client profile", updateError);
      return { success: false, error: "Не удалось обновить профиль клиента." };
    }

    try {
      const serviceClient = await createSupabaseServiceClient();
      const authPayload: Record<string, unknown> = {
        user_metadata: {
          full_name: fullName,
        },
      };

      if (normalizedEmail) {
        authPayload.email = normalizedEmail;
      }
      if (sanitizedPhone) {
        authPayload.phone = sanitizedPhone;
      }

      const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(
        userId,
        authPayload,
      );

      if (authUpdateError) {
        console.warn("[operations] failed to sync auth user during client update", authUpdateError);
      }
    } catch (error) {
      console.warn("[operations] auth update skipped during client edit", { userId, error });
    }

    for (const path of getWorkspacePaths("clients")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/clients/${detailSlug}`);
    if (detailSlug !== userId) {
      revalidatePath(`/ops/clients/${userId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while updating client", error);
    return { success: false, error: "Произошла ошибка при обновлении клиента." };
  }
}
