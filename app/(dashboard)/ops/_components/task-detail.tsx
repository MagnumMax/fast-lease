"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type JSX } from "react";
import { useRouter } from "next/navigation";

import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { sortDocumentOptions } from "@/lib/documents/options";
import type { WorkspaceTask } from "@/lib/supabase/queries/tasks";
import { buildSlugWithId } from "@/lib/utils/slugs";
import {
  CLIENT_DOCUMENT_TYPES,
  WORKFLOW_ROLE_LABELS,
  getClientDocumentLabel,
  type ClientDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import { filterChecklistTypes, type ClientDocumentChecklist } from "@/lib/workflow/documents-checklist";

import { deleteTaskGuardDocumentAction, type FormStatus } from "@/app/(dashboard)/ops/tasks/[id]/actions";

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
  guard_note?: string | null;
  guard_attachment_path?: string | null;
  guard_document_type?: string | null;
};

type GuardDocumentLink = {
  id: string;
  title: string | null;
  documentType: string | null;
  storagePath?: string | null;
  status?: string | null;
  url: string | null;
};

type DocumentDraft = {
  id: string;
  type: ClientDocumentTypeValue | "";
  file: File | null;
};

const VEHICLE_VERIFICATION_TASK_TYPE = "VERIFY_VEHICLE";
const VEHICLE_VERIFICATION_GUARD_KEY = "vehicle.verified";
const TECHNICAL_REPORT_TYPE: ClientDocumentTypeValue = "technical_report";
const AECB_TASK_TYPE = "AECB_CHECK";
const AECB_CREDIT_REPORT_TYPE: ClientDocumentTypeValue = "aecb_credit_report";
const ANALOG_FIELD_DEFS: TaskFieldDefinition[] = [
  {
    id: "analog_market_url_1",
    type: "text",
    label: "Аналоги на площадках #1",
  },
  {
    id: "analog_market_url_2",
    type: "text",
    label: "Аналоги на площадках #2",
  },
  {
    id: "analog_market_url_3",
    type: "text",
    label: "Аналоги на площадках #3",
  },
  {
    id: "analog_market_plus1_url_1",
    type: "text",
    label: "Аналоги на площадках +1 год #1",
  },
  {
    id: "analog_market_plus1_url_2",
    type: "text",
    label: "Аналоги на площадках +1 год #2",
  },
  {
    id: "analog_market_plus1_url_3",
    type: "text",
    label: "Аналоги на площадках +1 год #3",
  },
];

function createDocumentDraft(defaultType: ClientDocumentTypeValue | "" = ""): DocumentDraft {
  const identifier =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `doc-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: identifier,
    type: defaultType,
    file: null,
  };
}

const CLIENT_DOCUMENT_ACCEPT_TYPES = ".pdf,.png,.jpg,.jpeg";
const DOCUMENT_TYPE_EMPTY_VALUE = "__workflow-doc-none__";
const CLIENT_DOCUMENT_OPTIONS = sortDocumentOptions(CLIENT_DOCUMENT_TYPES);
const TASKS_LIST_ROUTE = "/ops/tasks";
const CONFIRM_CAR_INSTRUCTIONS =
  "Свяжитесь с дилером/брокером и подтвердите доступность выбранного авто.";

const INITIAL_STATE: FormStatus = { status: "idle" };

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
  guardDocuments,
  completeAction,
}: TaskDetailViewProps) {
  const [formState, formAction, pending] = useActionState(completeAction, INITIAL_STATE);
  const [, setDraftRequiredValues] = useState<Record<string, string>>({});
  const router = useRouter();
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(() => new Set());
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraft[]>([]);

  function setDocumentDeleting(id: string, deleting: boolean) {
    setDeletingDocumentIds((prev) => {
      const next = new Set(prev);
      if (deleting) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function isDocumentDeleting(id: string): boolean {
    return deletingDocumentIds.has(id);
  }

  const payload = (task.payload as TaskPayload | undefined) ?? undefined;
  const isPrepareQuoteTask = task.type === "PREPARE_QUOTE";
  const isAecbTask = task.type === AECB_TASK_TYPE;
  const confirmCarInstructions =
    task.type === "CONFIRM_CAR"
      ? resolveFieldValue("instructions", payload) || CONFIRM_CAR_INSTRUCTIONS
      : null;
  const isVehicleVerificationTask =
    task.type === VEHICLE_VERIFICATION_TASK_TYPE || guardMeta?.key === VEHICLE_VERIFICATION_GUARD_KEY;

  const schemaFields = Array.isArray(payload?.schema?.fields) ? payload?.schema?.fields ?? [] : [];
  const filteredSchemaFields =
    isAecbTask ? schemaFields.filter((field) => field.id !== "notes") : schemaFields;
  let effectiveSchemaFields = isPrepareQuoteTask ? [] : filteredSchemaFields;
  const fieldsToSkip = new Set<string>();
  if (task.type === "CONFIRM_CAR") {
    fieldsToSkip.add("instructions");
  }
  if (isVehicleVerificationTask) {
    fieldsToSkip.add("vin");
    fieldsToSkip.add("supplier");
    const existingIds = new Set(effectiveSchemaFields.map((field) => field.id));
    const missingAnalogs = ANALOG_FIELD_DEFS.filter((field) => !existingIds.has(field.id));
    if (missingAnalogs.length > 0) {
      effectiveSchemaFields = [...effectiveSchemaFields, ...missingAnalogs];
    }
  }
  const editableFields = effectiveSchemaFields.filter(
    (field) => isEditableField(field) && !fieldsToSkip.has(field.id),
  );
  const statusMeta = getTaskStatusMeta(task.status);
  const deadlineInfo = task.slaDueAt ? formatDate(task.slaDueAt) : null;
  const completedInfo = task.completedAt ? formatDate(task.completedAt) : null;
  const enforcedDocumentType = isVehicleVerificationTask ? TECHNICAL_REPORT_TYPE : null;
  const requiresDocument = (guardMeta?.requiresDocument ?? false) || Boolean(enforcedDocumentType);
  const documentsEnabled = requiresDocument || isAecbTask;
  const defaultDocumentType = enforcedDocumentType ?? (isAecbTask ? AECB_CREDIT_REPORT_TYPE : "");
  const requiredDocumentLabel = enforcedDocumentType
    ? getClientDocumentLabel(enforcedDocumentType) ?? "Технический отчёт"
    : null;
  const documentSectionDescription = requiresDocument
    ? "Приложите файлы из чек-листа, чтобы закрыть guard этапа. Поддерживаются PDF, JPG и PNG."
    : isAecbTask
      ? "При необходимости загрузите AECB credit report для внутренней проверки. Поддерживаются PDF, JPG и PNG."
      : "Добавьте связанные документы при необходимости. Поддерживаются PDF, JPG и PNG.";
  const documentEmptyStateText = requiresDocument
    ? "Документы для загрузки не выбраны. Добавьте хотя бы один файл."
    : isAecbTask
      ? "Документы не выбраны. Этот шаг можно пропустить или приложить AECB credit report."
      : "Документы для загрузки не выбраны.";

  useEffect(() => {
    if (!documentsEnabled) {
      setDocumentDrafts([]);
      return;
    }
    setDocumentDrafts((prev) =>
      prev.length > 0 ? prev : [createDocumentDraft(defaultDocumentType)],
    );
  }, [defaultDocumentType, documentsEnabled]);

  const hasExistingAttachment = Boolean(guardState?.attachmentUrl);
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
  const allowDocumentDeletion = Boolean(deal?.clientId);
  const taskTitle = isVehicleVerificationTask
    ? "Проверка тех состояния и оценочной стоимости авто"
    : isPrepareQuoteTask
      ? "Подготовка и подписание клиентом коммерческого предложения"
      : task.title;
  const taskInstruction = hasForm
    ? deadlineInfo
      ? `Проверьте детали, заполните форму ниже и завершите задачу до ${deadlineInfo}.`
      : "Проверьте детали, заполните форму ниже и завершите задачу."
    : "Задача завершена — просмотрите ответы и вложения или вернитесь к списку.";

  function handleBackNavigation() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(TASKS_LIST_ROUTE);
  }

  function handleAddDocumentDraft() {
    setDocumentDrafts((prev) => [...prev, createDocumentDraft(defaultDocumentType)]);
  }

  useEffect(() => {
    if (formState.status === "success" && formState.redirectTo) {
      router.push(formState.redirectTo);
    }
  }, [formState, router]);

  function handleRemoveDocumentDraft(id: string) {
    setDocumentDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }

  async function handleDeleteGuardDocument(documentId: string) {
    if (!allowDocumentDeletion || !deal?.clientId) {
      setDocumentActionError("Невозможно удалить документ: не определён клиент сделки.");
      return;
    }
    if (isDocumentDeleting(documentId)) {
      return;
    }

    setDocumentActionError(null);
    setDocumentActionMessage(null);
    setDocumentDeleting(documentId, true);

    try {
      const result = await deleteTaskGuardDocumentAction({
        documentId,
        clientId: deal.clientId,
        clientSlug: clientSlug ?? undefined,
        taskId: task.id,
        dealId: deal?.id ?? undefined,
        dealSlug: dealSlug ?? undefined,
      });

      if (!result.success) {
        setDocumentActionError(result.error ?? "Не удалось удалить документ.");
        return;
      }

      setDocumentActionMessage("Документ удалён.");
      router.refresh();
    } catch (error) {
      console.error("[workflow] guard document delete error", error);
      setDocumentActionError("Не удалось удалить документ. Попробуйте ещё раз.");
    } finally {
      setDocumentDeleting(documentId, false);
    }
  }

  function handleDocumentDraftTypeChange(id: string, type: ClientDocumentTypeValue | "") {
    setDocumentDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, type } : draft)));
  }

  function handleDocumentDraftFileChange(id: string, file: File | null) {
    setDocumentDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, file } : draft)));
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

  function renderGuardDocumentList(showActions: boolean) {
    if (!guardDocumentLinks.length) {
      return null;
    }

    return (
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
        {guardDocumentLinks.map((doc) => {
          const label = resolveDocumentLabel(doc);
          const deleting = isDocumentDeleting(doc.id);
          const openButton = doc.url ? (
            <Button asChild size="sm" variant="outline" className="rounded-lg">
              <Link href={doc.url} target="_blank">
                Открыть
              </Link>
            </Button>
          ) : (
            <Badge variant="outline" className="rounded-lg text-muted-foreground">
              Нет ссылки
            </Badge>
          );

          return (
            <div
              key={doc.id}
              className="flex flex-col gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-xs text-foreground"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Paperclip className="h-3 w-3 text-brand-600" />
                  {label}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {openButton}
                  {showActions ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-lg text-destructive hover:bg-destructive/5"
                      onClick={() => handleDeleteGuardDocument(doc.id)}
                      disabled={pending || deleting || !allowDocumentDeletion}
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      <span className="ml-1 text-xs">{deleting ? "Удаляем..." : "Удалить"}</span>
                    </Button>
                  ) : null}
                </div>
              </div>
              {doc.status ? (
                <span className="text-[11px] text-muted-foreground">{doc.status}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBackNavigation}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Button>
      </div>
      <Card className="border-border/80 bg-card/80 backdrop-blur">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl font-semibold">{taskTitle}</CardTitle>
            <Badge variant={statusMeta.variant} className="flex items-center gap-1 rounded-lg">
              {statusMeta.icon}
              {statusMeta.label}
            </Badge>
          </div>
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
          {deadlineInfo ? (
            <div className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Крайний срок: {deadlineInfo}</span>
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
          <div className="mt-2 rounded-lg border border-dashed border-border/70 bg-muted/25 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Что сделать</p>
            <p className="mt-1 text-sm text-foreground/80">{taskInstruction}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/80 backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg font-semibold">Выполнение задачи</CardTitle>
        </CardHeader>
        <CardContent>
          {formState.status === "success" ? (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {formState.message ?? "Задача успешно завершена"}
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

              {confirmCarInstructions ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-foreground">
                  {confirmCarInstructions}
                </div>
              ) : null}

              {editableFields.length > 0 ? (
                <div className="space-y-3">
                  {editableFields.map((field) => {
                    const fieldId = field.id;
                    const value = resolveFieldValue(fieldId, payload);
                    const label = field.label ?? fieldId;
                    const hint = field.hint ?? "";
                    const type = field.type?.toLowerCase();

                    const isRequired = field.required ?? false;

                    if (type === "textarea") {
                      return (
                        <div key={fieldId} className="space-y-2">
                          <Label htmlFor={`field-${fieldId}`}>
                            {label}
                            {isRequired ? (
                              <span className="ml-1 align-middle font-semibold text-destructive" aria-hidden="true">
                                *
                              </span>
                            ) : null}
                          </Label>
                          <Textarea
                            id={`field-${fieldId}`}
                            name={`field:${fieldId}`}
                            defaultValue={value}
                            required={isRequired}
                            placeholder={hint}
                            className="min-h-[120px] rounded-lg"
                            onChange={(event) => {
                              if (isRequired) {
                                const next = event.target.value.trim();
                                setDraftRequiredValues((prev) =>
                                  next.length > 0 ? { ...prev, [fieldId]: next } : (() => {
                                    const clone = { ...prev };
                                    delete clone[fieldId];
                                    return clone;
                                  })(),
                                );
                              }
                            }}
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
                          <Label htmlFor={`field-${fieldId}`}>
                            {label}
                            {isRequired ? (
                              <span className="ml-1 align-middle font-semibold text-destructive" aria-hidden="true">
                                *
                              </span>
                            ) : null}
                          </Label>
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
                        <Label htmlFor={`field-${fieldId}`}>
                          {label}
                          {isRequired ? (
                            <span className="ml-1 align-middle font-semibold text-destructive" aria-hidden="true">
                              *
                            </span>
                          ) : null}
                        </Label>
                        <Input
                          id={`field-${fieldId}`}
                          name={`field:${fieldId}`}
                          defaultValue={value}
                          required={isRequired}
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
              ) : null}

              {documentsEnabled ? (
                <div className="space-y-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-foreground">Загрузка документов</span>
                    <p className="text-xs text-muted-foreground">
                      {documentSectionDescription}
                    </p>
                    {requiredDocumentLabel ? (
                      <p className="text-xs font-semibold text-foreground">
                        Обязателен документ: {requiredDocumentLabel}
                      </p>
                    ) : null}
                  </div>

                  {hasGuardDocuments ? (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Уже загружено
                      </span>
                      {renderGuardDocumentList(true)}
                    </div>
                  ) : null}
                  {documentActionMessage ? (
                    <p className="text-xs text-emerald-600">{documentActionMessage}</p>
                  ) : null}
                  {documentActionError ? (
                    <p className="text-xs text-destructive">{documentActionError}</p>
                  ) : null}

                  <div className="space-y-3">
                    {documentDrafts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{documentEmptyStateText}</p>
                    ) : (
                      documentDrafts.map((draft, index) => (
                        <div
                          key={draft.id}
                          className="space-y-3 rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Документ {index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveDocumentDraft(draft.id)}
                              disabled={pending}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Удалить файл</span>
                            </Button>
                          </div>
                          <div className="flex flex-col gap-3 md:flex-row">
                            <div className="flex-1 space-y-2">
                              <Label>
                                Тип документа
                                {requiresDocument ? (
                                  <span className="ml-1 align-middle font-semibold text-destructive" aria-hidden="true">
                                    *
                                  </span>
                                ) : null}
                              </Label>
                              <Select
                                value={draft.type || DOCUMENT_TYPE_EMPTY_VALUE}
                                onValueChange={(nextValue) => {
                                  const normalized =
                                    nextValue === DOCUMENT_TYPE_EMPTY_VALUE
                                      ? ""
                                      : (nextValue as ClientDocumentTypeValue);
                                  handleDocumentDraftTypeChange(draft.id, normalized);
                                }}
                                disabled={pending}
                              >
                                <SelectTrigger className="rounded-lg">
                                  <SelectValue placeholder="Выберите тип документа" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72 overflow-y-auto">
                                  <SelectItem value={DOCUMENT_TYPE_EMPTY_VALUE}>Не выбран</SelectItem>
                                  {CLIENT_DOCUMENT_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <input type="hidden" name={`documents[${draft.id}][type]`} value={draft.type} />
                            </div>
                            <div className="flex-1 space-y-2">
                              <Label htmlFor={`document-file-${draft.id}`}>
                                Файл
                                {requiresDocument ? (
                                  <span className="ml-1 align-middle font-semibold text-destructive" aria-hidden="true">
                                    *
                                  </span>
                                ) : null}
                              </Label>
                              <Input
                                id={`document-file-${draft.id}`}
                                type="file"
                                name={`documents[${draft.id}][file]`}
                                accept={CLIENT_DOCUMENT_ACCEPT_TYPES}
                                onChange={(event) =>
                                  handleDocumentDraftFileChange(draft.id, event.currentTarget.files?.[0] ?? null)
                                }
                                className="rounded-lg"
                                disabled={pending}
                              />
                              <p className="text-xs text-muted-foreground">
                                {draft.file?.name
                                  ? `Выбран файл: ${draft.file.name}`
                                  : "Максимальный размер — 10 МБ для каждого файла."}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 rounded-lg"
                      onClick={handleAddDocumentDraft}
                      disabled={pending}
                    >
                      <Plus className="h-4 w-4" />
                      Добавить документ
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      После отправки файлы автоматически попадут в карточку клиента и сделки.
                    </p>
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

              {formState.status === "error" ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formState.message ?? "Не удалось завершить задачу. Попробуйте снова."}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <Button
                  type="submit"
                  className="rounded-lg"
                  name="intent"
                  value="complete"
                  disabled={pending}
                >
                  {pending
                    ? "Завершаем..."
                    : requiresDocument
                      ? "Завершить задачу"
                      : "Завершить задачу"}
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
                  {renderGuardDocumentList(true)}
                  {documentActionError ? (
                    <p className="mt-2 text-xs text-destructive">{documentActionError}</p>
                  ) : null}
                  {documentActionMessage ? (
                    <p className="mt-1 text-xs text-emerald-600">{documentActionMessage}</p>
                  ) : null}
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Задача завершена. Обновите страницу при необходимости.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
