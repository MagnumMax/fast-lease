"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Paperclip,
  UploadCloud,
  ClipboardCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OpsDealWorkflowTask } from "@/lib/supabase/queries/operations";

type DealStageTasksProps = {
  tasks: OpsDealWorkflowTask[];
  onUploadDocument?: (taskId: string) => void;
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

function renderDocumentChecklist(
  documentTasks: OpsDealWorkflowTask[],
  onUploadDocument?: (taskId: string) => void,
) {
  if (documentTasks.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-dashed border-amber-400/60 bg-amber-50/80 p-4 dark:border-amber-300/40 dark:bg-amber-500/10">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-semibold text-foreground">Чек-лист документов</p>
      </div>
      <ul className="space-y-3">
        {documentTasks.map((task) => {
          const isUploaded = Boolean(task.attachmentUrl || task.fulfilled);
          return (
            <li key={`doc-${task.id}`} className="flex flex-col gap-2 rounded-lg bg-white/70 p-3 shadow-sm dark:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isUploaded ? "success" : "warning"}
                    className="rounded-lg text-xs font-semibold"
                  >
                    {isUploaded ? "Загружено" : "Нет файла"}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">
                    {task.guardLabel ?? task.title}
                  </span>
                </div>
                {task.guardLabel && task.guardLabel !== task.title ? (
                  <p className="text-xs text-muted-foreground">{task.title}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isUploaded && task.attachmentUrl ? (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                  >
                    <Link href={task.attachmentUrl} target="_blank">
                      <Paperclip className="mr-2 h-3.5 w-3.5" />
                      Открыть файл
                    </Link>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant={isUploaded ? "outline" : "default"}
                  className="rounded-lg"
                  onClick={() => (onUploadDocument ? onUploadDocument(task.id) : undefined)}
                  asChild={!onUploadDocument}
                >
                  {onUploadDocument ? (
                    <>
                      <UploadCloud className="mr-2 h-3.5 w-3.5" />
                      {isUploaded ? "Заменить" : "Загрузить"}
                    </>
                  ) : (
                    <Link href={`/ops/tasks/${task.id}?focus=document`}>
                      <UploadCloud className="mr-2 h-3.5 w-3.5" />
                      {isUploaded ? "Заменить" : "Загрузить"}
                    </Link>
                  )}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DealStageTasks({ tasks, onUploadDocument }: DealStageTasksProps) {
  const documentTasks = useMemo(
    () => tasks.filter((task) => task.requiresDocument),
    [tasks],
  );

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
          const guardLabel = task.guardLabel ?? task.title;
          const note = task.note?.trim() ? task.note.trim() : null;

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
                  <p className="text-sm font-semibold text-foreground">{guardLabel}</p>
                  {task.guardLabel && task.guardLabel !== task.title ? (
                    <p className="text-xs text-muted-foreground">{task.title}</p>
                  ) : null}
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-lg">
                  <Link href={`/ops/tasks/${task.id}`}>Перейти к задаче</Link>
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {task.slaDueAt
                  ? renderMetaLine(
                      task.status === "DONE" ? "Завершена" : "SLA",
                      new Date(
                        task.status === "DONE" && task.completedAt ? task.completedAt : task.slaDueAt,
                      ).toLocaleString(),
                    )
                  : null}
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
            </div>
          );
        })}
      </div>

      {renderDocumentChecklist(documentTasks, onUploadDocument)}
    </div>
  );
}
