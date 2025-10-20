import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createWorkflowService, esignEventSchema } from "@/lib/workflow";
import { WorkflowTransitionError } from "@/lib/workflow/state-machine";

type DealRow = {
  id: string;
  status: string;
  payload: Record<string, unknown> | null;
};

type PaymentRow = {
  kind: string;
  status: string;
};

function mergePayload(
  base: Record<string, unknown> | null | undefined,
  updates: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(base ?? {}),
    ...updates,
  };
}

function buildPaymentsContext(payments: PaymentRow[] | null | undefined) {
  const advanceReceived = (payments ?? []).some(
    (payment) => payment.kind === "ADVANCE" && payment.status === "CONFIRMED",
  );
  const supplierPaid = (payments ?? []).some(
    (payment) => payment.kind === "SUPPLIER" && payment.status === "CONFIRMED",
  );

  return { advanceReceived, supplierPaid };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = esignEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServiceClient();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, status, payload")
    .eq("id", parsed.data.deal_id)
    .maybeSingle<DealRow>();

  if (dealError) {
    console.error("[workflow] failed to load deal for esign webhook", dealError);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }

  if (!deal) {
    return new Response(null, { status: 204 });
  }

  const updatedPayload = mergePayload(deal.payload, {
    esign: {
      ...(deal.payload?.esign as Record<string, unknown> | undefined),
      status: parsed.data.status,
      allSigned: parsed.data.status === "COMPLETED",
      envelopeId: parsed.data.envelope_id ?? null,
    },
  });

  const updateResult = await supabase
    .from("deals")
    .update({ payload: updatedPayload })
    .eq("id", deal.id);

  if (updateResult.error) {
    console.error("[workflow] failed to update deal payload", updateResult.error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("kind, status")
    .eq("deal_id", deal.id);

  const paymentsContext = buildPaymentsContext(payments as PaymentRow[] | null);

  if (deal.status === "SIGNING_FUNDING" && parsed.data.status === "COMPLETED") {
    try {
      const workflowService = await createWorkflowService();
      await workflowService.transitionDeal({
        dealId: deal.id,
        targetStatus: "VEHICLE_DELIVERY",
        actorRole: "FINANCE",
        guardContext: {
          esign: { allSigned: true },
          payments: paymentsContext,
        },
      });
    } catch (error) {
      if (error instanceof WorkflowTransitionError) {
        console.warn("[workflow] esign transition guard failure", error.validation);
      } else {
        console.error("[workflow] esign transition error", error);
      }
    }
  }

  return new Response(null, { status: 204 });
}
