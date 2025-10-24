import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { WorkflowAction } from "./types";
import type {
  WorkflowActionContext,
  WorkflowActionExecutor,
} from "./state-machine";
import { createWorkflowService } from "./factory";
import { WorkflowTransitionError } from "./state-machine";

function computeSlaDueAt(hours: number | undefined): string | null {
  if (!hours || Number.isNaN(hours)) {
    return null;
  }

  const due = new Date();
  due.setHours(due.getHours() + hours);
  return due.toISOString();
}

function computeActionHash(
  action: WorkflowAction,
  context: WorkflowActionContext,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        dealId: context.dealId ?? null,
        transition: context.transition,
        action,
      }),
    )
    .digest("hex");
}

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code && error.code === "23505");
}

function shouldLogAction(result: { data: unknown; error: { code?: string } | null }): boolean {
  if (result.error && !isUniqueViolation(result.error)) {
    return false;
  }

  return Boolean(result.data);
}

async function handleTaskCreate(
  client: SupabaseClient,
  action: WorkflowAction,
  context: WorkflowActionContext,
): Promise<void> {
  if (action.type !== "TASK_CREATE" || !context.dealId) {
    return;
  }

  const slaDueAt = computeSlaDueAt(action.task.sla?.hours);
  const actionHash = computeActionHash(action, context);

  const result = await client
    .from("tasks")
    .upsert(
      {
        deal_id: context.dealId,
        type: action.task.type,
        status: "OPEN",
        assignee_role: action.task.assigneeRole,
        sla_due_at: slaDueAt,
        payload: {
          title: action.task.title,
          checklist: action.task.checklist ?? [],
          created_by_role: context.actorRole,
          guard_key: action.task.guardKey ?? null,
          status_key: context.transition.to,
          status_title:
            context.template?.stages?.[context.transition.to]?.title ??
            context.transition.to,
        },
        action_hash: actionHash,
      },
      { onConflict: "action_hash", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (result.error && !isUniqueViolation(result.error)) {
    console.error("[workflow] failed to create task", result.error);
    return;
  }

  if (shouldLogAction(result)) {
    await insertAudit(client, "TASK_CREATE", context, {
      taskType: action.task.type,
      assigneeRole: action.task.assigneeRole,
      slaDueAt,
    });
  }
}

async function insertAudit(
  client: SupabaseClient,
  actionLabel: string,
  context: WorkflowActionContext,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from("audit_log").insert({
    deal_id: context.dealId ?? null,
    actor_user_id: context.actorId ?? null,
    action: actionLabel,
    from_status: context.transition.from,
    to_status: context.transition.to,
    metadata,
  });

  if (error) {
    console.error(`[*] failed to insert audit action ${actionLabel}`, error);
  }
}

async function enqueueNotification(
  client: SupabaseClient,
  action: Extract<WorkflowAction, { type: "NOTIFY" | "ESCALATE" }>,
  context: WorkflowActionContext,
  kind: "NOTIFY" | "ESCALATE",
): Promise<void> {
  const actionHash = computeActionHash(action, context);

  const messageTemplate =
    context.template?.notifications?.templates?.[action.template] ?? action.template;
  const combinedPayload = {
    ...(context.payload ?? {}),
    message: messageTemplate,
  };

  const result = await client
    .from("workflow_notification_queue")
    .upsert(
      {
        kind,
        deal_id: context.dealId ?? null,
        transition_from: context.transition.from,
        transition_to: context.transition.to,
        template: action.template,
        to_roles: action.toRoles,
        payload: combinedPayload,
        action_hash: actionHash,
      },
      { onConflict: "action_hash", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (result.error && !isUniqueViolation(result.error)) {
    console.error("[workflow] failed to enqueue notification", result.error);
    return;
  }

  if (shouldLogAction(result)) {
    await insertAudit(client, `${kind}_TRIGGER`, context, {
      toRoles: action.toRoles,
      template: action.template,
    });
  }
}

async function handleNotify(
  client: SupabaseClient,
  action: WorkflowAction,
  context: WorkflowActionContext,
): Promise<void> {
  if (action.type !== "NOTIFY") {
    return;
  }

  await enqueueNotification(client, action, context, "NOTIFY");
}

async function handleEscalate(
  client: SupabaseClient,
  action: WorkflowAction,
  context: WorkflowActionContext,
): Promise<void> {
  if (action.type !== "ESCALATE") {
    return;
  }

  await enqueueNotification(client, action, context, "ESCALATE");
}

async function handleOutgoingWebhook(
  client: SupabaseClient,
  action: WorkflowAction,
  context: WorkflowActionContext,
): Promise<void> {
  if (action.type !== "WEBHOOK") {
    return;
  }

  const actionHash = computeActionHash(action, context);

  const result = await client
    .from("workflow_webhook_queue")
    .upsert(
      {
        deal_id: context.dealId ?? null,
        transition_from: context.transition.from,
        transition_to: context.transition.to,
        endpoint: action.endpoint,
        payload: action.payload ?? null,
        action_hash: actionHash,
      },
      { onConflict: "action_hash", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (result.error && !isUniqueViolation(result.error)) {
    console.error("[workflow] failed to enqueue webhook", result.error);
    return;
  }

  if (shouldLogAction(result)) {
    await insertAudit(client, "WEBHOOK_ENQUEUED", context, {
      endpoint: action.endpoint,
    });
  }
}

export interface IncomingWebhookPayload {
  dealId: string;
  event: string;
  payload?: Record<string, unknown>;
  actorRole?: string;
  actorId?: string;
}

export async function handleWebhook(
  webhookPayload: IncomingWebhookPayload,
): Promise<{ success: boolean; error?: string; newStatus?: string }> {
  console.log("[workflow] handling incoming webhook", {
    dealId: webhookPayload.dealId,
    event: webhookPayload.event,
    payload: webhookPayload.payload,
  });

  try {
    const workflowService = await createWorkflowService();
    const supabase = await createSupabaseServiceClient();

    // Получаем deal
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, status, payload, workflow_id, workflow_version_id")
      .eq("id", webhookPayload.dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[workflow] failed to load deal for webhook", dealError);
      return { success: false, error: "Failed to load deal" };
    }

    if (!deal) {
      console.warn("[workflow] deal not found for webhook", { dealId: webhookPayload.dealId });
      return { success: false, error: "Deal not found" };
    }

    // Обновляем payload если предоставлен
    let updatedPayload = deal.payload;
    if (webhookPayload.payload) {
      updatedPayload = {
        ...(deal.payload ?? {}),
        ...webhookPayload.payload,
      };

      const { error: updateError } = await supabase
        .from("deals")
        .update({ payload: updatedPayload })
        .eq("id", deal.id);

      if (updateError) {
        console.error("[workflow] failed to update deal payload", updateError);
        return { success: false, error: "Failed to update deal payload" };
      }
    }

    // Получаем workflow template
    const versionService = await import("./versioning").then(m => m.WorkflowVersionService);
    const versionRepo = await import("../supabase/queries/workflow-versions").then(m => m.createSupabaseWorkflowVersionRepository(supabase));
    const versionServiceInstance = new versionService(versionRepo);

    let version = null;
    if (deal.workflow_version_id) {
      version = await versionServiceInstance.getVersionById(deal.workflow_version_id);
    }
    if (!version) {
      version = await versionServiceInstance.getActiveVersion(deal.workflow_id);
    }

    if (!version) {
      console.error("[workflow] no active workflow version found", { workflowId: deal.workflow_id });
      return { success: false, error: "No active workflow version" };
    }

    // Ищем webhook config в текущем статусе
    const currentStatus = version.template.stages[deal.status];
    if (!currentStatus || !currentStatus.webhooks || !currentStatus.webhooks.onEvent) {
      console.log("[workflow] no webhook config for current status", { status: deal.status });
      return { success: false, error: "No webhook config for current status" };
    }

    // Ищем matching event
    const matchingEvent = currentStatus.webhooks.onEvent.find(
      (e: any) => e.event === webhookPayload.event
    );

    if (!matchingEvent) {
      console.log("[workflow] no matching event found", { event: webhookPayload.event, status: deal.status });
      return { success: false, error: "No matching event for current status" };
    }

    // Проверяем conditions если есть
    if (matchingEvent.conditions && matchingEvent.conditions.length > 0) {
      // Здесь нужно реализовать проверку conditions
      // Для простоты, предполагаем, что conditions проверяются в guardContext
      console.log("[workflow] checking conditions", matchingEvent.conditions);
    }

    // Вызываем transitionDeal
    const actorRole = webhookPayload.actorRole || "SYSTEM";
    const guardContext = updatedPayload || {};

    await workflowService.transitionDeal({
      dealId: deal.id,
      targetStatus: matchingEvent.transitionTo,
      actorRole: actorRole as any,
      actorId: webhookPayload.actorId,
      guardContext,
    });

    console.log("[workflow] webhook transition successful", {
      dealId: deal.id,
      from: deal.status,
      to: matchingEvent.transitionTo,
    });

    return { success: true, newStatus: matchingEvent.transitionTo };

  } catch (error) {
    if (error instanceof WorkflowTransitionError) {
      console.warn("[workflow] webhook transition guard failure", error.validation);
      return { success: false, error: "Guard conditions not met" };
    } else {
      console.error("[workflow] webhook transition error", error);
      return { success: false, error: "Transition failed" };
    }
  }
}

async function handleSchedule(
  client: SupabaseClient,
  action: WorkflowAction,
  context: WorkflowActionContext,
): Promise<void> {
  if (action.type !== "SCHEDULE") {
    return;
  }

  const actionHash = computeActionHash(action, context);

  const result = await client
    .from("workflow_schedule_queue")
    .upsert(
      {
        deal_id: context.dealId ?? null,
        transition_from: context.transition.from,
        transition_to: context.transition.to,
        job_type: action.job.type,
        cron: action.job.cron,
        payload: context.payload ?? null,
        action_hash: actionHash,
      },
      { onConflict: "action_hash", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (result.error && !isUniqueViolation(result.error)) {
    console.error("[workflow] failed to enqueue schedule", result.error);
    return;
  }

  if (shouldLogAction(result)) {
    await insertAudit(client, "SCHEDULE_TRIGGER", context, {
      job: action.job,
    });
  }
}

export function createWorkflowActionExecutor(
  client: SupabaseClient,
): WorkflowActionExecutor {
  return async (action, context) => {
    switch (action.type) {
      case "TASK_CREATE":
        await handleTaskCreate(client, action, context);
        break;
      case "NOTIFY":
        await handleNotify(client, action, context);
        break;
      case "ESCALATE":
        await handleEscalate(client, action, context);
        break;
      case "WEBHOOK":
        await handleOutgoingWebhook(client, action, context);
        break;
      case "SCHEDULE":
        await handleSchedule(client, action, context);
        break;
      default:
        break;
    }
  };
}

export { handleWebhook as handleIncomingWebhook };
