import { notFound } from "next/navigation";

import { TaskDetailView } from "@/app/(dashboard)/ops/_components/task-detail";
import { OPS_WORKFLOW_STATUS_MAP } from "@/lib/supabase/queries/operations";
import { getWorkspaceTaskById } from "@/lib/supabase/queries/tasks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";
import { resolveTaskGuardKey } from "@/lib/workflow/task-utils";
import { completeTaskFormAction } from "./actions";

type TaskPageParams = {
  params: Promise<{ id: string }>;
};

const STORAGE_BUCKET = "deal-documents";

export default async function TaskDetailPage({ params }: TaskPageParams) {
  const { id } = await params;
  const task = await getWorkspaceTaskById(id);

  if (!task) {
    notFound();
  }

  const guardKey = resolveTaskGuardKey(task);
  const stageMeta = task.workflowStageKey ? OPS_WORKFLOW_STATUS_MAP[task.workflowStageKey] : null;
  const guardMeta = guardKey && stageMeta
    ? stageMeta.exitGuards.find((guard) => guard.key === guardKey) ?? null
    : null;

  let guardState: {
    note: string | null;
    attachmentPath: string | null;
    attachmentUrl: string | null;
  } | null = null;
  let dealSummary: { id: string; dealNumber: string | null; clientId: string | null; vehicleId: string | null } | null = null;

  if (task.dealId) {
    const supabase = await createSupabaseServerClient();
    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select("id, deal_number, client_id, vehicle_id, payload, deal_documents (document_type, storage_path, title)")
      .eq("id", task.dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[workflow] failed to load deal for task page", dealError);
    }

    if (dealRow) {
      dealSummary = {
        id: dealRow.id,
        dealNumber: dealRow.deal_number ?? null,
        clientId: dealRow.client_id ?? null,
        vehicleId: dealRow.vehicle_id ?? null,
      };

      if (guardKey) {
        const guardBranch =
          dealRow.payload &&
          typeof dealRow.payload === "object" &&
          !Array.isArray(dealRow.payload) &&
          dealRow.payload.guard_tasks &&
          typeof dealRow.payload.guard_tasks === "object" &&
          !Array.isArray(dealRow.payload.guard_tasks)
            ? (dealRow.payload.guard_tasks as Record<string, unknown>)
            : null;
        const guardEntry =
          guardBranch && typeof guardBranch[guardKey] === "object" && guardBranch[guardKey] !== null
            ? (guardBranch[guardKey] as Record<string, unknown>)
            : null;

        let attachmentPath =
          guardEntry && typeof guardEntry.attachment_path === "string"
            ? (guardEntry.attachment_path as string)
            : null;

        if (!attachmentPath && Array.isArray(dealRow.deal_documents)) {
          const matchingDoc = dealRow.deal_documents.find(
            (document: { document_type: string | null; storage_path: string | null }) =>
              document.document_type === guardKey && document.storage_path,
          );
          attachmentPath = matchingDoc?.storage_path ?? null;
        }

        const attachmentUrl =
          attachmentPath != null
            ? await createSignedStorageUrl({ bucket: STORAGE_BUCKET, path: attachmentPath })
            : null;

        guardState = {
          note:
            guardEntry && typeof guardEntry.note === "string"
              ? (guardEntry.note as string)
              : null,
          attachmentPath,
          attachmentUrl,
        };
      }
    }
  }

  return (
    <TaskDetailView
      task={task}
      guardMeta={
        guardMeta
          ? {
              key: guardMeta.key,
              label: guardMeta.label,
              requiresDocument: Boolean(guardMeta.requiresDocument),
            }
          : null
      }
      guardState={guardState}
      deal={dealSummary}
      stageTitle={stageMeta?.title ?? null}
      completeAction={completeTaskFormAction}
    />
  );
}
