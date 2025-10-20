import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { listDealTasksQuerySchema } from "@/lib/workflow";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServiceClient();
  const url = new URL(request.url);
  const parsed = listDealTasksQuerySchema.safeParse(
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
    .select(
      "id, deal_id, type, status, assignee_role, assignee_user_id, sla_due_at, payload, created_at, updated_at",
    )
    .eq("deal_id", id)
    .order("created_at", { ascending: true });

  if (parsed.data.status) {
    query = query.eq("status", parsed.data.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[workflow] failed to load tasks", error);
    return NextResponse.json(
      { error: "Failed to load tasks" },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: data ?? [] });
}
