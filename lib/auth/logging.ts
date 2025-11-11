import { headers } from "next/headers";

import type { AppRole, PortalCode } from "@/lib/auth/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type AuthLogStatus = "success" | "failure";

type AuthLogPayload = {
  portal: PortalCode;
  identity: string;
  status: AuthLogStatus;
  userId?: string | null;
  errorCode?: string;
  roles?: AppRole[];
  metadata?: Record<string, unknown>;
};

export async function logAuthEvent(payload: AuthLogPayload) {
  try {
    const serviceClient = await createSupabaseServiceClient();
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for") ?? "";
    const ip = forwardedFor.split(",")[0]?.trim() || null;
    const userAgent = requestHeaders.get("user-agent");

    const insertPayload = {
      portal: payload.portal,
      identity: payload.identity,
      status: payload.status,
      user_id: payload.userId ?? null,
      error_code: payload.errorCode ?? null,
      ip,
      user_agent: userAgent,
      role_snapshot: payload.roles ?? [],
      metadata: payload.metadata ?? {},
    };

    await serviceClient.from("auth_login_events").insert(insertPayload);
  } catch (error) {
    console.error("[auth] Failed to log auth event", {
      payload,
      error,
    });
  }
}
