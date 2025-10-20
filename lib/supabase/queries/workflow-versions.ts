import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  WorkflowVersionRecord,
  WorkflowVersionRepository,
} from "@/lib/workflow/versioning";

type WorkflowVersionRow = {
  id: string;
  workflow_id: string;
  version: string;
  title: string;
  description: string | null;
  source_yaml: string;
  template: unknown;
  checksum: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

function mapRow(row: WorkflowVersionRow): WorkflowVersionRecord {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    version: row.version,
    title: row.title,
    description: row.description,
    sourceYaml: row.source_yaml,
    template: row.template as WorkflowVersionRecord["template"],
    checksum: row.checksum,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

async function requireNoError<T>(result: {
  data: T | null;
  error: unknown;
}): Promise<T | null> {
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export function createSupabaseWorkflowVersionRepository(
  client: SupabaseClient,
): WorkflowVersionRepository {
  return {
    async insert(input) {
      const { data, error } = await client
        .from("workflow_versions")
        .insert({
          workflow_id: input.workflowId,
          version: input.version,
          title: input.title,
          description: input.description,
          source_yaml: input.sourceYaml,
          template: input.template,
          checksum: input.checksum,
          created_by: input.createdBy,
          is_active: input.isActive,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return mapRow(data as WorkflowVersionRow);
    },

    async list(workflowId) {
      const { data, error } = await client
        .from("workflow_versions")
        .select()
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data as WorkflowVersionRow[]).map(mapRow);
    },

    async findActive(workflowId) {
      const data = await requireNoError(
        await client
          .from("workflow_versions")
          .select()
          .eq("workflow_id", workflowId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );

      return data ? mapRow(data as WorkflowVersionRow) : null;
    },

    async findByVersion(workflowId, version) {
      const data = await requireNoError(
        await client
          .from("workflow_versions")
          .select()
          .eq("workflow_id", workflowId)
          .eq("version", version)
          .maybeSingle(),
      );

      return data ? mapRow(data as WorkflowVersionRow) : null;
    },

    async findById(id) {
      const data = await requireNoError(
        await client
          .from("workflow_versions")
          .select()
          .eq("id", id)
          .maybeSingle(),
      );

      return data ? mapRow(data as WorkflowVersionRow) : null;
    },

    async markActive(workflowId, versionId) {
      const reset = await client
        .from("workflow_versions")
        .update({ is_active: false })
        .eq("workflow_id", workflowId);

      if (reset.error) {
        throw reset.error;
      }

      const activate = await client
        .from("workflow_versions")
        .update({ is_active: true })
        .eq("id", versionId)
        .select()
        .single();

      if (activate.error) {
        throw activate.error;
      }
    },
  };
}
