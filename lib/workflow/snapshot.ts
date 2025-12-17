
import type { SupabaseClient } from "@supabase/supabase-js";

export async function snapshotDealParticipants(
  supabase: SupabaseClient,
  dealId: string,
  participantIds: {
    sellerId?: string | null;
    brokerId?: string | null;
    clientId?: string | null;
  }
) {
  if (!dealId) return;

  // 1. Resolve IDs. If any is missing, fetch from deal to be sure (especially client_id).
  let { sellerId, brokerId, clientId } = participantIds;

  if (!clientId || !sellerId) {
     const { data: deal, error: dealFetchError } = await supabase
        .from("deals")
        .select("client_id, seller_id, broker_id, payload")
        .eq("id", dealId)
        .single();
     
     if (!dealFetchError && deal) {
         if (!clientId) clientId = deal.client_id;
         if (!sellerId) sellerId = deal.seller_id; // Use what's in DB if not passed (e.g. established earlier)
         if (!brokerId) brokerId = deal.broker_id;
     }
  }

  const idsToFetch = [sellerId, brokerId, clientId].filter(Boolean) as string[];

  if (idsToFetch.length === 0) return;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", idsToFetch);

  if (error) {
    console.error("[Snapshot] Failed to fetch profiles", error);
    return;
  }

  const snapshotData: Record<string, any> = {};

  if (sellerId) {
    const profile = profiles.find((p) => p.id === sellerId);
    if (profile) snapshotData.seller = profile;
  }
  if (brokerId) {
    const profile = profiles.find((p) => p.id === brokerId);
    if (profile) snapshotData.broker = profile;
  }
  if (clientId) {
    const profile = profiles.find((p) => p.id === clientId);
    if (profile) snapshotData.client = profile;
  }

  if (Object.keys(snapshotData).length === 0) return;

  // Update deal payload with snapshot
  // Fetch current payload if we didn't fetch it above
  // Optimization: If we fetched deal above, use its payload. But we might not have.
  
  const { data: dealForUpdate, error: dealError } = await supabase
    .from("deals")
    .select("payload")
    .eq("id", dealId)
    .single();

  if (dealError) {
    console.error("[Snapshot] Failed to fetch deal payload", dealError);
    return;
  }

  const currentPayload = (dealForUpdate.payload as Record<string, any>) || {};
  const newPayload = {
    ...currentPayload,
    snapshot_data: {
      ...(currentPayload.snapshot_data || {}),
      ...snapshotData,
      snapshot_at: new Date().toISOString(),
    },
  };

  const { error: updateError } = await supabase
    .from("deals")
    .update({ payload: newPayload })
    .eq("id", dealId);

  if (updateError) {
    console.error("[Snapshot] Failed to update deal payload", updateError);
  } else {
    console.log("[Snapshot] Successfully updated snapshot_data for deal", dealId);
  }
}
