import { NextResponse } from "next/server";

import type { AppRole } from "@/lib/auth/types";
import {
  OPS_DEAL_STATUS_ORDER,
  OPS_WORKFLOW_STATUS_EXIT_ROLE,
  OPS_WORKFLOW_STATUS_MAP,
  WORKFLOW_ROLE_LABELS,
} from "@/lib/data/operations/deals";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { completeTaskRequestSchema, createWorkflowService } from "@/lib/workflow";
import { WorkflowTransitionError } from "@/lib/workflow/state-machine";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function clonePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

const TASK_GUARD_FALLBACK: Record<string, string> = {
  CONFIRM_CAR: "tasks.confirmCar.completed",
  PREPARE_QUOTE: "quotationPrepared",
  VERIFY_VEHICLE: "vehicle.verified",
  COLLECT_DOCS: "docs.required.allUploaded",
  AECB_CHECK: "risk.approved",
  FIN_CALC: "finance.approved",
  INVESTOR_APPROVAL: "investor.approved",
  PREPARE_CONTRACT: "legal.contractReady",
  RECEIVE_ADVANCE: "payments.advanceReceived",
  PAY_SUPPLIER: "payments.supplierPaid",
  ARRANGE_DELIVERY: "delivery.confirmed",
};

type WorkflowPayloadWithGuards = Record<string, unknown> & {
  tasks: Record<string, unknown>;
  guard_tasks: Record<string, unknown>;
};

function ensureWorkflowPayloadBranches(
  payload: Record<string, unknown> | null | undefined,
): WorkflowPayloadWithGuards {
  const base = clonePayload(payload);
  const tasksBranch =
    base.tasks && typeof base.tasks === "object" && !Array.isArray(base.tasks)
      ? (base.tasks as Record<string, unknown>)
      : {};
  const guardTasksBranch =
    base.guard_tasks && typeof base.guard_tasks === "object" && !Array.isArray(base.guard_tasks)
      ? (base.guard_tasks as Record<string, unknown>)
      : {};
  base.tasks = tasksBranch;
  base.guard_tasks = guardTasksBranch;
  return base as WorkflowPayloadWithGuards;
}

function resolveGuardKey(
  taskType: string | null | undefined,
  taskPayload: Record<string, unknown> | null | undefined,
): string | null {
  const payloadGuard =
    taskPayload && typeof taskPayload.guard_key === "string"
      ? (taskPayload.guard_key as string)
      : null;
  if (payloadGuard) {
    return payloadGuard;
  }

  if (!taskType || typeof taskType !== "string") {
    return null;
  }

  return TASK_GUARD_FALLBACK[taskType] ?? null;
}

function setNestedGuardFlag(target: Record<string, unknown>, guardKey: string): void {
  if (!guardKey) return;
  const segments = guardKey.split(".").filter((segment) => segment.length > 0);
  if (segments.length === 0) return;

  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const next = cursor[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]] = true;
}

function deriveTaskStorageKey(guardKey: string): string {
  if (guardKey.startsWith("tasks.")) {
    const [, taskKey] = guardKey.split(".");
    if (taskKey) {
      return taskKey;
    }
  }
  return guardKey.replace(/[^a-zA-Z0-9]/g, "_");
}

function normalizeStatusKey(value: string | null | undefined) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const upper = value.toUpperCase() as keyof typeof OPS_WORKFLOW_STATUS_MAP;
  if (upper in OPS_WORKFLOW_STATUS_MAP) {
    return upper;
  }
  return null;
}

function determineNextStatus(statusKey: keyof typeof OPS_WORKFLOW_STATUS_MAP) {
  const index = OPS_DEAL_STATUS_ORDER.indexOf(statusKey);
  if (index === -1 || index >= OPS_DEAL_STATUS_ORDER.length - 1) {
    return null;
  }
  return OPS_DEAL_STATUS_ORDER[index + 1];
}

function normalizeAppRole(value: string | null | undefined): AppRole | null {
  if (!value) {
    return null;
  }
  const upper = value.toUpperCase();
  return upper in WORKFLOW_ROLE_LABELS ? (upper as AppRole) : null;
}

async function autoTransitionOnTaskCompletion(params: {
  dealId: string;
  currentStatus: string | null | undefined;
  guardKey: string;
  guardContext: Record<string, unknown>;
  assigneeRole?: string | null;
  actorId?: string | null;
}) {
  const statusKey = normalizeStatusKey(params.currentStatus);
  if (!statusKey) {
    return;
  }

  const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];
  const guardMatches = statusMeta.exitGuards.some((guard) => guard.key === params.guardKey);
  if (!guardMatches) {
    return;
  }

  const targetStatus = determineNextStatus(statusKey);
  if (!targetStatus) {
    return;
  }

  const actorRole =
    normalizeAppRole(params.assigneeRole) ??
    OPS_WORKFLOW_STATUS_EXIT_ROLE[statusKey] ??
    "OP_MANAGER";

  try {
    const workflowService = await createWorkflowService();
    await workflowService.transitionDeal({
      dealId: params.dealId,
      targetStatus,
      actorRole,
      actorId: params.actorId ?? undefined,
      guardContext: params.guardContext,
    });
  } catch (error) {
    if (error instanceof WorkflowTransitionError) {
      if (error.validation.reason === "GUARD_FAILED") {
        console.info(
          "[workflow] guard conditions not yet met for auto transition",
          {
            dealId: params.dealId,
            targetStatus,
            failedGuards: error.validation.failedGuards,
          },
        );
      } else if (error.validation.reason === "UNKNOWN_TRANSITION") {
        console.warn("[workflow] no transition available for auto step", {
          dealId: params.dealId,
          from: statusKey,
          to: targetStatus,
        });
      } else {
        console.warn("[workflow] auto transition rejected", error.validation);
      }
    } else {
      console.error("[workflow] failed to auto transition", error);
    }
  }
}

function mergePayload(
  existing: Record<string, unknown> | null,
  incoming?: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!incoming) {
    return existing ?? null;
  }

  return { ...(existing ?? {}), ...incoming };
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = completeTaskRequestSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServiceClient();

  const existing = await supabase
    .from("tasks")
    .select(
      "id, deal_id, type, status, assignee_role, assignee_user_id, sla_due_at, payload, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (existing.error) {
    console.error("[workflow] failed to load task", existing.error);
    return NextResponse.json(
      { error: "Failed to load task" },
      { status: 500 },
    );
  }

  if (!existing.data) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (existing.data.status === "DONE") {
    return NextResponse.json(existing.data);
  }

  const newPayload = mergePayload(existing.data.payload, parsed.data.payload);

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "DONE", payload: newPayload })
    .eq("id", id)
    .select(
      "id, deal_id, type, status, assignee_role, assignee_user_id, sla_due_at, payload, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("[workflow] failed to complete task", error);
    return NextResponse.json(
      { error: "Failed to complete task" },
      { status: 500 },
    );
  }

  const taskPayload = (data.payload ?? null) as Record<string, unknown> | null;
  const statusKeyRaw =
    typeof taskPayload?.["status_key"] === "string"
      ? (taskPayload["status_key"] as string)
      : null;

  const guardKey = resolveGuardKey(
    (data as { type?: string | null })?.type ?? existing.data.type,
    taskPayload,
  );

  if (guardKey) {
    const dealId =
      typeof data.deal_id === "string" && data.deal_id.length > 0
        ? (data.deal_id as string)
        : existing.data.deal_id;

    if (!dealId) {
      console.warn("[workflow] skipped payload update: missing deal id for task", {
        taskId: data.id,
      });
      return NextResponse.json(data);
    }

    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select("payload, status")
      .eq("id", dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[workflow] failed to load deal for task completion", dealError);
    } else if (dealRow) {
      const dealPayload = ensureWorkflowPayloadBranches(
        (dealRow.payload as Record<string, unknown> | null | undefined) ?? null,
      );
      const taskStorageKey = deriveTaskStorageKey(guardKey);
      const currentEntry = dealPayload.tasks[taskStorageKey];
      const entryBase =
        currentEntry && typeof currentEntry === "object" && !Array.isArray(currentEntry)
          ? (currentEntry as Record<string, unknown>)
          : {};

      const completedAt = new Date().toISOString();

      setNestedGuardFlag(dealPayload, guardKey);

      dealPayload.tasks[taskStorageKey] = {
        ...entryBase,
        completed: true,
        completed_at: completedAt,
        task_type: data.type,
        task_id: data.id,
        status_key: statusKeyRaw,
      };

      const guardCurrent = dealPayload.guard_tasks[guardKey];
      const guardBase =
        guardCurrent && typeof guardCurrent === "object" && !Array.isArray(guardCurrent)
          ? (guardCurrent as Record<string, unknown>)
          : {};

      dealPayload.guard_tasks[guardKey] = {
        ...guardBase,
        fulfilled: true,
        completed_at: completedAt,
        task_type: data.type,
        task_id: data.id,
        status_key: statusKeyRaw,
      };

      const { error: payloadUpdateError } = await supabase
        .from("deals")
        .update({ payload: dealPayload })
        .eq("id", dealId);

      if (payloadUpdateError) {
        console.error("[workflow] failed to persist task completion flag", payloadUpdateError);
      } else {
        await autoTransitionOnTaskCompletion({
          dealId,
          currentStatus: (dealRow.status as string | null | undefined) ?? null,
          guardKey,
          guardContext: dealPayload,
          assigneeRole: (existing.data.assignee_role as string | null | undefined) ?? null,
          actorId: (existing.data.assignee_user_id as string | null | undefined) ?? null,
        });
      }
    }
  }

  return NextResponse.json(data);
}
