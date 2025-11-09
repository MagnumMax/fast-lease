import { Buffer } from "node:buffer";

import type { SupabaseClient } from "@supabase/supabase-js";

export type FileLike = (File | Blob) & { name?: string };

export function isFileLike(value: unknown): value is FileLike {
  if (typeof File !== "undefined" && value instanceof File) {
    return true;
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return true;
  }
  return false;
}

export type DocumentUploadCandidate<TType extends string = string> = {
  type: TType;
  file: FileLike;
  title?: string | null;
  category?: string | null;
  context?: string | null;
  metadata?: Record<string, unknown>;
};

type UploadMessages = {
  upload?: string;
  insert?: string;
};

export type DocumentUploadSuccess = {
  success: true;
  uploaded: number;
};

export type DocumentUploadFailure = {
  success: false;
  error: string;
};

export type DocumentUploadResult = DocumentUploadSuccess | DocumentUploadFailure;

export type DocumentUploadOptions<TType extends string = string> = {
  supabase: SupabaseClient;
  bucket: string;
  table: string;
  entityColumn: string;
  entityId: string;
  allowedTypes: Set<TType>;
  typeLabelMap?: Record<string, string>;
  storagePathPrefix?: string;
  status?: string;
  categoryColumn?: string;
  logPrefix?: string;
  uploadedBy?: string | null;
  metadataBuilder?: (candidate: DocumentUploadCandidate<TType>) => Record<string, unknown>;
  extraInsertFields?: (candidate: DocumentUploadCandidate<TType>) => Record<string, unknown>;
  titleBuilder?: (candidate: DocumentUploadCandidate<TType>, label?: string) => string;
  messages?: UploadMessages;
};

const DEFAULT_UPLOAD_ERROR = "Не удалось загрузить документ.";
const DEFAULT_INSERT_ERROR = "Документ не сохранился. Попробуйте ещё раз.";

function coerceMetadata(value?: Record<string, unknown>): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return { ...value };
}

export function sanitizeFileName(original: string): string {
  const fallback = "document";
  if (typeof original !== "string" || original.trim().length === 0) {
    return fallback;
  }
  const normalized = original.replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-");
  const trimmed = normalized.replace(/^-+|-+$/g, "");
  return trimmed.length ? trimmed : fallback;
}

export function getFileName(file: FileLike): string {
  return typeof file.name === "string" ? file.name : "";
}

export async function uploadDocumentsBatch<TType extends string = string>(
  documents: DocumentUploadCandidate<TType>[],
  options: DocumentUploadOptions<TType>,
): Promise<DocumentUploadResult> {
  if (documents.length === 0) {
    return { success: true, uploaded: 0 };
  }

  const {
    supabase,
    bucket,
    table,
    entityColumn,
    entityId,
    allowedTypes,
    typeLabelMap,
    storagePathPrefix,
    status = "uploaded",
    categoryColumn,
    logPrefix = "[documents]",
    uploadedBy = null,
    metadataBuilder,
    extraInsertFields,
    titleBuilder,
    messages,
  } = options;

  const uploadedPaths: string[] = [];
  let uploadedCount = 0;

  const resolveTitle = (
    candidate: DocumentUploadCandidate<TType>,
    typeLabel?: string,
  ) => {
    const providedTitle = typeof candidate.title === "string" ? candidate.title.trim() : "";
    if (providedTitle.length > 0) {
      return providedTitle;
    }
    if (titleBuilder) {
      return titleBuilder(candidate, typeLabel);
    }
    if (typeLabel && typeLabel.trim().length > 0) {
      return typeLabel;
    }
    return sanitizeFileName(getFileName(candidate.file));
  };

  const uploadErrorMessage = messages?.upload ?? DEFAULT_UPLOAD_ERROR;
  const insertErrorMessage = messages?.insert ?? DEFAULT_INSERT_ERROR;

  try {
    for (const candidate of documents) {
      if (!allowedTypes.has(candidate.type)) {
        console.warn(`${logPrefix} unsupported document type`, { type: candidate.type });
        return { success: false, error: uploadErrorMessage };
      }

      const originalName = getFileName(candidate.file);
      const sanitizedName = sanitizeFileName(originalName);
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const objectPath = `${storagePathPrefix ?? entityId}/${uniqueSuffix}-${sanitizedName}`;
      const buffer = Buffer.from(await candidate.file.arrayBuffer());

      const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
        contentType: candidate.file.type || "application/octet-stream",
        upsert: false,
      });

      if (uploadError) {
        console.error(`${logPrefix} failed to upload document`, uploadError);
        return { success: false, error: uploadErrorMessage };
      }

      const label = typeLabelMap?.[candidate.type] ?? originalName;
      const metadata: Record<string, unknown> = {
        original_filename: originalName || sanitizedName,
        ...(metadataBuilder ? metadataBuilder(candidate) : {}),
        ...coerceMetadata(candidate.metadata),
      };

      if (candidate.context && typeof metadata["upload_context"] !== "string") {
        metadata["upload_context"] = candidate.context;
      }

      const insertPayload: Record<string, unknown> = {
        [entityColumn]: entityId,
        document_type: candidate.type,
        title: resolveTitle(candidate, label),
        storage_path: objectPath,
        mime_type: candidate.file.type || null,
        file_size: typeof candidate.file.size === "number" ? candidate.file.size : null,
        status,
        metadata,
        uploaded_by: uploadedBy,
      };

      if (categoryColumn) {
        insertPayload[categoryColumn] = candidate.category ?? null;
      }

      if (extraInsertFields) {
        Object.assign(insertPayload, extraInsertFields(candidate));
      }

      const { error: insertError } = await supabase.from(table).insert(insertPayload);

      if (insertError) {
        console.error(`${logPrefix} failed to insert document metadata`, insertError);
        await supabase.storage.from(bucket).remove([objectPath]).catch((cleanupError) => {
          console.warn(`${logPrefix} failed to cleanup document after insert error`, cleanupError);
        });
        return { success: false, error: insertErrorMessage };
      }

      uploadedPaths.push(objectPath);
      uploadedCount += 1;
    }

    return { success: true, uploaded: uploadedCount };
  } catch (error) {
    console.error(`${logPrefix} unexpected upload error`, error);
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(bucket).remove(uploadedPaths).catch((cleanupError) => {
        console.warn(`${logPrefix} failed to cleanup documents after unexpected error`, cleanupError);
      });
    }
    return { success: false, error: uploadErrorMessage };
  }
}
