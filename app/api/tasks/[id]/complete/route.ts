import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { completeTaskRequestSchema } from "@/lib/workflow";
import { handleTaskCompletion, type TaskCompletionContext } from "@/lib/workflow/task-completion";
import { getSessionUser } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TraceContext = Record<string, unknown>;

function createTracer(scope: string, baseContext: TraceContext) {
  const startedAt = Date.now();
  let lastMark = startedAt;

  return (step: string, extra: TraceContext = {}) => {
    const now = Date.now();
    const entry = {
      tag: "trace",
      scope,
      step,
      elapsedMs: now - startedAt,
      deltaMs: now - lastMark,
      ...baseContext,
      ...extra,
    };
    console.log(JSON.stringify(entry));
    lastMark = now;
  };
}


export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const trace = createTracer("task-complete-api", { taskId: id });
  trace("start");
  const payload = await request.json().catch(() => null);
  const parsed = completeTaskRequestSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServiceClient();
  const sessionUser = await getSessionUser();
  const canOverrideAssignment = sessionUser?.roles.some((role) => role === "ADMIN" || role === "OP_MANAGER") ?? false;

  if (!sessionUser) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // Загружаем существующую задачу
  const existing = await supabase
    .from("tasks")
    .select(
      "id, deal_id, type, title, status, assignee_role, assignee_user_id, sla_due_at, completed_at, sla_status, payload, created_at, updated_at",
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
    trace("task-not-found");
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (
    existing.data.assignee_user_id &&
    existing.data.assignee_user_id !== sessionUser.user.id &&
    !canOverrideAssignment
  ) {
    return NextResponse.json(
      { error: "Task reserved for another user" },
      { status: 403 },
    );
  }

  trace("task-loaded", {
    status: existing.data.status,
    hasAssignee: Boolean(existing.data.assignee_user_id),
    assigneeRole: existing.data.assignee_role,
  });

  if (existing.data.status === "DONE") {
    trace("task-already-done");
    return NextResponse.json(existing.data);
  }

  // Объединяем payload задачи
  const newPayload = { ...(existing.data.payload ?? {}), ...parsed.data.payload };

  let effectiveAssigneeUserId = existing.data.assignee_user_id ?? sessionUser.user.id;

  if (!existing.data.assignee_user_id) {
    const claimResult = await supabase
      .from("tasks")
      .update({ assignee_user_id: sessionUser.user.id })
      .eq("id", id)
      .eq("status", existing.data.status)
      .is("assignee_user_id", null)
      .select("assignee_user_id")
      .maybeSingle();

    if (claimResult.error) {
      console.error("[workflow] failed to claim task before completion", claimResult.error);
      return NextResponse.json(
        { error: "Failed to claim task" },
        { status: 500 },
      );
    }

    if (!claimResult.data) {
      trace("task-claim-conflict");
      return NextResponse.json(
        { error: "Task has been claimed or updated by another user" },
        { status: 409 },
      );
    }

    effectiveAssigneeUserId = sessionUser.user.id;
    existing.data.assignee_user_id = sessionUser.user.id;
  }

  // Загружаем информацию о сделке для контекста
  const dealId = existing.data.deal_id;
  if (!dealId) {
    console.warn("[workflow] skipped task completion: missing deal id for task", {
      taskId: existing.data.id,
    });
    return NextResponse.json({ error: "Task is not associated with a deal" }, { status: 400 });
  }

  const { data: dealRow, error: dealError } = await supabase
    .from("deals")
    .select("payload, status")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) {
    console.error("[workflow] failed to load deal for task completion", dealError);
    return NextResponse.json(
      { error: "Failed to load associated deal" },
      { status: 500 },
    );
  }

  if (!dealRow) {
    trace("deal-not-found", { taskId: id });
    return NextResponse.json({ error: "Associated deal not found" }, { status: 404 });
  }
  trace("deal-loaded", { dealId, status: dealRow.status });

  // Используем новую функцию handleTaskCompletion
  const completionContext: TaskCompletionContext = {
    taskId: id,
    dealId,
    taskType: existing.data.type,
    assigneeRole: existing.data.assignee_role,
    assigneeUserId: effectiveAssigneeUserId,
    taskPayload: newPayload,
    slaDueAt: existing.data.sla_due_at,
    currentDealStatus: dealRow.status,
    dealPayload: (dealRow.payload as Record<string, unknown> | null) ?? null,
    actorRoles: sessionUser.roles,
  };

  trace("handler-start");
  const result = await handleTaskCompletion(completionContext);
  trace("handler-finish", {
    transitionAttempted: result.transitionAttempted,
    transitionSuccess: result.transitionSuccess ?? null,
    transitionError: result.error ?? null,
    newStatus: result.newStatus ?? null,
  });

  if (!result.taskUpdated) {
    return NextResponse.json(
      { error: result.error || "Failed to complete task" },
      { status: 500 },
    );
  }

  // Получаем обновленную информацию о задаче для ответа
  const { data: updatedTask } = await supabase
    .from("tasks")
    .select(
      "id, deal_id, type, title, status, assignee_role, assignee_user_id, sla_due_at, completed_at, sla_status, payload, created_at, updated_at",
    )
    .eq("id", id)
    .single();
  trace("response-ready", { updatedStatus: updatedTask?.status, dealId });

  // Логируем результат перехода
  if (result.transitionAttempted) {
    if (result.transitionSuccess) {
      console.log("[workflow] task completion triggered successful transition", {
        taskId: id,
        dealId,
        newStatus: result.newStatus,
      });
    } else {
      console.log("[workflow] task completion transition attempt failed", {
        taskId: id,
        dealId,
        error: result.error,
      });
    }
  }

  console.log("[workflow] Task completion API finished", {
    taskId: id,
    dealId,
    transitionAttempted: result.transitionAttempted,
    transitionSuccess: result.transitionSuccess,
    newStatus: result.newStatus,
    error: result.error,
  });
  return NextResponse.json({
    ...updatedTask,
    workflow_transition: {
      attempted: result.transitionAttempted,
      success: result.transitionSuccess,
      newStatus: result.newStatus,
      error: result.error,
    },
  });
}
