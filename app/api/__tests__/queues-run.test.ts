import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/workflow", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workflow")>(
    "@/lib/workflow",
  );
  return {
    ...actual,
    WorkflowQueueProcessor: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

const mockedWorkflowModule = await import("@/lib/workflow");
const mockedQueueProcessor = mockedWorkflowModule.WorkflowQueueProcessor as unknown as Mock;
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
    });

    expect(processorInstance.processNotifications).toHaveBeenCalled();
    expect(processorInstance.processWebhooks).toHaveBeenCalled();
    expect(processorInstance.processSchedules).toHaveBeenCalled();
  });
});
