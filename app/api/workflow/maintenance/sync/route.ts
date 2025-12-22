import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createWorkflowService } from "@/lib/workflow/factory";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createSupabaseServiceClient();
    const service = await createWorkflowService();

    // 1. Get all active deals (excluding CANCELLED)
    // We want to sync even deals that are technically "ACTIVE" (completed successfully) 
    // if the user wants to ensure all data is consistent, though usually ACTIVE deals are done.
    // Let's stick to syncing everything except CANCELLED for now.
    const { data: deals, error } = await supabase
      .from("deals")
      .select("id, status")
      .neq("status", "CANCELLED");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!deals || deals.length === 0) {
      return NextResponse.json({
        message: "No active deals found",
        total: 0,
        processed: 0,
        failed: 0,
      });
    }

    const results = [];
    const errors = [];

    console.log(`[SyncRoute] Starting synchronization for ${deals.length} deals...`);

    for (const deal of deals) {
      try {
        const result = await service.resyncDeal(deal.id);
        results.push({
          id: deal.id,
          status: result.newStatus,
          version: result.workflowVersionId,
          actions_executed: result.executedActions.length,
          actions_names: result.executedActions.map((a) => a.type),
        });
      } catch (e: any) {
        console.error(`[SyncRoute] Failed to sync deal ${deal.id}:`, e);
        errors.push({ id: deal.id, error: e.message });
      }
    }

    return NextResponse.json({
      message: "Synchronization completed",
      total: deals.length,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error: any) {
    console.error("[SyncRoute] Critical error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
