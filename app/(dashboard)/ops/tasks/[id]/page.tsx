import { notFound } from "next/navigation";

import { TaskDetailView } from "@/app/(dashboard)/ops/_components/task-detail";
import { OPS_WORKFLOW_STATUS_MAP } from "@/lib/supabase/queries/operations";
import { getWorkspaceTaskById } from "@/lib/supabase/queries/tasks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";
import { resolveTaskGuardKey } from "@/lib/workflow/task-utils";
import { completeTaskFormAction } from "./actions";
import {
  evaluateClientDocumentChecklist,
  extractChecklistFromTaskPayload,
  type ClientDocumentChecklist,
  type ClientDocumentSummary,
} from "@/lib/workflow/documents-checklist";

type TaskPageParams = {
  params: Promise<{ id: string }>;
};

const DEAL_STORAGE_BUCKET = "deal-documents";
const CLIENT_STORAGE_BUCKET = "client-documents";

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
    documentType: string | null;
  } | null = null;
  let dealSummary: { id: string; dealNumber: string | null; clientId: string | null; vehicleId: string | null } | null = null;
  let clientChecklist: ClientDocumentChecklist | null = null;

  if (task.dealId) {
    const supabase = await createSupabaseServerClient();
    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select(
        "id, deal_number, client_id, customer_id, vehicle_id, payload, deal_documents (document_type, storage_path, title, metadata)",
      )
      .eq("id", task.dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[workflow] failed to load deal for task page", dealError);
    }

    if (dealRow) {
      const effectiveClientId = (dealRow.client_id as string | null) ?? (dealRow.customer_id as string | null) ?? null;
      dealSummary = {
        id: dealRow.id,
        dealNumber: dealRow.deal_number ?? null,
        clientId: effectiveClientId,
        vehicleId: dealRow.vehicle_id ?? null,
      };

      let clientDocuments: ClientDocumentSummary[] = [];
      if (effectiveClientId) {
        const { data: clientDocsData, error: clientDocsError } = await supabase
          .from("client_documents")
          .select("id, document_type, title, status, storage_path")
          .eq("client_id", effectiveClientId);

        if (clientDocsError) {
          console.error("[workflow] failed to load client documents for task page", clientDocsError);
        } else if (Array.isArray(clientDocsData)) {
          clientDocuments = clientDocsData as ClientDocumentSummary[];
        }
      }

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
        let resolvedDocumentType =
          guardEntry && typeof guardEntry.document_type === "string"
            ? (guardEntry.document_type as string)
            : null;

        if (Array.isArray(dealRow.deal_documents)) {
          const matchingDoc = dealRow.deal_documents.find((document: {
            document_type: string | null;
            storage_path: string | null;
            metadata: unknown;
          }) => {
            const metadata =
              document.metadata && typeof document.metadata === "object" && !Array.isArray(document.metadata)
                ? (document.metadata as Record<string, unknown>)
                : null;
            const metadataGuardKey =
              metadata && typeof metadata.guard_key === "string" ? (metadata.guard_key as string) : null;
            if (metadataGuardKey && metadataGuardKey === guardKey) {
              return true;
            }
            return document.document_type === guardKey && Boolean(document.storage_path);
          });

          attachmentPath = attachmentPath ?? matchingDoc?.storage_path ?? null;

          if (!resolvedDocumentType && matchingDoc) {
            const metadata =
              matchingDoc.metadata && typeof matchingDoc.metadata === "object" && !Array.isArray(matchingDoc.metadata)
                ? (matchingDoc.metadata as Record<string, unknown>)
                : null;
            const metadataDocType =
              metadata && typeof metadata.guard_document_type === "string"
                ? (metadata.guard_document_type as string)
                : null;
            resolvedDocumentType =
              metadataDocType ?? (matchingDoc.document_type ? (matchingDoc.document_type as string) : null);
          }
        }

        let attachmentUrl: string | null = null;
        if (attachmentPath != null) {
          const bucketsToTry = [CLIENT_STORAGE_BUCKET, DEAL_STORAGE_BUCKET];
          for (const bucket of bucketsToTry) {
            attachmentUrl = await createSignedStorageUrl({ bucket, path: attachmentPath });
            if (attachmentUrl) {
              break;
            }
          }
        }

        guardState = {
          note:
            guardEntry && typeof guardEntry.note === "string"
              ? (guardEntry.note as string)
              : null,
          attachmentPath,
          attachmentUrl,
          documentType: resolvedDocumentType ?? null,
        };

        const requiredChecklist = extractChecklistFromTaskPayload(task.payload ?? null);
        if (requiredChecklist.length > 0 && clientDocuments.length > 0) {
          clientChecklist = evaluateClientDocumentChecklist(requiredChecklist, clientDocuments);
        } else if (requiredChecklist.length > 0) {
          clientChecklist = {
            items: requiredChecklist.map((key) => ({
              key,
              normalizedType: null,
              label: key,
              fulfilled: false,
              matches: [],
            })),
            fulfilled: false,
          };
        }
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
      checklist={clientChecklist}
      deal={dealSummary}
      stageTitle={stageMeta?.title ?? null}
      completeAction={completeTaskFormAction}
    />
  );
}
