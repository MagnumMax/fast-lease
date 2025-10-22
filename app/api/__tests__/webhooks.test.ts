import { describe, expect, it, beforeEach, vi } from "vitest";

const workflowModule = await vi.importActual<typeof import("@/lib/workflow")>(
  "@/lib/workflow",
);

vi.mock("@/lib/workflow", () => ({
  ...workflowModule,
  createWorkflowService: vi.fn(),
}));

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
const { POST: postBank } = await import("../webhooks/bank/route");
const { POST: postAecb } = await import("../webhooks/aecb/route");

const DEAL_ID_ESIGN = "00000000-0000-0000-0000-000000000001";
const DEAL_ID_BANK = "00000000-0000-0000-0000-000000000002";
const DEAL_ID_AECB = "00000000-0000-0000-0000-000000000003";

beforeEach(() => {
  vi.clearAllMocks();
});

function createEsignSupabaseMock() {
  const dealsSelectMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: DEAL_ID_ESIGN,
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
    },
    error: null,
  });
  const dealsSelectEq = vi.fn(() => ({ maybeSingle: dealsSelectMaybeSingle }));
  const dealsSelect = vi.fn(() => ({ eq: dealsSelectEq }));

  const dealsUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const dealsUpdate = vi.fn(() => ({ eq: dealsUpdateEq }));

  const paymentsSelectEq = vi.fn().mockResolvedValue({
    data: [
      { kind: "ADVANCE", status: "CONFIRMED" },
      { kind: "SUPPLIER", status: "CONFIRMED" },
    ],
    error: null,
  });
  const paymentsSelect = vi.fn(() => ({ eq: paymentsSelectEq }));

  let dealsCall = 0;

  const fromMock = vi.fn((table: string) => {
    if (table === "deals") {
      dealsCall += 1;
      return dealsCall === 1 ? { select: dealsSelect } : { update: dealsUpdate };
    }
    if (table === "payments") {
      return { select: paymentsSelect };
    }
    return {
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(),
      update: vi.fn(),
    };
  });

  return {
    client: { from: fromMock },
    fromMock,
  };
}

function createBankSupabaseMock() {
  const paymentsInsert = vi.fn().mockResolvedValue({ error: null });

  const dealsSelectMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: DEAL_ID_BANK,
      status: "SIGNING_FUNDING",
      payload: {
        esign: { allSigned: true },
        payments: {
          advanceReceived: false,
          supplierPaid: false,
        },
      },
    },
    error: null,
  });
  const dealsSelectEq = vi.fn(() => ({ maybeSingle: dealsSelectMaybeSingle }));
  const dealsSelect = vi.fn(() => ({ eq: dealsSelectEq }));

  const dealsUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const dealsUpdate = vi.fn(() => ({ eq: dealsUpdateEq }));

  const paymentsSelectEq = vi.fn().mockResolvedValue({
    data: [
      { kind: "ADVANCE", status: "CONFIRMED" },
      { kind: "SUPPLIER", status: "CONFIRMED" },
    ],
    error: null,
  });
  const paymentsSelect = vi.fn(() => ({ eq: paymentsSelectEq }));

  let paymentsCall = 0;
  let dealsCall = 0;

  const fromMock = vi.fn((table: string) => {
    if (table === "payments") {
      paymentsCall += 1;
      return paymentsCall === 1 ? { insert: paymentsInsert } : { select: paymentsSelect };
    }
    if (table === "deals") {
      dealsCall += 1;
      return dealsCall === 1 ? { select: dealsSelect } : { update: dealsUpdate };
    }
    return {
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(),
      update: vi.fn(),
    };
  });

  return {
    client: { from: fromMock },
    fromMock,
  };
}

function createAecbSupabaseMock() {
  const riskInsert = vi.fn().mockResolvedValue({ error: null });

  const dealsSelectMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: DEAL_ID_AECB,
      status: "RISK_REVIEW",
      payload: {
        risk: { approved: false },
      },
    },
    error: null,
  });
  const dealsSelectEq = vi.fn(() => ({ maybeSingle: dealsSelectMaybeSingle }));
  const dealsSelect = vi.fn(() => ({ eq: dealsSelectEq }));

  const dealsUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const dealsUpdate = vi.fn(() => ({ eq: dealsUpdateEq }));

  let dealsCall = 0;

  const fromMock = vi.fn((table: string) => {
    if (table === "risk_reports") {
      return { insert: riskInsert };
    }
    if (table === "deals") {
      dealsCall += 1;
      return dealsCall === 1 ? { select: dealsSelect } : { update: dealsUpdate };
    }
    return {
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(),
      update: vi.fn(),
    };
  });

  return {
    client: { from: fromMock },
    fromMock,
  };
}

describe("webhook handlers", () => {
  it("применяет переход для e-sign webhook", async () => {
    const supabaseMock = createEsignSupabaseMock();
    mockedCreateSupabaseServiceClient.mockResolvedValue(supabaseMock.client as unknown);

    const transitionDeal = vi.fn().mockResolvedValue({});
    mockedCreateWorkflowService.mockResolvedValue({ transitionDeal } as unknown);

    const response = await postEsign(
      new Request("http://localhost/api/webhooks/esign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: DEAL_ID_ESIGN,
          status: "COMPLETED",
          envelope_id: "env-1",
        }),
      }),
    );

    const body = response.status === 204 ? null : await response.json();
    expect({ status: response.status, body }).toEqual({ status: 204, body: null });
    expect(transitionDeal).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: DEAL_ID_ESIGN,
        targetStatus: "VEHICLE_DELIVERY",
      }),
    );
  });

  it("применяет переход для bank webhook", async () => {
    const supabaseMock = createBankSupabaseMock();
    mockedCreateSupabaseServiceClient.mockResolvedValue(supabaseMock.client as unknown);

    const transitionDeal = vi.fn().mockResolvedValue({});
    mockedCreateWorkflowService.mockResolvedValue({ transitionDeal } as unknown);

    const response = await postBank(
      new Request("http://localhost/api/webhooks/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: DEAL_ID_BANK,
          kind: "ADVANCE",
          status: "CONFIRMED",
        }),
      }),
    );

    const body = response.status === 204 ? null : await response.json();
    expect({ status: response.status, body }).toEqual({ status: 204, body: null });
    expect(transitionDeal).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: DEAL_ID_BANK,
        targetStatus: "VEHICLE_DELIVERY",
      }),
    );
  });

  it("обновляет deal и рисковый статус для aecb webhook", async () => {
    const supabaseMock = createAecbSupabaseMock();
    mockedCreateSupabaseServiceClient.mockResolvedValue(supabaseMock.client as unknown);

    const transitionDeal = vi.fn().mockResolvedValue({});
    mockedCreateWorkflowService.mockResolvedValue({ transitionDeal } as unknown);

    const response = await postAecb(
      new Request("http://localhost/api/webhooks/aecb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: DEAL_ID_AECB,
          aecb_score: 700,
          approved: true,
        }),
      }),
    );

    const body = response.status === 204 ? null : await response.json();
    expect({ status: response.status, body }).toEqual({ status: 204, body: null });
    expect(transitionDeal).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: DEAL_ID_AECB,
        targetStatus: "FINANCE_REVIEW",
      }),
    );
  });
});
