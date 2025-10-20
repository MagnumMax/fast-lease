import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServiceClient();

  const totalsQuery = await supabase
    .from("deals")
    .select("id", { head: true, count: "exact" });

  if (totalsQuery.error) {
    console.error("[workflow] failed to compute totals", totalsQuery.error);
    return NextResponse.json(
      { error: "Failed to compute metrics" },
      { status: 500 },
    );
  }

  const activeQuery = await supabase
    .from("deals")
    .select("id", { head: true, count: "exact" })
    .eq("status", "ACTIVE");

  if (activeQuery.error) {
    console.error("[workflow] failed to compute active total", activeQuery.error);
    return NextResponse.json(
      { error: "Failed to compute metrics" },
      { status: 500 },
    );
  }

  const statusesQuery = await supabase
    .from("deals")
    .select("status")
    .limit(5000);

  if (statusesQuery.error) {
    console.error("[workflow] failed to load statuses", statusesQuery.error);
    return NextResponse.json(
      { error: "Failed to compute metrics" },
      { status: 500 },
    );
  }

  const statusCounts = new Map<string, number>();
  for (const row of statusesQuery.data ?? []) {
    const current = statusCounts.get(row.status) ?? 0;
    statusCounts.set(row.status, current + 1);
  }

  const funnel = Array.from(statusCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => ({ status, count }));

  return NextResponse.json({
    totals: {
      deals_total: totalsQuery.count ?? 0,
      active_total: activeQuery.count ?? 0,
    },
    funnel,
  });
}
