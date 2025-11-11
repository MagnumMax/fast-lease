import { cache } from "react";

import type { AppRole, PortalCode } from "@/lib/auth/types";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

export type PortalRoleAssignment = {
  user_id: string;
  role: AppRole;
  portal: PortalCode;
  portal_status: string | null;
  last_access_at: string | null;
  assigned_at: string | null;
};

export const listPortalRoleAssignments = cache(
  async (userId?: string): Promise<PortalRoleAssignment[]> => {
    const supabase = await createSupabaseServerClient();

    let query = supabase.from("view_portal_roles").select(
      "user_id, role, portal, portal_status, last_access_at, assigned_at",
    );

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[portal-admin] failed to load assignments", error);
      return [];
    }

    return (data ?? []) as PortalRoleAssignment[];
  },
);

type AuditPayload = {
  actorUserId: string;
  targetUserId: string;
  action: string;
  metadata?: Record<string, unknown>;
};

export async function logPortalAdminAction({
  actorUserId,
  targetUserId,
  action,
  metadata = {},
}: AuditPayload) {
  try {
    const supabase = await createSupabaseServiceClient();
    const { error } = await supabase.from("admin_portal_audit").insert({
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      action,
      metadata,
    });

    if (error) {
      console.error("[portal-admin] Failed to log admin action", error);
    }
  } catch (error) {
    console.error("[portal-admin] audit logging crashed", error);
  }
}
