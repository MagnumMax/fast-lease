import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServiceClient();
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("tasks")
    .select(
      "id, deal_id, type, title, status, assignee_role, assignee_user_id, sla_due_at, completed_at, sla_status, payload, created_at, updated_at",
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

  if (
    existing.data.assignee_user_id &&
    existing.data.assignee_user_id !== sessionUser.user.id
  ) {
    return NextResponse.json(
      { error: "Task reserved for another user" },
      { status: 403 },
    );
  }

  let updateBuilder = supabase
    .from("tasks")
    .update({
      status: "IN_PROGRESS",
      assignee_user_id: sessionUser.user.id,
    })
    .eq("id", id)
    .eq("status", "OPEN");

  if (existing.data.assignee_user_id) {
    updateBuilder = updateBuilder.eq("assignee_user_id", existing.data.assignee_user_id);
  } else {
    updateBuilder = updateBuilder.is("assignee_user_id", null);
  }

  const { data, error } = await updateBuilder
    .select(
      "id, deal_id, type, title, status, assignee_role, assignee_user_id, sla_due_at, completed_at, sla_status, payload, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    console.error("[workflow] failed to start task", error);
    return NextResponse.json(
      { error: "Failed to start task" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Task has been claimed or updated by another user" },
      { status: 409 },
    );
  }

  return NextResponse.json(data);
}
