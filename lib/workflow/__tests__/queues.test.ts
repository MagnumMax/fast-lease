import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { WorkflowQueueProcessor } from "../queues";

type QueueOptions = {
  notifications?: Array<Record<string, unknown>>;
  webhooks?: Array<Record<string, unknown>>;
  schedules?: Array<Record<string, unknown>>;
};

const makeNotificationSelectChain = (rows: Array<Record<string, unknown>>) => {
  const limit = vi.fn(async () => ({ data: rows, error: null }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, order, limit };
};

const makeWebhookSelectChain = (rows: Array<Record<string, unknown>>) => {
  const limit = vi.fn(async () => ({ data: rows, error: null }));
  const order = vi.fn(() => ({ limit }));
  const or = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ or }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, or, order, limit };
};

const makeScheduleSelectChain = makeNotificationSelectChain;

const makeUpdateChain = () => {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  return { update, eq };
};

const createClientMock = (options: QueueOptions = {}) => {
  const notificationRows = options.notifications ?? [];
  const webhookRows = options.webhooks ?? [];
  const scheduleRows = options.schedules ?? [];

  const notificationSelect = makeNotificationSelectChain(notificationRows);
  const webhookSelect = makeWebhookSelectChain(webhookRows);
  const scheduleSelect = makeScheduleSelectChain(scheduleRows);

  const notificationUpdate = makeUpdateChain();
  const webhookUpdate = makeUpdateChain();
  const scheduleUpdate = makeUpdateChain();

  const fromMock = vi.fn((table: string) => {
    switch (table) {
      case "workflow_notification_queue":
        return {
          select: notificationSelect.select,
          update: notificationUpdate.update,
        };
      case "workflow_webhook_queue":
        return {
          select: webhookSelect.select,
          update: webhookUpdate.update,
        };
      case "workflow_schedule_queue":
        return {
          select: scheduleSelect.select,
          update: scheduleUpdate.update,
        };
      default:
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [], error: null })) })) })) })),
          update: makeUpdateChain().update,
        };
    }
  });

  const client = {
    from: fromMock,
  } as unknown as SupabaseClient;

  return {
    client,
    fromMock,
    notificationSelect,
    notificationUpdate,
    webhookSelect,
    webhookUpdate,
    scheduleSelect,
    scheduleUpdate,
  };
};

describe("WorkflowQueueProcessor", () => {
  it("возвращает нулевые счётчики при пустой очереди уведомлений", async () => {
    const { client } = createClientMock();
    const processor = new WorkflowQueueProcessor(client);

    const result = await processor.processNotifications();

    expect(result).toEqual({ processed: 0, failed: 0 });
  });

  it("помечает уведомление как SENT", async () => {
    const notificationRow = {
      id: "notif-1",
      kind: "NOTIFY",
      deal_id: "deal-1",
      transition_from: "NEW",
      transition_to: "OFFER_PREP",
      template: "template",
      to_roles: ["OP_MANAGER"],
      payload: null,
      status: "PENDING",
      action_hash: "hash",
    };

    const { client, notificationUpdate } = createClientMock({
      notifications: [notificationRow],
    });

    const processor = new WorkflowQueueProcessor(client);
    const result = await processor.processNotifications();

    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(notificationUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SENT" }),
    );
    expect(notificationUpdate.eq).toHaveBeenCalledWith("id", notificationRow.id);
  });

  it("отправляет уведомление в Telegram, когда настроены токен и chat_id", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const notificationRow = {
      id: "notif-telegram",
      kind: "NOTIFY",
      deal_id: "deal-1",
      transition_from: "NEW",
      transition_to: "OFFER_PREP",
      template: "new_deal_created",
      to_roles: ["OP_MANAGER"],
      payload: { message: "Test message" },
      status: "PENDING",
      action_hash: "hash-telegram",
    };

    const { client, notificationUpdate } = createClientMock({
      notifications: [notificationRow],
    });

    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "123";

    const processor = new WorkflowQueueProcessor(client);
    const result = await processor.processNotifications();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.telegram.org/bottest-token/sendMessage"),
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(notificationUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SENT" }),
    );
    expect(result).toEqual({ processed: 1, failed: 0 });

    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    global.fetch = originalFetch;
  });

  it("ставит вебхук в SENT при успехе", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const webhookRow = {
      id: "webhook-1",
      deal_id: "deal-1",
      transition_from: "SIGNING_FUNDING",
      transition_to: "VEHICLE_DELIVERY",
      endpoint: "https://example.com",
      payload: null,
      status: "PENDING",
      retry_count: 0,
      next_attempt_at: null,
      action_hash: "hash",
    };

    const { client, webhookUpdate } = createClientMock({ webhooks: [webhookRow] });
    const processor = new WorkflowQueueProcessor(client);

    const result = await processor.processWebhooks();

    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(webhookUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SENT" }),
    );
    expect(webhookUpdate.eq).toHaveBeenCalledWith("id", webhookRow.id);

    global.fetch = originalFetch;
  });

  it("планирует повтор вебхука при ошибке", async () => {
    const webhookRow = {
      id: "webhook-2",
      deal_id: "deal-1",
      transition_from: "SIGNING_FUNDING",
      transition_to: "VEHICLE_DELIVERY",
      endpoint: "https://example.com",
      payload: null,
      status: "PENDING",
      retry_count: 0,
      next_attempt_at: null,
      action_hash: "hash",
    };

    const { client, webhookUpdate } = createClientMock({ webhooks: [webhookRow] });
    const processor = new WorkflowQueueProcessor(client);

    (processor as unknown as { dispatchWebhook: (row: any) => Promise<any> }).dispatchWebhook = vi
      .fn()
      .mockResolvedValue({
        status: "PENDING",
        retry_count: 1,
        next_attempt_at: "2099-01-01T00:00:00.000Z",
        error: "network",
        processed_at: null,
      });

    const result = await processor.processWebhooks();

    expect(result).toEqual({ processed: 0, failed: 0 });
    expect(webhookUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PENDING", retry_count: 1 }),
    );
  });

  it("обрабатывает расписания", async () => {
    const scheduleRow = {
      id: "schedule-1",
      deal_id: "deal-1",
      transition_from: "ACTIVE",
      transition_to: null,
      job_type: "INVOICE_SCHEDULE",
      cron: "0 8 1 * *",
      payload: null,
      status: "PENDING",
      action_hash: "hash",
    };

    const { client, scheduleUpdate } = createClientMock({ schedules: [scheduleRow] });
    const processor = new WorkflowQueueProcessor(client);

    const result = await processor.processSchedules();

    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(scheduleUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SENT" }),
    );
  });
});
