import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  createDealRequestSchema,
  listDealsQuerySchema,
} from "@/lib/workflow";
import { createDealWithWorkflow } from "@/lib/workflow/http/create-deal";

export async function GET(request: Request) {
  const supabase = await createSupabaseServiceClient();
  const url = new URL(request.url);
  const queryParse = listDealsQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );

  if (!queryParse.success) {
    return NextResponse.json(
      { error: "Invalid query", details: queryParse.error.flatten() },
      { status: 400 },
    );
  }

  const { status, op_manager_id, source, limit, cursor } = queryParse.data;

  let dbQuery = supabase
    .from("deals")
    .select(
      "id, workflow_id, workflow_version_id, customer_id, asset_id, source, status, op_manager_id, created_at, updated_at, payload",
    )
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (status) {
    dbQuery = dbQuery.eq("status", status);
  }

  if (op_manager_id) {
    dbQuery = dbQuery.eq("op_manager_id", op_manager_id);
  }

  if (source) {
    dbQuery = dbQuery.eq("source", source);
  }

  if (cursor) {
    dbQuery = dbQuery.lt("created_at", cursor);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("[workflow] failed to list deals", error);
    return NextResponse.json(
      { error: "Failed to load deals" },
      { status: 500 },
    );
  }

  const items = (data ?? []).slice(0, limit);
  const hasNext = (data ?? []).length > limit;
  const nextCursor = hasNext ? data?.[limit]?.created_at ?? null : null;

  return NextResponse.json({
    items,
    next_cursor: nextCursor,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const parseResult = createDealRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const result = await createDealWithWorkflow(parseResult.data);

  if (!result.success) {
    return NextResponse.json(
      { error: result.message },
      { status: result.statusCode },
    );
  }

  return NextResponse.json(result.deal, { status: 201 });
}
