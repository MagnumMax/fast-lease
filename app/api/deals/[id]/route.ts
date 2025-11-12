import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { canMutateSessionUser } from "@/lib/auth/guards";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";

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
      "id, workflow_id, workflow_version_id, client_id, asset_id, source, status, op_manager_id, created_at, updated_at, payload, deal_documents(*), invoices(*), payments(*)",
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

  return NextResponse.json(data);
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServiceClient();

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!canMutateSessionUser(sessionUser)) {
    return NextResponse.json({ error: READ_ONLY_ACCESS_MESSAGE }, { status: 403 });
  }

  // Ensure deal exists
  const existing = await supabase
    .from("deals")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) {
    console.error("[workflow] failed to load deal before deletion", existing.error);
    return NextResponse.json({ error: "Failed to load deal" }, { status: 500 });
  }

  if (!existing.data) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Delete nested dependencies
  async function deleteBy(table: string, column: string, values: string[]) {
    if (values.length === 0) return;
    const { error } = await supabase.from(table).delete().in(column, values);
    if (error) {
      throw new Error(`[workflow] failed to delete from ${table}: ${error.message}`);
    }
  }

  try {
    // Payments & related
    const paymentsRes = await supabase.from("payments").select("id").eq("deal_id", id);
    if (paymentsRes.error) {
      throw new Error(`[workflow] failed to load payments: ${paymentsRes.error.message}`);
    }
    const paymentIds = (paymentsRes.data ?? []).map((row) => row.id);
    if (paymentIds.length > 0) {
      await deleteBy("payment_transactions", "payment_id", paymentIds);
    }

    await supabase.from("payments").delete().eq("deal_id", id);

    await supabase.from("payment_schedules").delete().eq("deal_id", id);
    await supabase.from("invoices").delete().eq("deal_id", id);
    await supabase.from("deal_documents").delete().eq("deal_id", id);
    await supabase.from("deal_events").delete().eq("deal_id", id);
    await supabase.from("workflow_task_queue").delete().eq("deal_id", id);
    await supabase.from("workflow_schedule_queue").delete().eq("deal_id", id);
    await supabase.from("workflow_notification_queue").delete().eq("deal_id", id);
    await supabase.from("workflow_webhook_queue").delete().eq("deal_id", id);
    await supabase.from("tasks").delete().eq("deal_id", id);
    await supabase.from("vehicle_services").delete().eq("deal_id", id);
    await supabase.from("portfolio_assets").delete().eq("deal_id", id);
    await supabase.from("referral_rewards").delete().eq("deal_id", id);
    await supabase.from("referral_deals").delete().eq("deal_id", id);

    const ticketsRes = await supabase
      .from("support_tickets")
      .select("id")
      .eq("deal_id", id);
    if (ticketsRes.error) {
      throw new Error(`[workflow] failed to load support tickets: ${ticketsRes.error.message}`);
    }
    const ticketIds = (ticketsRes.data ?? []).map((row) => row.id);
    if (ticketIds.length > 0) {
      await deleteBy("support_messages", "ticket_id", ticketIds);
      await deleteBy("support_tickets", "id", ticketIds);
    }
  } catch (error) {
    console.error("[workflow] failed to cascade delete deal", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete related records" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("deals")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[workflow] failed to delete deal", error);
    const status = error.code === "23503" ? 409 : 500;
    return NextResponse.json(
      {
        error:
          status === 409
            ? "Deal cannot be deleted due to existing related records"
            : "Failed to delete deal",
      },
      { status },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
