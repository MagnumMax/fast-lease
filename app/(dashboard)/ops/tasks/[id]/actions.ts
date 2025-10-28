"use server";

import { Buffer } from "node:buffer";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getWorkspacePaths } from "@/lib/workspace/routes";
import { handleTaskCompletion } from "@/lib/workflow/task-completion";
import { getSessionUser } from "@/lib/auth/session";

export type FormStatus = { status: "idle" | "success" | "error"; message?: string };

const COMPLETE_FORM_SCHEMA = z.object({
  taskId: z.string().uuid(),
  dealId: z.string().uuid().optional(),
  guardKey: z.string().optional(),
  guardLabel: z.string().optional(),
  requiresDocument: z.enum(["true", "false"]).default("false"),
  initialNote: z.string().optional(),
});

const STORAGE_BUCKET = "deal-documents";

function parseFieldEntries(formData: FormData): Record<string, unknown> {
  const entries = Array.from(formData.entries()).filter(([key]) => key.startsWith("field:"));
  const result: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    const fieldId = key.slice("field:".length);
    if (!fieldId) continue;
    if (typeof value === "string") {
      result[fieldId] = value.trim();
    } else if (value instanceof File) {
      // Поля форм с type="file" идут отдельно — их не обрабатываем как field
      continue;
    } else {
      result[fieldId] = value;
    }
  }

  return result;
}

async function uploadAttachment(options: {
  supabase: Awaited<ReturnType<typeof createSupabaseServiceClient>>;
  dealId: string;
  guardKey: string;
  guardLabel?: string;
  file: File;
}): Promise<{ path: string } | { error: string }> {
  const { supabase, dealId, guardKey, guardLabel, file } = options;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const path = `${dealId}/${guardKey}/${Date.now()}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (uploadError) {
    console.error("[workflow] failed to upload task attachment", uploadError);
    return { error: "Не удалось загрузить вложение" };
  }

  const { error: insertError } = await supabase.from("deal_documents").insert({
    deal_id: dealId,
    title: guardLabel ?? guardKey,
    document_type: guardKey,
    status: "uploaded",
    storage_path: path,
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
}): Record<string, unknown> {
  const { existingPayload, fields, noteChanged, noteValue, attachmentPath } = options;

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
  });

  if (!parsed.success) {
    return { status: "error", message: "Не удалось обработать форму. Обновите страницу и попробуйте снова." };
  }

  const { taskId, dealId, guardKey, guardLabel, requiresDocument, initialNote } = parsed.data;
  const requiresDoc = requiresDocument === "true";
  const fields = parseFieldEntries(formData);
  const noteRaw = (formData.get("note") as string | null) ?? "";
  const noteTrimmed = noteRaw.trim();
  const noteChanged = noteTrimmed !== (initialNote ?? "");
  const noteValue = noteChanged ? (noteTrimmed.length > 0 ? noteTrimmed : null) : initialNote ?? null;
  const file = formData.get("attachment") as File | null;

  if (requiresDoc && (!file || file.size === 0)) {
    return { status: "error", message: "Необходимо приложить документ" };
  }

  const supabase = await createSupabaseServiceClient();
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { status: "error", message: "Необходимо авторизоваться" };
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

  if (existing.status === "DONE") {
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
  if (existing.assignee_user_id && existing.assignee_user_id !== sessionUser.user.id) {
    return { status: "error", message: "Задача закреплена за другим пользователем" };
  }

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

  let attachmentPath: string | null = null;
  if (file && file.size > 0) {
    if (!guardKey) {
      return { status: "error", message: "Вложение доступно только для задач с guard" };
    }

    const uploadResult = await uploadAttachment({
      supabase,
      dealId,
      guardKey,
      guardLabel,
      file,
    });

    if ("error" in uploadResult) {
      return { status: "error", message: uploadResult.error };
    }

    attachmentPath = uploadResult.path;
  }

  const { data: dealRow, error: dealError } = await supabase
    .from("deals")
    .select("payload, status, deal_number")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) {
    console.error("[workflow] failed to load deal for task completion", dealError);
    return { status: "error", message: "Не удалось загрузить связанную сделку" };
  }

  if (!dealRow) {
    return { status: "error", message: "Связанная сделка не найдена" };
  }

  const mergedPayload = buildTaskPayloadPatch({
    existingPayload: (existing.payload as Record<string, unknown> | null) ?? null,
    fields,
    noteChanged,
    noteValue,
    attachmentPath,
  });

  const dealSlug = typeof dealRow.deal_number === "string" ? (dealRow.deal_number as string) : null;

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

  const originHeader = headers().get("origin");
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

  return {
    status: "success",
    message: completionResult.transitionSuccess
      ? `Задача завершена, статус сделки: ${completionResult.newStatus}`
      : "Задача завершена",
  };
}
