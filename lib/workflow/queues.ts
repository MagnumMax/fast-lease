import type { SupabaseClient } from "@supabase/supabase-js";
import { createWorkflowService } from "./factory";
import { resolveTaskAssigneeUserId } from "./task-assignees";
import type { WorkflowTaskDefinition } from "./types";

type NotificationQueueRow = {
  id: string;
  kind: string;
  deal_id: string | null;
  transition_from: string | null;
  transition_to: string | null;
  template: string;
  to_roles: string[];
  payload: Record<string, unknown> | null;
  status: string;
  action_hash: string;
};

type WebhookQueueRow = {
  id: string;
  deal_id: string | null;
  transition_from: string | null;
  transition_to: string | null;
  endpoint: string;
  payload: Record<string, unknown> | null;
  status: string;
  retry_count: number;
  next_attempt_at: string | null;
  action_hash: string;
};

type ScheduleQueueRow = {
  id: string;
  deal_id: string | null;
  transition_from: string | null;
  transition_to: string | null;
  job_type: string;
  cron: string | null;
  payload: Record<string, unknown> | null;
  status: string;
  action_hash: string;
};

type TaskQueueRow = {
  id: string;
  deal_id: string;
  transition_from: string | null;
  transition_to: string | null;
  template_id: string | null;
  task_definition: WorkflowTaskDefinition;
  context: Record<string, unknown> | null;
  status: string;
  attempts: number;
  action_hash: string;
};

export type QueueProcessResult = {
  processed: number;
  failed: number;
};

export class WorkflowQueueProcessor {
  constructor(private readonly client: SupabaseClient) {}

  async processNotifications(limit = 10): Promise<QueueProcessResult> {
    const { data, error } = await this.client
      .from("workflow_notification_queue")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[workflow] failed to load notification queue", error);
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const row of data as NotificationQueueRow[]) {
      const nextStatus = await this.sendNotification(row);
      const { error: updateError } = await this.client
        .from("workflow_notification_queue")
        .update(nextStatus)
        .eq("id", row.id);

      if (updateError) {
        failed += 1;
        console.error("[workflow] failed to update notification status", updateError);
        continue;
      }

      processed += nextStatus.status === "SENT" ? 1 : 0;
      failed += nextStatus.status === "FAILED" ? 1 : 0;
    }

    return { processed, failed };
  }

  async processWebhooks(limit = 10): Promise<QueueProcessResult> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("workflow_webhook_queue")
      .select("*")
      .eq("status", "PENDING")
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[workflow] failed to load webhook queue", error);
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const row of data as WebhookQueueRow[]) {
      const next = await this.dispatchWebhook(row);
      const { error: updateError } = await this.client
        .from("workflow_webhook_queue")
        .update(next)
        .eq("id", row.id);

      if (updateError) {
        failed += 1;
        console.error("[workflow] failed to update webhook status", updateError);
        continue;
      }

      processed += next.status === "SENT" ? 1 : 0;
      failed += next.status === "FAILED" ? 1 : 0;

      // Проверяем переходы после успешной отправки webhook
      if (next.status === "SENT" && row.transition_to && row.deal_id) {
        try {
          console.log("[workflow] checking transition after webhook", {
            dealId: row.deal_id,
            from: row.transition_from,
            to: row.transition_to,
          });

          const workflowService = await createWorkflowService();
          await workflowService.transitionDeal({
            dealId: row.deal_id,
            targetStatus: row.transition_to,
            actorRole: "SYSTEM" as any,
            guardContext: row.payload || {},
          });

          console.log("[workflow] transition successful after webhook", {
            dealId: row.deal_id,
            to: row.transition_to,
          });
        } catch (error) {
          console.error("[workflow] transition failed after webhook", {
            dealId: row.deal_id,
            to: row.transition_to,
            error: String(error),
          });
          // Не меняем статус webhook, просто логируем ошибку
        }
      }
    }

    return { processed, failed };
  }

  async processSchedules(limit = 10): Promise<QueueProcessResult> {
    const { data, error } = await this.client
      .from("workflow_schedule_queue")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[workflow] failed to load schedule queue", error);
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const row of data as ScheduleQueueRow[]) {
      const next = await this.dispatchSchedule(row);
      const { error: updateError } = await this.client
        .from("workflow_schedule_queue")
        .update(next)
        .eq("id", row.id);

      if (updateError) {
        failed += 1;
        console.error("[workflow] failed to update schedule status", updateError);
        continue;
      }

      processed += next.status === "SENT" ? 1 : 0;
      failed += next.status === "FAILED" ? 1 : 0;
    }

    return { processed, failed };
  }

  async processTasks(limit = 10): Promise<QueueProcessResult> {
    const { data, error } = await this.client
      .from("workflow_task_queue")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[workflow] failed to load task queue", error);
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const row of data as TaskQueueRow[]) {
      const result = await this.instantiateTask(row);
      const { error: updateError } = await this.client
        .from("workflow_task_queue")
        .update(result.update)
        .eq("id", row.id);

      if (updateError) {
        console.error("[workflow] failed to update task queue status", updateError);
        failed += 1;
        continue;
      }

      if (result.success) {
        processed += 1;
      } else {
        failed += 1;
      }
    }

    return { processed, failed };
  }

  async monitorTaskSla(): Promise<{ updated: number }> {
    const { data, error } = await this.client.rpc("monitor_task_sla_status");
    if (error) {
      console.error("[workflow] failed to monitor task SLA", error);
      return { updated: 0 };
    }

    return { updated: Number(data) || 0 };
  }

  private async sendNotification(row: NotificationQueueRow) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const messageText =
      (row.payload as { message?: string } | null | undefined)?.message ?? row.template;

    if (!token || !chatId) {
      console.info("[workflow] notification stub", {
        template: row.template,
        to: row.to_roles,
        message: messageText,
      });

      return { status: "SENT", processed_at: new Date().toISOString(), error: null };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: "HTML",
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Telegram API error: ${response.status} ${errorText}`);
      }

      return { status: "SENT", processed_at: new Date().toISOString(), error: null };
    } catch (error) {
      console.error("[workflow] notification send error", error);
      return { status: "FAILED", processed_at: new Date().toISOString(), error: String(error) };
    }
  }

  private async dispatchWebhook(row: WebhookQueueRow) {
    try {
      console.info("[workflow] dispatching webhook", {
        endpoint: row.endpoint,
        payload: row.payload,
      });

      const response = await fetch(row.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(row.payload || {}),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      console.info("[workflow] webhook sent successfully", {
        endpoint: row.endpoint,
        status: response.status,
      });

      return { status: "SENT", processed_at: new Date().toISOString(), error: null };
    } catch (error) {
      console.error("[workflow] webhook dispatch error", error);
      const retryCount = row.retry_count + 1;
      const nextAttempt = new Date();
      nextAttempt.setMinutes(nextAttempt.getMinutes() + Math.min(30, 2 ** retryCount));

      return {
        status: retryCount >= 5 ? "FAILED" : "PENDING",
        retry_count: retryCount,
        next_attempt_at: retryCount >= 5 ? null : nextAttempt.toISOString(),
        error: String(error),
        processed_at: retryCount >= 5 ? new Date().toISOString() : null,
      };
    }
  }

  private async dispatchSchedule(row: ScheduleQueueRow) {
    try {
      console.info("[workflow] schedule stub", {
        job: row.job_type,
        cron: row.cron,
        payload: row.payload,
      });

      return { status: "SENT", processed_at: new Date().toISOString(), error: null };
    } catch (error) {
      return { status: "FAILED", processed_at: new Date().toISOString(), error: String(error) };
    }
  }

  private computeSlaDueAt(hours: number | undefined): string | null {
    if (!hours || Number.isNaN(hours)) {
      return null;
    }

    const due = new Date();
    due.setHours(due.getHours() + hours);
    return due.toISOString();
  }

  private async instantiateTask(
    row: TaskQueueRow,
  ): Promise<{ success: boolean; update: Record<string, unknown> }> {
    try {
      const definition = row.task_definition;
      const slaDueAt = this.computeSlaDueAt(definition.sla?.hours);
      const deal = await this.loadDealSnapshot(row.deal_id);
      const dealPayload =
        (deal?.payload as Record<string, unknown> | null | undefined) ?? null;
      const assigneeUserId = resolveTaskAssigneeUserId({
        role: definition.assigneeRole,
        deal: (deal ?? {}) as { op_manager_id?: string | null },
        payloadSources: [dealPayload, row.context ?? null],
      });
      const payload = this.buildTaskPayload(row, deal);

      const result = await this.client
        .from("tasks")
        .upsert(
          {
            deal_id: row.deal_id,
            type: definition.type,
            title: definition.title,
            status: "OPEN",
            assignee_role: definition.assigneeRole,
            assignee_user_id: assigneeUserId,
            sla_due_at: slaDueAt,
            sla_status: slaDueAt ? "ON_TRACK" : null,
            payload,
            action_hash: row.action_hash,
          },
          { onConflict: "action_hash" },
        )
        .select("id")
        .maybeSingle();

      if (result.error) {
        throw result.error;
      }

      return {
        success: true,
        update: {
          status: "PROCESSED",
          processed_at: new Date().toISOString(),
          error: null,
        },
      };
    } catch (error) {
      console.error("[workflow] failed to instantiate task", error);
      return {
        success: false,
        update: {
          status: "FAILED",
          attempts: row.attempts + 1,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async loadDealSnapshot(
    dealId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.client
      .from("deals")
      .select(
        "id, workflow_id, workflow_version_id, status, payload, customer_id, asset_id, source, op_manager_id",
      )
      .eq("id", dealId)
      .maybeSingle();

    if (error) {
      console.error("[workflow] failed to load deal snapshot", error);
      return null;
    }

    return data as Record<string, unknown> | null;
  }

  private buildTaskPayload(
    row: TaskQueueRow,
    deal: Record<string, unknown> | null,
  ): Record<string, unknown> {
    const definition = row.task_definition;
    const context = {
      deal,
      payload: (deal?.payload as Record<string, unknown> | undefined) ?? {},
      queue: row.context ?? {},
      now: new Date().toISOString(),
    };

    const resolvedBindings = this.evaluateBindings(definition.bindings, context);

    return {
      template_id: definition.templateId,
      title: definition.title,
      type: definition.type,
      schema_version: definition.schema?.version ?? "1.0",
      schema: definition.schema ?? null,
      guard_key: definition.guardKey ?? null,
      defaults: definition.defaults ?? null,
      fields: {
        ...(definition.defaults ?? {}),
        ...resolvedBindings,
      },
      status: row.context?.status ?? null,
      status_key: (row.context?.status as { key?: unknown } | undefined)?.key ?? null,
      status_title:
        (row.context?.status as { title?: unknown } | undefined)?.title ?? null,
      workflow: row.context?.workflow ?? null,
    };
  }

  private evaluateBindings(
    bindings: Record<string, string> | undefined,
    context: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!bindings) {
      return {};
    }

    return Object.entries(bindings).reduce<Record<string, unknown>>(
      (acc, [key, expression]) => {
        acc[key] = this.resolveBindingExpression(expression, context);
        return acc;
      },
      {},
    );
  }

  private resolveBindingExpression(
    expression: string,
    context: Record<string, unknown>,
  ): unknown {
    const trimmed = expression.trim();
    const mustache = trimmed.match(/^{{\s*(.+?)\s*}}$/);
    if (!mustache) {
      return expression;
    }

    const path = mustache[1];
    return this.resolvePath(context, path);
  }

  private resolvePath(
    context: Record<string, unknown>,
    path: string,
  ): unknown {
    return path.split(".").reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined) {
        return undefined;
      }

      if (typeof acc !== "object") {
        return undefined;
      }

      return (acc as Record<string, unknown>)[key];
    }, context);
  }
}
