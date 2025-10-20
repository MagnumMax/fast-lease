import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, workflow_id, workflow_version_id, customer_id, asset_id, source, status, op_manager_id, created_at, updated_at, payload, tasks(*), documents(*), payments(*), risk_reports(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[workflow] failed to load deal", error);
    return NextResponse.json(
      { error: "Failed to load deal" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { risk_reports, ...rest } = data as any;

  return NextResponse.json({
    ...rest,
    risk_report: Array.isArray(risk_reports) ? risk_reports[0] ?? null : null,
  });
}
