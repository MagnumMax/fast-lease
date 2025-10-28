import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { TASK_SELECT, mapTaskRow } from "@/lib/supabase/queries/tasks";
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
    .select(TASK_SELECT)
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

  const items = (data ?? []).map(mapTaskRow);
  return NextResponse.json({ items });
}
