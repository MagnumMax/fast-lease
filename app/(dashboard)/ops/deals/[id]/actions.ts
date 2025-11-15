"use server";

import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  OPS_WORKFLOW_STATUS_MAP,
  DEAL_DOCUMENT_TYPES,
  type DealDocumentCategory,
  type DealDocumentTypeValue,
  DEAL_DOCUMENT_TYPE_LABEL_MAP,
} from "@/lib/supabase/queries/operations";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { getWorkspacePaths } from "@/lib/workspace/routes";
import {
  uploadDocumentsBatch,
  type DocumentUploadCandidate,
  isFileLike,
  type FileLike,
} from "@/lib/documents/upload";
import { DEAL_COMPANY_CODES, DEFAULT_DEAL_COMPANY_CODE } from "@/lib/data/deal-companies";
import { getMutationSessionUser } from "@/lib/auth/guards";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";

const inputSchema = z.object({
  dealId: z.string().uuid(),
  statusKey: z.string().min(1),
  guardKey: z.string().min(1),
  note: z.string().optional(),
  slug: z.string().min(1),
});

const STORAGE_BUCKET = "deal-documents";
const SELLER_DOCUMENTS_BUCKET = "seller-documents";

const DEAL_DOCUMENT_TYPE_META: Record<DealDocumentTypeValue, { title: string; category: DealDocumentCategory }> =
  DEAL_DOCUMENT_TYPES.reduce(
    (acc, entry) => {
      acc[entry.value] = { title: entry.label, category: entry.category };
      return acc;
    },
    {} as Record<DealDocumentTypeValue, { title: string; category: DealDocumentCategory }>,
  );

const DEAL_DOCUMENT_TYPE_VALUES = new Set<DealDocumentTypeValue>(
  DEAL_DOCUMENT_TYPES.map((entry) => entry.value),
);

const FALLBACK_UPLOAD_NAME = "document";

function resolveUploadedFileName(file: FileLike): string {
  const rawName = typeof file.name === "string" ? file.name.trim() : "";
  return rawName.length > 0 ? rawName : FALLBACK_UPLOAD_NAME;
}

const uploadDealDocumentsSchema = z.object({
  dealId: z.string().uuid(),
  slug: z.string().min(1),
});

const uploadSellerDocumentsSchema = z.object({
  dealId: z.string().uuid(),
  slug: z.string().min(1),
});

const deleteDealDocumentSchema = z.object({
  dealId: z.string().uuid(),
  documentId: z.string().uuid(),
  slug: z.string().min(1),
});

export type UploadDealDocumentsResult =
  | { success: true; uploaded: number }
  | { success: false; error: string };

type UploadedSellerDocument = {
  id: string;
  title: string;
  bucket: string;
  storage_path: string;
  uploaded_at: string;
};

export type UploadSellerDocumentsResult =
  | { success: true; documents: UploadedSellerDocument[] }
  | { success: false; error: string };

type DeleteDealDocumentInput = z.infer<typeof deleteDealDocumentSchema>;

export type DeleteDealDocumentResult =
  | { success: true }
  | { success: false; error: string };

export async function uploadDealDocuments(formData: FormData): Promise<UploadDealDocumentsResult> {
  const base = {
    dealId: formData.get("dealId"),
    slug: formData.get("slug"),
  } satisfies Record<string, unknown>;

  const parsed = uploadDealDocumentsSchema.safeParse(base);

  if (!parsed.success) {
    console.warn("[operations] invalid deal document upload payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { dealId, slug } = parsed.data;

  const documentsMap = new Map<number, { type?: string; file?: FileLike | null }>();

  for (const [key, value] of formData.entries()) {
    const match = /^documents\[(\d+)\]\[(type|file)\]$/.exec(key);
    if (!match) continue;
    const index = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(index)) continue;
    const existing = documentsMap.get(index) ?? {};
    if (match[2] === "type" && typeof value === "string") {
      existing.type = value;
    }
    if (match[2] === "file" && isFileLike(value)) {
      existing.file = value;
    }
    documentsMap.set(index, existing);
  }

  const rawDocuments = Array.from(documentsMap.values());

  const hasIncomplete = rawDocuments.some((entry) => {
    const type = typeof entry.type === "string" ? entry.type.trim() : "";
    const hasFile = isFileLike(entry.file) && entry.file.size > 0;
    return (type && !hasFile) || (hasFile && !type);
  });

  if (hasIncomplete) {
    return { success: false, error: "Выберите тип и файл для каждого документа." };
  }

  const documents = rawDocuments
    .map((entry) => {
      const typeRaw = typeof entry.type === "string" ? entry.type.trim().toLowerCase() : "";
      const typeValue = typeRaw as DealDocumentTypeValue;
      const file = isFileLike(entry.file) && entry.file.size > 0 ? entry.file : null;
      if (!typeRaw || !file) {
        return null;
      }
      if (!DEAL_DOCUMENT_TYPE_VALUES.has(typeValue)) {
        return null;
      }
      return { type: typeValue, file };
    })
    .filter((entry): entry is { type: DealDocumentTypeValue; file: FileLike } => entry !== null);

  if (documents.length === 0) {
    return { success: true, uploaded: 0 };
  }

  try {
    const supabase = await createSupabaseServiceClient();
    const sessionClient = await createSupabaseServerClient();
    const { data: authData } = await sessionClient.auth.getUser();
    const uploadedBy = authData?.user?.id ?? null;

    const candidates: DocumentUploadCandidate<DealDocumentTypeValue>[] = documents.map((doc) => {
      const meta = DEAL_DOCUMENT_TYPE_META[doc.type];
      const originalName = resolveUploadedFileName(doc.file);
      const baseTitle = meta?.title ?? originalName;
      const finalTitle = originalName && baseTitle ? `${baseTitle} (${originalName})` : baseTitle ?? originalName;

      return {
        type: doc.type,
        file: doc.file,
        category: meta?.category ?? "required",
        title: finalTitle,
        metadata: {
          label: meta?.title ?? originalName,
        },
      };
    });

    const uploadResult = await uploadDocumentsBatch<DealDocumentTypeValue>(candidates, {
      supabase,
      bucket: STORAGE_BUCKET,
      table: "deal_documents",
      entityColumn: "deal_id",
      entityId: dealId,
      allowedTypes: DEAL_DOCUMENT_TYPE_VALUES,
      typeLabelMap: DEAL_DOCUMENT_TYPE_LABEL_MAP,
      categoryColumn: "document_category",
      uploadedBy,
      logPrefix: "[operations] deal document",
      messages: {
        upload: "Не удалось загрузить документ.",
        insert: "Документ не сохранился. Попробуйте ещё раз.",
      },
    });

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);
    if (slug !== dealId) {
      revalidatePath(`/ops/deals/${dealId}`);
    }

    return { success: true, uploaded: uploadResult.uploaded };
  } catch (error) {
    console.error("[operations] unexpected error while uploading deal documents", error);
    return { success: false, error: "Произошла ошибка при загрузке документов." };
  }
}

export async function uploadSellerDocuments(formData: FormData): Promise<UploadSellerDocumentsResult> {
  const base = {
    dealId: formData.get("dealId"),
    slug: formData.get("slug"),
  } satisfies Record<string, unknown>;

  const parsed = uploadSellerDocumentsSchema.safeParse(base);

  if (!parsed.success) {
    console.warn("[operations] invalid seller document upload payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные документа продавца." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { dealId, slug } = parsed.data;

  const documentsMap = new Map<
    number,
    {
      title?: string;
      file?: FileLike | null;
    }
  >();

  for (const [key, value] of formData.entries()) {
    const match = /^documents\[(\d+)\]\[(title|file)\]$/.exec(key);
    if (!match) continue;
    const index = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(index)) continue;
    const existing = documentsMap.get(index) ?? {};
    if (match[2] === "title" && typeof value === "string") {
      existing.title = value;
    }
    if (match[2] === "file" && isFileLike(value)) {
      existing.file = value;
    }
    documentsMap.set(index, existing);
  }

  const rawDocuments = Array.from(documentsMap.values());

  const hasIncomplete = rawDocuments.some((entry) => {
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    const hasFile = isFileLike(entry.file) && entry.file.size > 0;
    return (title && !hasFile) || (hasFile && !title);
  });

  if (hasIncomplete) {
    return { success: false, error: "Для каждого документа заполните название и выберите файл." };
  }

  const documents = rawDocuments
    .map((entry) => {
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      const file = isFileLike(entry.file) && entry.file.size > 0 ? entry.file : null;
      if (!title || !file) {
        return null;
      }
      return { title, file };
    })
    .filter((entry): entry is { title: string; file: FileLike } => entry !== null);

  if (documents.length === 0) {
    return { success: true, documents: [] };
  }

  try {
    const supabase = await createSupabaseServiceClient();

    const results: UploadedSellerDocument[] = [];

    for (const document of documents) {
      const originalName = resolveUploadedFileName(document.file);
      console.log("[operations] seller document upload requested", {
        dealId,
        title: document.title,
        fileName: originalName,
        size: document.file.size,
      });
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const path = `${dealId}/seller/${Date.now()}-${sanitizedName}`;
      const arrayBuffer = await document.file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from(SELLER_DOCUMENTS_BUCKET)
        .upload(path, buffer, {
          upsert: false,
          contentType: document.file.type || "application/octet-stream",
        });

      if (uploadError) {
        console.error("[operations] failed to upload seller document", uploadError);
        return { success: false, error: "Не удалось загрузить документ продавца." };
      }

      results.push({
        id: randomUUID(),
        title: document.title,
        bucket: SELLER_DOCUMENTS_BUCKET,
        storage_path: path,
        uploaded_at: new Date().toISOString(),
      });
      console.log("[operations] seller document uploaded", {
        dealId,
        title: document.title,
        path,
      });
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);

    console.log("[operations] seller document upload batch complete", {
      dealId,
      uploaded: results.length,
    });
    return { success: true, documents: results };
  } catch (error) {
    console.error("[operations] unexpected error while uploading seller document", error);
    return { success: false, error: "Произошла ошибка при загрузке документов продавца." };
  }
}

export async function deleteDealDocument(
  input: DeleteDealDocumentInput,
): Promise<DeleteDealDocumentResult> {
  const parsed = deleteDealDocumentSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid deal document delete payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для удаления документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { dealId, documentId, slug } = parsed.data;

  try {
    const supabase = await createSupabaseServiceClient();

    const { data: documentRecord, error: lookupError } = await supabase
      .from("deal_documents")
      .select("id, deal_id, storage_path")
      .eq("id", documentId)
      .maybeSingle();

    if (lookupError) {
      console.error("[operations] failed to load deal document before deletion", lookupError);
      return { success: false, error: "Не удалось найти документ сделки." };
    }

    if (!documentRecord || String(documentRecord.deal_id) !== dealId) {
      return { success: false, error: "Документ не найден или принадлежит другой сделке." };
    }

    const storagePath =
      typeof documentRecord.storage_path === "string" && documentRecord.storage_path.length > 0
        ? documentRecord.storage_path
        : null;

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

      if (storageError && !String(storageError.message ?? "").toLowerCase().includes("not found")) {
        console.error("[operations] failed to remove deal document file", storageError);
        return { success: false, error: "Не удалось удалить файл документа." };
      }
    }

    const { error: deleteError } = await supabase
      .from("deal_documents")
      .delete()
      .eq("id", documentId)
      .eq("deal_id", dealId);

    if (deleteError) {
      console.error("[operations] failed to delete deal document", deleteError);
      return { success: false, error: "Не удалось удалить запись документа." };
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);
    if (slug !== dealId) {
      revalidatePath(`/ops/deals/${dealId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while deleting deal document", error);
    return { success: false, error: "Произошла ошибка при удалении документа." };
  }
}

function resolveGuardMeta(statusKey: string, guardKey: string) {
  const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey as keyof typeof OPS_WORKFLOW_STATUS_MAP];
  if (!statusMeta) return null;
  return statusMeta.exitGuards.find((guard: { key: string }) => guard.key === guardKey) ?? null;
}

function ensureGuardPayload(base: Record<string, unknown> | null | undefined) {
  const clone = base ? structuredClone(base) : {};
  if (typeof clone !== "object" || Array.isArray(clone)) {
    return { guard_tasks: {} as Record<string, unknown> };
  }
  if (!clone.guard_tasks || typeof clone.guard_tasks !== "object") {
    clone.guard_tasks = {};
  }
  return clone as Record<string, unknown> & { guard_tasks: Record<string, unknown> };
}

const updateDealSchema = z.object({
  dealId: z.string().uuid(),
  slug: z.string().min(1),
  dealNumber: z.string().optional(),
  companyCode: z.enum(DEAL_COMPANY_CODES).optional(),
  principalAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  monthlyPayment: z.string().optional(),
  monthlyLeaseRate: z.string().optional(),
  interestRate: z.string().optional(),
  downPaymentAmount: z.string().optional(),
  securityDeposit: z.string().optional(),
  processingFee: z.string().optional(),
  termMonths: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  firstPaymentDate: z.string().optional(),
  completedAt: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insurancePolicyType: z.string().optional(),
  insurancePremiumAmount: z.string().optional(),
  insurancePaymentFrequency: z.string().optional(),
  insuranceNextPaymentDue: z.string().optional(),
  insuranceCoverageStart: z.string().optional(),
  insuranceCoverageEnd: z.string().optional(),
  insuranceDeductible: z.string().optional(),
  insuranceLastPaymentStatus: z.string().optional(),
  insuranceLastPaymentDate: z.string().optional(),
  insuranceNotes: z.string().optional(),
  sellerDocuments: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().optional(),
        url: z.string().optional(),
        status: z.string().optional(),
        uploadedAt: z.string().optional(),
        bucket: z.string().optional(),
        storagePath: z.string().optional(),
      }),
    )
    .optional(),
});

const verifyDealDeletionSchema = z.object({
  dealId: z.string().uuid(),
});

const deleteDealSchema = z.object({
  dealId: z.string().uuid(),
  slug: z.string().min(1),
});

function normalizeText(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed;
}

function normalizeOptionalText(value?: string | null): string | null {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

function parseDecimalInput(value?: string | null): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const cleaned = normalized.replace(/[^0-9,\.\-]/g, "").replace(/,/g, ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function parseIntegerInput(value?: string | null): number | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function normalizeDateInput(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return trimmed;
}

function normalizeDateTimeLocal(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

type SellerDocumentInput = {
  id?: string | null;
  title?: string | null;
  url?: string | null;
  status?: string | null;
  uploadedAt?: string | null;
  bucket?: string | null;
  storagePath?: string | null;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureIsoDate(value?: string | null): string {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

type NormalizedSellerDocument = {
  id?: string;
  title: string;
  url?: string;
  status?: string;
  uploaded_at: string;
  bucket?: string;
  storage_path?: string;
};

function sanitizeSellerDocuments(input?: SellerDocumentInput[]): NormalizedSellerDocument[] {
  if (!input || input.length === 0) {
    return [];
  }
  return input
    .map((doc) => {
      const title = normalizeText(doc.title);
      const url = normalizeText(doc.url);
      const hasFileReference = Boolean(
        (doc.bucket && doc.storagePath) || (doc.storagePath && !doc.bucket) || url,
      );
      if (!title || !hasFileReference) {
        return null;
      }
      const status = normalizeText(doc.status);
      const uploadedAt = doc.uploadedAt ? ensureIsoDate(doc.uploadedAt) : new Date().toISOString();
      const identifier = normalizeText(doc.id);
      const bucket = normalizeText(doc.bucket);
      const storagePath = normalizeText(doc.storagePath);
      return {
        ...(identifier ? { id: identifier } : {}),
        title,
        ...(url ? { url } : {}),
        ...(bucket && storagePath ? { bucket } : {}),
        ...(storagePath ? { storage_path: storagePath } : {}),
        ...(status ? { status } : {}),
        uploaded_at: uploadedAt,
      } satisfies NormalizedSellerDocument;
    })
    .filter((entry): entry is NormalizedSellerDocument => entry !== null);
}

function sanitizeInsuranceDetails(
  current: Record<string, unknown> | null | undefined,
  input: {
    provider: string | null;
    policyNumber: string | null;
    policyType: string | null;
    premiumAmount: number | null;
    paymentFrequency: string | null;
    nextPaymentDue: string | null;
    coverageStart: string | null;
    coverageEnd: string | null;
    deductible: number | null;
    lastPaymentStatus: string | null;
    lastPaymentDate: string | null;
    notes: string | null;
  },
): Record<string, unknown> {
  const base = isPlainRecord(current) ? structuredClone(current) : {};
  const assign = (key: string, value: string | number | null) => {
    if (value == null || value === "") {
      delete base[key];
      return;
    }
    base[key] = value;
  };

  assign("provider", input.provider);
  assign("policy_number", input.policyNumber);
  assign("policy_type", input.policyType);
  assign("premium_amount", input.premiumAmount);
  assign("payment_frequency", input.paymentFrequency ? input.paymentFrequency.toLowerCase() : null);
  assign("next_payment_due", input.nextPaymentDue);
  assign("coverage_start", input.coverageStart);
  assign("coverage_end", input.coverageEnd);
  assign("deductible", input.deductible);
  assign("last_payment_status", input.lastPaymentStatus ? input.lastPaymentStatus.toLowerCase() : null);
  assign("last_payment_date", input.lastPaymentDate);
  assign("notes", input.notes);

  return Object.keys(base).length > 0 ? base : {};
}

export async function completeDealGuardAction(
  prevState: { error?: string; success?: boolean },
  formData: FormData,
) {
  const parsed = inputSchema.safeParse({
    dealId: formData.get("dealId"),
    statusKey: formData.get("statusKey"),
    guardKey: formData.get("guardKey"),
    note: formData.get("note"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { error: "Введите корректные данные", success: false };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { error: READ_ONLY_ACCESS_MESSAGE, success: false };
  }

  const { dealId, statusKey, guardKey, note, slug } = parsed.data;

  const guardMeta = resolveGuardMeta(statusKey, guardKey);
  if (!guardMeta) {
    return { error: "Задача не найдена для текущего статуса", success: false };
  }

  const file = formData.get("attachment") as File | null;

  if (guardMeta.requiresDocument && (!file || file.size === 0)) {
    return { error: "Необходимо приложить документ", success: false };
  }

  try {
    const supabase = await createSupabaseServiceClient();
    const sessionClient = await createSupabaseServerClient();
    const { data: authData } = await sessionClient.auth.getUser();
    const uploadedBy = authData?.user?.id ?? null;

    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select("payload")
      .eq("id", dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[workflow] failed to load deal payload", dealError);
      return { error: "Не удалось загрузить сделку", success: false };
    }

    if (!dealRow) {
      return { error: "Сделка не найдена", success: false };
    }

    const payload = ensureGuardPayload(dealRow.payload as Record<string, unknown> | null | undefined);

    let attachmentPath: string | null = null;

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const path = `${dealId}/${guardKey}/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        console.error("[workflow] failed to upload attachment", uploadError);
        return { error: "Не удалось загрузить файл", success: false };
      }

      attachmentPath = path;

      const { error: insertDocError } = await supabase.from("deal_documents").insert({
        deal_id: dealId,
        title: guardMeta.label,
        document_type: guardKey,
        document_category: "other",
        status: "uploaded",
        storage_path: attachmentPath,
        mime_type: file.type || null,
        file_size: file.size ?? null,
        metadata: {
          upload_context: "guard_task",
          guard_key: guardKey,
          label: guardMeta.label,
        },
        uploaded_by: uploadedBy,
      });

      if (insertDocError) {
        console.error("[workflow] failed to insert deal document", insertDocError);
        return { error: "Файл загружен, но запись не создана", success: false };
      }
    }

    payload.guard_tasks[guardKey] = {
      fulfilled: true,
      note: note?.trim() || null,
      attachment_path: attachmentPath,
      completed_at: new Date().toISOString(),
      label: guardMeta.label,
    };

    const { error: updateError } = await supabase
      .from("deals")
      .update({ payload })
      .eq("id", dealId);

    if (updateError) {
      console.error("[workflow] failed to update guard payload", updateError);
      return { error: "Не удалось обновить задачу", success: false };
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);

    return { success: true, error: undefined };
  } catch (error) {
    console.error("[workflow] unexpected error while completing guard", error);
    return { error: "Произошла ошибка при выполнении задачи", success: false };
  }
}

export type UpdateOperationsDealInput = z.infer<typeof updateDealSchema>;

export type UpdateOperationsDealResult =
  | { success: true }
  | { success: false; error: string };

export type DealDeletionBlockerType = "payments" | "invoices";

export type VerifyDealDeletionResult =
  | { canDelete: true }
  | { canDelete: false; reason?: string; blockers?: Array<{ type: DealDeletionBlockerType; count: number }> };

export type VerifyDealDeletionInput = z.infer<typeof verifyDealDeletionSchema>;

export type DeleteOperationsDealInput = z.infer<typeof deleteDealSchema>;

export type DeleteOperationsDealResult =
  | { success: true }
  | { success: false; error: string };

export async function updateOperationsDeal(
  input: UpdateOperationsDealInput,
): Promise<UpdateOperationsDealResult> {
  const parsed = updateDealSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid deal update payload", parsed.error.flatten());
    return { success: false, error: "Проверьте введённые данные и попробуйте снова." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const {
    dealId,
    slug,
    dealNumber,
    principalAmount,
    totalAmount,
    monthlyPayment,
    monthlyLeaseRate,
    interestRate,
    downPaymentAmount,
    securityDeposit,
    processingFee,
    termMonths,
    contractStartDate,
    contractEndDate,
    firstPaymentDate,
    completedAt,
    insuranceProvider,
    insurancePolicyNumber,
    insurancePolicyType,
    insurancePremiumAmount,
    insurancePaymentFrequency,
    insuranceNextPaymentDue,
    insuranceCoverageStart,
    insuranceCoverageEnd,
    insuranceDeductible,
    insuranceLastPaymentStatus,
    insuranceLastPaymentDate,
    insuranceNotes,
    sellerDocuments,
    companyCode,
  } = parsed.data;

  const nextDealNumber = normalizeText(dealNumber);
  const normalizedCompanyCode = (companyCode ?? DEFAULT_DEAL_COMPANY_CODE).toUpperCase();

  const updateColumnsBase: Record<string, unknown> = {
    deal_number: nextDealNumber.length > 0 ? nextDealNumber : null,
    company_code: normalizedCompanyCode,
    principal_amount: parseDecimalInput(principalAmount),
    total_amount: parseDecimalInput(totalAmount),
    monthly_payment: parseDecimalInput(monthlyPayment),
    monthly_lease_rate: parseDecimalInput(monthlyLeaseRate),
    interest_rate: parseDecimalInput(interestRate),
    down_payment_amount: parseDecimalInput(downPaymentAmount),
    security_deposit: parseDecimalInput(securityDeposit),
    processing_fee: parseDecimalInput(processingFee),
    term_months: parseIntegerInput(termMonths),
    contract_start_date: normalizeDateInput(contractStartDate),
    contract_end_date: normalizeDateInput(contractEndDate),
    first_payment_date: normalizeDateInput(firstPaymentDate),
    completed_at: normalizeDateTimeLocal(completedAt),
  };

  try {
    const supabase = await createSupabaseServiceClient();

    const { data: dealRow, error: dealLoadError } = await supabase
      .from("deals")
      .select("payload, insurance_details")
      .eq("id", dealId)
      .maybeSingle();

    if (dealLoadError) {
      console.error("[operations] failed to load deal payload before update", { dealId, error: dealLoadError });
      return { success: false, error: "Не удалось загрузить данные сделки." };
    }

    if (!dealRow) {
      return { success: false, error: "Сделка не найдена." };
    }

    const nextPayload = isPlainRecord(dealRow.payload) ? structuredClone(dealRow.payload) : {};
    nextPayload.seller_documents = sanitizeSellerDocuments(sellerDocuments);

    const insuranceDetails = sanitizeInsuranceDetails(
      (dealRow as { insurance_details?: Record<string, unknown> | null }).insurance_details,
      {
        provider: normalizeOptionalText(insuranceProvider),
        policyNumber: normalizeOptionalText(insurancePolicyNumber),
        policyType: normalizeOptionalText(insurancePolicyType),
        premiumAmount: parseDecimalInput(insurancePremiumAmount),
        paymentFrequency: normalizeOptionalText(insurancePaymentFrequency),
        nextPaymentDue: normalizeDateInput(insuranceNextPaymentDue),
        coverageStart: normalizeDateInput(insuranceCoverageStart),
        coverageEnd: normalizeDateInput(insuranceCoverageEnd),
        deductible: parseDecimalInput(insuranceDeductible),
        lastPaymentStatus: normalizeOptionalText(insuranceLastPaymentStatus),
        lastPaymentDate: normalizeDateInput(insuranceLastPaymentDate),
        notes: normalizeOptionalText(insuranceNotes),
      },
    );

    const updatePayload = {
      ...updateColumnsBase,
      payload: nextPayload,
      insurance_details: insuranceDetails,
    } satisfies Record<string, unknown>;

    const { error } = await supabase
      .from("deals")
      .update(updatePayload)
      .eq("id", dealId);

    if (error) {
      console.error("[operations] failed to update deal", { dealId, error });
      return { success: false, error: "Не удалось сохранить сделку." };
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while updating deal", error);
    return { success: false, error: "Произошла ошибка при сохранении сделки." };
  }
}

export async function verifyDealDeletion(
  input: VerifyDealDeletionInput,
): Promise<VerifyDealDeletionResult> {
  const parsed = verifyDealDeletionSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid deal deletion check payload", parsed.error.flatten());
    return { canDelete: false, reason: "Некорректные данные для проверки удаления." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { canDelete: false, reason: READ_ONLY_ACCESS_MESSAGE };
  }

  const { dealId } = parsed.data;

  try {
    const supabase = await createSupabaseServiceClient();

    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select("status")
      .eq("id", dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[operations] failed to load deal before deletion check", dealError);
      return { canDelete: false, reason: "Не удалось проверить сделку. Попробуйте позже." };
    }

    if (!dealRow) {
      return { canDelete: false, reason: "Сделка не найдена." };
    }

    const blockers: Array<{ type: DealDeletionBlockerType; count: number }> = [];

    const { count: paymentsCount, error: paymentsError } = await supabase
      .from("payments")
      .select("id", { head: true, count: "exact" })
      .eq("deal_id", dealId);

    if (paymentsError) {
      console.error("[operations] failed to check deal payments", paymentsError);
      return { canDelete: false, reason: "Не удалось проверить платежи сделки." };
    }

    if ((paymentsCount ?? 0) > 0) {
      blockers.push({ type: "payments", count: paymentsCount ?? 0 });
    }

    const { count: invoicesCount, error: invoicesError } = await supabase
      .from("invoices")
      .select("id", { head: true, count: "exact" })
      .eq("deal_id", dealId);

    if (invoicesError) {
      console.error("[operations] failed to check deal invoices", invoicesError);
      return { canDelete: false, reason: "Не удалось проверить счета сделки." };
    }

    if ((invoicesCount ?? 0) > 0) {
      blockers.push({ type: "invoices", count: invoicesCount ?? 0 });
    }

    if (blockers.length > 0) {
      const blockerLabels: Record<DealDeletionBlockerType, string> = {
        payments: "платежи",
        invoices: "счета",
      };
      const parts = blockers
        .map((blocker) => `${blockerLabels[blocker.type]} — ${blocker.count}`)
        .join(", ");
      return {
        canDelete: false,
        reason: `Удаление невозможно: найдены связанные данные (${parts}).`,
        blockers,
      };
    }

    return { canDelete: true };
  } catch (error) {
    console.error("[operations] unexpected error while checking deal deletion", error);
    return {
      canDelete: false,
      reason: "Произошла ошибка при проверке возможности удаления сделки.",
    };
  }
}

export async function deleteOperationsDeal(
  input: DeleteOperationsDealInput,
): Promise<DeleteOperationsDealResult> {
  const parsed = deleteDealSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid deal delete payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для удаления сделки." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { dealId, slug } = parsed.data;

  const verification = await verifyDealDeletion({ dealId });

  if (!verification.canDelete) {
    return {
      success: false,
      error: verification.reason ?? "Сделку нельзя удалить.",
    };
  }

  try {
    const supabase = await createSupabaseServiceClient();

    const { data: documentsData, error: documentsError } = await supabase
      .from("deal_documents")
      .select("storage_path")
      .eq("deal_id", dealId);

    if (documentsError) {
      console.warn("[operations] failed to load deal documents before deletion", documentsError);
    }

    const documentStoragePaths = (documentsData ?? [])
      .map((doc) => (typeof doc?.storage_path === "string" ? doc.storage_path : null))
      .filter((path): path is string => Boolean(path));

    const paymentsResponse = await supabase
      .from("payments")
      .select("id")
      .eq("deal_id", dealId);

    if (paymentsResponse.error) {
      console.error("[operations] failed to load deal payments before deletion", paymentsResponse.error);
      return { success: false, error: "Не удалось подготовить удаление сделки." };
    }

    const paymentIds = (paymentsResponse.data ?? [])
      .map((row) => (typeof row.id === "string" ? row.id : null))
      .filter((id): id is string => Boolean(id));

    if (paymentIds.length > 0) {
      const { error: transactionsDeleteError } = await supabase
        .from("payment_transactions")
        .delete()
        .in("payment_id", paymentIds);

      if (transactionsDeleteError) {
        console.error("[operations] failed to delete payment transactions", transactionsDeleteError);
        return { success: false, error: "Не удалось удалить связанные транзакции платежей." };
      }
    }

    const cascadedTables: Array<{ table: string; column: string }> = [
      { table: "payments", column: "deal_id" },
      { table: "payment_schedules", column: "deal_id" },
      { table: "invoices", column: "deal_id" },
      { table: "deal_documents", column: "deal_id" },
      { table: "deal_events", column: "deal_id" },
      { table: "workflow_task_queue", column: "deal_id" },
      { table: "workflow_schedule_queue", column: "deal_id" },
      { table: "workflow_notification_queue", column: "deal_id" },
      { table: "workflow_webhook_queue", column: "deal_id" },
      { table: "tasks", column: "deal_id" },
      { table: "vehicle_services", column: "deal_id" },
      { table: "portfolio_assets", column: "deal_id" },
      { table: "referral_rewards", column: "deal_id" },
      { table: "referral_deals", column: "deal_id" },
    ];

    for (const entry of cascadedTables) {
      const { error: cascadeError } = await supabase
        .from(entry.table)
        .delete()
        .eq(entry.column, dealId);

      if (cascadeError) {
        console.error(`[operations] failed to delete related ${entry.table}`, cascadeError);
        return { success: false, error: "Не удалось удалить связанные данные сделки." };
      }
    }

    const ticketsResponse = await supabase
      .from("support_tickets")
      .select("id")
      .eq("deal_id", dealId);

    if (ticketsResponse.error) {
      console.error("[operations] failed to load support tickets before deal deletion", ticketsResponse.error);
      return { success: false, error: "Не удалось удалить связанные обращения поддержки." };
    }

    const ticketIds = (ticketsResponse.data ?? [])
      .map((row) => (typeof row.id === "string" ? row.id : null))
      .filter((id): id is string => Boolean(id));

    if (ticketIds.length > 0) {
      const { error: messagesDeleteError } = await supabase
        .from("support_messages")
        .delete()
        .in("ticket_id", ticketIds);

      if (messagesDeleteError) {
        console.error("[operations] failed to delete support messages", messagesDeleteError);
        return { success: false, error: "Не удалось удалить переписку по обращениям поддержки." };
      }

      const { error: ticketsDeleteError } = await supabase
        .from("support_tickets")
        .delete()
        .in("id", ticketIds);

      if (ticketsDeleteError) {
        console.error("[operations] failed to delete support tickets", ticketsDeleteError);
        return { success: false, error: "Не удалось удалить обращения поддержки." };
      }
    }

    if (documentStoragePaths.length > 0) {
      const { error: storageDeleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(documentStoragePaths);

      if (storageDeleteError) {
        console.warn("[operations] failed to remove deal document files", storageDeleteError);
      }
    }

    const { error: dealDeleteError } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId);

    if (dealDeleteError) {
      console.error("[operations] failed to delete deal", dealDeleteError);
      return { success: false, error: "Не удалось удалить сделку." };
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);
    if (slug !== dealId) {
      revalidatePath(`/ops/deals/${dealId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while deleting deal", error);
    return { success: false, error: "Произошла ошибка при удалении сделки." };
  }
}
