import type { SupabaseClient } from "@supabase/supabase-js";
import { createWorkflowService } from "./factory";

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
}
