import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createWorkflowService, bankEventSchema } from "@/lib/workflow";
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

function computePaymentsFlags(payments: PaymentRow[] | null | undefined) {
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
  const parsed = bankEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServiceClient();

  const paymentResult = await supabase.from("payments").insert({
    deal_id: parsed.data.deal_id,
    kind: parsed.data.kind,
    amount: parsed.data.amount ?? 0,
    currency: parsed.data.currency ?? "AED",
    status: parsed.data.status,
    external_ref: parsed.data.external_ref ?? null,
  });

  if (paymentResult.error) {
    console.error("[workflow] failed to persist bank webhook", paymentResult.error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, status, payload")
    .eq("id", parsed.data.deal_id)
    .maybeSingle<DealRow>();

  if (dealError) {
    console.error("[workflow] failed to load deal for bank webhook", dealError);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }

  if (!deal) {
    return new Response(null, { status: 204 });
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("kind, status")
    .eq("deal_id", deal.id);

  const paymentFlags = computePaymentsFlags(payments as PaymentRow[] | null);

  const updatedPayload = mergePayload(deal.payload, {
    payments: {
      ...(deal.payload?.payments as Record<string, unknown> | undefined),
      advanceReceived: paymentFlags.advanceReceived,
      supplierPaid: paymentFlags.supplierPaid,
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

  if (deal.status === "SIGNING_FUNDING") {
    try {
      const workflowService = await createWorkflowService();
      const esignPayload = (
        updatedPayload as Record<string, unknown> & {
          esign?: { allSigned?: boolean };
        }
      ).esign;
      await workflowService.transitionDeal({
        dealId: deal.id,
        targetStatus: "VEHICLE_DELIVERY",
        actorRole: "FINANCE",
        guardContext: {
          esign: {
            allSigned: Boolean(esignPayload?.allSigned),
          },
          payments: paymentFlags,
        },
      });
    } catch (error) {
      if (error instanceof WorkflowTransitionError) {
        console.warn("[workflow] bank transition guard failure", error.validation);
      } else {
        console.error("[workflow] bank transition error", error);
      }
    }
  }

  return new Response(null, { status: 204 });
}
