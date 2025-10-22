import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/lib/workflow", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workflow")>(
    "@/lib/workflow",
  );
  return {
    ...actual,
    createWorkflowService: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

const mockedCreateWorkflowService = vi.mocked(
  (await import("@/lib/workflow")).createWorkflowService,
);
const mockedCreateSupabaseServiceClient = vi.mocked(
  (await import("@/lib/supabase/server")).createSupabaseServiceClient,
);

const { POST: postEsign } = await import("../webhooks/esign/route");
const { POST: runQueues } = await import("../workflow/queues/run/route");

type NotificationRow = {
  id: string;
  action_hash: string;
  status: string;
  template: string;
  to_roles: string[];
  payload: Record<string, unknown> | null;
};

function createSupabaseMock() {
  const deal = {
    id: "00000000-0000-0000-0000-000000000010",
    status: "SIGNING_FUNDING",
    payload: {
      payments: {
        advanceReceived: true,
        supplierPaid: true,
      },
      esign: {
        allSigned: false,
      },
    },
  };

  const payments = [
    { kind: "ADVANCE", status: "CONFIRMED" },
    { kind: "SUPPLIER", status: "CONFIRMED" },
  ];

  const notifications: NotificationRow[] = [];

  const ensureRow = (values: Record<string, unknown>): NotificationRow => {
    const existing = notifications.find((row) => row.action_hash === values.action_hash);
    const next: NotificationRow = {
      id: existing?.id ?? `notif-${notifications.length + 1}`,
      action_hash: String(values.action_hash),
      status: String(values.status ?? "PENDING"),
      template: String(values.template ?? ""),
      to_roles: (values.to_roles as string[]) ?? [],
      payload: (values.payload as Record<string, unknown>) ?? null,
    };
    if (existing) {
      const index = notifications.findIndex((row) => row.id === existing.id);
      notifications[index] = next;
    } else {
      notifications.push(next);
    }
    return next;
  };

  const from = (table: string) => {
    if (table === "deals") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { ...deal }, error: null }),
          }),
        }),
        update: (values: Record<string, unknown>) => ({
          eq: async () => {
            Object.assign(deal, values);
            return { error: null };
          },
        }),
      };
    }

    if (table === "payments") {
      return {
        select: () => ({
          eq: async () => ({ data: payments, error: null }),
        }),
      };
    }

    if (table === "workflow_notification_queue") {
      return {
        upsert: (values: Record<string, unknown>) => ({
          select: () => ({
            maybeSingle: async () => ({ data: ensureRow(values), error: null }),
          }),
        }),
        select: () => ({
          eq: (_column: string, status: string) => ({
            order: () => ({
              limit: async () => ({
                data: notifications
                  .filter((row) => row.status === status)
                  .map((row) => ({ ...row })),
                error: null,
              }),
            }),
          }),
        }),
        update: (values: Record<string, unknown>) => ({
          eq: async (_column: string, id: string) => {
            const index = notifications.findIndex((row) => row.id === id);
            if (index >= 0) {
              notifications[index] = {
                ...notifications[index],
                status: String(values.status ?? notifications[index].status),
              };
            }
            return { error: null };
          },
        }),
      };
    }

    if (table === "workflow_webhook_queue") {
      return {
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    }

    if (table === "workflow_schedule_queue") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    }

    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
      insert: async () => ({ error: null }),
      upsert: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    };
  };

  return {
    // @ts-expect-error - Mock object for testing
    client: { from },
    deal,
    notifications,
  };
}

describe("end-to-end workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("выполняет цепочку webhook → queue → telegram", async () => {
    const supabaseMock = createSupabaseMock();
    mockedCreateSupabaseServiceClient.mockResolvedValue(supabaseMock.client);

    const transitionSpy = vi.fn(async () => {
      await supabaseMock.client
        .from("workflow_notification_queue")
        .upsert({
          action_hash: "hash-1",
          template: "active_notification",
          to_roles: ["OP_MANAGER"],
          payload: { message: "Deal is ready" },
        })
        .select()
        .maybeSingle();
    });

    // @ts-expect-error - Mock object for testing
    mockedCreateWorkflowService.mockResolvedValueOnce({
      transitionDeal: transitionSpy,
    });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "123";

    await postEsign(
      new Request("http://localhost/api/webhooks/esign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: "00000000-0000-0000-0000-000000000010",
          status: "COMPLETED",
        }),
      }),
    );

    expect(transitionSpy).toHaveBeenCalled();
    expect(supabaseMock.notifications).toHaveLength(1);

    await runQueues();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.telegram.org/bottest-token/sendMessage"),
      expect.objectContaining({
        method: "POST",
      }),
    );

    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    global.fetch = originalFetch;
  });
});
