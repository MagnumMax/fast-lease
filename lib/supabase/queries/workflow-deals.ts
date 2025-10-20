import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  WorkflowDeal,
  WorkflowDealRepository,
} from "@/lib/workflow/service";

type DealRow = {
  id: string;
  workflow_id: string;
  workflow_version_id: string | null;
  status: string;
  payload: Record<string, unknown> | null;
};

function mapDeal(row: DealRow): WorkflowDeal {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    workflowVersionId: row.workflow_version_id,
    status: row.status,
    payload: row.payload,
  };
}

export function createSupabaseWorkflowDealRepository(
  client: SupabaseClient,
): WorkflowDealRepository {
  return {
    async getDealById(id) {
      const { data, error } = await client
        .from("deals")
        .select("id, workflow_id, workflow_version_id, status, payload")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return mapDeal(data as DealRow);
    },

    async updateDealStatus({
      dealId,
      previousStatus,
      status,
      workflowVersionId,
    }) {
      const { error } = await client
        .from("deals")
        .update({
          status,
          workflow_version_id: workflowVersionId,
        })
        .eq("id", dealId)
        .eq("status", previousStatus);

      if (error) {
        throw error;
      }
    },
  };
}
