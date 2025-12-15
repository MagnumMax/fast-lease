"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import type { OpsClientRecord, OpsClientType } from "@/lib/supabase/queries/operations";
import {
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_LABEL_MAP,
  type ClientDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import {
  findSupabaseAuthUserByEmail,
  listSupabaseAuthUsers,
} from "@/lib/supabase/admin-auth";
import { getWorkspacePaths } from "@/lib/workspace/routes";
import { buildSlugWithId } from "@/lib/utils/slugs";
import {
  uploadDocumentsBatch,
  type DocumentUploadCandidate,
  isFileLike,
  type FileLike,
  getFileName,
} from "@/lib/documents/upload";
import { getMutationSessionUser } from "@/lib/auth/guards";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";

const inputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(["personal", "company"]).optional().default("personal"),
});

type CreateOperationsClientInput = z.infer<typeof inputSchema>;

export type CreateOperationsClientResult =
  | { data: OpsClientRecord; error?: undefined }
  | { data?: undefined; error: string };

const CLIENT_DOCUMENT_BUCKET = "profile-documents";
const CLIENT_DOCUMENT_TYPE_VALUES = new Set(
  CLIENT_DOCUMENT_TYPES.map((entry) => entry.value),
);

const uploadClientDocumentsSchema = z.object({
  clientId: z.string().uuid(),
  slug: z.string().min(1),
});

const deleteClientDocumentSchema = z.object({
  clientId: z.string().uuid(),
  documentId: z.string().uuid(),
  slug: z.string().min(1),
});

export type UploadClientDocumentsResult =
  | { success: true; uploaded: number }
  | { success: false; error: string };

type DeleteClientDocumentInput = z.infer<typeof deleteClientDocumentSchema>;

export type DeleteClientDocumentResult =
  | { success: true }
  | { success: false; error: string };

const CLIENT_DOCUMENT_CATEGORY_MAP: Record<ClientDocumentTypeValue, string> =
  CLIENT_DOCUMENT_TYPES.reduce<Record<ClientDocumentTypeValue, string>>((acc, entry) => {
    acc[entry.value] = entry.context === "company" ? "company" : "identity";
    return acc;
  }, {} as Record<ClientDocumentTypeValue, string>);

type ProfileMetadata = Record<string, unknown> & {
  ops_email?: string;
  ops_phone?: string;
  company_contact_name?: string;
  company_contact_emirates_id?: string;
  company_trn?: string;
  company_license_number?: string;
  lead_source?: string;
  source?: string;
  source_label?: string;
};

type SupabaseProfileRow = {
  full_name: string | null;
  phone: string | null;
  status: string;
  residency_status?: string | null;
  metadata?: unknown;
  created_at: string | null;
  source?: string | null;
  entity_type?: string | null;
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

function isMissingColumnError(error: unknown, column: string): boolean {
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
    entity_type?: string | null;
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
    entityType: (profile.entity_type as "personal" | "company") ?? "personal",
    leasing: undefined,
  };
}

const AUTH_USER_LOOKUP_PAGE_SIZE = 30;
const AUTH_USER_LOOKUP_MAX_PAGES = 80;

async function resolveUserId(
  email: string | null,
  phone: string | null,
) {
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

function generateRandomPassword() {
  return randomBytes(18).toString("base64url");
}

export async function createOperationsClient(
  input: CreateOperationsClientInput,
): Promise<CreateOperationsClientResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Введите корректные данные покупателя." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { error: READ_ONLY_ACCESS_MESSAGE };
  }

const { name, email, phone, type } = parsed.data;
  const { fullName, firstName, lastName } = parseNameParts(name);
  const normalizedEmail = normalizeEmail(email);
  const sanitizedPhone = sanitizePhone(phone);
  // Статус автоматически устанавливается как "Active" (suspended = "active" в базе данных)
  const userStatus = "active";

  try {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServiceClient();

    if (!normalizedEmail && !sanitizedPhone) {
      return {
        error: "Укажите email или телефон покупателя.",
      };
    }

    let userId = await resolveUserId(normalizedEmail, sanitizedPhone);

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
        error: "Не удалось определить учетную запись покупателя.",
      };
    }

    let supportsSourceColumn = true;
    let {
      data: existingProfile,
      error: existingProfileError,
    } = await supabase
      .from("profiles")
      .select("metadata, source")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfileError && isMissingColumnError(existingProfileError, "source")) {
      supportsSourceColumn = false;
      ({ data: existingProfile, error: existingProfileError } = await supabase
        .from("profiles")
        .select("metadata")
        .eq("user_id", userId)
        .maybeSingle());
    }

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
  const existingSource = normalizeOptionalString(
    (existingProfile?.source as string | null | undefined) ?? null,
  );
  const metadataSourceCandidate = normalizeOptionalString(
    (metadata.lead_source as string | null | undefined) ??
      (metadata.source_label as string | null | undefined) ??
      (metadata.source as string | null | undefined) ??
      null,
  );
  const upsertSource = existingSource ?? metadataSourceCandidate ?? "OPS Dashboard";

  if (upsertSource) {
    metadata.lead_source = metadata.lead_source ?? upsertSource;
    metadata.source = metadata.source ?? upsertSource;
  }

    if (!supportsSourceColumn) {
      metadata.source = metadata.source ?? upsertSource;
      metadata.lead_source = metadata.lead_source ?? upsertSource;
    }

    const baseProfilePayload: Record<string, unknown> = {
      user_id: userId,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone: sanitizedPhone,
      status: userStatus,
      metadata,
      entity_type: type,
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
          : "full_name, phone, status, residency_status, metadata, created_at, entity_type",
      )
      .single();

    if (profileError && supportsSourceColumn && isMissingColumnError(profileError, "source")) {
      console.warn("[operations] profiles.source column missing during upsert, retrying without it", {
        userId,
      });
      supportsSourceColumn = false;
      metadata.source = metadata.source ?? upsertSource;
      metadata.lead_source = metadata.lead_source ?? upsertSource;

      const fallbackPayload = { ...baseProfilePayload };
      delete fallbackPayload.source;

      ({ data: profile, error: profileError } = await supabase
        .from("profiles")
        .upsert(fallbackPayload, { onConflict: "user_id" })
        .select("full_name, phone, status, residency_status, metadata, created_at, entity_type")
        .single());
    }

    if (profileError) {
      console.error("[operations] failed to upsert profile", profileError);
      return {
        error: "Не удалось сохранить профиль покупателя.",
      };
    }

    // Ensure client role exists - check first, then insert if needed
    const { data: existingRole, error: roleCheckError } = await serviceClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "CLIENT")
      .maybeSingle();

    if (roleCheckError) {
      console.error("[operations] failed to check existing client role", roleCheckError);
    }

    // Only insert if role doesn't exist yet
    if (!existingRole) {
      const { error: roleInsertError } = await serviceClient
        .from("user_roles")
        .insert({
            user_id: userId,
            role: "CLIENT",
            portal: "client",
            assigned_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {}
        });

      if (roleInsertError) {
        console.error("[operations] failed to insert client role", roleInsertError);
        return {
          error: "Не удалось назначить роль клиента. Покупатель создан, но не будет отображаться в списке без роли CLIENT.",
        };
      }

      console.log("[operations] successfully assigned CLIENT role to user", { userId });
    } else {
      console.log("[operations] client role already exists for user", { userId });
    }

    for (const path of getWorkspacePaths("clients")) {
      revalidatePath(path);
    }

    const typedProfile = profile as SupabaseProfileRow | null;
    if (!typedProfile) {
      console.error("[operations] upsert profile returned empty data", { userId });
      return {
        error: "Не удалось сохранить профиль покупателя.",
      };
    }

    const profileMetadata = (typedProfile.metadata as ProfileMetadata | null) ?? null;
    const emailFromProfile =
      (profileMetadata?.ops_email as string | undefined) ?? normalizedEmail ?? null;

    const record = formatClientRecord(
      { phone: typedProfile.phone, status: typedProfile.status, created_at: typedProfile.created_at, entity_type: typedProfile.entity_type },
      fullName,
      emailFromProfile,
      userId,
    );

    return { data: record };
  } catch (error) {
    console.error("[operations] unexpected error while creating client", error);
    return {
      error: "Произошла ошибка при создании покупателя.",
    };
  }
}

const updateInputSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1),
  clientType: z.union([z.literal("Personal"), z.literal("Company")]).default("Personal"),
  status: z.union([z.literal("Active"), z.literal("Blocked")]).default("Active"),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  emiratesId: z.string().optional(),
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  residencyStatus: z.string().optional(),
  dateOfBirth: z.string().optional(),
  companyContactName: z.string().optional(),
  companyContactEmiratesId: z.string().optional(),
  companyTrn: z.string().optional(),
  companyLicenseNumber: z.string().optional(),
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

const deleteClientSchema = z.object({
  userId: z.string().uuid(),
});

const ACTIVE_CLIENT_DEAL_STATUSES: string[] = [
  "pending_activation",
  "active",
  "signing_funding",
  "contract_prep",
];

export type DeleteOperationsClientInput = z.infer<typeof deleteClientSchema>;

export type DeleteOperationsClientResult =
  | { success: true }
  | { success: false; error: string; dealsCount?: number };

export type VerifyClientDeletionResult =
  | { canDelete: true }
  | { canDelete: false; reason?: string; dealsCount?: number };

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

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const {
    userId,
    fullName,
    clientType,
    status,
    email,
    phone,
    emiratesId,
    passportNumber,
    nationality,
    residencyStatus,
    dateOfBirth,
    companyContactName,
    companyContactEmiratesId,
    companyTrn,
    companyLicenseNumber,
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
      return { success: false, error: "Не удалось загрузить профиль покупателя." };
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

    const normalizedCompanyContactName =
      clientType === "Company" ? normalizeOptionalString(companyContactName) : null;
    if (normalizedCompanyContactName) {
      metadata.company_contact_name = normalizedCompanyContactName;
    } else {
      delete metadata.company_contact_name;
    }

    const normalizedCompanyContactEmiratesId =
      clientType === "Company" ? normalizeOptionalString(companyContactEmiratesId) : null;
    if (normalizedCompanyContactEmiratesId) {
      metadata.company_contact_emirates_id = normalizedCompanyContactEmiratesId;
    } else {
      delete metadata.company_contact_emirates_id;
    }

    const normalizedCompanyTrn =
      clientType === "Company" ? normalizeOptionalString(companyTrn) : null;
    if (normalizedCompanyTrn) {
      metadata.company_trn = normalizedCompanyTrn;
    } else {
      delete metadata.company_trn;
    }

    const normalizedCompanyLicenseNumber =
      clientType === "Company" ? normalizeOptionalString(companyLicenseNumber) : null;
    if (normalizedCompanyLicenseNumber) {
      metadata.company_license_number = normalizedCompanyLicenseNumber;
    } else {
      delete metadata.company_license_number;
    }

    const entityType = clientType === "Company" ? "company" : "personal";

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
        employment_info: employmentPayload,
        financial_profile: financialPayload,
        entity_type: entityType,
        metadata,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[operations] failed to update client profile", updateError);
      return { success: false, error: "Не удалось обновить профиль покупателя." };
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
    return { success: false, error: "Произошла ошибка при обновлении покупателя." };
  }
}

export async function uploadClientDocuments(
  formData: FormData,
): Promise<UploadClientDocumentsResult> {
  const base = {
    clientId: formData.get("clientId"),
    slug: formData.get("slug"),
  } satisfies Record<string, unknown>;

  const parsed = uploadClientDocumentsSchema.safeParse(base);

  if (!parsed.success) {
    console.warn("[operations] invalid client document upload payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { clientId, slug } = parsed.data;

  const documentsMap = new Map<
    number,
    { type?: ClientDocumentTypeValue | ""; file?: FileLike | null; context?: "personal" | "company" }
  >();
  for (const [key, value] of formData.entries()) {
    const match = /^documents\[(\d+)\]\[(type|file|context)\]$/.exec(key);
    if (!match) continue;
    const index = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(index)) continue;
    const existing = documentsMap.get(index) ?? {};
    if (match[2] === "type" && typeof value === "string") {
      existing.type = value as ClientDocumentTypeValue | "";
    }
    if (match[2] === "file" && isFileLike(value)) {
      existing.file = value;
    }
    if (match[2] === "context" && typeof value === "string") {
      const normalized = value.toLowerCase();
      existing.context = normalized === "company" ? "company" : "personal";
    }
    documentsMap.set(index, existing);
  }

  const rawDocuments = Array.from(documentsMap.values());
  const hasIncompleteDocument = rawDocuments.some((entry) => {
    const hasType = Boolean(entry.type);
    const hasFile = isFileLike(entry.file) && entry.file.size > 0;
    return (hasType && !hasFile) || (hasFile && !hasType);
  });

  if (hasIncompleteDocument) {
    return { success: false, error: "Выберите тип и файл для каждого документа." };
  }

  const documents = rawDocuments
    .map((entry) => {
      if (!entry.type || !CLIENT_DOCUMENT_TYPE_VALUES.has(entry.type)) {
        return null;
      }
      if (!isFileLike(entry.file) || entry.file.size <= 0) {
        return null;
      }
      const context =
        entry.context ??
        (entry.type === "company_license" ? "company" : ("personal" as "personal" | "company"));
      return { type: entry.type, file: entry.file, context };
    })
    .filter(
      (entry): entry is { type: ClientDocumentTypeValue; file: FileLike; context: "personal" | "company" } =>
        entry !== null,
    );

  if (documents.length === 0) {
    return { success: true, uploaded: 0 };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    const uploadedBy = authData?.user?.id ?? null;

    const serviceClient = await createSupabaseServiceClient();
    const { data: profileData } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("user_id", clientId)
      .maybeSingle();

    const profileId = profileData?.id;
    if (!profileId) {
      return { success: false, error: "Не удалось найти профиль покупателя." };
    }

    const candidates: DocumentUploadCandidate<ClientDocumentTypeValue>[] = documents.map((doc) => {
      const category =
        CLIENT_DOCUMENT_CATEGORY_MAP[doc.type] ?? (doc.context === "company" ? "company" : "identity");
      const fallbackName = getFileName(doc.file) || "client-document";
      const defaultLabel = CLIENT_DOCUMENT_TYPE_LABEL_MAP[doc.type] ?? fallbackName;

      return {
        type: doc.type,
        file: doc.file,
        context: doc.context,
        category,
        title: defaultLabel,
        metadata: {
          label: defaultLabel,
          uploaded_via: "ops_dashboard",
        },
      };
    });

    const uploadResult = await uploadDocumentsBatch<ClientDocumentTypeValue>(candidates, {
      supabase,
      bucket: CLIENT_DOCUMENT_BUCKET,
      table: "profile_documents",
      entityColumn: "profile_id",
      entityId: profileId,
      storagePathPrefix: `clients/${clientId}`,
      allowedTypes: CLIENT_DOCUMENT_TYPE_VALUES,
      typeLabelMap: CLIENT_DOCUMENT_TYPE_LABEL_MAP,
      categoryColumn: "document_category",
      uploadedBy,
      logPrefix: "[operations] client document",
      messages: {
        upload: "Не удалось загрузить документ.",
        insert: "Документ не сохранился. Попробуйте ещё раз.",
      },
    });

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    for (const path of getWorkspacePaths("clients")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/clients/${slug}`);
    if (slug !== clientId) {
      revalidatePath(`/ops/clients/${clientId}`);
    }

    return { success: true, uploaded: uploadResult.uploaded };
  } catch (error) {
    console.error("[operations] unexpected error while uploading client documents", error);
    return { success: false, error: "Произошла ошибка при загрузке документов." };
  }
}

export async function deleteClientDocument(
  input: DeleteClientDocumentInput,
): Promise<DeleteClientDocumentResult> {
  const parsed = deleteClientDocumentSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid client document delete payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для удаления документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { clientId, documentId, slug } = parsed.data;

  try {
    const serviceClient = await createSupabaseServiceClient();

    const { data: profileData } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("user_id", clientId)
      .maybeSingle();

    const profileId = profileData?.id;
    if (!profileId) {
      return { success: false, error: "Не удалось найти профиль покупателя." };
    }

    const { data: documentRecord, error: lookupError } = await serviceClient
      .from("profile_documents")
      .select("id, profile_id, storage_path")
      .eq("id", documentId)
      .maybeSingle();

    if (lookupError) {
      console.error("[operations] failed to load client document before deletion", lookupError);
      return { success: false, error: "Не удалось найти документ покупателя." };
    }

    if (!documentRecord || documentRecord.profile_id !== profileId) {
      return { success: false, error: "Документ не найден или принадлежит другому покупателю." };
    }

    const storagePath =
      typeof documentRecord.storage_path === "string" && documentRecord.storage_path.length > 0
        ? documentRecord.storage_path
        : null;

    if (storagePath) {
      const { error: storageError } = await serviceClient.storage
        .from(CLIENT_DOCUMENT_BUCKET)
        .remove([storagePath]);

      if (storageError && !String(storageError.message ?? "").toLowerCase().includes("not found")) {
        console.error("[operations] failed to remove client document file", storageError);
        return { success: false, error: "Не удалось удалить файл документа." };
      }
    }

    const { error: deleteError } = await serviceClient
      .from("profile_documents")
      .delete()
      .eq("id", documentId)
      .eq("profile_id", profileId);

    if (deleteError) {
      console.error("[operations] failed to delete client document", deleteError);
      return { success: false, error: "Не удалось удалить запись документа." };
    }

    for (const path of getWorkspacePaths("clients")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/clients/${slug}`);
    if (slug !== clientId) {
      revalidatePath(`/ops/clients/${clientId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while deleting client document", error);
    return { success: false, error: "Произошла ошибка при удалении документа." };
  }
}

export async function verifyClientDeletion(
  input: DeleteOperationsClientInput,
): Promise<VerifyClientDeletionResult> {
  const parsed = deleteClientSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid client deletion check payload", parsed.error.flatten());
    return { canDelete: false, reason: "Некорректные данные для проверки удаления." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { canDelete: false, reason: READ_ONLY_ACCESS_MESSAGE };
  }

  const { userId } = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();

    const { data: dealsData, error: dealsError } = await supabase
      .from("deals")
      .select("status")
      .eq("client_id", userId);

    if (dealsError) {
      console.error("[operations] failed to check client deals", dealsError);
      return {
        canDelete: false,
        reason: "Не удалось проверить связанные сделки. Попробуйте позже.",
      };
    }

    const activeDeals = (dealsData ?? []).filter((deal) => {
      if (typeof deal.status !== "string") return false;
      return ACTIVE_CLIENT_DEAL_STATUSES.includes(deal.status.toLowerCase());
    });

    if (activeDeals.length > 0) {
      return {
        canDelete: false,
        dealsCount: activeDeals.length,
        reason: `Удаление невозможно: у покупателя есть активные сделки (${activeDeals.length}).`,
      };
    }

    return { canDelete: true };
  } catch (error) {
    console.error("[operations] unexpected error while checking client deletion", error);
    return {
      canDelete: false,
      reason: "Произошла ошибка при проверке возможности удаления покупателя.",
    };
  }
}

export async function deleteOperationsClient(
  input: DeleteOperationsClientInput,
): Promise<DeleteOperationsClientResult> {
  const parsed = deleteClientSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid client delete payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для удаления покупателя." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { userId } = parsed.data;

  const verification = await verifyClientDeletion({ userId });

  if (!verification.canDelete) {
    return {
      success: false,
      error: verification.reason ?? "Нельзя удалить покупателя.",
      dealsCount: verification.dealsCount,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServiceClient();

    // Проверяем, есть ли активные сделки у покупателя
    const { data: dealsData, error: dealsError } = await supabase
      .from("deals")
      .select("id, status")
      .eq("client_id", userId);

    if (dealsError) {
      console.error("[operations] failed to check client deals", dealsError);
      return { success: false, error: "Не удалось проверить связанные сделки." };
    }

    const activeDeals = (dealsData || []).filter((deal) => {
      if (typeof deal.status !== "string") {
        return false;
      }
      return ACTIVE_CLIENT_DEAL_STATUSES.includes(deal.status.toLowerCase());
    });

    if (activeDeals.length > 0) {
      return {
        success: false,
        error: `Нельзя удалить покупателя с активными сделками. Найдено ${activeDeals.length} активных сделок.`,
        dealsCount: activeDeals.length,
      };
    }

    // Удаляем документы покупателя (сначала документы, потом профиль)
    const { error: documentsError } = await supabase
      .from("deal_documents")
      .delete()
      .in("deal_id", (dealsData || []).map(deal => deal.id));

    if (documentsError) {
      console.warn("[operations] failed to delete client documents", documentsError);
      // Продолжаем удаление, даже если не удалось удалить документы
    }

    // Удаляем сделки покупателя (если есть завершенные или отмененные)
    const { error: dealsDeleteError } = await supabase
      .from("deals")
      .delete()
      .eq("client_id", userId);

    if (dealsDeleteError) {
      console.warn("[operations] failed to delete client deals", dealsDeleteError);
      // Продолжаем удаление профиля
    }

    // Удаляем профиль покупателя
    const { error: profileDeleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (profileDeleteError) {
      console.error("[operations] failed to delete client profile", profileDeleteError);
      return { success: false, error: "Не удалось удалить профиль покупателя." };
    }

    // Удаляем роль пользователя
    const { error: roleError } = await serviceClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "CLIENT");

    if (roleError) {
      console.warn("[operations] failed to delete client role", roleError);
      // Продолжаем, роль не критична
    }

    // Удаляем пользователя из auth
    try {
      const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.warn("[operations] failed to delete auth user", authDeleteError);
      }
    } catch (error) {
      console.warn("[operations] auth user deletion skipped", { userId, error });
    }

    // Инвалидируем кеш
    for (const path of getWorkspacePaths("clients")) {
      revalidatePath(path);
    }

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while deleting client", error);
    return { success: false, error: "Произошла ошибка при удалении покупателя." };
  }
}
