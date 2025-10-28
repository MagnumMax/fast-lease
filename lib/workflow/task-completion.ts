import type { AppRole } from "@/lib/auth/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createWorkflowService } from "@/lib/workflow";
import { WorkflowTransitionError } from "@/lib/workflow/state-machine";
import { resolveTaskGuardKey } from "@/lib/workflow/task-utils";

type WorkflowPayloadWithGuards = Record<string, unknown> & {
  tasks: Record<string, unknown>;
  guard_tasks: Record<string, unknown>;
};

function clonePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function ensureWorkflowPayloadBranches(
  payload: Record<string, unknown> | null | undefined,
): WorkflowPayloadWithGuards {
  const base = clonePayload(payload);
  const tasksBranch =
    base.tasks && typeof base.tasks === "object" && !Array.isArray(base.tasks)
      ? (base.tasks as Record<string, unknown>)
      : {};
  const guardTasksBranch =
    base.guard_tasks && typeof base.guard_tasks === "object" && !Array.isArray(base.guard_tasks)
      ? (base.guard_tasks as Record<string, unknown>)
      : {};
  base.tasks = tasksBranch;
  base.guard_tasks = guardTasksBranch;
  return base as WorkflowPayloadWithGuards;
}

function resolveGuardKey(
  taskType: string | null | undefined,
  taskPayload: Record<string, unknown> | null | undefined,
): string | null {
  return resolveTaskGuardKey({
    type: taskType ?? undefined,
    payload: (taskPayload ?? undefined) as Record<string, unknown> | undefined,
  });
}

function setNestedGuardFlag(target: Record<string, unknown>, guardKey: string): void {
  if (!guardKey) return;
  const segments = guardKey.split(".").filter((segment) => segment.length > 0);
  if (segments.length === 0) return;

  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const next = cursor[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]] = true;
}

function deriveTaskStorageKey(guardKey: string): string {
  if (guardKey.startsWith("tasks.")) {
    const [, taskKey] = guardKey.split(".");
    if (taskKey) {
      return taskKey;
    }
  }
  return guardKey.replace(/[^a-zA-Z0-9]/g, "_");
}

function deriveCompletionSlaStatus(
  slaDueAt: string | null | undefined,
  completedAtIso: string,
): "ON_TRACK" | "BREACHED" | null {
  if (!slaDueAt) {
    return null;
  }

  const completedAt = new Date(completedAtIso);
  const due = new Date(slaDueAt);

  if (Number.isNaN(completedAt.getTime()) || Number.isNaN(due.getTime())) {
    return null;
  }

  return completedAt <= due ? "ON_TRACK" : "BREACHED";
}

export interface TaskCompletionContext {
  taskId: string;
  dealId: string;
  taskType: string | null;
  assigneeRole: string | null;
  assigneeUserId: string | null;
  taskPayload: Record<string, unknown> | null;
  slaDueAt?: string | null;
  currentDealStatus: string | null;
  dealPayload: Record<string, unknown> | null;
}

export interface TaskCompletionResult {
  taskUpdated: boolean;
  transitionAttempted: boolean;
  transitionSuccess?: boolean;
  newStatus?: string;
  error?: string;
}

/**
 * Обрабатывает завершение задачи и автоматический переход workflow
 * Обновляет статус задачи, строит guardContext и вызывает transitionDeal
 */
export async function handleTaskCompletion(
  context: TaskCompletionContext,
): Promise<TaskCompletionResult> {
  const supabase = await createSupabaseServiceClient();
  const completedAt = new Date().toISOString();
  const slaStatus = deriveCompletionSlaStatus(context.slaDueAt, completedAt);

  try {
    // Обновляем статус задачи на DONE
    const { data: updatedTask, error: taskUpdateError } = await supabase
      .from("tasks")
      .update({
        status: "DONE",
        payload: context.taskPayload,
        completed_at: completedAt,
        sla_status: slaStatus,
      })
      .eq("id", context.taskId)
      .select(
        "id, deal_id, type, status, assignee_role, assignee_user_id, payload, sla_due_at, completed_at, sla_status",
      )
      .single();

    if (taskUpdateError) {
      console.error("[workflow] failed to complete task", taskUpdateError);
      return {
        taskUpdated: false,
        transitionAttempted: false,
        error: `Failed to update task: ${taskUpdateError.message}`,
      };
    }

    if (!updatedTask) {
      return {
        taskUpdated: false,
        transitionAttempted: false,
        error: "Task not found after update",
      };
    }

    // Получаем guard key для задачи
    const guardKey = resolveGuardKey(context.taskType, context.taskPayload);

    if (!guardKey) {
      console.log("[workflow] no guard key found for task type:", context.taskType);
      return {
        taskUpdated: true,
        transitionAttempted: false,
      };
    }

    // Строим guard context
    const dealPayload = ensureWorkflowPayloadBranches(context.dealPayload);
    const taskStorageKey = deriveTaskStorageKey(guardKey);
    // Обновляем guard флаги в payload
    setNestedGuardFlag(dealPayload, guardKey);

    // Обновляем информацию о задаче в payload
    const currentEntry = dealPayload.tasks[taskStorageKey];
    const entryBase =
      currentEntry && typeof currentEntry === "object" && !Array.isArray(currentEntry)
        ? (currentEntry as Record<string, unknown>)
        : {};

    dealPayload.tasks[taskStorageKey] = {
      ...entryBase,
      completed: true,
      completed_at: completedAt,
      task_type: context.taskType,
      task_id: context.taskId,
      status_key: context.taskPayload?.status_key,
    };

    // Обновляем guard_tasks секцию
    const guardCurrent = dealPayload.guard_tasks[guardKey];
    const guardBase =
      guardCurrent && typeof guardCurrent === "object" && !Array.isArray(guardCurrent)
        ? (guardCurrent as Record<string, unknown>)
        : {};
    const guardNote =
      typeof context.taskPayload?.guard_note === "string"
        ? (context.taskPayload.guard_note as string)
        : (typeof guardBase.note === "string" ? (guardBase.note as string) : null);
    const guardAttachmentPathCandidate =
      typeof context.taskPayload?.guard_attachment_path === "string"
        ? (context.taskPayload.guard_attachment_path as string)
        : null;
    const guardAttachmentPath =
      guardAttachmentPathCandidate ??
      (typeof guardBase.attachment_path === "string" ? (guardBase.attachment_path as string) : null);

    dealPayload.guard_tasks[guardKey] = {
      ...guardBase,
      fulfilled: true,
      completed_at: completedAt,
      task_type: context.taskType,
      task_id: context.taskId,
      status_key: context.taskPayload?.status_key,
      note: guardNote,
      attachment_path: guardAttachmentPath,
    };

    // Обновляем payload сделки в базе данных
    const { error: payloadUpdateError } = await supabase
      .from("deals")
      .update({ payload: dealPayload })
      .eq("id", context.dealId);

    if (payloadUpdateError) {
      console.error("[workflow] failed to persist task completion flag", payloadUpdateError);
      return {
        taskUpdated: true,
        transitionAttempted: false,
        error: `Failed to update deal payload: ${payloadUpdateError.message}`,
      };
    }

    // Пытаемся выполнить автоматический переход
    console.log("[workflow] Starting workflow transition attempt", {
      dealId: context.dealId,
      currentStatus: context.currentDealStatus,
      guardKey,
      taskType: context.taskType,
    });
    const transitionResult = await attemptWorkflowTransition({
      dealId: context.dealId,
      currentStatus: context.currentDealStatus,
      guardKey,
      guardContext: dealPayload,
      assigneeRole: context.assigneeRole,
      assigneeUserId: context.assigneeUserId,
    });
    console.log("[workflow] Workflow transition result", {
      dealId: context.dealId,
      success: transitionResult.success,
      newStatus: transitionResult.newStatus,
      error: transitionResult.error,
    });

    return {
      taskUpdated: true,
      transitionAttempted: true,
      transitionSuccess: transitionResult.success,
      newStatus: transitionResult.newStatus,
      error: transitionResult.error,
    };

  } catch (error) {
    console.error("[workflow] unexpected error in handleTaskCompletion:", error);
    return {
      taskUpdated: false,
      transitionAttempted: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Пытается выполнить автоматический переход workflow при завершении задачи
 */
async function attemptWorkflowTransition(params: {
  dealId: string;
  currentStatus: string | null | undefined;
  guardKey: string;
  guardContext: Record<string, unknown>;
  assigneeRole?: string | null;
  assigneeUserId?: string | null;
}): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  try {
    // Нормализуем статус
    const statusKey = normalizeStatusKey(params.currentStatus);
    if (!statusKey) {
      return { success: false, error: "Invalid current status" };
    }

    // Получаем метаданные статуса из workflow конфигурации
    const statusMeta = await getWorkflowStatusMeta(statusKey, params.dealId);
    if (!statusMeta) {
      return { success: false, error: "Status metadata not found" };
    }

    // Проверяем, соответствует ли guard key выходным guard'ам статуса
    const exitGuards = statusMeta.exitRequirements || [];
    const guardMatches = exitGuards.some((guard: { key: string }) => guard.key === params.guardKey);
    if (!guardMatches) {
      return { success: false, error: "Guard key does not match exit guards" };
    }

    // Определяем следующий статус
    const targetStatus = await determineNextStatus(statusKey, params.guardKey, params.dealId);
    if (!targetStatus) {
      return { success: false, error: "No next status available" };
    }

    // Определяем роль актора для перехода
    const actorRole = normalizeAppRole(params.assigneeRole) || "OP_MANAGER";

    // Выполняем переход через workflow сервис
    console.log("[workflow] Attempting transition", {
      dealId: params.dealId,
      currentStatus: params.currentStatus,
      targetStatus,
      guardKey: params.guardKey,
      guardContext: params.guardContext,
      actorRole,
    });
    const workflowService = await createWorkflowService();
    await workflowService.transitionDeal({
      dealId: params.dealId,
      targetStatus,
      actorRole,
      actorId: params.assigneeUserId ?? undefined,
      guardContext: params.guardContext,
    });
    console.log("[workflow] Transition completed successfully", {
      dealId: params.dealId,
      targetStatus,
    });

    return { success: true, newStatus: targetStatus };

  } catch (error) {
    if (error instanceof WorkflowTransitionError) {
      if (error.validation.reason === "GUARD_FAILED") {
        console.info("[workflow] guard conditions not yet met for auto transition", {
          dealId: params.dealId,
          failedGuards: error.validation.failedGuards,
        });
        return { success: false, error: "Guard conditions not met" };
      } else if (error.validation.reason === "UNKNOWN_TRANSITION") {
        console.warn("[workflow] no transition available for auto step", {
          dealId: params.dealId,
          from: params.currentStatus,
          to: "targetStatus",
        });
        return { success: false, error: "No transition available" };
      } else {
        return { success: false, error: `Transition rejected: ${error.validation.reason}` };
      }
    } else {
      console.error("[workflow] failed to auto transition", error);
      return { success: false, error: `Transition failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

/**
 * Нормализует ключ статуса к верхнему регистру
 */
function normalizeStatusKey(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }
  return value.toUpperCase();
}

/**
 * Получает метаданные статуса из workflow конфигурации
 */
async function getWorkflowStatusMeta(statusKey: string, dealId: string): Promise<any> {
  const supabase = await createSupabaseServiceClient();

  // Получаем информацию о сделке для определения workflow версии
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("workflow_id, workflow_version_id")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError || !deal) {
    console.error("[workflow] failed to load deal for status meta", dealError);
    return null;
  }

  // Получаем активную версию workflow
  let workflowVersionId = deal.workflow_version_id;
  if (!workflowVersionId) {
    const { data: activeVersion, error: versionError } = await supabase
      .from("workflow_versions")
      .select("id, template")
      .eq("workflow_id", deal.workflow_id)
      .eq("is_active", true)
      .maybeSingle();

    if (versionError || !activeVersion) {
      console.error("[workflow] failed to load active workflow version", versionError);
      return null;
    }

    workflowVersionId = activeVersion.id;
  }

  // Получаем template workflow версии
  const { data: version, error: versionDataError } = await supabase
    .from("workflow_versions")
    .select("template")
    .eq("id", workflowVersionId)
    .maybeSingle();

  if (versionDataError || !version) {
    console.error("[workflow] failed to load workflow version template", versionDataError);
    return null;
  }

  const template = version.template as any;
  if (!template || !template.stages) {
    console.error("[workflow] invalid workflow template structure");
    return null;
  }

  // Возвращаем метаданные статуса
  return template.stages[statusKey] || null;
}

/**
 * Определяет следующий статус на основе текущего и guard key
 */
async function determineNextStatus(
  currentStatus: string,
  guardKey: string,
  dealId: string
): Promise<string | null> {
  const supabase = await createSupabaseServiceClient();

  // Получаем информацию о сделке для определения workflow версии
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("workflow_id, workflow_version_id")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError || !deal) {
    console.error("[workflow] failed to load deal for next status", dealError);
    return null;
  }

  // Получаем активную версию workflow
  let workflowVersionId = deal.workflow_version_id;
  if (!workflowVersionId) {
    const { data: activeVersion, error: versionError } = await supabase
      .from("workflow_versions")
      .select("id, template")
      .eq("workflow_id", deal.workflow_id)
      .eq("is_active", true)
      .maybeSingle();

    if (versionError || !activeVersion) {
      console.error("[workflow] failed to load active workflow version", versionError);
      return null;
    }

    workflowVersionId = activeVersion.id;
  }

  // Получаем template workflow версии
  const { data: version, error: versionDataError } = await supabase
    .from("workflow_versions")
    .select("template")
    .eq("id", workflowVersionId)
    .maybeSingle();

  if (versionDataError || !version) {
    console.error("[workflow] failed to load workflow version template", versionDataError);
    return null;
  }

  const template = version.template as any;
  if (!template || !template.transitions) {
    console.error("[workflow] invalid workflow template structure");
    return null;
  }

  // Ищем подходящий переход на основе текущего статуса и guard key
  const transitions = template.transitions;
  for (const transition of transitions) {
    if (transition.from === currentStatus) {
      // Проверяем, что guard key соответствует одному из guards перехода
      if (transition.guards && transition.guards.length > 0) {
        const guardMatches = transition.guards.some((guard: any) => guard.key === guardKey);
        if (guardMatches) {
          return transition.to;
        }
      } else {
        // Если у перехода нет guards, то он может быть выполнен
        return transition.to;
      }
    }
  }

  return null;
}

/**
 * Нормализует роль приложения
 */
function normalizeAppRole(value: string | null | undefined): AppRole | null {
  if (!value) {
    return null;
  }
  const upper = value.toUpperCase();
  // Здесь должна быть логика проверки валидности роли
  // Пока просто возвращаем значение как AppRole
  return upper as AppRole;
}
