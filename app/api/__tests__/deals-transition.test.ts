import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/workflow", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workflow")>(
    "@/lib/workflow",
  );
  return {
    ...actual,
    createWorkflowService: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/supabase/server")
  >("@/lib/supabase/server");
  return {
    ...actual,
    createSupabaseServiceClient: vi.fn(),
  };
});

const mockedCreateWorkflowService = vi.mocked(
  (await import("@/lib/workflow")).createWorkflowService,
);
const mockedCreateSupabaseServiceClient = vi.mocked(
  (await import("@/lib/supabase/server")).createSupabaseServiceClient,
);

const { POST } = await import("../deals/[id]/transition/route");

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/deals/{id}/transition", () => {
  it("returns 400 when payload is invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/deals/123/transition", {
        method: "POST",
        body: JSON.stringify({ to_status: "ACTIVE" }),
      }),
      { params: Promise.resolve({ id: "123" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 409 when workflow service rejects transition", async () => {
    const { WorkflowTransitionError } = await import(
      "@/lib/workflow/state-machine"
    );

    mockedCreateWorkflowService.mockResolvedValueOnce({
      transitionDeal: vi.fn().mockRejectedValue(
        new WorkflowTransitionError("blocked", {
          allowed: false,
          reason: "GUARD_FAILED",
        }),
      ),
    } as any);

    const response = await POST(
      new Request("http://localhost/api/deals/123/transition", {
        method: "POST",
        body: JSON.stringify({
          to_status: "RISK_REVIEW",
          actor_role: "OP_MANAGER",
        }),
      }),
      { params: Promise.resolve({ id: "123" }) },
    );

    expect(response.status).toBe(409);
  });

  it("returns updated deal when transition succeeds", async () => {
    mockedCreateWorkflowService.mockResolvedValueOnce({
      transitionDeal: vi.fn().mockResolvedValue({}),
    } as any);

    mockedCreateSupabaseServiceClient.mockResolvedValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "123",
                status: "RISK_REVIEW",
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const response = await POST(
      new Request("http://localhost/api/deals/123/transition", {
        method: "POST",
        body: JSON.stringify({
          to_status: "RISK_REVIEW",
          actor_role: "OP_MANAGER",
        }),
      }),
      { params: Promise.resolve({ id: "123" }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ id: "123", status: "RISK_REVIEW" });
  });
});
