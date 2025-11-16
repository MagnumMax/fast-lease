"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState, type ChangeEvent, type JSX } from "react";

import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, Paperclip, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkspaceTask } from "@/lib/supabase/queries/tasks";
import { buildSlugWithId } from "@/lib/utils/slugs";
import { Textarea } from "@/components/ui/textarea";
import {
  CLIENT_DOCUMENT_TYPES,
  getClientDocumentLabel,
  normalizeClientDocumentType,
} from "@/lib/supabase/queries/operations";
import { sortDocumentOptions } from "@/lib/documents/options";
import { filterChecklistTypes, type ClientDocumentChecklist } from "@/lib/workflow/documents-checklist";

import type { FormStatus } from "@/app/(dashboard)/ops/tasks/[id]/actions";

type TaskDetailViewProps = {
  task: WorkspaceTask;
  guardMeta: { key: string; label: string; requiresDocument: boolean } | null;
  guardState: {
    note: string | null;
    attachmentPath: string | null;
    attachmentUrl: string | null;
    documentType: string | null;
  } | null;
  checklist: ClientDocumentChecklist | null;
  deal: { id: string; dealNumber: string | null; clientId: string | null; vehicleId: string | null } | null;
  stageTitle: string | null;
  guardDocuments: GuardDocumentLink[];
  completeAction: (state: FormStatus, formData: FormData) => Promise<FormStatus>;
};

type TaskFieldDefinition = {
  id: string;
  type?: string;
  label?: string;
  required?: boolean;
  hint?: string;
};

type SchemaPayload = {
  fields?: TaskFieldDefinition[];
};

type TaskPayload = {
  schema?: SchemaPayload;
  fields?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
};

type GuardDocumentLink = {
  id: string;
  title: string | null;
  documentType: string | null;
  storagePath?: string | null;
  url: string | null;
};

type DocumentDraft = {
  id: string;
  type: string;
  fileName: string | null;
  hasFile: boolean;
};

const INITIAL_STATE: FormStatus = { status: "idle" };
const EMPTY_DOCUMENT_TYPE_VALUE = "__empty__";
const CLIENT_DOCUMENT_ACCEPT_TYPES = ".pdf,.png,.jpg,.jpeg";

function createDocumentDraft(): DocumentDraft {
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `draft-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    type: "",
    fileName: null,
    hasFile: false,
  };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function resolveFieldValue(fieldId: string, payload: TaskPayload | undefined): string {
  if (!payload) return "";
  const fields = payload.fields ?? {};
  const defaults = payload.defaults ?? {};

  const candidate = fields[fieldId] ?? defaults[fieldId];
  if (fieldId === "checklist") {
    const normalized = normalizeChecklistCandidate(candidate);
    if (normalized) {
      const filtered = filterChecklistTypes(normalized);
      return JSON.stringify(filtered);
    }
  }
  if (candidate == null) return "";
  if (typeof candidate === "string") return candidate;
  if (typeof candidate === "number") return candidate.toString();
  return JSON.stringify(candidate);
}

function normalizeChecklistCandidate(candidate: unknown): string[] | null {
  if (Array.isArray(candidate)) {
    return candidate.filter((value): value is string => typeof value === "string");
  }
  if (typeof candidate === "string") {
    try {
      const parsed = JSON.parse(candidate);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function getTaskStatusMeta(status: string): { label: string; variant: "success" | "warning" | "secondary"; icon: JSX.Element } {
  const normalized = status.toUpperCase();
  if (normalized === "DONE") {
    return { label: "Завершена", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> };
  }
  if (normalized === "IN_PROGRESS") {
    return { label: "В работе", variant: "secondary", icon: <Clock3 className="h-3 w-3" /> };
  }
  return { label: "Открыта", variant: "warning", icon: <Clock3 className="h-3 w-3" /> };
}

function isEditableField(field: TaskFieldDefinition): boolean {
  const type = field.type?.toLowerCase();
  if (!type) return true;
  return type !== "badge";
}

export function TaskDetailView({
  task,
  guardMeta,
  guardState,
  checklist,
  deal,
  stageTitle,
  guardDocuments,
  completeAction,
}: TaskDetailViewProps) {
  const [formState, formAction, pending] = useActionState(completeAction, INITIAL_STATE);
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraft[]>([createDocumentDraft()]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const payload = (task.payload as TaskPayload | undefined) ?? undefined;
  const schemaFields = Array.isArray(payload?.schema?.fields) ? payload?.schema?.fields ?? [] : [];
  const editableFields = schemaFields.filter((field) => isEditableField(field));
  const sortedDocumentTypeOptions = useMemo(() => sortDocumentOptions(CLIENT_DOCUMENT_TYPES), []);

  const statusMeta = getTaskStatusMeta(task.status);
  const slaInfo = task.slaDueAt ? formatDate(task.slaDueAt) : null;
  const completedInfo = task.completedAt ? formatDate(task.completedAt) : null;
  const requiresDocument = guardMeta?.requiresDocument ?? false;
  const hasExistingAttachment = Boolean(guardState?.attachmentUrl);
  const hasAnyNewFiles = documentDrafts.some((draft) => draft.hasFile);
  const mustProvideDocument = requiresDocument && !hasExistingAttachment;
  const hasForm = task.status !== "DONE";
  const isCompletedWorkflow = !hasForm && task.isWorkflow;
  const guardDocumentLinks = Array.isArray(guardDocuments) ? guardDocuments : [];
  const hasGuardDocuments = guardDocumentLinks.length > 0;
  const hasGuardAttachmentLink = Boolean(guardState?.attachmentUrl);
  const dealSlug = deal ? buildSlugWithId(deal.dealNumber ?? null, deal.id) || deal.id : null;
  const clientSlug = deal?.clientId
    ? buildSlugWithId(task.dealClientName ?? null, deal.clientId) || deal.clientId
    : null;
  const vehicleSlug = deal?.vehicleId
    ? buildSlugWithId(task.dealVehicleName ?? null, deal.vehicleId) || deal.vehicleId
    : null;
  const guardDocumentTypeLabel = guardState?.documentType
    ? getClientDocumentLabel(guardState.documentType) ?? guardState.documentType
    : null;
  const showDocumentWarning = mustProvideDocument && !hasAnyNewFiles;

  function registerFileInput(id: string, node: HTMLInputElement | null) {
    fileInputRefs.current[id] = node;
  }

  function handleDraftTypeChange(id: string, value: string) {
    setDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, type: value === EMPTY_DOCUMENT_TYPE_VALUE ? "" : value } : draft)),
    );
  }

  function handleDraftFileChange(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setDocumentDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id ? { ...draft, fileName: file ? file.name : null, hasFile: Boolean(file) } : draft,
      ),
    );
  }

  function clearDraftFile(id: string) {
    const input = fileInputRefs.current[id];
    if (input) {
      input.value = "";
    }
    setDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, fileName: null, hasFile: false } : draft)),
    );
  }

  function addDocumentDraft() {
    setDocumentDrafts((prev) => [...prev, createDocumentDraft()]);
  }

  function removeDocumentDraft(id: string) {
    setDocumentDrafts((prev) => {
      const next = prev.filter((draft) => draft.id !== id);
      return next.length > 0 ? next : [createDocumentDraft()];
    });
    delete fileInputRefs.current[id];
  }

  function resolveDocumentLabel(doc: GuardDocumentLink): string {
    const rawTitle = doc.title?.trim();
    const fileName = getFileNameFromPath(doc.storagePath);
    const hasCustomTitle = rawTitle && rawTitle.toLowerCase() !== "другой документ";

    return (
      (hasCustomTitle ? rawTitle : null) ??
      fileName ??
      getClientDocumentLabel(doc.documentType ?? undefined) ??
      doc.documentType ??
      "Документ"
    );
  }

  function getFileNameFromPath(path?: string | null): string | null {
    if (!path) return null;
    const normalized = path.split("/").filter(Boolean).pop();
    return normalized ?? null;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex">
        <Button asChild variant="ghost" size="sm" className="rounded-lg px-2 py-1 text-sm font-medium">
          <Link href="/ops/tasks" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Link>
        </Button>
      </div>
      <Card className="border-border/80 bg-card/80 backdrop-blur">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl font-semibold">{task.title}</CardTitle>
            <Badge variant={statusMeta.variant} className="flex items-center gap-1 rounded-lg">
              {statusMeta.icon}
              {statusMeta.label}
            </Badge>
          </div>
          <CardDescription>
            {stageTitle ? `Этап: ${stageTitle}` : "Задача workflow"}
            {task.assigneeRole ? ` • Ответственный: ${task.assigneeRole}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {deal ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground/80">Сделка:</span>
              <Link
                href={dealSlug ? `/ops/deals/${dealSlug}` : `/ops/deals/${deal.id}`}
                className="text-xs font-semibold uppercase tracking-wide text-brand-600 underline underline-offset-2"
              >
                {deal.dealNumber ?? deal.id.slice(0, 8)}
              </Link>
            </div>
          ) : null}
          {task.isWorkflow && (deal?.clientId || deal?.vehicleId) ? (
            <div className="flex flex-col gap-2">
              {deal?.clientId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground/80">Клиент:</span>
                  <Link
                    href={
                      clientSlug ? `/ops/clients/${clientSlug}` : `/ops/clients/${deal.clientId}`
                    }
                    className="text-xs font-semibold uppercase tracking-wide text-brand-600 underline underline-offset-2"
                  >
                    {task.dealClientName ?? deal.clientId.slice(0, 8)}
                  </Link>
                </div>
              ) : null}
              {deal?.vehicleId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground/80">Авто:</span>
                  <Link
                    href={
                      vehicleSlug ? `/ops/cars/${vehicleSlug}` : `/ops/cars/${deal.vehicleId}`
                    }
                    className="text-xs font-semibold uppercase tracking-wide text-brand-600 underline underline-offset-2"
                  >
                    {task.dealVehicleName ?? deal.vehicleId.slice(0, 8)}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
          {slaInfo ? (
            <div className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>SLA: {slaInfo}</span>
            </div>
          ) : null}
          {completedInfo && task.status === "DONE" ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Завершена: {completedInfo}</span>
            </div>
          ) : null}
          {hasGuardAttachmentLink && !hasGuardDocuments ? (
            <Link
              href={guardState?.attachmentUrl ?? "#"}
              target="_blank"
              className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 underline underline-offset-2"
            >
              <Paperclip className="h-3 w-3" />
              Просмотреть текущее вложение
            </Link>
          ) : null}
          {guardDocumentTypeLabel ? (
            <p className="text-xs text-muted-foreground">Тип документа: {guardDocumentTypeLabel}</p>
          ) : null}
          {checklist && checklist.items.length > 0 ? (
            <div className="mt-4 space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span>Чек-лист клиента</span>
                <Badge variant={checklist.fulfilled ? "success" : "secondary"} className="rounded-lg text-[11px]">
                  {checklist.fulfilled ? "Готово" : "Ожидает"}
                </Badge>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {checklist.items.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-3 rounded-md bg-background/40 px-3 py-2 text-foreground"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span>
                        {item.fulfilled
                          ? `Загружено файлов: ${item.matches.length}`
                          : "Документ отсутствует"}
                      </span>
                    </div>
                    <Badge variant={item.fulfilled ? "success" : "secondary"} className="rounded-lg text-[11px]">
                      {item.fulfilled ? "OK" : "Нет"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/80 backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg font-semibold">Выполнение задачи</CardTitle>
          <CardDescription>
            Заполните необходимые поля и приложите подтверждающие документы, чтобы завершить задачу
            и разблокировать переход по workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formState.status === "success" ? (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {formState.message ?? "Задача успешно завершена"}
            </div>
          ) : null}
          {formState.status === "error" ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formState.message ?? "Не удалось завершить задачу. Попробуйте снова."}
            </div>
          ) : null}

          {hasForm ? (
            <form action={formAction} className="space-y-5">
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="requiresDocument" value={requiresDocument ? "true" : "false"} />
              <input type="hidden" name="initialNote" value={guardState?.note ?? ""} />
              {task.dealId ? <input type="hidden" name="dealId" value={task.dealId} /> : null}
              {guardMeta ? <input type="hidden" name="guardKey" value={guardMeta.key} /> : null}
              {guardMeta ? <input type="hidden" name="guardLabel" value={guardMeta.label} /> : null}

              {editableFields.length > 0 ? (
                <div className="space-y-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Поля для заполнения
                  </span>
                  <div className="space-y-3">
                    {editableFields.map((field) => {
                      const fieldId = field.id;
                      const value = resolveFieldValue(fieldId, payload);
                      const label = field.label ?? fieldId;
                      const hint = field.hint ?? "";
                      const type = field.type?.toLowerCase();

                      if (type === "textarea") {
                        return (
                          <div key={fieldId} className="space-y-2">
                            <Label htmlFor={`field-${fieldId}`}>{label}</Label>
                            <Textarea
                              id={`field-${fieldId}`}
                              name={`field:${fieldId}`}
                              defaultValue={value}
                              required={field.required ?? false}
                              placeholder={hint}
                              className="min-h-[120px] rounded-lg"
                            />
                            {hint ? (
                              <p className="text-xs text-muted-foreground">
                                {hint}
                              </p>
                            ) : null}
                          </div>
                        );
                      }

                      if (type === "checklist") {
                        const parsedChecklist = normalizeChecklistCandidate(value);
                        const checklist = parsedChecklist ? filterChecklistTypes(parsedChecklist) : [];
                        return (
                          <div key={fieldId} className="space-y-2">
                            <Label htmlFor={`field-${fieldId}`}>{label}</Label>
                            <input
                              type="hidden"
                              id={`field-${fieldId}`}
                              name={`field:${fieldId}`}
                              value={JSON.stringify(checklist)}
                            />
                            {checklist.length > 0 ? (
                              <div className="flex flex-wrap gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                                {checklist.map((item) => (
                                  <Badge key={item} variant="secondary" className="rounded-lg text-xs">
                                    {getClientDocumentLabel(item) ?? item}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                                Чек-лист пуст.
                              </p>
                            )}
                            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
                          </div>
                        );
                      }

                      return (
                        <div key={fieldId} className="space-y-2">
                          <Label htmlFor={`field-${fieldId}`}>{label}</Label>
                          <Input
                            id={`field-${fieldId}`}
                            name={`field:${fieldId}`}
                            defaultValue={value}
                            required={field.required ?? false}
                            placeholder={hint}
                            className="rounded-lg"
                          />
                          {hint ? (
                            <p className="text-xs text-muted-foreground">{hint}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="task-note">Комментарий</Label>
                <Textarea
                  id="task-note"
                  name="note"
                  defaultValue={guardState?.note ?? ""}
                  placeholder="Добавьте детали выполнения или важные замечания"
                  className="min-h-[120px] rounded-lg"
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Загрузка документов
                  </span>
                  {showDocumentWarning ? (
                    <Badge variant="danger" className="rounded-lg text-[11px]">
                      Требуется документ
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {documentDrafts.map((draft) => {
                    const namePrefix = `documents[${draft.id}]`;
                    return (
                      <div
                        key={draft.id}
                        className="space-y-3 rounded-xl border border-dashed border-border/60 bg-muted/20 p-4"
                      >
                        <div className="grid gap-3 md:grid-cols-[minmax(0,260px)_1fr_auto]">
                          <div className="space-y-1">
                            <Label>Тип документа</Label>
                            <Select
                              value={draft.type || EMPTY_DOCUMENT_TYPE_VALUE}
                              onValueChange={(value) => handleDraftTypeChange(draft.id, value)}
                            >
                              <SelectTrigger className="h-10 rounded-lg border border-border bg-background/80 text-sm">
                                <SelectValue placeholder="Выберите тип" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={EMPTY_DOCUMENT_TYPE_VALUE}>Выберите тип</SelectItem>
                                {sortedDocumentTypeOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <input type="hidden" name={`${namePrefix}[type]`} value={draft.type} />
                          </div>
                          <div className="space-y-1">
                            <Label>Файл</Label>
                            <Input
                              ref={(node) => registerFileInput(draft.id, node)}
                              name={`${namePrefix}[file]`}
                              type="file"
                              accept={CLIENT_DOCUMENT_ACCEPT_TYPES}
                              className="cursor-pointer rounded-lg"
                              onChange={(event) => handleDraftFileChange(draft.id, event)}
                            />
                            {draft.fileName ? (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="truncate">{draft.fileName}</span>
                                <button
                                  type="button"
                                  className="font-medium text-brand-600"
                                  onClick={() => clearDraftFile(draft.id)}
                                >
                                  Очистить
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Допустимые форматы: PDF, JPG, PNG (до 10 МБ).
                              </p>
                            )}
                          </div>
                          <div className="flex items-end justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => removeDocumentDraft(draft.id)}
                              disabled={documentDrafts.length === 1 && !draft.hasFile && !draft.type}
                            >
                              <Trash2 className="mr-1 h-4 w-4" /> Удалить
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 rounded-lg"
                    onClick={addDocumentDraft}
                  >
                    <Plus className="h-4 w-4" /> Добавить документ
                  </Button>
                  <p className="text-xs text-muted-foreground">Форматы: PDF, JPG, PNG (до 10 МБ).</p>
                </div>
                {showDocumentWarning ? (
                  <p className="text-xs text-destructive">Загрузите хотя бы один документ.</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <Button
                  type="submit"
                  variant="outline"
                  className="rounded-lg"
                  name="intent"
                  value="save"
                  disabled={pending}
                >
                  {pending ? "Сохраняем..." : "Сохранить черновик"}
                </Button>
                <Button
                  type="submit"
                  className="rounded-lg"
                  name="intent"
                  value="complete"
                  disabled={pending || showDocumentWarning}
                >
                  {pending ? "Сохраняем..." : "Завершить задачу"}
                </Button>
              </div>
            </form>
          ) : (
            <>
              {hasGuardDocuments ? (
                <div className="rounded-lg border border-border/60 bg-muted/15 p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    <span>Загруженные документы</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {guardDocumentLinks.map((doc) => {
                      const label = resolveDocumentLabel(doc);
                      if (!doc.url) {
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between rounded-md border border-border/50 bg-background px-3 py-2 text-xs text-foreground"
                          >
                            <span className="flex items-center gap-2">
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                              {label}
                            </span>
                            <span className="text-[11px] text-muted-foreground/80">Нет ссылки</span>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={doc.id}
                          href={doc.url}
                          target="_blank"
                          className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-brand-200 hover:bg-muted/40"
                        >
                          <span className="flex items-center gap-2">
                            <Paperclip className="h-3 w-3 text-brand-600" />
                            {label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">Открыть</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {isCompletedWorkflow ? (
                <div className="space-y-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Ответы исполнителя
                  </span>
                  {editableFields.length > 0 ? (
                    <div className="space-y-2">
                      {editableFields.map((field) => {
                        const value = resolveFieldValue(field.id, payload);
                        const displayValue = value.trim().length > 0 ? value : "—";
                        return (
                          <div
                            key={field.id}
                            className="space-y-1 rounded-lg border border-border/60 bg-muted/40 px-3 py-2"
                          >
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {field.label ?? field.id}
                            </span>
                            <p className="whitespace-pre-wrap text-sm text-foreground/80">{displayValue}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {guardState?.note ? (
                    <div className="space-y-1 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Комментарий
                      </span>
                      <p className="whitespace-pre-wrap text-sm text-foreground/80">{guardState.note}</p>
                    </div>
                  ) : null}
                  {!hasGuardDocuments && guardState?.attachmentUrl ? (
                    <Link
                      href={guardState.attachmentUrl}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 underline underline-offset-2"
                    >
                      <Paperclip className="h-3 w-3" />
                      Просмотреть вложенный документ
                    </Link>
                  ) : null}
                  {editableFields.length === 0 && !guardState?.note ? (
                    <p className="text-sm text-muted-foreground">Данные по выполнению задачи отсутствуют.</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Задача уже завершена. Обновите страницу, чтобы увидеть актуальные данные.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
