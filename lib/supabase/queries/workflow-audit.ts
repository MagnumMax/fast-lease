import type { SupabaseClient } from "@supabase/supabase-js";

import type { WorkflowAuditLogger } from "@/lib/workflow/service";

export function createSupabaseWorkflowAuditLogger(
  client: SupabaseClient,
): WorkflowAuditLogger {
  return {
    async logTransition(entry) {
      const { error } = await client.from("audit_log").insert({
        deal_id: entry.dealId,
        actor_user_id: entry.actorId ?? null,
        action: "STATUS_CHANGED",
        from_status: entry.fromStatus,
        to_status: entry.toStatus,
        metadata: {
          actorRole: entry.actorRole,
          workflowVersionId: entry.workflowVersionId,
          context: entry.context,
        },
      });

      if (error) {
        throw error;
      }
    },
  };
}
