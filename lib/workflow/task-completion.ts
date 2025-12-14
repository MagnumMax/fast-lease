import type { AppRole } from "@/lib/auth/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createWorkflowService } from "@/lib/workflow";
import { ProfileSyncService } from "./profile-sync";
import { WorkflowTransitionError } from "@/lib/workflow/state-machine";
import { resolveTaskGuardKey } from "@/lib/workflow/task-utils";
import type { WorkflowTemplate, WorkflowTaskDefinition } from "@/lib/workflow/types";

type TraceContext = Record<string, unknown>;

function findTaskDefinition(template: WorkflowTemplate, taskType: string): WorkflowTaskDefinition | null {
  for (const stage of Object.values(template.stages)) {
    if (stage.entryActions) {
      for (const action of stage.entryActions) {
        if (action.type === "TASK_CREATE" && (action as any).task?.type === taskType) {
          return (action as any).task as WorkflowTaskDefinition;
        }
      }
    }
  }
  return null;
}

function createTracer(scope: string, baseContext: TraceContext) {
  const startedAt = Date.now();
  let lastMark = startedAt;

  return (step: string, extra: TraceContext = {}) => {
    const now = Date.now();
    const entry = {
      tag: "trace",
      scope,
      step,
      elapsedMs: now - startedAt,
      deltaMs: now - lastMark,
      ...baseContext,
      ...extra,
    };
    console.log(JSON.stringify(entry));
    lastMark = now;
  };
}

type WorkflowStageMeta = {
  exitRequirements?: Array<{ key?: string | null; rule?: string | null }>;
};

type WorkflowPayloadWithGuards = Record<string, unknown> & {
  tasks: Record<string, unknown>;
  guard_tasks: Record<string, unknown>;
};

type TaskCompletionSnapshot = {
  id: string;
  deal_id: string | null;
  type: string | null;
  title: string | null;
  status: string;
  assignee_role: string | null;
  assignee_user_id: string | null;
  payload: Record<string, unknown> | null;
  sla_due_at: string | null;
  completed_at: string | null;
  sla_status: string | null;
  created_at: string;
  updated_at: string;
};

const QUOTE_FIELD_KEYS = [
  "price_vat",
  "term_months",
  "down_payment_amount",
  "interest_rate_annual",
  "insurance_rate_annual",
] as const;

type QuoteFieldKey = (typeof QUOTE_FIELD_KEYS)[number];

function parseNumericField(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (normalized.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractQuoteFieldsFromTaskPayload(
  taskPayload: Record<string, unknown> | null | undefined,
): Record<QuoteFieldKey, number> | null {
  if (!taskPayload || typeof taskPayload !== "object" || Array.isArray(taskPayload)) {
    return null;
  }

  const fieldsBranch = taskPayload.fields;
  const fields =
    fieldsBranch && typeof fieldsBranch === "object" && !Array.isArray(fieldsBranch)
      ? (fieldsBranch as Record<string, unknown>)
      : null;

  if (!fields) {
    return null;
  }

  const next: Partial<Record<QuoteFieldKey, number>> = {};
  for (const key of QUOTE_FIELD_KEYS) {
    const parsed = parseNumericField(fields[key]);
    if (parsed != null) {
      next[key] = parsed;
    }
  }

  return Object.keys(next).length > 0 ? (next as Record<QuoteFieldKey, number>) : null;
}

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

type SupabaseServiceClient = Awaited<ReturnType<typeof createSupabaseServiceClient>>;

type LoadedWorkflowTemplate = {
  template: WorkflowTemplate;
  versionId: string;
};

const workflowTemplateCache = new Map<string, WorkflowTemplate>();

async function loadWorkflowTemplateForDeal(
  supabase: SupabaseServiceClient,
  dealId: string,
  meta?: { workflowId?: string | null; workflowVersionId?: string | null; workflowTemplate?: WorkflowTemplate | null },
): Promise<LoadedWorkflowTemplate | null> {
  let workflowId = meta?.workflowId ?? null;
  let workflowVersionId = meta?.workflowVersionId ?? null;

  if (meta?.workflowTemplate && workflowVersionId) {
    workflowTemplateCache.set(workflowVersionId, meta.workflowTemplate);
    return { template: meta.workflowTemplate, versionId: workflowVersionId };
  }

  if (!workflowId || !workflowVersionId) {
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("workflow_id, workflow_version_id")
      .eq("id", dealId)
      .maybeSingle();

    if (dealError || !deal) {
      console.error("[workflow] failed to load deal for workflow template", dealError);
      return null;
    }

    workflowId = typeof deal.workflow_id === "string" ? (deal.workflow_id as string) : null;
    workflowVersionId =
      typeof deal.workflow_version_id === "string" ? (deal.workflow_version_id as string) : null;
  }

  if (!workflowVersionId) {
    if (!workflowId) {
      return null;
    }

    const { data: activeVersion, error: versionError } = await supabase
      .from("workflow_versions")
      .select("id, template")
      .eq("workflow_id", workflowId)
      .eq("is_active", true)
      .maybeSingle();

    if (versionError || !activeVersion) {
      console.error("[workflow] failed to load active workflow version", versionError);
      return null;
    }

    workflowVersionId = activeVersion.id;
    if (activeVersion.template) {
      workflowTemplateCache.set(activeVersion.id, activeVersion.template as WorkflowTemplate);
      return { template: activeVersion.template as WorkflowTemplate, versionId: activeVersion.id };
    }
  }

  if (!workflowVersionId) {
    return null;
  }

  const cached = workflowTemplateCache.get(workflowVersionId);
  if (cached) {
    return { template: cached, versionId: workflowVersionId };
  }

  const { data: version, error: versionDataError } = await supabase
    .from("workflow_versions")
    .select("id, template")
    .eq("id", workflowVersionId)
    .maybeSingle();

  if (versionDataError || !version || !version.template) {
    console.error("[workflow] failed to load workflow version template", versionDataError);
    return null;
  }

  workflowTemplateCache.set(version.id, version.template as WorkflowTemplate);
  return { template: version.template as WorkflowTemplate, versionId: version.id };
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
  actorRoles?: AppRole[] | null;
  workflowId?: string | null;
  workflowVersionId?: string | null;
  workflowTemplate?: WorkflowTemplate | null;
  supabase?: SupabaseServiceClient;
}

export interface TaskCompletionResult {
  taskUpdated: boolean;
  transitionAttempted: boolean;
  transitionSuccess?: boolean;
  newStatus?: string;
  error?: string;
  transitionSkippedReason?: string;
  expectedExitGuards?: string[];
  updatedTask?: TaskCompletionSnapshot;
}

/**
 * Обрабатывает завершение задачи и автоматический переход workflow
 * Обновляет статус задачи, строит guardContext и вызывает transitionDeal
 */
export async function handleTaskCompletion(
  context: TaskCompletionContext,
): Promise<TaskCompletionResult> {
  const supabase = context.supabase ?? (await createSupabaseServiceClient());
  const completedAt = new Date().toISOString();
  const slaStatus = deriveCompletionSlaStatus(context.slaDueAt, completedAt);
  const trace = createTracer("task-completion", {
    taskId: context.taskId,
    dealId: context.dealId,
    currentStatus: context.currentDealStatus ?? null,
  });

  try {
    trace("start");
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
        "id, deal_id, type, title, status, assignee_role, assignee_user_id, payload, sla_due_at, completed_at, sla_status, created_at, updated_at",
      )
      .single();

    if (taskUpdateError) {
      console.error("[workflow] failed to complete task", taskUpdateError);
      trace("task-update-error", { error: taskUpdateError.message });
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
    const taskSnapshot = updatedTask as TaskCompletionSnapshot;
    trace("task-updated", { status: updatedTask.status, slaStatus: updatedTask.sla_status ?? null });

    // Sync back to profile
    if (context.taskPayload && context.taskType) {
      try {
        const loadedTemplate = await loadWorkflowTemplateForDeal(supabase, context.dealId, {
          workflowId: context.workflowId,
          workflowVersionId: context.workflowVersionId,
          workflowTemplate: context.workflowTemplate,
        });

        if (loadedTemplate?.template) {
          const taskDef = findTaskDefinition(loadedTemplate.template, context.taskType);
          if (taskDef && taskDef.schema) {
            const syncService = new ProfileSyncService(supabase);
            await syncService.saveTaskDataToProfile(
              context.dealId,
              context.taskPayload,
              taskDef.schema
            );
          }
        }
      } catch (syncError) {
        console.error("[workflow] failed to sync task data to profile", syncError);
        // We don't block completion on sync failure
      }
    }

    // Получаем guard key для задачи
    const guardKey = resolveGuardKey(context.taskType, context.taskPayload);

    if (!guardKey) {
      console.log("[workflow] no guard key found for task type:", context.taskType);
      trace("guard-missing", { taskType: context.taskType });
      return {
        taskUpdated: true,
        transitionAttempted: false,
        updatedTask: taskSnapshot,
      };
    }
    trace("guard-resolved", { guardKey });

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
    const guardDocumentTypeCandidate =
      typeof context.taskPayload?.guard_document_type === "string"
        ? (context.taskPayload.guard_document_type as string)
        : null;
    const guardDocumentType =
      guardDocumentTypeCandidate ??
      (typeof guardBase.document_type === "string" ? (guardBase.document_type as string) : null);

    dealPayload.guard_tasks[guardKey] = {
      ...guardBase,
      fulfilled: true,
      completed_at: completedAt,
      task_type: context.taskType,
      task_id: context.taskId,
      status_key: context.taskPayload?.status_key,
      note: guardNote,
      attachment_path: guardAttachmentPath,
      document_type: guardDocumentType,
    };

    // Обновляем payload сделки в базе данных
    const { error: payloadUpdateError } = await supabase
      .from("deals")
      .update({ payload: dealPayload })
      .eq("id", context.dealId);

    if (payloadUpdateError) {
      console.error("[workflow] failed to persist task completion flag", payloadUpdateError);
      trace("payload-update-error", { error: payloadUpdateError.message });
      return {
        taskUpdated: true,
        transitionAttempted: false,
        updatedTask: taskSnapshot,
        error: `Failed to update deal payload: ${payloadUpdateError.message}`,
      };
    }
    trace("payload-updated");

    // Пытаемся выполнить автоматический переход
    console.log("[workflow] Starting workflow transition attempt", {
      dealId: context.dealId,
      currentStatus: context.currentDealStatus,
      guardKey,
      taskType: context.taskType,
    });
    trace("transition-attempt", { guardKey, assigneeRole: context.assigneeRole });
    const transitionResult = await attemptWorkflowTransition({
      dealId: context.dealId,
      currentStatus: context.currentDealStatus,
      guardKey,
      guardContext: dealPayload,
      assigneeRole: context.assigneeRole,
      assigneeUserId: context.assigneeUserId,
      actorRoles: context.actorRoles ?? undefined,
      workflowId: context.workflowId,
      workflowVersionId: context.workflowVersionId,
      workflowTemplate: context.workflowTemplate,
      supabase,
    });
    trace("transition-result", {
      success: transitionResult.success,
      skipped: transitionResult.skipped ?? false,
      newStatus: transitionResult.newStatus ?? null,
      error: transitionResult.error ?? null,
    });
    console.log("[workflow] Workflow transition result", {
      dealId: context.dealId,
      success: transitionResult.success,
      skipped: transitionResult.skipped,
      newStatus: transitionResult.newStatus,
      error: transitionResult.error,
    });

    if (transitionResult.skipped) {
      return {
        taskUpdated: true,
        transitionAttempted: false,
        transitionSkippedReason: transitionResult.error,
        expectedExitGuards: transitionResult.expectedGuards,
        error: transitionResult.error,
        updatedTask: taskSnapshot,
      };
    }

    return {
      taskUpdated: true,
      transitionAttempted: true,
      transitionSuccess: transitionResult.success,
      newStatus: transitionResult.newStatus,
      error: transitionResult.error,
      updatedTask: taskSnapshot,
    };

  } catch (error) {
    console.error("[workflow] unexpected error in handleTaskCompletion:", error);
    trace("unexpected-error", { error: error instanceof Error ? error.message : String(error) });
    return {
      taskUpdated: false,
      transitionAttempted: false,
      updatedTask: undefined,
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
  actorRoles?: AppRole[] | null;
  workflowId?: string | null;
  workflowVersionId?: string | null;
  workflowTemplate?: WorkflowTemplate | null;
  supabase?: SupabaseServiceClient;
}): Promise<{
  success: boolean;
  newStatus?: string;
  error?: string;
  skipped?: boolean;
  expectedGuards?: string[];
}> {
  const guardContext = params.guardContext ?? {};
  const trace = createTracer("workflow-transition", {
    dealId: params.dealId,
    guardKey: params.guardKey,
    currentStatus: params.currentStatus ?? null,
  });

  try {
    trace("start");
    const supabase = params.supabase ?? (await createSupabaseServiceClient());

    // Нормализуем статус
    const statusKey = normalizeStatusKey(params.currentStatus);
    if (!statusKey) {
      trace("invalid-status");
      return { success: false, error: "Invalid current status" };
    }

    const loadedTemplate = await loadWorkflowTemplateForDeal(supabase, params.dealId, {
      workflowId: params.workflowId,
      workflowVersionId: params.workflowVersionId,
      workflowTemplate: params.workflowTemplate,
    });
    if (!loadedTemplate) {
      trace("template-missing");
      return { success: false, error: "Failed to load workflow template" };
    }

    const plan = resolveAutoTransitionPlan({
      template: loadedTemplate.template,
      currentStatus: statusKey,
      guardKey: params.guardKey,
      guardContext,
    });

    trace("status-meta-loaded", { exitGuards: plan.exitGuardKeys.length });

    if (!plan.statusFound) {
      trace("status-meta-missing");
      return { success: false, error: "Status metadata not found" };
    }

    if (!plan.guardMatched && plan.exitGuardKeys.length > 0) {
      const reason = `Guard '${params.guardKey}' не подходит для статуса '${statusKey}'. Ожидаемые guard'ы: ${plan.exitGuardKeys.join(", ")}`;
      console.warn("[workflow] guard key does not match exit guards", {
        dealId: params.dealId,
        statusKey,
        guardKey: params.guardKey,
        expected: plan.exitGuardKeys,
      });
      trace("guard-mismatch", { expected: plan.exitGuardKeys });
      return { success: false, error: reason, skipped: true, expectedGuards: plan.exitGuardKeys };
    }

    if (plan.unsatisfiedGuards.length > 0) {
      console.info("[workflow] skipping transition — guard conditions not met", {
        dealId: params.dealId,
        statusKey,
        guardKey: params.guardKey,
        missingKeys: plan.unsatisfiedGuards,
      });
      trace("guards-unsatisfied", { missingKeys: plan.unsatisfiedGuards });

      return {
        success: false,
        skipped: true,
        expectedGuards: plan.exitGuardKeys,
        error: `Guard conditions not met: ${plan.unsatisfiedGuards.join(", ")}`,
      };
    }

    if (!plan.targetStatus) {
      trace("next-status-missing");
      return { success: false, error: "No next status available" };
    }

    trace("next-status-resolved", { targetStatus: plan.targetStatus });

    // Определяем роль актора для перехода; для контрактного этапа принудительно OP_MANAGER во избежание ROLE_NOT_ALLOWED
    const actorRole = resolveTransitionActorRole({
      guardKey: params.guardKey,
      assigneeRole: params.assigneeRole,
      actorRoles: params.actorRoles ?? null,
    });

    // Выполняем переход через workflow сервис
    console.log("[workflow] Attempting transition", {
      dealId: params.dealId,
      currentStatus: params.currentStatus,
      targetStatus: plan.targetStatus,
      guardKey: params.guardKey,
      guardContext: params.guardContext,
      actorRole,
    });
    trace("workflow-service-call", { targetStatus: plan.targetStatus, actorRole });
    const workflowService = await createWorkflowService();
    await workflowService.transitionDeal({
      dealId: params.dealId,
      targetStatus: plan.targetStatus,
      actorRole,
      actorId: params.assigneeUserId ?? undefined,
      guardContext: params.guardContext,
    });
    console.log("[workflow] Transition completed successfully", {
      dealId: params.dealId,
      targetStatus: plan.targetStatus,
    });
    trace("workflow-service-success", { targetStatus: plan.targetStatus });

    return { success: true, newStatus: plan.targetStatus };

  } catch (error) {
    if (error instanceof WorkflowTransitionError) {
      if (error.validation.reason === "GUARD_FAILED") {
        console.info("[workflow] guard conditions not yet met for auto transition", {
          dealId: params.dealId,
          failedGuards: error.validation.failedGuards,
        });
        trace("workflow-service-guard-failed", {
          failedGuards: error.validation.failedGuards?.map((guard) => guard.key),
        });
        return { success: false, error: "Guard conditions not met" };
      } else if (error.validation.reason === "UNKNOWN_TRANSITION") {
        console.warn("[workflow] no transition available for auto step", {
          dealId: params.dealId,
          from: params.currentStatus,
          to: "targetStatus",
        });
        trace("workflow-service-unknown-transition");
        return { success: false, error: "No transition available" };
      } else {
        trace("workflow-service-rejected", { reason: error.validation.reason });
        return { success: false, error: `Transition rejected: ${error.validation.reason}` };
      }
    } else {
      console.error("[workflow] failed to auto transition", error);
      trace("workflow-service-error", { error: error instanceof Error ? error.message : String(error) });
      return { success: false, error: `Transition failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

function resolveGuardPathValue(context: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((acc, segment) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[segment];
  }, context);
}

function parseGuardExpectedValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (!Number.isNaN(Number(trimmed)) && trimmed !== "") {
    return Number(trimmed);
  }
  return trimmed;
}

type AutoTransitionPlan = {
  statusFound: boolean;
  exitGuardKeys: string[];
  guardMatched: boolean;
  unsatisfiedGuards: string[];
  targetStatus: string | null;
};

export function resolveAutoTransitionPlan(params: {
  template: WorkflowTemplate;
  currentStatus: string;
  guardKey: string;
  guardContext: Record<string, unknown>;
}): AutoTransitionPlan {
  const statusMeta = params.template.stages?.[params.currentStatus];
  if (!statusMeta) {
    return {
      statusFound: false,
      exitGuardKeys: [],
      guardMatched: true,
      unsatisfiedGuards: [],
      targetStatus: null,
    };
  }

  const exitGuards = statusMeta.exitRequirements ?? [];
  const exitGuardKeys = exitGuards
    .map((guard) => guard?.key ?? null)
    .filter((key): key is string => Boolean(key));

  const guardMatched = exitGuardKeys.length === 0 || exitGuardKeys.includes(params.guardKey);

  const unsatisfiedGuards = exitGuards
    .filter((guard) => {
      if (!guard || typeof guard.rule !== "string" || typeof guard.key !== "string") {
        return true;
      }
      const actual = resolveGuardPathValue(params.guardContext, guard.key);
      const rule = guard.rule.trim();
      if (rule === "truthy") return !actual;
      if (rule === "falsy") return Boolean(actual);
      if (rule.startsWith("==")) {
        return actual !== parseGuardExpectedValue(rule.slice(2));
      }
      if (rule.startsWith("!=")) {
        return actual === parseGuardExpectedValue(rule.slice(2));
      }
      return true;
    })
    .map((guard) => guard?.key)
    .filter((key): key is string => Boolean(key));

  const targetStatus = findNextStatusFromTemplate(
    params.template.transitions ?? [],
    params.currentStatus,
    params.guardKey,
  );

  return {
    statusFound: true,
    exitGuardKeys,
    guardMatched,
    unsatisfiedGuards,
    targetStatus,
  };
}

function findNextStatusFromTemplate(
  transitions: WorkflowTemplate["transitions"] | undefined,
  currentStatus: string,
  guardKey: string,
): string | null {
  if (!transitions || transitions.length === 0) {
    return null;
  }

  for (const transition of transitions) {
    if (transition.from !== currentStatus) {
      continue;
    }

    if (transition.guards && transition.guards.length > 0) {
      const guardMatches = transition.guards.some((guard) => guard.key === guardKey);
      if (guardMatches) {
        return transition.to;
      }
      continue;
    }

    return transition.to;
  }

  return null;
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

const SUPERVISOR_TRANSITION_ROLES: AppRole[] = ["ADMIN", "OP_MANAGER"];

function resolveTransitionActorRole(params: {
  guardKey: string;
  assigneeRole?: string | null;
  actorRoles?: AppRole[] | null;
}): AppRole {
  if (params.guardKey === "legal.contractReady") {
    return "OP_MANAGER";
  }

  const normalizedUserRoles = (params.actorRoles ?? [])
    .map((role) => normalizeAppRole(role))
    .filter((role): role is AppRole => Boolean(role));

  const supervisorRole = normalizedUserRoles.find((role) =>
    SUPERVISOR_TRANSITION_ROLES.includes(role),
  );

  if (supervisorRole) {
    return supervisorRole;
  }

  return normalizeAppRole(params.assigneeRole) ?? "OP_MANAGER";
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
