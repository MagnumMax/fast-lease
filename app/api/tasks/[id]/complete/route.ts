import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { completeTaskRequestSchema } from "@/lib/workflow";
import { handleTaskCompletion, type TaskCompletionContext } from "@/lib/workflow/task-completion";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};


export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  console.log("[workflow] Task completion API called", { taskId: id });
  const payload = await request.json().catch(() => null);
  const parsed = completeTaskRequestSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServiceClient();

  // Загружаем существующую задачу
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

  // Объединяем payload задачи
  const newPayload = { ...(existing.data.payload ?? {}), ...parsed.data.payload };

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
    return NextResponse.json({ error: "Associated deal not found" }, { status: 404 });
  }

  // Используем новую функцию handleTaskCompletion
  const completionContext: TaskCompletionContext = {
    taskId: id,
    dealId,
    taskType: existing.data.type,
    assigneeRole: existing.data.assignee_role,
    assigneeUserId: existing.data.assignee_user_id,
    taskPayload: newPayload,
    currentDealStatus: dealRow.status,
    dealPayload: (dealRow.payload as Record<string, unknown> | null) ?? null,
  };

  const result = await handleTaskCompletion(completionContext);

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
      "id, deal_id, type, status, assignee_role, assignee_user_id, sla_due_at, payload, created_at, updated_at",
    )
    .eq("id", id)
    .single();

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
