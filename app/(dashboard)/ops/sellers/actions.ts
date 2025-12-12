"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { OpsClientRecord } from "@/lib/supabase/queries/operations";
import { buildSlugWithId } from "@/lib/utils/slugs";
import {
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_LABEL_MAP,
  type ClientDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getMutationSessionUser } from "@/lib/auth/guards";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";
import { getWorkspacePaths } from "@/lib/workspace/routes";
import {
  uploadDocumentsBatch,
  type DocumentUploadCandidate,
  isFileLike,
  type FileLike,
} from "@/lib/documents/upload";
import {
  normalizeEmail,
  sanitizePhone,
  formatMonthYear,
  parseNameParts,
  resolveUserId,
  createOperationsAuthUser,
  upsertOperationsProfile,
  isMissingColumnError,
  type SupabaseProfileRow,
  type ProfileMetadata,
} from "@/lib/operations/shared-actions";

const createInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(["individual", "company"]).default("individual"),
});

type CreateOperationsSellerInput = z.infer<typeof createInputSchema>;

export type CreateOperationsSellerResult =
  | { data: OpsClientRecord; error?: undefined }
  | { data?: undefined; error: string };

function formatSellerRecord(
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
    profile.status === "suspended" || profile.status === "archived"
      ? "Blocked"
      : "Active";

  const memberSince = formatMonthYear(profile.created_at);
  const detailSlug = buildSlugWithId(name, userId) || userId;

  return {
    userId,
    id: `SL-${Math.floor(Date.now() / 1000).toString().slice(-4).padStart(4, "0")}`,
    name,
    email: email ?? "",
    phone: profile.phone ?? "+971 50 000 0000",
    status: statusLabel === "Blocked" ? "Blocked" : "Active",
    statusLabel,
    scoring: "—",
    overdue: 0,
    limit: "—",
    detailHref: `/ops/sellers/${detailSlug}`,
    memberSince,
    segment: null,
    tags: statusLabel === "Blocked" ? ["Blocked"] : ["Active"],
    metricsSummary: {
      scoring: "—",
      limit: "—",
      overdue: "Нет данных",
    },
    residencyStatus: profile.residency_status ?? null,
    entityType: (profile.entity_type as "individual" | "company") ?? null,
    leasing: undefined,
  };
}

export async function createOperationsSeller(
  input: CreateOperationsSellerInput,
): Promise<CreateOperationsSellerResult> {
  const parsed = createInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Введите корректные данные продавца." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { name, email, phone, type } = parsed.data;
  const { firstName, lastName } = parseNameParts(name);
  const fullName = name.trim();
  const normalizedEmail = normalizeEmail(email);
  const sanitizedPhone = sanitizePhone(phone);
  const userStatus = "active";

  try {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServiceClient();

    if (!normalizedEmail && !sanitizedPhone) {
      return {
        error: "Укажите email или телефон продавца.",
      };
    }

    let userId = await resolveUserId(normalizedEmail || null, sanitizedPhone || null);

    if (!userId) {
      const { data: created, error: createError } = await createOperationsAuthUser(serviceClient, {
        email: normalizedEmail || null,
        phone: sanitizedPhone || null,
        fullName,
        role: "SELLER",
        source: "ops_dashboard"
      });

      if (createError) {
        return {
          error: "Не удалось создать пользователя в Supabase. Попробуйте позже.",
        };
      }

      userId = created.user?.id ?? null;
    }

    if (!userId) {
      return {
        error: "Не удалось определить учетную запись продавца.",
      };
    }

    const { data: profile, error: profileError } = await upsertOperationsProfile(supabase, userId, {
      fullName,
      firstName,
      lastName,
      phone: sanitizedPhone || null,
      email: normalizedEmail || null,
      status: userStatus,
      source: "OPS Dashboard",
      entityType: type,
    });

    if (profileError || !profile) {
      return {
        error: "Не удалось сохранить профиль продавца.",
      };
    }

    const { data: existingRole } = await serviceClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "SELLER")
      .maybeSingle();

    if (!existingRole) {
      const { error: roleInsertError } = await serviceClient
        .from("user_roles")
        .insert({
            user_id: userId,
            role: "SELLER",
            portal: "seller",
            assigned_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {}
        });

      if (roleInsertError) {
        console.error("[operations] failed to insert seller role", roleInsertError);
        return {
          error: "Не удалось назначить роль продавца.",
        };
      }
    }

    for (const path of getWorkspacePaths("sellers")) {
      revalidatePath(path);
    }

    const typedProfile = profile as SupabaseProfileRow;
    const profileMetadata = typedProfile.metadata ?? null;
    const emailFromProfile =
      (profileMetadata?.ops_email as string | undefined) ?? normalizedEmail ?? null;

    const record = formatSellerRecord(
      { phone: typedProfile.phone, status: typedProfile.status, created_at: typedProfile.created_at },
      fullName,
      emailFromProfile,
      userId,
    );

    return { data: record };

  } catch (error) {
    console.error("[operations] unexpected error while creating seller", error);
    return {
      error: "Произошла ошибка при создании продавца.",
    };
  }
}

const updateInputSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1),
  status: z.union([z.literal("Active"), z.literal("Blocked")]).default("Active"),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  source: z.string().optional(),
  emiratesId: z.string().optional(),
  passportNumber: z.string().optional(),
});

export type UpdateOperationsSellerInput = z.infer<typeof updateInputSchema>;

export type UpdateOperationsSellerResult =
  | { success: true }
  | { success: false; error: string };

const deleteSellerSchema = z.object({
  userId: z.string().uuid(),
});

export type DeleteOperationsSellerInput = z.infer<typeof deleteSellerSchema>;

export type DeleteOperationsSellerResult =
  | { success: true }
  | { success: false; error: string; dealsCount?: number };

const SELLER_DOCUMENT_BUCKET = "seller-documents";
const SELLER_DOCUMENT_TYPE_VALUES = new Set(
  CLIENT_DOCUMENT_TYPES.map((entry) => entry.value),
);

const uploadSellerDocumentsSchema = z.object({
  sellerId: z.string().uuid(),
});

const deleteSellerDocumentSchema = z.object({
  sellerId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export type UploadOperationsSellerDocumentsResult =
  | { success: true; uploaded: number }
  | { success: false; error: string };

type DeleteOperationsSellerDocumentInput = z.infer<typeof deleteSellerDocumentSchema>;

export type DeleteOperationsSellerDocumentResult =
  | { success: true }
  | { success: false; error: string };


export async function updateOperationsSeller(
  input: UpdateOperationsSellerInput,
): Promise<UpdateOperationsSellerResult> {
  const parsed = updateInputSchema.safeParse({
    ...input,
    email: input.email ?? undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Проверьте корректность введённых данных." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const {
    userId,
    fullName,
    status,
    email,
    phone,
    nationality,
    source,
    emiratesId,
    passportNumber,
  } = parsed.data;

  const { firstName, lastName } = parseNameParts(fullName);
  const normalizedEmail = normalizeEmail(email);
  const sanitizedPhone = sanitizePhone(phone);
  const userStatus = status === "Blocked" ? "suspended" : "active";

  try {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServiceClient();

    // 1. Update Auth User (email/phone/metadata)
    if (normalizedEmail || sanitizedPhone) {
      const updatePayload: {
        email?: string;
        phone?: string;
        user_metadata?: Record<string, unknown>;
      } = {
        user_metadata: {
          full_name: fullName,
        },
      };

      if (normalizedEmail) updatePayload.email = normalizedEmail;
      if (sanitizedPhone) updatePayload.phone = sanitizedPhone;

      const { error: authError } = await serviceClient.auth.admin.updateUserById(
        userId,
        updatePayload,
      );

      if (authError) {
        console.error("[operations] failed to update auth user for seller", { userId, authError });
        // Continue to update profile even if auth update fails (e.g. email duplicate)
      }
    }

    // 2. Fetch existing profile for metadata merge
    let supportsSourceColumn = true;
    let { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("metadata, source")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError && isMissingColumnError(fetchError, "source")) {
      supportsSourceColumn = false;
      ({ data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("metadata")
        .eq("user_id", userId)
        .maybeSingle());
    }

    if (fetchError) {
      console.error("[operations] failed to fetch existing profile", fetchError);
      return { success: false, error: "Не удалось загрузить профиль продавца." };
    }

    const currentMetadata = (existingProfile?.metadata as ProfileMetadata | null) ?? {};
    const updatedMetadata: ProfileMetadata = {
      ...currentMetadata,
      ops_email: normalizedEmail ?? currentMetadata.ops_email,
      ops_phone: sanitizedPhone ?? currentMetadata.ops_phone,
      nationality: nationality ?? (currentMetadata.nationality as string | undefined),
      emirates_id: emiratesId ?? (currentMetadata.emirates_id as string | undefined),
      passport_number: passportNumber ?? (currentMetadata.passport_number as string | undefined),
    };

    if (source) {
        updatedMetadata.source = source;
        updatedMetadata.lead_source = source;
    }

    // 3. Update Profile
    const profilePayload: Record<string, unknown> = {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone: sanitizedPhone,
      status: userStatus,
      nationality: nationality, // Try updating column first
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
    };

    if (supportsSourceColumn && source) {
        profilePayload.source = source;
    }

    let { error: updateError } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("user_id", userId);

    // Handle missing columns gracefully
    if (updateError) {
        const isMissingNationality = isMissingColumnError(updateError, "nationality");
        const isMissingSource = isMissingColumnError(updateError, "source");

        if (isMissingNationality || isMissingSource) {
            const fallbackPayload = { ...profilePayload };
            if (isMissingNationality) delete fallbackPayload.nationality;
            if (isMissingSource) delete fallbackPayload.source;

            const { error: retryError } = await supabase
                .from("profiles")
                .update(fallbackPayload)
                .eq("user_id", userId);
            
            updateError = retryError;
        }
    }

    if (updateError) {
      console.error("[operations] failed to update seller profile", updateError);
      return { success: false, error: "Не удалось обновить профиль продавца." };
    }

    for (const path of getWorkspacePaths("sellers")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/sellers/${userId}`); // Revalidate detail page via ID (slug might change but ID is stable)

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error updating seller", error);
    return { success: false, error: "Произошла системная ошибка." };
  }
}

export async function deleteOperationsSeller(
  input: DeleteOperationsSellerInput,
): Promise<DeleteOperationsSellerResult> {
  const parsed = deleteSellerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Некорректный ID продавца." };
  }

  const { userId } = parsed.data;
  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServiceClient();

    // 1. Check for active deals
    // Sellers are linked via 'seller_id' in deals table
    const { data: deals, error: countError } = await serviceClient
      .from("deals")
      .select("id, status")
      .eq("seller_id", userId);

    if (countError && !isMissingColumnError(countError, "seller_id")) {
        console.error("[operations] failed to check seller deals", countError);
        return { success: false, error: "Не удалось проверить сделки продавца." };
    }

    // If seller_id column exists
    if (!countError && deals) {
        const activeDeals = deals.filter(d => 
            d.status !== 'cancelled' && d.status !== 'completed'
        );

        if (activeDeals.length > 0) {
            return { 
                success: false, 
                error: `Невозможно удалить продавца: найдено ${activeDeals.length} активных сделок.`,
                dealsCount: activeDeals.length
            };
        }
    }

    // 2. Soft delete / Block user
    // We don't hard delete users usually to preserve audit trails.
    // But if requested, we can mark status as deleted or actually delete if no dependencies.
    // For now, let's stick to blocking/suspending or soft-deleting profile.
    
    // If the user wants to DELETE, we can try deleting the user_role first.
    const { error: roleError } = await serviceClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "SELLER");

    if (roleError) {
        console.error("[operations] failed to delete seller role", roleError);
        return { success: false, error: "Не удалось удалить роль продавца." };
    }

    // Optionally update profile status to 'deleted' or 'blocked'
    await serviceClient
        .from("profiles")
        .update({ status: "archived", metadata: { ...parsed, deleted_at: new Date().toISOString() } }) // simplified
        .eq("user_id", userId);

    for (const path of getWorkspacePaths("sellers")) {
      revalidatePath(path);
    }

    return { success: true };

  } catch (error) {
    console.error("[operations] unexpected error deleting seller", error);
    return { success: false, error: "Произошла системная ошибка." };
  }
}

export async function uploadOperationsSellerDocuments(
  formData: FormData,
): Promise<UploadOperationsSellerDocumentsResult> {
  const base = {
    sellerId: formData.get("sellerId"),
  } satisfies Record<string, unknown>;
  const parsed = uploadSellerDocumentsSchema.safeParse(base);

  if (!parsed.success) {
    return { success: false, error: "Некорректные данные документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { sellerId } = parsed.data;
  const files = Array.from(formData.getAll("files")).filter(isFileLike) as FileLike[];
  // Expect types to be passed as parallel array "types"
  const types = Array.from(formData.getAll("types")).map(String);

  if (files.length === 0) {
    return { success: false, error: "Не выбраны файлы для загрузки." };
  }

  const supabase = await createSupabaseServerClient();
  const uploadedBy = sessionUser.user.id;

  // We need to map files to candidates with types
  const candidates: DocumentUploadCandidate[] = files.map((file, index) => {
    const typeValue = types[index] || "other";
    const typeLabel = CLIENT_DOCUMENT_TYPE_LABEL_MAP[typeValue as ClientDocumentTypeValue] ?? "Документ";
    
    return {
      file,
      title: typeLabel,
      type: typeValue,
      metadata: {
          document_type: typeValue,
          label: typeLabel,
          uploaded_via: "ops_dashboard",
      }
    };
  });

  const uploadResult = await uploadDocumentsBatch<ClientDocumentTypeValue>(candidates, {
    supabase,
    bucket: SELLER_DOCUMENT_BUCKET,
    table: "profile_documents",
    entityColumn: "profile_id",
    entityId: sellerId,
    storagePathPrefix: `sellers/${sellerId}`,
    allowedTypes: SELLER_DOCUMENT_TYPE_VALUES,
    typeLabelMap: CLIENT_DOCUMENT_TYPE_LABEL_MAP,
    categoryColumn: "document_category",
    uploadedBy,
    logPrefix: "[operations] seller document",
    messages: {
      upload: "Не удалось загрузить документ.",
      insert: "Документ не сохранился. Попробуйте ещё раз.",
    },
  });

  if (!uploadResult.success) {
    return { success: false, error: uploadResult.error };
  }

  for (const path of getWorkspacePaths("sellers")) {
    revalidatePath(path);
  }
  revalidatePath(`/ops/sellers/${sellerId}`);

  return { success: true, uploaded: uploadResult.uploaded };
}

export async function deleteOperationsSellerDocument(
  input: DeleteOperationsSellerDocumentInput,
): Promise<DeleteOperationsSellerDocumentResult> {
  const parsed = deleteSellerDocumentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Некорректные данные для удаления документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { sellerId, documentId } = parsed.data;

  try {
    const serviceClient = await createSupabaseServiceClient();

    const { data: documentRecord, error: lookupError } = await serviceClient
      .from("profile_documents")
      .select("id, profile_id, storage_path")
      .eq("id", documentId)
      .maybeSingle();

    if (lookupError) {
      console.error("[operations] failed to load seller document before deletion", lookupError);
      return { success: false, error: "Не удалось найти документ продавца." };
    }

    if (!documentRecord || String(documentRecord.profile_id) !== sellerId) {
      return { success: false, error: "Документ не найден или принадлежит другому продавцу." };
    }

    const storagePath =
      typeof documentRecord.storage_path === "string" && documentRecord.storage_path.length > 0
        ? documentRecord.storage_path
        : null;

    if (storagePath) {
      // Try deleting from seller-documents bucket first, then profile-documents if needed?
      // Or just try removing from the bucket configured.
      // Since we don't know for sure which bucket it is in (could be default), we try SELLER_DOCUMENT_BUCKET.
      const { error: storageError } = await serviceClient.storage
        .from(SELLER_DOCUMENT_BUCKET)
        .remove([storagePath]);

      if (storageError && !String(storageError.message ?? "").toLowerCase().includes("not found")) {
        console.warn("[operations] failed to remove seller document file", storageError);
        // Continue to delete record
      }
    }

    const { error: deleteError } = await serviceClient
      .from("profile_documents")
      .delete()
      .eq("id", documentId)
      .eq("profile_id", sellerId);

    if (deleteError) {
      console.error("[operations] failed to delete seller document", deleteError);
      return { success: false, error: "Не удалось удалить запись документа." };
    }

    for (const path of getWorkspacePaths("sellers")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/sellers/${sellerId}`);

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while deleting seller document", error);
    return { success: false, error: "Произошла ошибка при удалении документа." };
  }
}
