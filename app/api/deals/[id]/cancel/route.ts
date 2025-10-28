import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServiceClient();
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payloadBody = await request.json().catch(() => ({}));
  const reason =
    payloadBody && typeof payloadBody.reason === "string" && payloadBody.reason.trim().length > 0
      ? payloadBody.reason.trim()
      : null;
  const notes =
    payloadBody && typeof payloadBody.notes === "string" && payloadBody.notes.trim().length > 0
      ? payloadBody.notes.trim()
      : null;

  const existing = await supabase
    .from("deals")
    .select("status, payload")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) {
    console.error("[workflow] failed to load deal before cancel", existing.error);
    return NextResponse.json(
      { error: "Failed to load deal" },
      { status: 500 },
    );
  }

  if (!existing.data) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (existing.data.status === "CANCELLED") {
    return NextResponse.json({ status: "CANCELLED" });
  }

  const payloadBase =
    existing.data.payload && typeof existing.data.payload === "object" && !Array.isArray(existing.data.payload)
      ? (existing.data.payload as Record<string, unknown>)
      : {};

  const cancelledAt = new Date().toISOString();
  const updatedPayload = {
    ...payloadBase,
    cancelled_at: cancelledAt,
    cancelled_reason: reason ?? payloadBase.cancelled_reason ?? null,
    cancelled_notes: notes ?? payloadBase.cancelled_notes ?? null,
    cancelled_by: sessionUser.user.id,
  };

  const { data, error } = await supabase
    .from("deals")
    .update({
      status: "CANCELLED",
      payload: updatedPayload,
    })
    .eq("id", id)
    .select("id, status, updated_at")
    .single();

  if (error) {
    console.error("[workflow] failed to cancel deal", error);
    return NextResponse.json(
      { error: "Failed to cancel deal" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    status: data.status,
    updated_at: data.updated_at,
    cancelled_at: cancelledAt,
    cancelled_by: sessionUser.user.id,
    cancelled_reason: reason,
    cancelled_notes: notes,
  });
}
