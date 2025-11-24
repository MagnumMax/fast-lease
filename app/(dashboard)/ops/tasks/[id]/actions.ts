"use server";

import { Buffer } from "node:buffer";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getWorkspacePaths } from "@/lib/workspace/routes";
import { handleTaskCompletion } from "@/lib/workflow/task-completion";
import { getMutationSessionUser } from "@/lib/auth/guards";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";
import { isFileLike, type FileLike, getFileName, sanitizeFileName } from "@/lib/documents/upload";
import {
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_LABEL_MAP,
  type ClientDocumentTypeValue,
  normalizeClientDocumentType,
  DEAL_DOCUMENT_TYPES,
} from "@/lib/supabase/queries/operations";
import {
  evaluateClientDocumentChecklist,
  extractChecklistFromTaskPayload,
  type ClientDocumentChecklist,
  type ClientDocumentSummary,
} from "@/lib/workflow/documents-checklist";

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

const DEAL_DOCUMENT_BUCKET = "deal-documents";
const VEHICLE_VERIFICATION_GUARD_KEY = "vehicle.verified";
const TECHNICAL_REPORT_TYPE: ClientDocumentTypeValue = "technical_report";
const DEAL_DOCUMENT_CATEGORY_MAP: Record<string, string> = DEAL_DOCUMENT_TYPES.reduce((acc, entry) => {
  acc[entry.value] = entry.category;
  return acc;
}, {} as Record<string, string>);

function resolveDealDocumentCategory(value: string | null): string {
  if (!value) return "other";
  return DEAL_DOCUMENT_CATEGORY_MAP[value] ?? "other";
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
  file: FileLike;
};

const DOCUMENT_FIELD_REGEX = /^documents\[(.+?)\]\[(type|file)\]$/;

function extractDocumentUploads(formData: FormData): ParsedDocumentUpload[] {
  const entries = new Map<string, { type?: string; file?: FileLike }>();

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
    }
    entries.set(id, current);
  }

  const uploads: ParsedDocumentUpload[] = [];
  for (const [id, entry] of entries.entries()) {
    if (!entry.type || !entry.file) {
      continue;
    }
    const normalized = normalizeClientDocumentType(entry.type);
    if (!normalized) {
      continue;
    }
    uploads.push({ id, type: normalized, file: entry.file });
  }

  return uploads;
}

async function uploadAttachment(options: {
  supabase: Awaited<ReturnType<typeof createSupabaseServiceClient>>;
  dealId: string;
  guardKey: string;
  guardLabel?: string;
  file: FileLike;
  documentType: ClientDocumentTypeValue;
  uploadedBy: string | null;
}): Promise<{ path: string } | { error: string }> {
  const { supabase, dealId, guardKey, guardLabel, file, documentType, uploadedBy } = options;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const baseName = getFileName(file) || guardKey || "attachment";
  const sanitizedName = sanitizeFileName(baseName);
  const path = `${dealId}/${guardKey}/${Date.now()}-${sanitizedName}`;
  const documentCategory = resolveDealDocumentCategory(documentType);
  const typeLabel = CLIENT_DOCUMENT_TYPE_LABEL_MAP[documentType] ?? null;
  const metadata = {
    upload_context: "workflow_task",
    guard_key: guardKey,
    guard_label: guardLabel,
    guard_document_type: documentType,
    guard_deal_id: dealId,
  };

  const { error: uploadError } = await supabase.storage.from(DEAL_DOCUMENT_BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (uploadError) {
    console.error("[workflow] failed to upload task attachment", uploadError);
    return { error: "Не удалось загрузить вложение" };
  }

  const { error: insertError } = await supabase.from("deal_documents").insert({
    deal_id: dealId,
    title: typeLabel ?? guardLabel ?? guardKey,
    document_type: documentType,
    document_category: documentCategory,
    status: "uploaded",
    storage_path: path,
    mime_type: file.type || null,
    file_size: typeof file.size === "number" ? file.size : null,
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
  const requiresDoc = requiresDocument === "true" || guardKey === VEHICLE_VERIFICATION_GUARD_KEY;
  const fields = parseFieldEntries(formData);
  const documentUploads = extractDocumentUploads(formData);
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
    .select("payload, status, deal_number, client_id")
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
  if (guardKey && dealPayload && typeof dealPayload === "object" && !Array.isArray(dealPayload)) {
    const guardTasksBranch = dealPayload.guard_tasks;
    if (guardTasksBranch && typeof guardTasksBranch === "object" && !Array.isArray(guardTasksBranch)) {
      const guardEntry = (guardTasksBranch as Record<string, unknown>)[guardKey];
      if (guardEntry && typeof guardEntry === "object" && !Array.isArray(guardEntry)) {
        const maybePath = (guardEntry as Record<string, unknown>).attachment_path;
        if (typeof maybePath === "string" && maybePath.length > 0) {
          existingGuardAttachmentPath = maybePath;
        }
      }
    }
  }

  const enforcedChecklist = guardKey === VEHICLE_VERIFICATION_GUARD_KEY ? [TECHNICAL_REPORT_TYPE] : [];
  const requiredChecklist = Array.from(
    new Set([...extractChecklistFromTaskPayload(existing.payload ?? null), ...enforcedChecklist]),
  );
  let syncedChecklist: ClientDocumentChecklist | null = null;

  if (guardKey && requiredChecklist.length > 0 && documentUploads.length === 0) {
    syncedChecklist = await evaluateAndSyncDocsGuard({
      supabase,
      dealId,
      guardKey,
      dealPayload: (dealRow.payload as Record<string, unknown> | null) ?? null,
      requiredChecklist,
    });
    if (!existingGuardAttachmentPath) {
      existingGuardAttachmentPath = resolveChecklistAttachmentPath(syncedChecklist);
    }
  }

  const mustUploadDocuments =
    intent === "complete" &&
    requiresDoc &&
    documentUploads.length === 0 &&
    requiredChecklist.length === 0 &&
    !existingGuardAttachmentPath;
  if (mustUploadDocuments) {
    return { status: "error", message: "Необходимо приложить документ" };
  }

  if (documentUploads.length > 0) {
    if (!guardKey) {
      return { status: "error", message: "Вложение доступно только для задач с guard" };
    }

    for (const upload of documentUploads) {
      const uploadResult = await uploadAttachment({
        supabase,
        dealId,
        guardKey,
        guardLabel,
        file: upload.file,
        documentType: upload.type,
        uploadedBy: sessionUser.user.id,
      });

      if ("error" in uploadResult) {
        return { status: "error", message: uploadResult.error };
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

  if (guardKey && requiredChecklist.length > 0 && (documentUploads.length > 0 || !syncedChecklist)) {
    syncedChecklist = await evaluateAndSyncDocsGuard({
      supabase,
      dealId,
      guardKey,
      dealPayload: (dealRow.payload as Record<string, unknown> | null) ?? null,
      requiredChecklist,
    });
    if (!existingGuardAttachmentPath) {
      existingGuardAttachmentPath = resolveChecklistAttachmentPath(syncedChecklist);
    }
  }

  const dealSlug = typeof dealRow.deal_number === "string" ? (dealRow.deal_number as string) : null;

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
    dealPayload: (dealRow.payload as Record<string, unknown> | null) ?? null,
  };

  const completionResult = await handleTaskCompletion(completionContext);

  if (!completionResult.taskUpdated) {
    return {
      status: "error",
      message: completionResult.error ?? "Не удалось завершить задачу",
    };
  }

  if (!completionResult.transitionAttempted) {
    return {
      status: "error",
      message:
        "Задача закрыта, но не связана с автоматическим переходом. Проверьте, что тип задачи соответствует guard'у этапа.",
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

  return {
    status: "success",
    message: completionResult.transitionSuccess
      ? `Задача завершена, статус сделки: ${completionResult.newStatus}`
      : "Задача завершена",
    redirectTo: dealSlug ? `/ops/deals/${dealSlug}` : `/ops/deals/${dealId}`,
  };
}
