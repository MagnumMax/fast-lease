import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createWorkflowService, transitionRequestSchema } from "@/lib/workflow";
import { WorkflowTransitionError } from "@/lib/workflow/state-machine";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = transitionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { actor_role, to_status, guard_context } = parsed.data;

  if (!actor_role) {
    return NextResponse.json(
      { error: "actor_role is required" },
      { status: 400 },
    );
  }

  const workflowService = await createWorkflowService();

  try {
    await workflowService.transitionDeal({
      dealId: id,
      targetStatus: to_status,
      actorRole: actor_role,
      guardContext: guard_context ?? undefined,
    });
  } catch (error) {
    if (error instanceof WorkflowTransitionError) {
      return NextResponse.json(
        {
          error: "Transition rejected",
          reason: error.validation.reason,
          failedGuards: error.validation.failedGuards ?? [],
        },
        { status: 409 },
      );
    }

    console.error("[workflow] transition failure", error);
    return NextResponse.json(
      { error: "Failed to perform transition" },
      { status: 500 },
    );
  }

  const supabase = await createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, workflow_id, workflow_version_id, customer_id, asset_id, source, status, op_manager_id, created_at, updated_at, payload",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[workflow] failed to load deal after transition", error);
    return NextResponse.json(
      { error: "Transition performed but fetching deal failed" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
