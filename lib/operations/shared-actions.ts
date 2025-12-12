import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findSupabaseAuthUserByEmail, listSupabaseAuthUsers } from "@/lib/supabase/admin-auth";

export const AUTH_USER_LOOKUP_PAGE_SIZE = 30;
export const AUTH_USER_LOOKUP_MAX_PAGES = 80;

export type ProfileMetadata = Record<string, unknown> & {
  ops_email?: string;
  ops_phone?: string;
  lead_source?: string;
  source?: string;
};

export type SupabaseProfileRow = {
  full_name: string | null;
  phone: string | null;
  status: string;
  residency_status?: string | null;
  metadata?: ProfileMetadata;
  created_at: string | null;
  source?: string | null;
  entity_type?: string | null;
};

export function generateRandomPassword() {
  return randomBytes(18).toString("base64url");
}

export function normalizeOptionalString(value?: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeEmail(email?: string) {
  if (!email) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

export function sanitizePhone(phone?: string) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  return `+${digits}`;
}

export function formatMonthYear(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
}

export function parseNameParts(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ");
  const firstName = parts[0] ?? normalized;
  const lastName = parts.slice(1).join(" ") || null;
  return { fullName: normalized, firstName, lastName };
}

export function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code && String(code) === "42703") {
    return true;
  }
  const message = String((error as { message?: string }).message ?? "");
  const details = String((error as { details?: string }).details ?? "");
  const needle = `column ${column}`;
  return message.toLowerCase().includes(needle) || details.toLowerCase().includes(needle);
}

export async function resolveUserId(
  email: string | null,
  phone: string | null,
): Promise<string | null> {
  try {
    if (email) {
      const match = await findSupabaseAuthUserByEmail(email);
      if (match?.id) {
        return match.id;
      }
    }

    if (!phone) {
      return null;
    }

    const normalizedPhone = phone.replace(/\D/g, "");
    if (!normalizedPhone) {
      return null;
    }

    for (let page = 1; page <= AUTH_USER_LOOKUP_MAX_PAGES; page += 1) {
      const users = await listSupabaseAuthUsers({
        page,
        perPage: AUTH_USER_LOOKUP_PAGE_SIZE,
        maxPages: 1,
      });

      if (!users.length) {
        break;
      }

      const match = users.find((user) => {
        const directPhone = (user.phone ?? "").replace(/\D/g, "");
        if (directPhone && directPhone === normalizedPhone) {
          return true;
        }

        const metadataPhone =
          typeof user.user_metadata?.phone === "string"
            ? user.user_metadata.phone.replace(/\D/g, "")
            : "";
        return metadataPhone && metadataPhone === normalizedPhone;
      });

      if (match?.id) {
        return match.id;
      }

      if (users.length < AUTH_USER_LOOKUP_PAGE_SIZE) {
        break;
      }
    }
  } catch (error) {
    console.error("[operations] failed to lookup auth user", { email, phone, error });
  }

  return null;
}

export async function createOperationsAuthUser(
  serviceClient: SupabaseClient,
  params: {
    email: string | null;
    phone: string | null;
    fullName: string;
    role: string;
    source?: string;
  }
) {
  const { email, phone, fullName, role, source = "ops_dashboard" } = params;
  const password = generateRandomPassword();
  
  const createPayload: {
    email?: string;
    email_confirm?: boolean;
    phone?: string;
    phone_confirm?: boolean;
    password: string;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
  } = {
    password,
    user_metadata: {
      full_name: fullName,
      source,
    },
    app_metadata: {
      roles: [role],
    },
  };

  if (email) {
    createPayload.email = email;
    createPayload.email_confirm = true;
  }

  if (phone) {
    createPayload.phone = phone;
    createPayload.phone_confirm = true;
  }

  const { data: created, error: createError } =
    await serviceClient.auth.admin.createUser(createPayload);

  if (createError) {
    console.error("[operations] failed to create auth user", {
      email,
      phone,
      error: createError,
    });
    return { error: createError };
  }

  return { data: created, error: null };
}

export async function upsertOperationsProfile(
  supabase: SupabaseClient,
  userId: string,
  params: {
    fullName: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    status: string;
    source?: string;
    entityType?: "individual" | "company" | null;
  }
) {
  const { fullName, firstName, lastName, phone, email, status, source = "OPS Dashboard", entityType } = params;
  
  let supportsSourceColumn = true;

  let {
    data: existingProfile,
    error: existingProfileError,
  } = await supabase
    .from("profiles")
    .select("metadata, source, entity_type")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfileError) {
      // Fallback checks if columns are missing
      if (isMissingColumnError(existingProfileError, "source")) {
        supportsSourceColumn = false;
      }

      // Retry fetch with safe columns if needed, or just proceed with what we have if it was a column error
      // Ideally we should retry the select without the missing columns, but for upsert logic below we mainly need metadata.
      // Let's simplified retry:
       ({ data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("user_id", userId)
      .maybeSingle());
  }

  const metadata: ProfileMetadata = {
    ...((existingProfile?.metadata as ProfileMetadata | null) ?? {}),
    ...(email ? { ops_email: email } : {}),
    ...(phone ? { ops_phone: phone } : {}),
  };
  
  const existingSource = (existingProfile?.source as string | null) ?? null;
  const metadataSourceCandidate = (metadata.lead_source as string | null) ?? (metadata.source as string | null) ?? null;
  const upsertSource = existingSource ?? metadataSourceCandidate ?? source;

  if (upsertSource) {
    metadata.lead_source = metadata.lead_source ?? upsertSource;
    metadata.source = metadata.source ?? upsertSource;
  }

  const baseProfilePayload: Record<string, unknown> = {
    user_id: userId,
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    phone,
    status,
    metadata,
    entity_type: entityType ?? "company",
  };

  if (supportsSourceColumn) {
    baseProfilePayload.source = upsertSource;
  }

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(baseProfilePayload, { onConflict: "user_id" })
    .select(
      supportsSourceColumn
        ? "full_name, phone, status, residency_status, metadata, created_at, source, entity_type"
        : "full_name, phone, status, residency_status, metadata, created_at, entity_type"
    )
    .single();

  // Retry logic for missing columns
  if (profileError && isMissingColumnError(profileError, "source")) {
     const fallbackPayload = { ...baseProfilePayload };
     delete fallbackPayload.source;
     supportsSourceColumn = false;
     
     ({ data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(fallbackPayload, { onConflict: "user_id" })
      .select("full_name, phone, status, residency_status, metadata, created_at, entity_type")
      .single());
  }

  if (profileError) {
    console.error("[operations] failed to upsert profile", profileError);
    return { error: profileError };
  }

  return { data: profile as unknown as SupabaseProfileRow, error: null };
}
