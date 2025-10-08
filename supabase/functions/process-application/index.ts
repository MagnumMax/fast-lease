import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import {
  createSupabaseClient,
  errorResponse,
  jsonResponse,
} from "../_shared/client.ts";

const supabase = createSupabaseClient();

interface ProcessApplicationPayload {
  applicationId: string;
  dryRun?: boolean;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Only POST requests are supported.", 405);
  }

  let payload: ProcessApplicationPayload;
  try {
    payload = (await req.json()) as ProcessApplicationPayload;
  } catch (_err) {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const { applicationId, dryRun = false } = payload ?? {};
  if (!applicationId || typeof applicationId !== "string") {
    return errorResponse("`applicationId` is required.", 422);
  }

  const { data: application, error: fetchError } = await supabase
    .from("applications")
    .select("id, status, scoring_results, user_id, vehicle_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(
      "Unable to load application for scoring.",
      500,
      fetchError.message
    );
  }

  if (!application) {
    return errorResponse("Application not found.", 404);
  }

  const scoringResult = {
    provider: "mock-bki",
    riskScore: 710,
    riskBand: "moderate",
    requestedAt: new Date().toISOString(),
    metadata: payload.metadata ?? {},
    notes: [
      "Replace with actual BKI / bank integrations.",
      "See technical architecture §6 for integration contract.",
    ],
  };

  if (!dryRun) {
    const nextStatus =
      application.status === "draft" ? "in_review" : application.status;

    const { error: updateError } = await supabase
      .from("applications")
      .update({
        status: nextStatus,
        scoring_results: scoringResult,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateError) {
      return errorResponse(
        "Failed to persist scoring result.",
        500,
        updateError.message
      );
    }
  }

  return jsonResponse({
    ok: true,
    applicationId,
    dryRun,
    scoringResult,
  });
});
