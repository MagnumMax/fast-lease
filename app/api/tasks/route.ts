import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { TASK_SELECT, hydrateTaskAssigneeNames, mapTaskRow } from "@/lib/supabase/queries/tasks";
import { getSessionUser } from "@/lib/auth/session";

const listTasksQuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  deal_id: z.string().uuid().optional(),
  assignee_role: z.string().optional(),
  assignee_user_id: z.string().uuid().optional(),
  workflow_only: z.enum(["true", "false"]).optional(),
  assigned: z.enum(["me", "role"]).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1).default("MANUAL"),
  description: z.string().optional(),
  deal_id: z.string().uuid().optional(),
  assignee_role: z.string().optional(),
  assignee_user_id: z.string().uuid().optional(),
  due_at: z
    .string()
    .datetime({ offset: true })
    .optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

export async function GET(request: Request) {
  const supabase = await createSupabaseServiceClient();
  const url = new URL(request.url);
  const parsed = listTasksQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .order("sla_due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const filters = parsed.data;
  let sessionUser = null;

  if (filters.assigned) {
    sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required for scoped tasks" },
        { status: 401 },
      );
    }
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.deal_id) {
    query = query.eq("deal_id", filters.deal_id);
  }
  if (filters.assignee_role) {
    query = query.eq("assignee_role", filters.assignee_role);
  }
  if (filters.assignee_user_id) {
    query = query.eq("assignee_user_id", filters.assignee_user_id);
  }
  if (filters.workflow_only === "true") {
    query = query.not("action_hash", "is", null);
  }
  if (filters.assigned === "me") {
    query = query.eq("assignee_user_id", sessionUser!.user.id);
  }
  if (filters.assigned === "role") {
    const role = sessionUser?.primaryRole;
    if (!role) {
      return NextResponse.json(
        { error: "No primary role associated with current user" },
        { status: 400 },
      );
    }
    query = query.eq("assignee_role", role);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[workflow] failed to list tasks", error);
    return NextResponse.json(
      { error: "Failed to list tasks" },
      { status: 500 },
    );
  }

  const mapped = (data ?? []).map(mapTaskRow);
  const items = await hydrateTaskAssigneeNames(mapped, supabase);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServiceClient();
  const payload = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const dueAt = parsed.data.due_at
    ? new Date(parsed.data.due_at).toISOString()
    : null;
  const taskPayload = {
    ...parsed.data.payload,
    description: parsed.data.description ?? null,
    title: parsed.data.title,
    created_from: "manual",
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      deal_id: parsed.data.deal_id ?? null,
      type: parsed.data.type ?? "MANUAL",
      title: parsed.data.title,
      status: "OPEN",
      assignee_role: parsed.data.assignee_role ?? null,
      assignee_user_id: parsed.data.assignee_user_id ?? null,
      sla_due_at: dueAt,
      sla_status: dueAt ? "ON_TRACK" : null,
      payload: taskPayload,
    })
    .select(TASK_SELECT)
    .single();

  if (error) {
    console.error("[workflow] failed to create task", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }

  const mapped = mapTaskRow(data);
  const [hydrated] = await hydrateTaskAssigneeNames([mapped], supabase);

  return NextResponse.json(hydrated ?? mapped, { status: 201 });
}
