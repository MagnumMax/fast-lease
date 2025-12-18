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
  type: z.enum(["personal", "company"]).default("personal"),
});

type CreateOperationsBrokerInput = z.infer<typeof createInputSchema>;

export type CreateOperationsBrokerResult =
  | { data: OpsClientRecord; error?: undefined }
  | { data?: undefined; error: string };

function formatBrokerRecord(
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
    id: `BR-${Math.floor(Date.now() / 1000).toString().slice(-4).padStart(4, "0")}`,
    name,
    email: email ?? "",
    phone: profile.phone ?? "+971 50 000 0000",
    status: statusLabel === "Blocked" ? "Blocked" : "Active",
    statusLabel,
    scoring: "—",
    overdue: 0,
    limit: "—",
    detailHref: `/ops/brokers/${detailSlug}`,
    memberSince,
    segment: null,
    tags: statusLabel === "Blocked" ? ["Blocked"] : ["Active"],
    metricsSummary: {
      scoring: "—",
      limit: "—",
      overdue: "Нет данных",
    },
    residencyStatus: profile.residency_status ?? null,
    entityType: (profile.entity_type as "personal" | "company") ?? null,
    leasing: undefined,
  };
}

export async function createOperationsBroker(
  input: CreateOperationsBrokerInput,
): Promise<CreateOperationsBrokerResult> {
  const parsed = createInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Введите корректные данные брокера." };
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
  
  // Normalize entity type for DB
  const entityType = type;

  try {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServiceClient();

    if (!normalizedEmail && !sanitizedPhone) {
      return {
        error: "Укажите email или телефон брокера.",
      };
    }

    let userId = await resolveUserId(normalizedEmail || null, sanitizedPhone || null);

    if (!userId) {
      const { data: created, error: createError } = await createOperationsAuthUser(serviceClient, {
        email: normalizedEmail || null,
        phone: sanitizedPhone || null,
        fullName,
        role: "BROKER",
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
        error: "Не удалось определить учетную запись брокера.",
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
      entityType: entityType,
    });

    if (profileError || !profile) {
      return {
        error: "Не удалось сохранить профиль брокера.",
      };
    }

    const { data: existingRole } = await serviceClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "BROKER")
      .maybeSingle();

    if (!existingRole) {
      const { error: roleInsertError } = await serviceClient
        .from("user_roles")
        .insert({
            user_id: userId,
            role: "BROKER",
            portal: "broker",
            assigned_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {}
        });

      if (roleInsertError) {
        console.error("[operations] failed to insert broker role", roleInsertError);
        return {
          error: "Не удалось назначить роль брокера.",
        };
      }
    }

    for (const path of getWorkspacePaths("brokers")) {
      revalidatePath(path);
    }

    const typedProfile = profile as SupabaseProfileRow;
    const profileMetadata = typedProfile.metadata ?? null;
    const emailFromProfile =
      (profileMetadata?.ops_email as string | undefined) ?? normalizedEmail ?? null;

    const record = formatBrokerRecord(
      { phone: typedProfile.phone, status: typedProfile.status, created_at: typedProfile.created_at },
      fullName,
      emailFromProfile,
      userId,
    );

    return { data: record };

  } catch (error) {
    console.error("[operations] unexpected error while creating broker", error);
    return {
      error: "Произошла ошибка при создании брокера.",
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
  bankDetails: z.string().optional(),
  contactEmail: z.union([z.string().email(), z.literal("")]).optional(),
  contactPhone: z.string().optional(),
  dateOfBirth: z.string().nullable().optional(),
  type: z.enum(["personal", "company"]).optional(),
});

export type UpdateOperationsBrokerInput = z.infer<typeof updateInputSchema>;

export type UpdateOperationsBrokerResult =
  | { success: true }
  | { success: false; error: string };

const deleteBrokerSchema = z.object({
  userId: z.string().uuid(),
});

export type DeleteOperationsBrokerInput = z.infer<typeof deleteBrokerSchema>;

export type DeleteOperationsBrokerResult =
  | { success: true }
  | { success: false; error: string; dealsCount?: number };

const BROKER_DOCUMENT_BUCKET = "profile-documents";
const BROKER_DOCUMENT_TYPE_VALUES = new Set(
  CLIENT_DOCUMENT_TYPES.map((entry) => entry.value),
);

const uploadBrokerDocumentsSchema = z.object({
  brokerId: z.string().uuid(),
});

const deleteBrokerDocumentSchema = z.object({
  brokerId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export type UploadOperationsBrokerDocumentsResult =
  | { success: true; uploaded: number }
  | { success: false; error: string };

type DeleteOperationsBrokerDocumentInput = z.infer<typeof deleteBrokerDocumentSchema>;

export type DeleteOperationsBrokerDocumentResult =
  | { success: true }
  | { success: false; error: string };


export async function updateOperationsBroker(
  input: UpdateOperationsBrokerInput,
): Promise<UpdateOperationsBrokerResult> {
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
    bankDetails,
    contactEmail,
    contactPhone,
    dateOfBirth,
    type,
  } = parsed.data;

  const { firstName, lastName } = parseNameParts(fullName);
  const normalizedEmail = normalizeEmail(email);
  const sanitizedPhone = sanitizePhone(phone);
  const normalizedContactEmail = normalizeEmail(contactEmail || undefined);
  const sanitizedContactPhone = sanitizePhone(contactPhone);
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
        console.error("[operations] failed to update auth user for broker", { userId, authError });
        // Continue to update profile even if auth update fails (e.g. email duplicate)
      }
    }

    // 2. Fetch existing profile for metadata merge
    let supportsSourceColumn = true;
    let { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("metadata, source, broker_details, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError && isMissingColumnError(fetchError, "source")) {
      supportsSourceColumn = false;
      ({ data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("metadata, broker_details, full_name")
        .eq("user_id", userId)
        .maybeSingle());
    }

    if (fetchError) {
      console.error("[operations] failed to fetch existing profile", fetchError);
      return { success: false, error: "Не удалось загрузить профиль брокера." };
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

    // Prepare broker_details
    const currentBrokerDetails = (existingProfile?.broker_details as Record<string, unknown> | null) ?? {};
    const updatedBrokerDetails: Record<string, unknown> = {
      ...currentBrokerDetails,
      broker_bank_details: bankDetails ?? currentBrokerDetails.broker_bank_details,
      broker_contact_email: normalizedContactEmail ?? currentBrokerDetails.broker_contact_email,
      broker_contact_phone: sanitizedContactPhone ?? currentBrokerDetails.broker_contact_phone,
    };

    // 3. Update Profile
    const profilePayload: Record<string, unknown> = {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone: sanitizedPhone,
      status: userStatus,
      nationality: nationality, // Try updating column first
      date_of_birth: dateOfBirth,
      metadata: updatedMetadata,
      broker_details: updatedBrokerDetails,
      entity_type: type,
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
      console.error("[operations] failed to update broker profile", updateError);
      return { success: false, error: "Не удалось обновить профиль брокера." };
    }

    for (const path of getWorkspacePaths("brokers")) {
      revalidatePath(path);
    }

    // Revalidate all potential paths for this broker
    const newSlug = buildSlugWithId(fullName, userId);
    revalidatePath(`/ops/brokers/${newSlug}`);

    if (existingProfile) {
      // @ts-ignore - full_name is selected dynamically
      const oldFullName = existingProfile.full_name as string | null;
      const oldSlug = buildSlugWithId(oldFullName, userId);
      if (oldSlug !== newSlug) {
        revalidatePath(`/ops/brokers/${oldSlug}`);
      }
    }

    revalidatePath(`/ops/brokers/${userId}`); // Revalidate detail page via ID (slug might change but ID is stable)

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error updating broker", error);
    return { success: false, error: "Произошла системная ошибка." };
  }
}

export async function deleteOperationsBroker(
  input: DeleteOperationsBrokerInput,
): Promise<DeleteOperationsBrokerResult> {
  const parsed = deleteBrokerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Некорректный ID брокера." };
  }

  const { userId } = parsed.data;
  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  try {
    const serviceClient = await createSupabaseServiceClient();

    // 1. Check for active deals
    // Brokers are linked via 'broker_id' in deals table
    const { data: deals, error: countError } = await serviceClient
      .from("deals")
      .select("id, status")
      .eq("broker_id", userId);

    if (countError && !isMissingColumnError(countError, "broker_id")) {
        console.error("[operations] failed to check broker deals", countError);
        return { success: false, error: "Не удалось проверить сделки брокера." };
    }

    // If broker_id column exists
    if (!countError && deals) {
        const activeDeals = deals.filter(d => 
            d.status !== 'cancelled' && d.status !== 'completed'
        );

        if (activeDeals.length > 0) {
            return { 
                success: false, 
                error: `Невозможно удалить брокера: найдено ${activeDeals.length} активных сделок.`,
                dealsCount: activeDeals.length
            };
        }
    }

    // 2. Soft delete / Block user
    
    // If the user wants to DELETE, we can try deleting the user_role first.
    const { error: roleError } = await serviceClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "BROKER");

    if (roleError) {
        console.error("[operations] failed to delete broker role", roleError);
        return { success: false, error: "Не удалось удалить роль брокера." };
    }

    // Optionally update profile status to 'deleted' or 'blocked'
    await serviceClient
        .from("profiles")
        .update({ status: "archived", metadata: { ...parsed, deleted_at: new Date().toISOString() } }) // simplified
        .eq("user_id", userId);

    for (const path of getWorkspacePaths("brokers")) {
      revalidatePath(path);
    }

    return { success: true };

  } catch (error) {
    console.error("[operations] unexpected error deleting broker", error);
    return { success: false, error: "Произошла системная ошибка." };
  }
}

export async function uploadOperationsBrokerDocuments(
  formData: FormData,
): Promise<UploadOperationsBrokerDocumentsResult> {
  const base = {
    brokerId: formData.get("brokerId"),
  } satisfies Record<string, unknown>;
  const parsed = uploadBrokerDocumentsSchema.safeParse(base);

  if (!parsed.success) {
    return { success: false, error: "Некорректные данные документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { brokerId } = parsed.data;
  const files = Array.from(formData.getAll("files")).filter(isFileLike) as FileLike[];
  // Expect types to be passed as parallel array "types"
  const types = Array.from(formData.getAll("types")).map(String);

  if (files.length === 0) {
    return { success: false, error: "Не выбраны файлы для загрузки." };
  }

  const supabase = await createSupabaseServerClient();
  const uploadedBy = sessionUser.user.id;

  // Resolve profile.id from user_id (brokerId)
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", brokerId)
    .maybeSingle();

  if (profileError || !profileData) {
    console.error("[operations] failed to resolve profile id for upload", { brokerId, error: profileError });
    return { success: false, error: "Не удалось определить профиль брокера." };
  }

  const profileId = profileData.id;

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
    bucket: BROKER_DOCUMENT_BUCKET,
    table: "profile_documents",
    entityColumn: "profile_id",
    entityId: profileId,
    storagePathPrefix: `brokers/${brokerId}`,
    allowedTypes: BROKER_DOCUMENT_TYPE_VALUES,
    typeLabelMap: CLIENT_DOCUMENT_TYPE_LABEL_MAP,
    categoryColumn: "document_category",
    uploadedBy,
    logPrefix: "[operations] broker document",
    messages: {
      upload: "Не удалось загрузить документ.",
    },
  });

  if (!uploadResult.success) {
    return { success: false, error: uploadResult.error };
  }

  for (const path of getWorkspacePaths("brokers")) {
    revalidatePath(path);
  }
  
  // Revalidate detail page
  revalidatePath(`/ops/brokers/${brokerId}`);
  // Also revalidate by slug if possible, but ID is safest
  
  return { success: true, uploaded: uploadResult.uploaded };
}

export async function deleteOperationsBrokerDocument(
  input: DeleteOperationsBrokerDocumentInput,
): Promise<DeleteOperationsBrokerDocumentResult> {
  const parsed = deleteBrokerDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Некорректный ID документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { brokerId, documentId } = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();

    // 1. Verify ownership/access if needed (omitted for ops dashboard admins)
    
    // 2. Delete file from storage
    const { data: docData, error: fetchError } = await supabase
        .from("profile_documents")
        .select("storage_path, bucket_id")
        .eq("id", documentId)
        .single();
    
    if (fetchError) {
         console.error("[operations] document not found for deletion", fetchError);
         return { success: false, error: "Документ не найден." };
    }

    if (docData.storage_path && docData.bucket_id) {
        const { error: storageError } = await supabase
            .storage
            .from(docData.bucket_id)
            .remove([docData.storage_path]);
        
        if (storageError) {
            console.error("[operations] failed to delete document from storage", storageError);
            // Continue to delete record? Maybe safest to stop.
            return { success: false, error: "Не удалось удалить файл из хранилища." };
        }
    }

    // 3. Delete record
    const { error: deleteError } = await supabase
      .from("profile_documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      console.error("[operations] failed to delete broker document record", deleteError);
      return { success: false, error: "Не удалось удалить запись о документе." };
    }

    for (const path of getWorkspacePaths("brokers")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/brokers/${brokerId}`);

    return { success: true };

  } catch (error) {
    console.error("[operations] unexpected error deleting broker document", error);
    return { success: false, error: "Произошла ошибка при удалении документа." };
  }
}
