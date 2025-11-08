import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

const queueProcessorFactory = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("@/lib/workflow", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workflow")>(
    "@/lib/workflow",
  );

  class WorkflowQueueProcessorMock {
    constructor(...args: unknown[]) {
      return queueProcessorFactory.create(...args);
    }
  }

  return {
    ...actual,
    WorkflowQueueProcessor: WorkflowQueueProcessorMock,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

const mockedQueueProcessor = queueProcessorFactory.create as unknown as Mock;
const mockedCreateSupabaseServiceClient = vi.mocked(
  (await import("@/lib/supabase/server")).createSupabaseServiceClient,
);

const { POST } = await import("../workflow/queues/run/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/workflow/queues/run", () => {
  it("возвращает результаты обработки очередей", async () => {
    const processorInstance = {
      processNotifications: vi.fn().mockResolvedValue({ processed: 1, failed: 0 }),
      processWebhooks: vi.fn().mockResolvedValue({ processed: 2, failed: 1 }),
      processSchedules: vi.fn().mockResolvedValue({ processed: 3, failed: 0 }),
      processTasks: vi.fn().mockResolvedValue({ processed: 4, failed: 0 }),
      monitorTaskSla: vi.fn().mockResolvedValue({ updated: 2 }),
    };

    mockedQueueProcessor.mockReturnValue(processorInstance);
    // @ts-expect-error - Mock object for testing
    mockedCreateSupabaseServiceClient.mockResolvedValue({});

    const response = await POST();

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toEqual({
      notifications: { processed: 1, failed: 0 },
      webhooks: { processed: 2, failed: 1 },
      schedules: { processed: 3, failed: 0 },
      tasks: { processed: 4, failed: 0 },
      sla: { updated: 2 },
    });

    expect(processorInstance.processNotifications).toHaveBeenCalled();
    expect(processorInstance.processWebhooks).toHaveBeenCalled();
    expect(processorInstance.processSchedules).toHaveBeenCalled();
    expect(processorInstance.processTasks).toHaveBeenCalled();
    expect(processorInstance.monitorTaskSla).toHaveBeenCalled();
  });
});
