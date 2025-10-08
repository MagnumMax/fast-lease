import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import {
  createSupabaseClient,
  errorResponse,
  jsonResponse,
} from "../_shared/client.ts";

const supabase = createSupabaseClient();

type NotificationChannel = "email" | "sms" | "push";

interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  dealId?: string;
  applicationId?: string;
}

interface NotificationPayload {
  channel: NotificationChannel;
  template: string;
  data?: Record<string, unknown>;
  recipient: NotificationRecipient;
  dryRun?: boolean;
  triggeredBy?: string;
}

const SUPPORTED_CHANNELS: NotificationChannel[] = ["email", "sms", "push"];

serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Only POST is supported.", 405);
  }

  let payload: NotificationPayload;
  try {
    payload = (await req.json()) as NotificationPayload;
  } catch (_err) {
    return errorResponse("Invalid JSON payload.", 400);
  }

  if (!payload?.channel || !SUPPORTED_CHANNELS.includes(payload.channel)) {
    return errorResponse("Unsupported notification channel.", 422, {
      supported: SUPPORTED_CHANNELS,
    });
  }

  if (!payload.template) {
    return errorResponse("`template` identifier is required.", 422);
  }

  if (!payload.recipient) {
    return errorResponse("`recipient` object is required.", 422);
  }

  const { dryRun = false, recipient } = payload;

  if (!recipient.email && !recipient.phone && !recipient.userId) {
    return errorResponse(
      "Recipient must include at least one of `email`, `phone`, or `userId`.",
      422
    );
  }

  const eventPayload = {
    template: payload.template,
    data: payload.data ?? {},
    channel: payload.channel,
    recipient,
    triggeredBy: payload.triggeredBy ?? "edge-function",
    generatedAt: new Date().toISOString(),
    notes: [
      "Integrate with SendGrid/Twilio per security spec.",
      "Extend to queueing service or retries if required.",
    ],
  };

  if (!dryRun && recipient.dealId) {
    const { error: eventError } = await supabase.from("deal_events").insert({
      deal_id: recipient.dealId,
      event_type: `notification.${payload.channel}`,
      payload: eventPayload,
      created_by: payload.triggeredBy
        ? payload.triggeredBy
        : recipient.userId ?? null,
    });

    if (eventError) {
      return errorResponse(
        "Failed to register notification event.",
        500,
        eventError.message
      );
    }
  }

  return jsonResponse({
    ok: true,
    dryRun,
    channel: payload.channel,
    template: payload.template,
    recipient,
  });
});
