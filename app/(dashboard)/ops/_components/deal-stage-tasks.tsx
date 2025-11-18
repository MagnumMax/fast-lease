"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { AlertCircle, CheckCircle2, Clock3, FileText, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OpsDealWorkflowTask } from "@/lib/supabase/queries/operations";

type DealStageTasksProps = {
  tasks: OpsDealWorkflowTask[];
};

type StatusVariant = {
  icon: ReactNode;
  label: string;
  variant: "success" | "warning" | "secondary" | "danger";
};

function getStatusVariant(status: string): StatusVariant {
  const normalized = status.toUpperCase();
  if (normalized === "DONE") {
    return { icon: <CheckCircle2 className="h-4 w-4" />, label: "Завершена", variant: "success" };
  }
  if (normalized === "BLOCKED") {
    return { icon: <AlertCircle className="h-4 w-4" />, label: "Заблокирована", variant: "danger" };
  }
  if (normalized === "IN_PROGRESS") {
    return { icon: <Clock3 className="h-4 w-4" />, label: "В работе", variant: "secondary" };
  }
  return { icon: <Clock3 className="h-4 w-4" />, label: "Открыта", variant: "warning" };
}

function renderMetaLine(label: string, value: string | null) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <FileText className="h-3 w-3 shrink-0" />
      <span className="truncate">
        <span className="font-medium text-foreground/75">{label}: </span>
        {value}
      </span>
    </div>
  );
}

export function DealStageTasks({ tasks }: DealStageTasksProps) {
  if (!tasks.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Для текущего этапа нет активных задач. Как только workflow создаст задачу — она появится здесь.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {tasks.map((task) => {
          const statusMeta = getStatusVariant(task.status);
          const title = task.title?.trim() || "Без названия";
          const note = task.note?.trim() ? task.note.trim() : null;
          const hasMeta = Boolean(note || task.attachmentUrl);

          return (
            <div
              key={task.id}
              className="rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm transition hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusMeta.variant} className="flex items-center gap-1 rounded-lg">
                      {statusMeta.icon}
                      {statusMeta.label}
                    </Badge>
                    {task.requiresDocument ? (
                      <Badge variant="outline" className="rounded-lg text-xs font-medium">
                        Требуется документ
                      </Badge>
                    ) : null}
                    {task.slaDueAt ? (
                      <Badge variant="outline" className="rounded-lg text-xs font-semibold text-foreground/80">
                        SLA до {new Date(task.slaDueAt).toLocaleString()}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-lg">
                  <Link href={`/ops/tasks/${task.id}`}>Перейти к задаче</Link>
                </Button>
              </div>

              {hasMeta ? (
                <div className="mt-3 space-y-2">
                  {note ? renderMetaLine("Комментарий", note) : null}
                  {task.attachmentUrl ? (
                    <Link
                      href={task.attachmentUrl}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-xs font-medium text-brand-600 underline underline-offset-2"
                    >
                      <Paperclip className="h-3 w-3" />
                      Просмотреть вложение
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
