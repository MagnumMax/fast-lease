import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createWorkflowService, aecbEventSchema } from "@/lib/workflow";
import { WorkflowTransitionError } from "@/lib/workflow/state-machine";

type DealRow = {
  id: string;
  status: string;
  payload: Record<string, unknown> | null;
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = aecbEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServiceClient();

  const { error: insertError } = await supabase.from("risk_reports").insert({
    deal_id: parsed.data.deal_id,
    aecb_score: parsed.data.aecb_score,
    approved: parsed.data.approved,
    notes: parsed.data.notes ?? null,
    raw: parsed.data.raw ?? null,
  });

  if (insertError) {
    console.error("[workflow] failed to persist aecb webhook", insertError);
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
    console.error("[workflow] failed to load deal for aecb webhook", dealError);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }

  if (!deal) {
    return new Response(null, { status: 204 });
  }

  const updatedPayload = mergePayload(deal.payload, {
    risk: {
      ...(deal.payload?.risk as Record<string, unknown> | undefined),
      approved: parsed.data.approved,
      aecbScore: parsed.data.aecb_score,
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

  if (parsed.data.approved && deal.status === "RISK_REVIEW") {
    try {
      const workflowService = await createWorkflowService();
      await workflowService.transitionDeal({
        dealId: deal.id,
        targetStatus: "FINANCE_REVIEW",
        actorRole: "RISK_MANAGER",
        guardContext: {
          risk: { approved: true },
        },
      });
    } catch (error) {
      if (error instanceof WorkflowTransitionError) {
        console.warn("[workflow] aecb transition guard failure", error.validation);
      } else {
        console.error("[workflow] aecb transition error", error);
      }
    }
  }

  return new Response(null, { status: 204 });
}
