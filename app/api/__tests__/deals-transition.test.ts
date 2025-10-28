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
  it("rejects manual transition attempts with 403", async () => {
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

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("Manual transitions are disabled"),
    });
    expect(mockedCreateWorkflowService).not.toHaveBeenCalled();
    expect(mockedCreateSupabaseServiceClient).not.toHaveBeenCalled();
  });
});
