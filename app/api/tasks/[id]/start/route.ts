import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServiceClient();

  const existing = await supabase
    .from("tasks")
    .select(
      "id, deal_id, type, status, assignee_role, assignee_user_id, sla_due_at, payload, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (existing.error) {
    console.error("[workflow] failed to load task", existing.error);
    return NextResponse.json(
      { error: "Failed to load task" },
      { status: 500 },
    );
  }

  if (!existing.data) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (existing.data.status !== "OPEN") {
    return NextResponse.json(
      { error: "Task cannot be started", status: existing.data.status },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "IN_PROGRESS" })
    .eq("id", id)
    .select(
      "id, deal_id, type, status, assignee_role, assignee_user_id, sla_due_at, payload, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("[workflow] failed to start task", error);
    return NextResponse.json(
      { error: "Failed to start task" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
