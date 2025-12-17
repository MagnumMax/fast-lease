"use server";

import { Buffer } from "node:buffer";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getWorkspacePaths } from "@/lib/workspace/routes";
import { handleTaskCompletion } from "@/lib/workflow/task-completion";
import { getMutationSessionUser } from "@/lib/auth/guards";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";
import { isFileLike, type FileLike, getFileName, sanitizeFileName } from "@/lib/documents/upload";
import {
  CLIENT_DOCUMENT_TYPE_LABEL_MAP,
  type ClientDocumentTypeValue,
  normalizeClientDocumentType,
  DEAL_DOCUMENT_TYPES,
} from "@/lib/supabase/queries/operations";
import {
  evaluateClientDocumentChecklist,
  extractChecklistFromTaskPayload,
  isOptionalGuardDocument,
  type ClientDocumentChecklist,
  type ClientDocumentSummary,
} from "@/lib/workflow/documents-checklist";
import { ProfileSyncService } from "@/lib/workflow/profile-sync";

export type FormStatus = { status: "idle" | "success" | "error"; message?: string; redirectTo?: string };
type DeleteGuardDocumentInput = z.infer<typeof DELETE_GUARD_DOCUMENT_SCHEMA>;
export type DeleteGuardDocumentResult = { success: true } | { success: false; error: string };

const COMPLETE_FORM_SCHEMA = z.object({
  taskId: z.string().uuid(),
  dealId: z.string().uuid().optional(),
  guardKey: z.string().optional(),
  guardLabel: z.string().optional(),
  requiresDocument: z.enum(["true", "false"]).default("false"),
  initialNote: z.string().optional(),
  intent: z.enum(["save", "complete"]).optional(),
});

const DELETE_GUARD_DOCUMENT_SCHEMA = z.object({
  documentId: z.string().uuid(),
  taskId: z.string().uuid(),
  dealId: z.string().uuid(),
  dealSlug: z.string().min(1).optional(),
});

const REOPEN_TASK_SCHEMA = z.object({
  taskId: z.string().uuid(),
  reason: z.string().trim().min(1, "Укажите причину"),
  comment: z.string().trim().min(1, "Добавьте комментарий"),
});

const DEAL_DOCUMENT_BUCKET = "deal-documents";
const VEHICLE_VERIFICATION_GUARD_KEY = "vehicle.verified";
const TECHNICAL_REPORT_TYPE: ClientDocumentTypeValue = "technical_report";
const BUYER_DOCS_GUARD_KEY = "docs.required.allUploaded";
const SELLER_DOCS_GUARD_KEY = "docs.seller.allUploaded";
const DEAL_DOCUMENT_CATEGORY_MAP: Record<string, string> = DEAL_DOCUMENT_TYPES.reduce((acc, entry) => {
  acc[entry.value] = entry.category;
  return acc;
}, {} as Record<string, string>);
const STORAGE_OBJECT_MAX_BYTES = 50 * 1024 * 1024; // Supabase storage single-object limit
const PDF_COMPRESSION_SETTINGS = [
  "-sDEVICE=pdfwrite",
  "-dCompatibilityLevel=1.4",
  "-dPDFSETTINGS=/ebook",
  "-dNOPAUSE",
  "-dQUIET",
  "-dBATCH",
];

function resolveDealDocumentCategory(value: string | null): string {
  if (!value) return "other";
  return DEAL_DOCUMENT_CATEGORY_MAP[value] ?? "other";
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let current = value;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  return `${Math.round(current * 10) / 10} ${units[index]}`;
}

function parseFieldEntries(formData: FormData): Record<string, unknown> {
  const entries = Array.from(formData.entries()).filter(([key]) => key.startsWith("field:"));
  const result: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    const fieldId = key.slice("field:".length);
    if (!fieldId) continue;
    if (typeof value === "string") {
      result[fieldId] = value.trim();
    } else if (isFileLike(value)) {
      // Поля форм с type="file" идут отдельно — их не обрабатываем как field
      continue;
    } else {
      result[fieldId] = value;
    }
  }

  return result;
}

type ParsedDocumentUpload = {
  id: string;
  type: ClientDocumentTypeValue;
  file?: FileLike;
  existingPath?: string;
  fileSize?: number;
  mimeType?: string;
};

const DOCUMENT_FIELD_REGEX = /^documents\[(.+?)\]\[(type|file|path|size|mime)\]$/;
const DOC_FIELD_UPLOAD_REGEX = /^documentFields\[(.+?)\]\[(type|file|path|size|mime)\]$/;

function extractDocumentUploads(formData: FormData): ParsedDocumentUpload[] {
  const entries = new Map<string, { type?: string; file?: FileLike; path?: string; size?: number; mime?: string }>();

  for (const [key, value] of formData.entries()) {
    const match = DOCUMENT_FIELD_REGEX.exec(key);
    if (!match) {
      continue;
    }
    const [, id, field] = match;
    const current = entries.get(id) ?? {};
    if (field === "type" && typeof value === "string") {
      current.type = value.trim();
    } else if (field === "file" && isFileLike(value) && value.size > 0) {
      current.file = value;
    } else if (field === "path" && typeof value === "string" && value.trim().length > 0) {
      current.path = value.trim();
    } else if (field === "size" && typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        current.size = parsed;
      }
    } else if (field === "mime" && typeof value === "string") {
      current.mime = value.trim();
    }
    entries.set(id, current);
  }

  const uploads: ParsedDocumentUpload[] = [];
  for (const [id, entry] of entries.entries()) {
    if (!entry.type) {
      continue;
    }
    // We need either a file or an existing path
    if (!entry.file && !entry.path) {
      continue;
    }

    const normalized = normalizeClientDocumentType(entry.type);
    if (!normalized) {
      continue;
    }
    uploads.push({
      id,
      type: normalized,
      file: entry.file,
      existingPath: entry.path,
      fileSize: entry.size,
      mimeType: entry.mime,
    });
  }

  return uploads;
}

type FieldDocumentUpload = {
  fieldId: string;
  type: ClientDocumentTypeValue;
  file?: FileLike;
  existingPath?: string;
  fileSize?: number;
  mimeType?: string;
};

function extractFieldDocumentUploads(
  formData: FormData,
  docFieldTypeMap: Record<string, ClientDocumentTypeValue>,
): FieldDocumentUpload[] {
  const entries = new Map<string, { type?: string; file?: FileLike; path?: string; size?: number; mime?: string }>();

  for (const [key, value] of formData.entries()) {
    const match = DOC_FIELD_UPLOAD_REGEX.exec(key);
    if (!match) continue;
    const [, fieldId, field] = match;
    const current = entries.get(fieldId) ?? {};
    if (field === "type" && typeof value === "string") {
      current.type = value.trim();
    } else if (field === "file" && isFileLike(value) && value.size > 0) {
      current.file = value;
    } else if (field === "path" && typeof value === "string" && value.trim().length > 0) {
      current.path = value.trim();
    } else if (field === "size" && typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        current.size = parsed;
      }
    } else if (field === "mime" && typeof value === "string") {
      current.mime = value.trim();
    }
    entries.set(fieldId, current);
  }

  const uploads: FieldDocumentUpload[] = [];
  for (const [fieldId, entry] of entries.entries()) {
    // We need either a file or an existing path
    if (!entry.file && !entry.path) continue;

    const docTypeFromSchema = docFieldTypeMap[fieldId];
    const normalizedType =
      docTypeFromSchema ??
      (entry.type
        ? normalizeClientDocumentType(entry.type) ??
        (entry.type as ClientDocumentTypeValue)
        : null);
    if (!normalizedType) continue;
    uploads.push({
      fieldId,
      type: normalizedType,
      file: entry.file,
      existingPath: entry.path,
      fileSize: entry.size,
      mimeType: entry.mime,
    });
  }
  return uploads;
}

function buildDocumentTypeMapFromSchema(
  payload: Record<string, unknown> | null,
): Record<string, ClientDocumentTypeValue> {
  const map: Record<string, ClientDocumentTypeValue> = {};
  if (!payload) return map;
  const schemaBranch =
    payload.schema && typeof payload.schema === "object" && !Array.isArray(payload.schema)
      ? (payload.schema as Record<string, unknown>)
      : null;
  const fields =
    schemaBranch &&
      Array.isArray((schemaBranch as { fields?: unknown }).fields)
      ? ((schemaBranch as { fields: unknown[] }).fields as Array<Record<string, unknown>>)
      : [];

  for (const field of fields) {
    const rawId = field.id;
    if (typeof rawId !== "string" || rawId.length === 0) continue;
    const rawDocType =
      typeof field.document_type === "string"
        ? field.document_type
        : typeof (field as { documentType?: unknown }).documentType === "string"
          ? (field as { documentType?: string }).documentType
          : null;
    const normalized =
      normalizeClientDocumentType(rawDocType ?? undefined) ??
      (typeof rawDocType === "string" && rawDocType.length > 0
        ? (rawDocType as ClientDocumentTypeValue)
        : null) ??
      normalizeClientDocumentType(rawId) ??
      (rawId as ClientDocumentTypeValue);
    if (normalized) {
      map[rawId] = normalized;
    }
  }

  return map;
}

async function compressPdfWithGhostscript(
  buffer: Buffer<ArrayBufferLike>,
): Promise<{ buffer: Buffer<ArrayBufferLike>; format: string; reduced: boolean }> {
  const tmpBase = join(tmpdir(), `pdf-compress-${randomUUID()}`);
  const inputPath = `${tmpBase}-in.pdf`;
  const outputPath = `${tmpBase}-out.pdf`;

  try {
    await fs.writeFile(inputPath, buffer);

    const args = [...PDF_COMPRESSION_SETTINGS, `-sOutputFile=${outputPath}`, inputPath];
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("gs", args, { stdio: "ignore" });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Ghostscript exited with code ${code}`));
        }
      });
    });

    const output = await fs.readFile(outputPath);
    const reduced = output.length < buffer.length * 0.98;
    return { buffer: reduced ? output : buffer, format: "pdf-gs", reduced };
  } catch (error) {
    console.warn("[workflow] PDF compression skipped", error);
    return { buffer, format: "none", reduced: false };
  } finally {
    await Promise.allSettled([
      fs.rm(inputPath, { force: true }),
      fs.rm(outputPath, { force: true }),
    ]);
  }
}

async function uploadAttachment(options: {
  supabase: Awaited<ReturnType<typeof createSupabaseServiceClient>>;
  dealId: string;
  guardKey: string;
  guardLabel?: string;
  file?: FileLike;
  documentType: ClientDocumentTypeValue;
  uploadedBy: string | null;
  isAdditional?: boolean;
  existingPath?: string;
  fileSize?: number;
  mimeType?: string;
}): Promise<{ path: string } | { error: string }> {
  const {
    supabase,
    dealId,
    guardKey,
    guardLabel,
    file,
    documentType,
    uploadedBy,
    isAdditional = false,
    existingPath,
    fileSize,
    mimeType,
  } = options;

  let path: string;
  let uploadMime = mimeType || "application/octet-stream";
  let uploadSize = fileSize || 0;
  const metadata: Record<string, unknown> = {
    upload_context: "workflow_task",
    guard_key: guardKey,
    guard_label: guardLabel,
    guard_document_type: documentType,
    guard_deal_id: dealId,
    compression: {
      applied: false,
      from_bytes: uploadSize,
      to_bytes: uploadSize,
      format: null,
    },
  };
  const documentCategory = resolveDealDocumentCategory(documentType);
  const typeLabel = CLIENT_DOCUMENT_TYPE_LABEL_MAP[documentType] ?? null;

  if (existingPath) {
    path = existingPath;
    // When using existing path (client upload), we skip server-side compression
    // and storage upload, but we still create the DB record.
  } else {
    if (!file) {
      return { error: "Файл не предоставлен" };
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer: Buffer<ArrayBufferLike> = Buffer.from(arrayBuffer);
    let uploadBuffer: Buffer<ArrayBufferLike> = originalBuffer;
    uploadMime = file.type || "application/octet-stream";
    const originalSize = originalBuffer.length;
    let compressedSize = originalSize;
    let compressionFormat: string | null = null;
    const baseName = getFileName(file) || guardKey || "attachment";
    const sanitizedName = sanitizeFileName(baseName);
    path = `${dealId}/${guardKey}/${Date.now()}-${sanitizedName}`;

    metadata.compression = {
      applied: false,
      from_bytes: originalSize,
      to_bytes: originalSize,
      format: null,
    };

    if (file.type && file.type.startsWith("image/")) {
      try {
        const sharpModule = await import("sharp").catch(() => null);
        const sharp = sharpModule?.default;
        if (sharp) {
          const pipeline = sharp(originalBuffer).rotate();
          const compressedBuffer = await pipeline.webp({ quality: 75 }).toBuffer();
          if (compressedBuffer.length < originalBuffer.length * 0.95) {
            uploadBuffer = compressedBuffer;
            uploadMime = "image/webp";
            compressedSize = compressedBuffer.length;
            compressionFormat = "webp";
            metadata.compression = {
              applied: true,
              from_bytes: originalSize,
              to_bytes: compressedSize,
              format: compressionFormat,
            };
          }
        }
      } catch (compressionError) {
        console.warn("[workflow] image compression skipped", compressionError);
      }
    }

    if (file.type === "application/pdf" || (file.name && file.name.toLowerCase().endsWith(".pdf"))) {
      const pdfCompressed = await compressPdfWithGhostscript(uploadBuffer);
      if (pdfCompressed.reduced) {
        uploadBuffer = pdfCompressed.buffer;
        uploadMime = "application/pdf";
        compressedSize = uploadBuffer.length;
        compressionFormat = pdfCompressed.format;
        metadata.compression = {
          applied: true,
          from_bytes: originalSize,
          to_bytes: compressedSize,
          format: compressionFormat,
        };
      }
    }

    // Fail fast if size exceeds storage limit even after compression attempt.
    if (uploadBuffer.length > STORAGE_OBJECT_MAX_BYTES) {
      return { error: `Файл больше лимита хранилища (${formatBytes(STORAGE_OBJECT_MAX_BYTES)}). Сожмите и попробуйте снова.` };
    }
    
    uploadSize = uploadBuffer.length;

    const { error: uploadError } = await supabase.storage.from(DEAL_DOCUMENT_BUCKET).upload(path, uploadBuffer, {
      contentType: uploadMime,
      upsert: true,
    });

    if (uploadError) {
      console.error("[workflow] failed to upload task attachment", uploadError);
      if ((uploadError as { statusCode?: string | number }).statusCode === "413" || (uploadError as { status?: number }).status === 413) {
        return { error: `Файл больше лимита хранилища (${formatBytes(STORAGE_OBJECT_MAX_BYTES)}). Сожмите и попробуйте снова.` };
      }
      return { error: "Не удалось загрузить вложение" };
    }
    
    console.log("[workflow] attachment uploaded successfully", { path, bucket: DEAL_DOCUMENT_BUCKET, size: uploadSize });
  }

  if (isAdditional) {
    metadata.guard_optional = true;
  }

  const { error: insertError } = await supabase.from("deal_documents").insert({
    deal_id: dealId,
    title: typeLabel ?? guardLabel ?? guardKey,
    document_type: documentType,
    document_category: documentCategory,
    status: "uploaded",
    storage_path: path,
    mime_type: uploadMime || null,
    file_size: uploadSize,
    metadata,
    uploaded_by: uploadedBy,
  });

  if (insertError) {
    console.error("[workflow] failed to insert deal document for task attachment", insertError);
    return { error: "Вложение загружено, но запись о документе не создана" };
  }

  return { path };
}

function buildTaskPayloadPatch(options: {
  existingPayload: Record<string, unknown> | null;
  fields: Record<string, unknown>;
  noteChanged: boolean;
  noteValue: string | null;
  attachmentPath: string | null;
  documentType: string | null;
}): Record<string, unknown> {
  const { existingPayload, fields, noteChanged, noteValue, attachmentPath, documentType } = options;

  const mergedPayload = existingPayload
    ? (structuredClone(existingPayload) as Record<string, unknown>)
    : {};

  if (Object.keys(fields).length > 0) {
    const currentFields =
      mergedPayload.fields && typeof mergedPayload.fields === "object"
        ? (mergedPayload.fields as Record<string, unknown>)
        : {};
    mergedPayload.fields = { ...currentFields, ...fields };
  }

  if (noteChanged) {
    mergedPayload.guard_note = noteValue;
  }

  if (attachmentPath) {
    mergedPayload.guard_attachment_path = attachmentPath;
  }

  if (documentType) {
    mergedPayload.guard_document_type = documentType;
  }

  return mergedPayload;
}

function buildPathsToRevalidate(taskId: string, dealId?: string | null, dealSlug?: string | null): string[] {
  const paths = new Set<string>([
    "/ops/tasks",
    `/ops/tasks/${taskId}`,
    ...getWorkspacePaths("tasks"),
  ]);

  if (dealId) {
    paths.add("/ops/deals");
    paths.add(`/ops/deals/${dealId}`);
    for (const dealPath of getWorkspacePaths("deals")) {
      paths.add(dealPath);
    }
  }

  if (dealSlug) {
    paths.add(`/ops/deals/${dealSlug}`);
  }

  return Array.from(paths);
}

type PreparedPayloadBranches = {
  payload: Record<string, unknown>;
  docsRequired: Record<string, unknown>;
  guardTasks: Record<string, unknown>;
};

function prepareDealPayloadBranches(source: unknown): PreparedPayloadBranches {
  const base =
    source && typeof source === "object" && !Array.isArray(source)
      ? (structuredClone(source) as Record<string, unknown>)
      : {};

  const docsBranch =
    base.docs && typeof base.docs === "object" && !Array.isArray(base.docs)
      ? ({ ...(base.docs as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const requiredBranch =
    docsBranch.required && typeof docsBranch.required === "object" && !Array.isArray(docsBranch.required)
      ? ({ ...(docsBranch.required as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  docsBranch.required = requiredBranch;
  base.docs = docsBranch;

  const guardTasksBranch =
    base.guard_tasks && typeof base.guard_tasks === "object" && !Array.isArray(base.guard_tasks)
      ? ({ ...(base.guard_tasks as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  base.guard_tasks = guardTasksBranch;

  return {
    payload: base,
    docsRequired: requiredBranch,
    guardTasks: guardTasksBranch,
  };
}

function resolveChecklistAttachmentPath(checklist: ClientDocumentChecklist | null): string | null {
  if (!checklist) return null;
  for (const item of checklist.items) {
    const match = item.matches.find(
      (entry) => typeof entry.storage_path === "string" && entry.storage_path.length > 0,
    );
    if (match?.storage_path) {
      return match.storage_path;
    }
  }
  return null;
}

async function evaluateAndSyncDocsGuard(options: {
  supabase: Awaited<ReturnType<typeof createSupabaseServiceClient>>;
  dealId: string;
  guardKey: string;
  dealPayload: Record<string, unknown> | null;
  requiredChecklist: string[];
}): Promise<ClientDocumentChecklist | null> {
  const { supabase, dealId, guardKey, dealPayload, requiredChecklist } = options;

  const { data: docsData, error: docsError } = await supabase
    .from("deal_documents")
    .select("id, document_type, title, status, storage_path, metadata")
    .eq("deal_id", dealId);

  if (docsError) {
    console.error("[workflow] failed to load deal documents for guard sync", docsError);
    return null;
  }

  const documentsRaw = Array.isArray(docsData)
    ? (docsData as Array<ClientDocumentSummary & { metadata?: unknown }>)
    : [];
  const documents = documentsRaw.filter((doc) => {
    const metadata =
      doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
        ? (doc.metadata as Record<string, unknown>)
        : null;
    if (isOptionalGuardDocument(metadata)) return false;
    const metadataGuardKey =
      metadata && typeof metadata.guard_key === "string" ? (metadata.guard_key as string) : null;
    const metadataDealId =
      metadata && typeof metadata.guard_deal_id === "string" ? (metadata.guard_deal_id as string) : null;

    if (metadataGuardKey && metadataGuardKey !== guardKey) return false;
    if (metadataDealId && metadataDealId !== dealId) return false;
    return true;
  });
  const checklist = evaluateClientDocumentChecklist(requiredChecklist, documents);
  if (checklist.items.length === 0) {
    return checklist;
  }

  await syncDocsGuardPayload({
    supabase,
    dealId,
    guardKey,
    dealPayload,
    checklist,
  });

  return checklist;
}

async function syncDocsGuardPayload(options: {
  supabase: Awaited<ReturnType<typeof createSupabaseServiceClient>>;
  dealId: string;
  guardKey: string;
  dealPayload: Record<string, unknown> | null;
  checklist: ClientDocumentChecklist;
}) {
  const { supabase, dealId, guardKey, dealPayload, checklist } = options;
  const { payload, docsRequired, guardTasks } = prepareDealPayloadBranches(dealPayload);

  const previousFlag = docsRequired.allUploaded === true;
  docsRequired.allUploaded = checklist.fulfilled;

  const guardEntryRaw = guardTasks[guardKey];
  const guardEntry =
    guardEntryRaw && typeof guardEntryRaw === "object" && !Array.isArray(guardEntryRaw)
      ? (guardEntryRaw as Record<string, unknown>)
      : {};
  const requiredTypesSnapshot = guardEntry.required_types as unknown;
  const nextRequiredTypes = checklist.items.map((item) => item.normalizedType ?? item.key);
  const firstMatch = checklist.items.find((item) => item.matches.length > 0);
  const firstMatchPath = firstMatch?.matches?.[0]?.storage_path;
  const firstMatchType = firstMatch?.normalizedType ?? firstMatch?.key ?? null;

  const nextGuardEntry: Record<string, unknown> = {
    ...guardEntry,
    fulfilled: checklist.fulfilled,
    auto_synced_at: new Date().toISOString(),
    required_types: nextRequiredTypes,
  };

  if (firstMatchPath) {
    nextGuardEntry.attachment_path = firstMatchPath;
  }

  if (firstMatchType) {
    nextGuardEntry.document_type = firstMatchType;
  }

  const previousFulfilled = guardEntry.fulfilled === true;
  guardTasks[guardKey] = nextGuardEntry;

  const previousTypesJson = JSON.stringify(requiredTypesSnapshot ?? null);
  const nextTypesJson = JSON.stringify(nextRequiredTypes);
  const payloadChanged = previousFlag !== checklist.fulfilled || previousFulfilled !== checklist.fulfilled || previousTypesJson !== nextTypesJson;

  if (payloadChanged) {
    const { error } = await supabase.from("deals").update({ payload }).eq("id", dealId);
    if (error) {
      console.error("[workflow] failed to sync docs guard payload", error);
    }
  }
}

export async function deleteTaskGuardDocumentAction(
  input: DeleteGuardDocumentInput,
): Promise<DeleteGuardDocumentResult> {
  const parsed = DELETE_GUARD_DOCUMENT_SCHEMA.safeParse(input);

  if (!parsed.success) {
    console.warn("[workflow] invalid guard document delete payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для удаления документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { documentId, taskId, dealId, dealSlug } = parsed.data;

  try {
    const supabase = await createSupabaseServiceClient();

    const { data: documentRecord, error: lookupError } = await supabase
      .from("deal_documents")
      .select("id, deal_id, storage_path")
      .eq("id", documentId)
      .maybeSingle();

    if (lookupError) {
      console.error("[workflow] failed to load guard document before deletion", lookupError);
      return { success: false, error: "Не удалось найти документ." };
    }

    if (!documentRecord || String(documentRecord.deal_id) !== dealId) {
      return { success: false, error: "Документ не найден или принадлежит другой сделке." };
    }

    const storagePath =
      typeof documentRecord.storage_path === "string" && documentRecord.storage_path.length > 0
        ? documentRecord.storage_path
        : null;

    if (storagePath) {
      const { error: storageError } = await supabase.storage.from(DEAL_DOCUMENT_BUCKET).remove([storagePath]);
      if (storageError && !String(storageError.message ?? "").toLowerCase().includes("not found")) {
        console.error("[workflow] failed to remove guard document file", storageError);
        return { success: false, error: "Не удалось удалить файл документа." };
      }

      // Also clean up any profile_documents referencing this path
      // This prevents orphans when a document is synced to profile but then deleted from task
      const { error: profileDocError } = await supabase
        .from("profile_documents")
        .delete()
        .eq("storage_path", storagePath);
        
      if (profileDocError) {
        console.warn("[workflow] failed to cleanup profile_documents for deleted path", profileDocError);
        // Non-critical error, proceed
      }
    }

    const { error: deleteError } = await supabase
      .from("deal_documents")
      .delete()
      .eq("id", documentId)
      .eq("deal_id", dealId);

    if (deleteError) {
      console.error("[workflow] failed to delete guard document entry", deleteError);
      return { success: false, error: "Не удалось удалить запись документа." };
    }

    for (const path of buildPathsToRevalidate(taskId, dealId, dealSlug)) {
      revalidatePath(path);
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath("/ops/deals");

    return { success: true };
  } catch (error) {
    console.error("[workflow] unexpected error while deleting guard document", error);
    return { success: false, error: "Произошла ошибка при удалении документа." };
  }
}

export async function getUploadUrlAction(input: {
  dealId: string;
  guardKey: string;
  fileName: string;
}): Promise<{ success: true; url: string; path: string; token: string } | { success: false; error: string }> {
  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { dealId, guardKey, fileName } = input;
  const sanitizedName = sanitizeFileName(fileName);
  const path = `${dealId}/${guardKey}/${Date.now()}-${sanitizedName}`;

  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(DEAL_DOCUMENT_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[workflow] failed to create signed upload url", error);
    return { success: false, error: "Не удалось получить ссылку для загрузки" };
  }

  return { success: true, url: data.signedUrl, path: data.path, token: data.token };
}

async function getTaskDefinition(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceClient>>,
  workflowVersionId: string,
  taskType: string
) {
  const { data } = await supabase
    .from("workflow_versions")
    .select("template")
    .eq("id", workflowVersionId)
    .single();

  if (!data?.template) return null;

  const template = data.template as any;
  // Handle both normalized (stages) and raw (statuses) template structures
  const statuses = template.stages || template.statuses;
  
  if (statuses) {
    for (const statusKey in statuses) {
      const status = statuses[statusKey];
      // Handle both normalized (entryActions) and raw (entry_actions) property names
      const actions = status.entryActions || status.entry_actions;
      
      if (actions) {
        for (const action of actions) {
          if (action.type === "TASK_CREATE" && action.task?.type === taskType) {
            return action.task;
          }
        }
      }
    }
  }
  return null;
}



export async function completeTaskFormAction(
  _prevState: FormStatus,
  formData: FormData,
): Promise<FormStatus> {
  const parsed = COMPLETE_FORM_SCHEMA.safeParse({
    taskId: formData.get("taskId"),
    dealId: formData.get("dealId") || undefined,
    guardKey: formData.get("guardKey") || undefined,
    guardLabel: formData.get("guardLabel") || undefined,
    requiresDocument: (formData.get("requiresDocument") ?? "false").toString(),
    initialNote: formData.get("initialNote") || undefined,
    intent: (formData.get("intent") as string | null) || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Не удалось обработать форму. Обновите страницу и попробуйте снова." };
  }

  const { taskId, dealId, guardKey, guardLabel, requiresDocument, initialNote } = parsed.data;
  const intent = parsed.data.intent ?? "complete";
  const isBuyerDocsGuard = guardKey === BUYER_DOCS_GUARD_KEY;
  const isSellerDocsGuard = guardKey === SELLER_DOCS_GUARD_KEY;
  const requiresDoc =
    !isBuyerDocsGuard && !isSellerDocsGuard && (requiresDocument === "true" || guardKey === VEHICLE_VERIFICATION_GUARD_KEY);
  const fields = parseFieldEntries(formData);
  const additionalDocumentUploads = extractDocumentUploads(formData);
  const noteRaw = (formData.get("note") as string | null) ?? "";
  const noteTrimmed = noteRaw.trim();
  const noteChanged = noteTrimmed !== (initialNote ?? "");
  const noteValue = noteChanged ? (noteTrimmed.length > 0 ? noteTrimmed : null) : initialNote ?? null;

  const supabase = await createSupabaseServiceClient();
  const sessionUser = await getMutationSessionUser();

  if (!sessionUser) {
    return { status: "error", message: READ_ONLY_ACCESS_MESSAGE };
  }

  const { data: existing, error: loadError } = await supabase
    .from("tasks")
    .select(
      "id, deal_id, type, title, status, assignee_role, assignee_user_id, sla_due_at, completed_at, sla_status, payload, created_at, updated_at",
    )
    .eq("id", taskId)
    .maybeSingle();

  if (loadError) {
    console.error("[workflow] failed to load task before completion", loadError);
    return { status: "error", message: "Не удалось загрузить задачу" };
  }

  if (!existing) {
    return { status: "error", message: "Задача не найдена" };
  }

  const isPrepareQuoteTask = existing.type === "PREPARE_QUOTE";
  if (existing.status === "DONE" && !(isPrepareQuoteTask && intent === "save")) {
    return { status: "success", message: "Задача уже завершена" };
  }

  if (!existing.deal_id) {
    return { status: "error", message: "Задача не привязана к сделке" };
  }

  if (!dealId || dealId !== existing.deal_id) {
    return {
      status: "error",
      message: "Не удалось определить сделку для завершения задачи",
    };
  }

  let effectiveAssignee = existing.assignee_user_id ?? null;
  const docFieldTypeMap = buildDocumentTypeMapFromSchema(
    (existing.payload as Record<string, unknown> | null) ?? null,
  );
  const fieldDocumentUploads = extractFieldDocumentUploads(formData, docFieldTypeMap);

  if (!existing.assignee_user_id) {
    const claimResult = await supabase
      .from("tasks")
      .update({ assignee_user_id: sessionUser.user.id })
      .eq("id", taskId)
      .eq("status", existing.status)
      .is("assignee_user_id", null)
      .select("assignee_user_id")
      .maybeSingle();

    if (claimResult.error) {
      console.error("[workflow] failed to claim task in action", claimResult.error);
      return { status: "error", message: "Не удалось начать выполнение задачи" };
    }

    if (!claimResult.data) {
      return {
        status: "error",
        message: "Задачу успел забрать другой пользователь. Обновите страницу.",
      };
    }

    effectiveAssignee = sessionUser.user.id;
  }

  const { data: dealRow, error: dealError } = await supabase
    .from("deals")
    .select("payload, status, deal_number, client_id, workflow_id, workflow_version_id")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) {
    console.error("[workflow] failed to load deal for task completion", dealError);
    return { status: "error", message: "Не удалось загрузить связанную сделку" };
  }

  if (!dealRow) {
    return { status: "error", message: "Связанная сделка не найдена" };
  }

  const clientId = typeof dealRow.client_id === "string" && dealRow.client_id.trim().length > 0
    ? (dealRow.client_id as string)
    : null;

  const dealPayload = (dealRow.payload as Record<string, unknown> | null) ?? null;
  let existingGuardAttachmentPath: string | null = null;
  async function loadGuardDocumentPath(): Promise<string | null> {
    if (!guardKey) return null;
    const { data, error } = await supabase
      .from("deal_documents")
      .select("storage_path, metadata")
      .eq("deal_id", dealId)
      .eq("metadata->>guard_key", guardKey)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[workflow] failed to load existing guard document", error);
      return null;
    }
    const records = Array.isArray(data) ? data : [];
    for (const record of records) {
      const metadata =
        record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
          ? (record.metadata as Record<string, unknown>)
          : null;
      if (isOptionalGuardDocument(metadata)) {
        continue;
      }
      const path =
        record && typeof record.storage_path === "string" && record.storage_path.length > 0
          ? record.storage_path
          : null;
      if (path) {
        return path;
      }
    }
    return null;
  }
  if (guardKey) {
    existingGuardAttachmentPath = await loadGuardDocumentPath();
  }

  const enforcedChecklist = guardKey === VEHICLE_VERIFICATION_GUARD_KEY ? [TECHNICAL_REPORT_TYPE] : [];
  const baseChecklist =
    isBuyerDocsGuard || isSellerDocsGuard ? [] : extractChecklistFromTaskPayload(existing.payload ?? null);
  const requiredChecklist = Array.from(new Set([...baseChecklist, ...enforcedChecklist]));
  let syncedChecklist: ClientDocumentChecklist | null = null;

  if (guardKey && requiredChecklist.length > 0 && fieldDocumentUploads.length === 0) {
    syncedChecklist = await evaluateAndSyncDocsGuard({
      supabase,
      dealId,
      guardKey,
      dealPayload,
      requiredChecklist,
    });
    if (!existingGuardAttachmentPath) {
      existingGuardAttachmentPath = resolveChecklistAttachmentPath(syncedChecklist);
    }
  }

  const mustUploadDocuments =
    intent === "complete" &&
    requiresDoc &&
    fieldDocumentUploads.length === 0 &&
    requiredChecklist.length === 0 &&
    !existingGuardAttachmentPath;
  if (mustUploadDocuments) {
    return { status: "error", message: "Необходимо приложить документ" };
  }

  const hasAnyUploads = additionalDocumentUploads.length > 0 || fieldDocumentUploads.length > 0;

  if (hasAnyUploads) {
    if (!guardKey) {
      return { status: "error", message: "Вложение доступно только для задач с guard" };
    }

    for (const upload of additionalDocumentUploads) {
      const uploadResult = await uploadAttachment({
        supabase,
        dealId,
        guardKey,
        guardLabel,
        file: upload.file,
        documentType: upload.type,
        uploadedBy: sessionUser.user.id,
        isAdditional: true,
        existingPath: upload.existingPath,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
      });

      if ("error" in uploadResult) {
        return { status: "error", message: uploadResult.error };
      }
    }

    if (fieldDocumentUploads.length > 0) {
      const guardKeyForFields = guardKey ?? "task-field-docs";
      for (const upload of fieldDocumentUploads) {
        const uploadResult = await uploadAttachment({
          supabase,
          dealId,
          guardKey: guardKeyForFields,
          guardLabel: guardLabel ?? upload.fieldId,
          file: upload.file,
          documentType: upload.type,
          uploadedBy: sessionUser.user.id,
          existingPath: upload.existingPath,
          fileSize: upload.fileSize,
          mimeType: upload.mimeType,
        });

        if ("error" in uploadResult) {
          return { status: "error", message: uploadResult.error };
        }

        fields[upload.fieldId] = uploadResult.path;
      }
    }
  }

  const mergedPayload = buildTaskPayloadPatch({
    existingPayload: (existing.payload as Record<string, unknown> | null) ?? null,
    fields,
    noteChanged,
    noteValue,
    attachmentPath: null,
    documentType: null,
  });

  if (
    guardKey &&
    requiredChecklist.length > 0 &&
    (fieldDocumentUploads.length > 0 || !syncedChecklist)
  ) {
    syncedChecklist = await evaluateAndSyncDocsGuard({
      supabase,
      dealId,
      guardKey,
      dealPayload,
      requiredChecklist,
    });
    if (!existingGuardAttachmentPath) {
      existingGuardAttachmentPath = resolveChecklistAttachmentPath(syncedChecklist);
    }
  }

  const dealSlug = typeof dealRow.deal_number === "string" ? (dealRow.deal_number as string) : null;
  const taskRedirectPath = dealSlug ? `/ops/deals/${dealSlug}` : `/ops/deals/${dealId}`;
  const revalidateRelatedPaths = () => {
    for (const path of buildPathsToRevalidate(taskId, dealId, dealSlug)) {
      revalidatePath(path);
    }

    if (clientId) {
      for (const path of getWorkspacePaths("clients")) {
        revalidatePath(path);
      }
      revalidatePath("/ops/clients");
      revalidatePath(`/ops/clients/${clientId}`);
    }
  };

  if (intent === "save") {
    const updatePayload: Record<string, unknown> = {
      payload: mergedPayload,
    };
    if (existing.status === "OPEN") {
      updatePayload.status = "IN_PROGRESS";
    }
    if (existing.status === "DONE" && isPrepareQuoteTask) {
      updatePayload.status = "DONE";
    }
    if (effectiveAssignee) {
      updatePayload.assignee_user_id = effectiveAssignee;
    }

    const { error: draftError } = await supabase.from("tasks").update(updatePayload).eq("id", taskId);
    if (draftError) {
      console.error("[workflow] failed to save task draft", draftError);
      return { status: "error", message: "Не удалось сохранить черновик" };
    }

    revalidateRelatedPaths();

    return { status: "success", message: "Черновик сохранён" };
  }

  if (intent === "complete" && requiresDoc) {
    const checklistState = syncedChecklist;
    if (requiredChecklist.length > 0) {
      if (!checklistState || !checklistState.fulfilled) {
        const fallbackItems: ClientDocumentChecklist["items"] = requiredChecklist.map((key) => {
          const normalizedType = normalizeClientDocumentType(key) ?? null;
          const label =
            (normalizedType ? CLIENT_DOCUMENT_TYPE_LABEL_MAP[normalizedType] : undefined) ??
            CLIENT_DOCUMENT_TYPE_LABEL_MAP[key as ClientDocumentTypeValue] ??
            key;
          return {
            key,
            normalizedType,
            label,
            fulfilled: false,
            matches: [],
          };
        });

        const missingLabels = (checklistState?.items ?? fallbackItems)
          .filter((item) => !item.fulfilled)
          .map((item) => {
            const normalized = item.normalizedType ?? (item.key as ClientDocumentTypeValue);
            return CLIENT_DOCUMENT_TYPE_LABEL_MAP[normalized] ?? item.label ?? item.key;
          })
          .filter(Boolean);
        return {
          status: "error",
          message:
            missingLabels.length > 0
              ? `Загрузите обязательные документы: ${missingLabels.join(", ")}`
              : "Не все обязательные документы загружены",
        };
      }
    }
  }

  const completionContext = {
    taskId,
    dealId,
    taskType: existing.type,
    assigneeRole: existing.assignee_role,
    assigneeUserId: effectiveAssignee,
    taskPayload: mergedPayload,
    slaDueAt: existing.sla_due_at,
    currentDealStatus: dealRow.status,
    dealPayload,
    actorRoles: sessionUser.roles,
    workflowId: (dealRow.workflow_id as string | null) ?? null,
    workflowVersionId: (dealRow.workflow_version_id as string | null) ?? null,
    supabase,
  };

  const completionResult = await handleTaskCompletion(completionContext);

  if (!completionResult.taskUpdated) {
    return {
      status: "error",
      message: completionResult.error ?? "Не удалось завершить задачу",
    };
  }

  if (clientId && dealRow.workflow_version_id) {
    try {
      const taskDef = await getTaskDefinition(supabase, dealRow.workflow_version_id, existing.type);
      if (taskDef && taskDef.schema) {
        const profileSync = new ProfileSyncService(supabase);
        await profileSync.saveTaskDataToProfile(dealId, mergedPayload, taskDef.schema);
      }
    } catch (err) {
      console.error("[workflow] failed to persist client profile data", err);
    }
  }

  if (!completionResult.transitionAttempted) {
    const message =
      completionResult.transitionSkippedReason ??
      "Задача закрыта, но не связана с автоматическим переходом. Проверьте, что тип задачи соответствует guard'у этапа.";

    if (completionResult.transitionSkippedReason) {
      revalidateRelatedPaths();
      return redirect(taskRedirectPath);
    }

    return {
      status: "error",
      message,
    };
  }

  if (completionResult.transitionAttempted && !completionResult.transitionSuccess) {
    return {
      status: "error",
      message:
        completionResult.error ??
        "Задача обновлена, но условия перехода по workflow не выполнены. Проверьте, что все необходимые guard'ы выполнены.",
    };
  }

  const originHeader = (await headers()).get("origin");
  console.log("[workflow] task completed via form action", {
    taskId,
    dealId,
    transitionAttempted: completionResult.transitionAttempted,
    transitionSuccess: completionResult.transitionSuccess,
    origin: originHeader,
  });

  revalidateRelatedPaths();

  return redirect(taskRedirectPath);
}

export async function reopenTaskAction(prevState: FormStatus, formData: FormData): Promise<FormStatus> {
  const parsed = REOPEN_TASK_SCHEMA.safeParse({
    taskId: formData.get("taskId"),
    reason: formData.get("reason"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Некорректные данные формы",
    };
  }

  const { taskId, reason, comment } = parsed.data;
  const supabase = await createSupabaseServiceClient();
  const sessionUser = await getMutationSessionUser();

  if (!sessionUser) {
    return { status: "error", message: READ_ONLY_ACCESS_MESSAGE };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("id, status, deal_id, reopen_count")
    .eq("id", taskId)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error("[workflow] failed to load task for reopen", fetchError);
    return { status: "error", message: "Задача не найдена" };
  }

  const normalizedStatus = typeof existing.status === "string" ? existing.status.toUpperCase() : "";
  if (normalizedStatus !== "DONE") {
    return { status: "error", message: "Переоткрыть можно только завершённую задачу" };
  }

  const nextReopenCount = (existing.reopen_count ?? 0) + 1;
  const nowIso = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      status: "IN_PROGRESS",
      completed_at: null,
      reopened_at: nowIso,
      reopen_count: nextReopenCount,
      reopen_reason: reason,
      reopen_comment: comment,
    })
    .eq("id", taskId);

  if (updateError) {
    console.error("[workflow] failed to reopen task", updateError);
    return { status: "error", message: "Не удалось переоткрыть задачу" };
  }

  const dealId = existing.deal_id ?? null;

  const [{ error: eventError }] = await Promise.all([
    supabase.from("task_reopen_events").insert({
      task_id: taskId,
      deal_id: dealId,
      actor_user_id: sessionUser.user.id,
      reason,
      comment,
    }),
    supabase.from("audit_log").insert({
      deal_id: dealId,
      actor_user_id: sessionUser.user.id,
      action: "TASK_REOPEN",
      from_status: existing.status,
      to_status: "IN_PROGRESS",
      metadata: { reason, comment },
    }),
  ]);

  if (eventError) {
    console.error("[workflow] failed to log reopen event", eventError);
  }

  let dealSlug: string | null = null;
  if (dealId) {
    const { data: dealRow } = await supabase
      .from("deals")
      .select("deal_number")
      .eq("id", dealId)
      .maybeSingle();
    dealSlug = (dealRow?.deal_number as string | null) ?? null;
  }

  for (const path of buildPathsToRevalidate(taskId, dealId ?? undefined, dealSlug ?? undefined)) {
    revalidatePath(path);
  }

  return { status: "success", message: "Задача переоткрыта" };
}
