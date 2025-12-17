"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, startTransition, type JSX } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  Paperclip,
  Plus,
  RefreshCcw,
  Trash2,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { sortDocumentOptions } from "@/lib/documents/options";
import type { WorkspaceTask } from "@/lib/supabase/queries/tasks";
import { buildSlugWithId } from "@/lib/utils/slugs";
import {
  CLIENT_DOCUMENT_TYPES,
  WORKFLOW_TASK_TEMPLATES_BY_TYPE,
  getClientDocumentLabel,
  type ClientDocumentTypeValue,
  normalizeClientDocumentType,
} from "@/lib/supabase/queries/operations";
import { filterChecklistTypes, type ClientDocumentChecklist, type ClientDocumentSummary } from "@/lib/workflow/documents-checklist";
import { WorkflowDocuments } from "@/app/(dashboard)/ops/_components/workflow-documents";
import { ProfileSelector } from "@/app/(dashboard)/ops/_components/profile-selector";

import { deleteTaskGuardDocumentAction, getUploadUrlAction, type FormStatus } from "@/app/(dashboard)/ops/tasks/[id]/actions";

type ClientDocumentWithUrl = ClientDocumentSummary & { signedUrl: string | null };

type TaskDetailViewProps = {
  task: WorkspaceTask;
  guardKey: string | null;
  guardMeta: { key: string; label: string; requiresDocument: boolean } | null;
  guardState: {
    note: string | null;
    attachmentPath: string | null;
    attachmentUrl: string | null;
    documentType: string | null;
  } | null;
  checklist: ClientDocumentChecklist | null;
  deal: {
    id: string;
    dealNumber: string | null;
    clientId: string | null;
    sellerId: string | null;
    brokerId: string | null;
    sellerName?: string | null;
    sellerType?: string | null;
    sellerEmail?: string | null;
    sellerPhone?: string | null;
    vehicleId: string | null;
    buyerEmail?: string | null;
    buyerPhone?: string | null;
    buyerType?: string | null;
  } | null;
  stageTitle: string | null;
  guardDocuments: GuardDocumentLink[];
  clientDocuments?: ClientDocumentWithUrl[];
  financeSnapshot?: FinanceReviewSnapshot | null;
  commercialOfferPriceVat?: number | null;
  completeAction: (state: FormStatus, formData: FormData) => Promise<FormStatus>;
  reopenAction: (state: FormStatus, formData: FormData) => Promise<FormStatus>;
};

type TaskFieldDefinition = {
  id: string;
  type?: string;
  label?: string;
  document_type?: string;
  documentType?: string;
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  depends_on?: string;
  link_target?: string;
  filter?: string;
  readonly?: boolean;
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
  requires_document?: boolean;
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
  prefilledPath?: string | null;
  prefilledTitle?: string | null;
  prefilledUrl?: string | null;
  prefilledId?: string | null;
};

type PartyTypeValue = "company" | "personal";

type SummaryDataPoint = { label: string; value: string };
type SummaryDocumentEntry = { label: string; value: string; status?: string | null; url?: string | null };
type WorkflowDocumentGroupEntry = {
  stageKey: string;
  stageTitle: string;
  taskTitle: string;
  taskTemplateId: string;
  documents: SummaryDocumentEntry[];
};
type FinanceEntitySnapshot = {
  title: string;
  data: SummaryDataPoint[];
  documents: SummaryDocumentEntry[];
  workflowDocuments?: WorkflowDocumentGroupEntry[];
  additionalDocuments?: SummaryDocumentEntry[];
};
type FinanceReviewSnapshot = {
  deal: FinanceEntitySnapshot;
  vehicle?: FinanceEntitySnapshot | null;
  client?: FinanceEntitySnapshot | null;
};

const VEHICLE_VERIFICATION_TASK_TYPE = "VERIFY_VEHICLE";
const VEHICLE_VERIFICATION_GUARD_KEY = "vehicle.verified";
const TECHNICAL_REPORT_TYPE: ClientDocumentTypeValue = "technical_report";
const COMPRESSION_HINT_THRESHOLD_BYTES = 20 * 1024 * 1024;
const COMPRESSION_HINT_LABEL = "20 МБ";
const MAX_TOTAL_UPLOAD_BYTES = Number.POSITIVE_INFINITY;
const MAX_TOTAL_UPLOAD_LABEL = "без лимита";
const AECB_GUARD_KEY = "risk.approved";
const FINANCE_REVIEW_TASK_TYPE = "FIN_CALC";
const INVESTOR_APPROVAL_TASK_TYPE = "INVESTOR_APPROVAL";
const BUYER_DOCS_GUARD_KEY = "docs.required.allUploaded";
const SELLER_DOCS_GUARD_KEY = "docs.seller.allUploaded";
const PARTY_TYPE_EMPTY_VALUE = "__party-type-none__";
const FINANCE_REVIEW_TITLE = "Проверка и утверждение финансовой структуры сделки";
const PARTY_TYPE_OPTIONS: ReadonlyArray<{ value: PartyTypeValue; label: string }> = [
  { value: "company", label: "Юридическое лицо" },
  { value: "personal", label: "Физическое лицо" },
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

function normalizePartyType(value: string | null | undefined): PartyTypeValue | "" {
  if (value === "company" || value === "personal") {
    return value;
  }
  return "";
}

function normalizeBooleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  if (typeof value === "number") return value !== 0;
  return false;
}

const CLIENT_DOCUMENT_ACCEPT_TYPES = ".pdf,.png,.jpg,.jpeg";
const DOCUMENT_TYPE_EMPTY_VALUE = "__workflow-doc-none__";
const CLIENT_DOCUMENT_OPTIONS = sortDocumentOptions(CLIENT_DOCUMENT_TYPES);
const TASKS_LIST_ROUTE = "/ops/tasks";
const INDIVIDUAL_DOC_LABELS: Record<string, string> = {
  doc_passport_driver: "Паспорт покупателя",
  doc_emirates_id_driver: "Emirates ID покупателя",
  doc_driving_license: "Водительские права (UAE) покупателя",
};
const REOPEN_REASON_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "quality", label: "Качество / ошибка выполнения" },
  { value: "requirements", label: "Уточнены требования" },
  { value: "missing_data", label: "Не хватает данных или документов" },
  { value: "incorrect_inputs", label: "Ошибочные исходные данные / предположения" },
  { value: "communication", label: "Коммуникация или ожидание ответа" },
  { value: "priority_shift", label: "Изменились сроки или приоритеты" },
  { value: "infrastructure", label: "Инфраструктура / внешние блокеры" },
  { value: "compliance", label: "Риски / комплаенс / безопасность" },
  { value: "other", label: "Другое" },
];
function getFieldDocumentType(field: TaskFieldDefinition): ClientDocumentTypeValue | null {
  const docTypeRaw = field.document_type ?? (field as { documentType?: string }).documentType;
  const normalized = normalizeClientDocumentType(docTypeRaw ?? undefined);
  return normalized ?? null;
}

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

function deriveRentyManagerFee(priceVat?: number | null): string | null {
  if (priceVat == null) return null;
  const normalized = Number(priceVat);
  if (!Number.isFinite(normalized)) return null;
  const percent = normalized < 500_000 ? 1 : 1.5;
  return `${percent}%`;
}

export function TaskDetailView({
  task,
  guardKey,
  guardMeta,
  guardState,
  checklist,
  deal,
  guardDocuments,
  clientDocuments,
  financeSnapshot,
  commercialOfferPriceVat,
  completeAction,
  reopenAction,
}: TaskDetailViewProps) {
  const [formState, formAction, serverPending] = useActionState(completeAction, INITIAL_STATE);
  const [reopenState, reopenFormAction, reopenPending] = useActionState(reopenAction, INITIAL_STATE);
  const [, setDraftRequiredValues] = useState<Record<string, string>>({});
  const router = useRouter();
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(() => new Set());
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraft[]>([]);
  const [docFieldFiles, setDocFieldFiles] = useState<Record<string, File | null>>({});
  
  // Track which prefilled fields were dismissed by the user
  const [dismissedPrefills, setDismissedPrefills] = useState<Record<string, boolean>>({});
  const [docFieldValues, setDocFieldValues] = useState<Record<string, string>>({});
  const [formResetToken, setFormResetToken] = useState(0);
  const [pendingBuyerType, setPendingBuyerType] = useState<PartyTypeValue | "">("");
  const [reopenReason, setReopenReason] = useState<string>("quality");
  const [uploadValidationError, setUploadValidationError] = useState<string | null>(null);
  const [docFieldWarnings, setDocFieldWarnings] = useState<Record<string, string>>({});
  const [draftWarnings, setDraftWarnings] = useState<Record<string, string>>({});
  const [requiredDocErrors, setRequiredDocErrors] = useState<Record<string, string>>({});
  const [isAdditionalDocsOpen, setIsAdditionalDocsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const pending = serverPending || isUploading;

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

  useEffect(() => {
    if (reopenState.status === "success") {
      router.refresh();
    }
  }, [reopenState.status, router]);

  const payload = (task.payload as TaskPayload | undefined) ?? undefined;
  const isPrepareQuoteTask = task.type === "PREPARE_QUOTE";
  const guardKeyResolved = guardKey ?? guardMeta?.key ?? null;
  const isConfirmCarTask = guardKeyResolved === "tasks.confirmCar.completed";
  const isAecbTask = guardKeyResolved === AECB_GUARD_KEY;
  const isFinanceReviewTask = task.type === FINANCE_REVIEW_TASK_TYPE;
  const isInvestorApprovalTask = task.type === INVESTOR_APPROVAL_TASK_TYPE;
  const isApprovalTask = isFinanceReviewTask || isInvestorApprovalTask;
  const isPaySupplierTask = guardKeyResolved === "payments.supplierPaid";
  const isBuyerDocsTask =
    guardKeyResolved === BUYER_DOCS_GUARD_KEY ||
    task.type === "COLLECT_DOCS" ||
    task.type === "COLLECT_BUYER_DOCS" ||
    task.type === "COLLECT_BUYER_DOCS_COMPANY" ||
    task.type === "COLLECT_BUYER_DOCS_INDIVIDUAL";
  const isSellerDocsTask =
    guardKeyResolved === SELLER_DOCS_GUARD_KEY ||
    task.type === "COLLECT_SELLER_DOCS" ||
    task.type === "COLLECT_SELLER_DOCS_COMPANY" ||
    task.type === "COLLECT_SELLER_DOCS_INDIVIDUAL";

  const isVehicleVerificationTask =
    guardKeyResolved === VEHICLE_VERIFICATION_GUARD_KEY ||
    task.type === VEHICLE_VERIFICATION_TASK_TYPE;
  const initialBuyerType = normalizePartyType(resolveFieldValue("buyer_type", payload)) || normalizePartyType(deal?.buyerType);
  const [buyerType, setBuyerType] = useState<PartyTypeValue | "">(() => initialBuyerType);
  const initialSellerType = normalizePartyType(resolveFieldValue("seller_type", payload)) || normalizePartyType(deal?.sellerType);
  const [sellerType, setSellerType] = useState<PartyTypeValue | "">(() => initialSellerType);
  const buyerChecklist: string[] = [];
  const sellerChecklist: string[] = [];
  const [booleanFieldValues, setBooleanFieldValues] = useState<Record<string, boolean>>({});
  
  // Track all field values for dependencies and interactivity
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    if (payload?.fields) Object.assign(initial, payload.fields);
    if (payload?.defaults) {
      Object.entries(payload.defaults).forEach(([k, v]) => {
        if (initial[k] === undefined) initial[k] = v;
      });
    }
    return initial;
  });

  function handleFieldValueChange(fieldId: string, value: unknown) {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  const schemaFieldsRaw = payload?.schema?.fields;
  const rawFieldsFromPayload = Array.isArray(schemaFieldsRaw)
    ? schemaFieldsRaw
    : schemaFieldsRaw && typeof schemaFieldsRaw === "object" && !Array.isArray(schemaFieldsRaw)
      ? (Array.isArray((schemaFieldsRaw as { fields?: TaskFieldDefinition[] }).fields)
        ? ((schemaFieldsRaw as { fields?: TaskFieldDefinition[] }).fields as TaskFieldDefinition[])
        : [])
      : [];
  const fallbackTemplate = WORKFLOW_TASK_TEMPLATES_BY_TYPE[task.type]?.[0];
  const rawFields =
    rawFieldsFromPayload.length > 0
      ? rawFieldsFromPayload
      : (fallbackTemplate?.schema?.fields as TaskFieldDefinition[] | undefined) ?? [];
  const editableFields = rawFields.filter((field) => isEditableField(field) && field.id !== "instructions");
  let visibleFields = editableFields;
  const statusMeta = getTaskStatusMeta(task.status);
  const canReopen = task.status.toUpperCase() === "DONE";
  const isReopenedTask = task.reopenCount > 0;
  const reopenBadge =
    task.reopenCount > 0
      ? `Переоткрыта ${task.reopenCount} ${task.reopenCount === 1 ? "раз" : "раз"}`
      : null;
  const [completedInfo, setCompletedInfo] = useState<string | null>(null);

  useEffect(() => {
    if (task.completedAt) {
      setCompletedInfo(formatDate(task.completedAt));
    } else {
      setCompletedInfo(null);
    }
  }, [task.completedAt]);
  const [deadlineInfo, setDeadlineInfo] = useState<string | null>(null);

  useEffect(() => {
    if (task.slaDueAt) {
      setDeadlineInfo(formatDate(task.slaDueAt));
    } else {
      setDeadlineInfo(null);
    }
  }, [task.slaDueAt]);
  const enforcedDocumentType = isVehicleVerificationTask ? TECHNICAL_REPORT_TYPE : null;
  const requiresDocumentFlag =
    typeof payload?.requires_document === "boolean" ? payload.requires_document : null;
  const requiresDocument = isBuyerDocsTask || isSellerDocsTask
    ? false
    : (guardMeta?.requiresDocument ?? false) || Boolean(enforcedDocumentType);
  const guardRequiresDocument = Boolean(guardMeta?.requiresDocument || requiresDocumentFlag);
  const documentsEnabled =
    isBuyerDocsTask || isSellerDocsTask || requiresDocument || isAecbTask || isPaySupplierTask;
  const enableDocsSection = documentsEnabled || isPrepareQuoteTask || isReopenedTask;
  const defaultDocumentType: ClientDocumentTypeValue | "" = "";
  const useTwoColumnFieldLayout = true;
  const workflowDocumentFields = visibleFields.filter((field) => getFieldDocumentType(field));
  const hasWorkflowDocumentFields = workflowDocumentFields.length > 0;
  const hasWorkflowChecklist = Boolean(checklist && checklist.items.length > 0);

  const isDocFieldRequired = (field: TaskFieldDefinition): boolean => {
    const docFieldType = getFieldDocumentType(field);
    if (!docFieldType) return false;
    if (field.required) return true;
    if (enforcedDocumentType && docFieldType === enforcedDocumentType) return true;
    if (guardRequiresDocument && workflowDocumentFields.length === 1) return true;
    return false;
  };
  const workflowDocumentsRequired =
    workflowDocumentFields.some((field) => isDocFieldRequired(field)) || hasWorkflowChecklist;

  const workflowDocumentItems =
    checklist && checklist.items.length > 0
      ? checklist.items.map((item) => ({
        key: item.key,
        label:
          getClientDocumentLabel((item.normalizedType as ClientDocumentTypeValue | null) ?? null) ??
          getClientDocumentLabel(item.key as ClientDocumentTypeValue) ??
          item.label,
        fulfilled: item.fulfilled,
        matchesCount: item.matches.length,
        required: workflowDocumentsRequired,
      }))
      : workflowDocumentFields.map((field) => {
        const mappedType = getFieldDocumentType(field);
        const label =
          (mappedType ? getClientDocumentLabel(mappedType) : null) ??
          (field.label && /(файл)/i.test(field.label) ? field.label.replace(/\s*\(файл\)/gi, "").trim() : field.label) ??
          field.id;
        const itemRequired = isDocFieldRequired(field);
        return {
          key: field.id,
          label,
          fulfilled: null as boolean | null,
          matchesCount: null as number | null,
          required: itemRequired,
        };
      });

  function renderFieldRow(opts: {
    id: string;
    label: string;
    required?: boolean;
    control: JSX.Element;
    useTwoColumn: boolean;
    rowClass: string;
  }) {
    const { id, label, required, control, useTwoColumn, rowClass } = opts;
    const labelNode = (
      <Label
        htmlFor={`field-${id}`}
        className="text-sm font-semibold leading-tight text-foreground normal-case tracking-normal"
      >
        {label}
        {required ? (
          <span className="ml-1 align-middle font-semibold text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
    );
    if (useTwoColumn) {
      return (
        <div key={id} className={rowClass}>
          <div className="flex flex-col gap-1">{labelNode}</div>
          <div className="space-y-2">{control}</div>
        </div>
      );
    }
    return (
      <div key={id} className={rowClass}>
        {labelNode}
        {control}
      </div>
    );
  }

  const documentSectionDescription =
    "Загрузите дополнительные файлы по сделке. Поддерживаются PDF, JPG и PNG.";
  const documentEmptyStateText = "Дополнительные документы пока не выбраны.";
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // Debug output to verify required doc flags in UI
      console.debug("[task-detail] workflow docs debug", {
        taskId: task.id,
        taskType: task.type,
        workflowDocumentsRequired,
        requiresDocumentFlag,
        enforcedDocumentType,
        guardMetaRequiresDocument: guardMeta?.requiresDocument ?? null,
        workflowDocumentFields: workflowDocumentFields.map((field) => ({
          id: field.id,
          required: field.required ?? false,
        })),
        workflowDocumentItems: workflowDocumentItems.map((item) => ({
          key: item.key,
          required: item.required,
          label: item.label,
        })),
      });
    }
  }, [
    enforcedDocumentType,
    guardMeta?.requiresDocument,
    requiresDocumentFlag,
    task.id,
    task.type,
    workflowDocumentFields,
    workflowDocumentItems,
    workflowDocumentsRequired,
  ]);

  useEffect(() => {
    if (!enableDocsSection) {
      setDocumentDrafts([]);
      return;
    }

    setDocumentDrafts((prev) => {
      if (prev.length > 0) return prev;

      const nextDrafts: DocumentDraft[] = [];
      
      // 1. Try to prefill from Client Documents
      // (Prefilling is now handled in the schema fields directly for COLLECT_ tasks)
      // We only keep this if we want to support prefilling for generic tasks in the future,
      // but for now, based on user feedback, we disable it here to avoid duplication/confusion.
      
      // 2. If no drafts created (no client docs found), add one empty
      if (nextDrafts.length === 0) {
        nextDrafts.push(createDocumentDraft(defaultDocumentType));
      }

      return nextDrafts;
    });
  }, [defaultDocumentType, enableDocsSection, clientDocuments, guardDocuments, task.type]);


  const isCompleted = task.status === "DONE";
  const isReadOnly = isCompleted;
  const guardDocumentLinks = useMemo(
    () => (Array.isArray(guardDocuments) ? guardDocuments : []),
    [guardDocuments],
  );
  const hasGuardDocuments = guardDocumentLinks.length > 0;
  const hasGuardAttachmentLink = Boolean(guardState?.attachmentUrl);
  const guardDocumentsByType = useMemo(() => {
    const map: Record<string, GuardDocumentLink> = {};
    guardDocumentLinks.forEach((doc) => {
      const normalized = normalizeClientDocumentType(doc.documentType ?? undefined);
      if (normalized && !map[normalized]) {
        map[normalized] = doc;
      }
    });
    return map;
  }, [guardDocumentLinks]);
  const expectedDocumentTypes = useMemo(() => {
    const types = new Set<string>();
    workflowDocumentFields.forEach((field) => {
      const normalized = getFieldDocumentType(field);
      if (normalized) {
        types.add(normalized);
      }
    });
    (checklist?.items ?? []).forEach((item) => {
      if (item.normalizedType) {
        types.add(item.normalizedType);
      }
    });
    return types;
  }, [checklist?.items, workflowDocumentFields]);
  const visibleGuardDocuments = useMemo(
    () =>
      guardDocumentLinks.filter((doc) => {
        if (isPlaceholderGuardDocument(doc)) {
          return false;
        }
        const normalized = normalizeClientDocumentType(doc.documentType ?? undefined);
        if (!normalized) return true;
        return !expectedDocumentTypes.has(normalized);
      }),
    [expectedDocumentTypes, guardDocumentLinks],
  );
  const hasVisibleGuardDocuments = visibleGuardDocuments.length > 0;
  const instructionShortRaw =
    payload?.defaults &&
      typeof payload.defaults === "object" &&
      !Array.isArray(payload.defaults) &&
      typeof (payload.defaults as Record<string, unknown>).instruction_short === "string"
      ? ((payload.defaults as Record<string, unknown>).instruction_short as string)
      : null;
  const instructionsDefaults =
    payload?.defaults &&
      typeof payload.defaults === "object" &&
      !Array.isArray(payload.defaults) &&
      typeof (payload.defaults as Record<string, unknown>).instructions === "string"
      ? ((payload.defaults as Record<string, unknown>).instructions as string)
      : null;
  const instructionsValue = resolveFieldValue("instructions", payload);
  const instructionShort =
    (instructionsValue && instructionsValue.trim().length > 0 ? instructionsValue.trim() : null) ||
    (instructionsDefaults && instructionsDefaults.trim().length > 0 ? instructionsDefaults.trim() : null) ||
    instructionShortRaw ||
    null;
  const dealSlug = deal ? buildSlugWithId(deal.dealNumber ?? null, deal.id) || deal.id : null;
  const clientSlug = deal?.clientId
    ? buildSlugWithId(task.dealClientName ?? null, deal.clientId) || deal.clientId
    : null;
  const vehicleSlug = deal?.vehicleId
    ? buildSlugWithId(task.dealVehicleName ?? null, deal.vehicleId) || deal.vehicleId
    : null;
  const sellerSlug = deal?.sellerId
    ? buildSlugWithId(task.dealSellerName ?? null, deal.sellerId) || deal.sellerId
    : null;

  const rentyManagerFeeDefault = useMemo(
    () => deriveRentyManagerFee(commercialOfferPriceVat),
    [commercialOfferPriceVat],
  );
  const allowDocumentDeletion = Boolean(deal?.id);
  const taskTitle = isVehicleVerificationTask
    ? "Проверка тех состояния и оценочной стоимости авто"
    : isPrepareQuoteTask
      ? "Подписание покупателем коммерческого предложения"
      : isFinanceReviewTask
        ? FINANCE_REVIEW_TITLE
        : task.title;
  const defaultInstruction = isCompleted
    ? "Задача завершена — просмотрите ответы и вложения или вернитесь к списку."
    : isApprovalTask
      ? deadlineInfo
        ? `Проверьте данные и утвердите решение до ${deadlineInfo}.`
        : "Проверьте данные и утвердите решение."
      : deadlineInfo
        ? `Проверьте детали, заполните форму ниже и завершите задачу до ${deadlineInfo}.`
        : "Проверьте детали, заполните форму ниже и завершите задачу.";
  const taskInstruction =
    !isCompleted && (instructionShort && instructionShort.trim().length > 0 ? instructionShort : defaultInstruction);

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

  function isFileLarge(file: File | null | undefined): boolean {
    if (!file || typeof file.size !== "number") return false;
    return file.size > COMPRESSION_HINT_THRESHOLD_BYTES;
  }

  function getFileSize(file: File | null | undefined): number {
    return typeof file?.size === "number" ? file.size : 0;
  }

  function getTotalUploadSize(
    docFields: Record<string, File | null>,
    drafts: DocumentDraft[],
  ): number {
    const docFieldTotal = Object.values(docFields).reduce((acc, file) => acc + getFileSize(file), 0);
    const draftTotal = drafts.reduce((acc, draft) => acc + getFileSize(draft.file), 0);
    return docFieldTotal + draftTotal;
  }

  function buildCompressionWarning() {
    return `Файл больше ${COMPRESSION_HINT_LABEL}. Будет сжат перед загрузкой.`;
  }

  function setDocFieldWarning(fieldId: string, message: string | null) {
    setDocFieldWarnings((prev) => {
      if (!message) {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      }
      return { ...prev, [fieldId]: message };
    });
  }

  function setDraftWarning(draftId: string, message: string | null) {
    setDraftWarnings((prev) => {
      if (!message) {
        const next = { ...prev };
        delete next[draftId];
        return next;
      }
      return { ...prev, [draftId]: message };
    });
  }

  function handleTotalOversize() {
    setUploadValidationError(
      `Суммарный объём загружаемых файлов превышает ${MAX_TOTAL_UPLOAD_LABEL}. Удалите часть файлов или выберите меньшие.`,
    );
  }

  function resetFileInputValue(inputId: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) {
      input.value = "";
    }
  }

  function triggerFilePicker(inputId: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) {
      input.value = "";
      input.click();
    }
  }

  useEffect(() => {
    if (formState.status === "success" && formState.redirectTo) {
      router.push(formState.redirectTo);
    }
  }, [formState, router]);

  function handleRemoveDocumentDraft(id: string) {
    setDocumentDrafts((prev) => prev.filter((draft) => draft.id !== id));
    setUploadValidationError(null);
    setDraftWarning(id, null);
  }

  function validateUploadsBeforeSubmit(): boolean {
    const nextRequiredErrors: Record<string, string> = {};

    // Проверяем обязательные doc-поля
    for (const field of visibleFields) {
      const docFieldType = getFieldDocumentType(field);
      if (!docFieldType) continue;
      if (!isDocFieldRequired(field)) continue;
      const fieldId = field.id;
      const hasFile = Boolean(docFieldFiles[fieldId]);
      const storedValue = docFieldValues[fieldId] ?? resolveFieldValue(fieldId, payload) ?? "";
      const hasValue = typeof storedValue === "string" ? storedValue.trim().length > 0 : Boolean(storedValue);
      if (!hasFile && !hasValue) {
        nextRequiredErrors[fieldId] = "Загрузите обязательный документ";
      }
    }

    setRequiredDocErrors(nextRequiredErrors);
    const hasRequiredErrors = Object.keys(nextRequiredErrors).length > 0;
    if (hasRequiredErrors) {
      setUploadValidationError("Заполните обязательные документы.");
      if (typeof console !== "undefined") {
        console.warn("[task-form] submission blocked", { requiredMissing: nextRequiredErrors });
      }
      return false;
    }

    const totalSize = getTotalUploadSize(docFieldFiles, documentDrafts);
    if (totalSize > MAX_TOTAL_UPLOAD_BYTES) {
      handleTotalOversize();
      if (typeof console !== "undefined") {
        console.warn("[task-form] submission blocked: total size limit");
      }
      return false;
    }

    setUploadValidationError(null);
    if (typeof console !== "undefined") {
      console.log("[task-form] submission passed client-side validation");
    }
    return true;
  }

  async function handleDeleteGuardDocument(documentId: string) {
    if (!allowDocumentDeletion || !deal?.id) {
      setDocumentActionError("Невозможно удалить документ: не определена сделка.");
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
        taskId: task.id,
        dealId: deal.id,
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

  function isPlaceholderGuardDocument(doc: GuardDocumentLink): boolean {
    const normalizedTitle = doc.title?.trim().toLowerCase();
    if (!normalizedTitle) return false;
    return normalizedTitle === "нет подписанных документов" || normalizedTitle === "нет подписанных документов.";
  }

  function renderGuardDocumentList(showActions: boolean) {
    if (!visibleGuardDocuments.length) {
      return null;
    }

    return (
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
        {visibleGuardDocuments.map((doc) => {
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
                <span className="font-medium text-foreground">
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
                      <span className="sr-only">{deleting ? "Удаляем" : "Удалить"}</span>
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

  function renderFinanceSnapshot(snapshot: FinanceReviewSnapshot | null) {
    if (!snapshot) return null;
    const entities = [snapshot.deal, snapshot.vehicle, snapshot.client].filter(Boolean) as FinanceEntitySnapshot[];
    if (!entities.length) return null;
    const dealEntity = snapshot.deal;
    const financedAmount = (() => {
      const entry = dealEntity.data.find((item) => {
        const normalized = item.label.toLowerCase();
        return normalized.includes("финансируем") || normalized.includes("principal");
      });
      if (!entry) return null;
      const numeric = entry.value
        ? Number(entry.value.replace(/[^\d.,-]/g, "").replace(/\s+/g, "").replace(",", "."))
        : null;
      return numeric != null && Number.isFinite(numeric) ? numeric : null;
    })();
    const workflowDocs = dealEntity.workflowDocuments ?? [];
    const effectiveWorkflowDocs =
      workflowDocs.length > 0
        ? workflowDocs
        : dealEntity.documents.length > 0
          ? [
            {
              stageKey: "deal",
              stageTitle: dealEntity.title,
              taskTitle: "Документы сделки",
              taskTemplateId: "deal-documents",
              documents: dealEntity.documents,
            } satisfies WorkflowDocumentGroupEntry,
          ]
          : [];
    const additionalDocs = dealEntity.additionalDocuments ?? [];

    return (
      <Card className="border-border/80 bg-card/80 backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg font-semibold">Контекст по сделке</CardTitle>
          <CardDescription>
            Используйте уже заполненные данные и загруженные документы, чтобы принять решение без возврата задачи.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entities.map((entity) => (
              <div
                key={entity.title}
                className="flex w-full flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{entity.title}</span>
                </div>
                <div className="space-y-2">
                  {entity.data.map((item) => (
                    <div
                      key={`${entity.title}-${item.label}`}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="max-w-[60%] text-right font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <WorkflowDocuments
              groups={effectiveWorkflowDocs}
              additional={additionalDocs}
              financedAmount={financedAmount}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (typeof console !== "undefined") {
      console.log("[task-form] submit attempt intercepted");
    }
    event.preventDefault();

    if (!validateUploadsBeforeSubmit()) {
      return;
    }

    setIsUploading(true);
    setDocumentActionError(null);

    const formData = new FormData(event.currentTarget);
    const currentDealId = deal?.id || task.dealId || "";
    const currentGuardKey = guardKey ?? guardMeta?.key ?? "unknown";

    try {
      // 1. Identify files to upload
      const uploadsToPerform: Array<{
        file: File;
        fieldId: string; // fieldId or draftId
        isDraft: boolean;
      }> = [];

      // Required/Field docs
      for (const [id, file] of Object.entries(docFieldFiles)) {
        if (file) {
          uploadsToPerform.push({ file, fieldId: id, isDraft: false });
        }
      }

      // Drafts
      for (const draft of documentDrafts) {
        if (draft.file) {
          uploadsToPerform.push({ file: draft.file, fieldId: draft.id, isDraft: true });
        }
      }

      // 2. Perform uploads
      if (uploadsToPerform.length > 0) {
        await Promise.all(
          uploadsToPerform.map(async ({ file, fieldId, isDraft }) => {
            // Get signed URL
            const urlResult = await getUploadUrlAction({
              dealId: currentDealId,
              guardKey: currentGuardKey,
              fileName: file.name,
            });

            if ("error" in urlResult) {
              throw new Error(`Не удалось получить ссылку для загрузки файла ${file.name}: ${urlResult.error}`);
            }

            // Upload to Supabase
            const { url, path } = urlResult;
            const uploadResult = await fetch(url, {
              method: "PUT",
              body: file,
              headers: {
                "Content-Type": file.type || "application/octet-stream",
              },
            });

            if (!uploadResult.ok) {
              throw new Error(`Ошибка загрузки файла ${file.name} в хранилище`);
            }

            // Update FormData
            if (isDraft) {
              formData.delete(`documents[${fieldId}][file]`);
              formData.set(`documents[${fieldId}][path]`, path);
              formData.set(`documents[${fieldId}][size]`, file.size.toString());
              formData.set(`documents[${fieldId}][mime]`, file.type || "application/octet-stream");
            } else {
              formData.delete(`documentFields[${fieldId}][file]`);
              formData.set(`documentFields[${fieldId}][path]`, path);
              formData.set(`documentFields[${fieldId}][size]`, file.size.toString());
              formData.set(`documentFields[${fieldId}][mime]`, file.type || "application/octet-stream");
            }
          })
        );
      }

      // 3. Submit form
      startTransition(() => {
        formAction(formData);
      });

    } catch (error) {
      console.error("[task-form] upload error", error);
      setDocumentActionError(error instanceof Error ? error.message : "Ошибка при загрузке файлов");
    } finally {
      setIsUploading(false);
    }
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
            <div className="flex items-center gap-2">
              <Badge variant={statusMeta.variant} className="flex items-center gap-1 rounded-lg">
                {statusMeta.icon}
                {statusMeta.label}
              </Badge>
              {reopenBadge ? (
                <Badge variant="outline" className="rounded-lg bg-amber-50 text-amber-800">
                  {reopenBadge}
                </Badge>
              ) : null}
            </div>
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
          {task.isWorkflow && (deal?.clientId || deal?.vehicleId || deal?.sellerId) ? (
            <div className="flex flex-col gap-2">
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
              {deal?.clientId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground/80">Покупатель:</span>
                  <Link
                    href={
                      clientSlug ? `/ops/clients/${clientSlug}` : `/ops/clients/${deal.clientId}`
                    }
                    className="text-xs font-semibold uppercase tracking-wide text-brand-600 underline underline-offset-2"
                  >
                    {task.dealClientName ?? deal.clientId.slice(0, 8)}
                  </Link>
                  {deal.buyerType ? (
                    <span className="text-xs text-muted-foreground">
                      ({deal.buyerType === "company" ? "Юр. лицо" : deal.buyerType === "personal" ? "Физ. лицо" : deal.buyerType})
                    </span>
                  ) : null}
                </div>
              ) : null}
              {deal?.sellerId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground/80">Продавец:</span>
                  <Link
                    href={
                      sellerSlug ? `/ops/sellers/${sellerSlug}` : `/ops/sellers/${deal.sellerId}`
                    }
                    className="text-xs font-semibold uppercase tracking-wide text-brand-600 underline underline-offset-2"
                  >
                    {task.dealSellerName ?? deal.sellerName ?? deal.sellerId.slice(0, 8)}
                  </Link>
                  {deal.sellerType ? (
                    <span className="text-xs text-muted-foreground">
                      ({deal.sellerType === "company" ? "Юр. лицо" : deal.sellerType === "personal" ? "Физ. лицо" : deal.sellerType})
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {task.reopenCount > 0 ? (
            <div className="flex flex-col gap-1 rounded-lg border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-amber-900">Переоткрытий: {task.reopenCount}</span>
                {task.reopenedAt ? (
                  <span className="text-[11px] text-amber-800/80">Последнее: {formatDate(task.reopenedAt)}</span>
                ) : null}
              </div>
              {task.reopenReason ? <div>Причина: {task.reopenReason}</div> : null}
              {task.reopenComment ? <div className="text-amber-900/90">Комментарий: {task.reopenComment}</div> : null}
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

        </CardContent>
      </Card>

      {financeSnapshot ? (
        <div className="w-full">
          {renderFinanceSnapshot(financeSnapshot)}
        </div>
      ) : null}

      {canReopen ? (
        <Card className="border-border/80 bg-card/80 backdrop-blur" id="reopen-task">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-semibold">Переоткрытие задачи</CardTitle>
            <CardDescription>Добавьте причину и комментарий — задача вернётся в работу.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reopenState.status === "success" ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {reopenState.message ?? "Задача переоткрыта"}
              </div>
            ) : null}
            {reopenState.status === "error" ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {reopenState.message ?? "Не удалось переоткрыть задачу"}
              </div>
            ) : null}
            <form action={reopenFormAction} className="space-y-3">
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="reason" value={reopenReason} />
              <div className="grid gap-2">
                <Label htmlFor="reopen-reason">Причина</Label>
                <Select value={reopenReason} onValueChange={setReopenReason} disabled={reopenPending}>
                  <SelectTrigger id="reopen-reason" className="rounded-lg">
                    <SelectValue placeholder="Выберите причину" />
                  </SelectTrigger>
                  <SelectContent>
                    {REOPEN_REASON_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reopen-comment">Комментарий</Label>
                <Textarea
                  id="reopen-comment"
                  name="comment"
                  required
                  minLength={3}
                  placeholder="Коротко опишите, что нужно исправить или уточнить"
                  disabled={reopenPending}
                  className="rounded-lg"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={reopenPending} className="rounded-lg">
                  {reopenPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Переоткрыть
                </Button>
                <p className="text-xs text-muted-foreground">
                  Статус станет <span className="font-semibold text-foreground">IN_PROGRESS</span>, дедлайн и документы сохранятся.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

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

          {hasVisibleGuardDocuments ? (
            <div className="mb-4 rounded-lg border border-border/60 bg-muted/15 p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                <span>Загруженные документы</span>
              </div>
              {renderGuardDocumentList(!isReadOnly && allowDocumentDeletion)}
              {documentActionError ? (
                <p className="mt-2 text-xs text-destructive">{documentActionError}</p>
              ) : null}
              {documentActionMessage ? (
                <p className="mt-1 text-xs text-emerald-600">{documentActionMessage}</p>
              ) : null}
            </div>
          ) : null}

          <form
            className="space-y-5"
            onSubmit={handleFormSubmit}
          >
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="requiresDocument" value={requiresDocument ? "true" : "false"} />
            <input type="hidden" name="initialNote" value={guardState?.note ?? ""} />
            {task.dealId ? <input type="hidden" name="dealId" value={task.dealId} /> : null}
            {guardMeta ? <input type="hidden" name="guardKey" value={guardMeta.key} /> : null}
            {guardMeta ? <input type="hidden" name="guardLabel" value={guardMeta.label} /> : null}

            {taskInstruction ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-foreground">
                {taskInstruction}
              </div>
            ) : null}
            {documentActionError ? (
              <p className="text-xs text-destructive">{documentActionError}</p>
            ) : null}
            {documentActionMessage ? (
              <p className="text-xs text-emerald-600">{documentActionMessage}</p>
            ) : null}

            {visibleFields.length > 0 ? (
              <div
                className={`workflow-template-block space-y-3 rounded-xl border-2 p-4 transition-shadow ${
                  isCompleted
                    ? "border-emerald-400/40 bg-emerald-50/70 shadow-[0_20px_40px_-28px_rgba(16,185,129,0.45)] dark:bg-emerald-500/10"
                    : "border-amber-400/60 bg-amber-100/70 shadow-[0_20px_45px_-25px_rgba(245,158,11,0.6)] dark:bg-amber-500/10"
                }`}
              >
                {visibleFields.map((field, index) => {
                  const fieldId = field.id;
                  const value = fieldValues[fieldId] !== undefined ? fieldValues[fieldId] : resolveFieldValue(fieldId, payload);
                  const rawValue =
                    payload?.fields && fieldId in (payload.fields as Record<string, unknown>)
                      ? (payload.fields as Record<string, unknown>)[fieldId]
                      : payload?.defaults && fieldId in (payload.defaults as Record<string, unknown>)
                        ? (payload.defaults as Record<string, unknown>)[fieldId]
                        : undefined;

                  // --- Dependency Check ---
                  if (field.depends_on) {
                    const [depField, depValue] = field.depends_on.split("=");
                    const currentDepValue = fieldValues[depField];
                    if (depValue !== undefined) {
                      if (String(currentDepValue) !== depValue) return null;
                    } else {
                      if (!currentDepValue) return null;
                    }
                  }
                  // ------------------------

                  const baseLabel = field.label ?? fieldId;
                  const hint = field.hint ?? "";
                  let label = baseLabel;
                  if (fieldId === "buyer_contact_email" && buyerType === "personal") {
                    label = "Электронная почта покупателя";
                  } else if (fieldId === "buyer_contact_phone" && buyerType === "personal") {
                    label = "Телефон покупателя";
                  }
                  if (fieldId === "seller_contact_email" && sellerType === "personal") {
                    label = "Электронная почта продавца";
                  } else if (fieldId === "seller_contact_phone" && sellerType === "personal") {
                    label = "Телефон продавца";
                  }
                  if (buyerType === "personal" && INDIVIDUAL_DOC_LABELS[fieldId]) {
                    label = INDIVIDUAL_DOC_LABELS[fieldId];
                  }
                  const isRentyManagerFeeField = fieldId === "renty_manager_commission";
                  const hasUserValue = typeof value === "string" ? value.trim().length > 0 : value != null;
                  const effectiveValue =
                    isRentyManagerFeeField
                      ? rentyManagerFeeDefault ?? value
                      : value;
                  const docFieldType = getFieldDocumentType(field);
                  if (docFieldType && /(файл)/i.test(label)) {
                    label = label.replace(/\s*\(файл\)/gi, "").trim();
                  }
                  const type = field.type?.toLowerCase();

                  const isDocField = Boolean(docFieldType || type === "file");
                  const isRequired = isDocField ? isDocFieldRequired(field) : field.required ?? false;
                  const isLastRow = index === visibleFields.length - 1;
                  const rowClass = useTwoColumnFieldLayout
                    ? `grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,260px)_1fr] sm:items-center px-4 py-3 ${isLastRow ? "" : "border-b border-border/60"
                    }`
                    : "space-y-2 py-2";
                  const renderRow = (control: JSX.Element) =>
                    renderFieldRow({
                      id: `${fieldId}-${buyerType}-${formResetToken}`
                        .replace(/\s+/g, '-')
                        .toLowerCase(),
                      label,
                      required: isRequired,
                      control,
                      useTwoColumn: useTwoColumnFieldLayout,
                      rowClass,
                    });

                  // --- New Field Types ---
                  if (type === "section_header") {
                     return (
                        <div key={field.id} className="col-span-full mt-6 mb-2">
                           <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
                           {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
                           <hr className="mt-2 border-border/60" />
                        </div>
                     );
                  }

                  if (type === "link") {
                    let target = field.link_target || "#";
                    if (deal) {
                      target = target
                        .replace("{{deal.client_id}}", deal.clientId || "")
                        .replace("{{deal.seller_id}}", deal.sellerId || "")
                        .replace("{{deal.broker_id}}", deal.brokerId || "");
                    }
                    
                    return (
                        <div key={field.id} className="col-span-full sm:col-span-1 flex items-end pb-2">
                            <a
                                href={target}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
                            >
                                {label}
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    );
                  }

                  if (type === "profile_selector") {
                     const profileSelectorControl = (
                        <>
                           <ProfileSelector
                              value={effectiveValue as string}
                              onChange={(val) => {
                                 handleFieldValueChange(fieldId, val);
                              }}
                              filter={field.filter as any}
                              disabled={isReadOnly || field.readonly}
                              optional={!field.required}
                           />
                           <input type="hidden" name={`field:${fieldId}`} value={effectiveValue as string || ""} />
                           {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
                        </>
                     );
                     return renderRow(profileSelectorControl);
                  }

                  // Hide company contact fields for individuals
                  if (
                    (fieldId === "buyer_company_email" || fieldId === "buyer_company_phone") &&
                    buyerType !== "company"
                  ) {
                    return (
                      <input
                        key={fieldId}
                        type="hidden"
                        name={`field:${fieldId}`}
                        value=""
                      />
                    );
                  }

                  if (fieldId === "buyer_type" || fieldId === "seller_type") {
                    const effectiveOptions =
                      Array.isArray(field.options) && field.options.length > 0
                        ? field.options
                        : PARTY_TYPE_OPTIONS;
                    const options = effectiveOptions;
                    const currentValue =
                      fieldId === "buyer_type" ? pendingBuyerType || buyerType : sellerType;
                    const hiddenValue = fieldId === "buyer_type" ? buyerType : sellerType;
                    const setValue = fieldId === "buyer_type" ? setPendingBuyerType : setSellerType;
                    const handleChange = (value: string) => {
                      const normalized =
                        value === PARTY_TYPE_EMPTY_VALUE ? "" : (value as PartyTypeValue);
                      if (fieldId === "buyer_type") {
                        setValue(normalized);
                        return;
                      }
                      setValue(normalized);
                    };
                    const placeholder =
                      fieldId === "buyer_type" ? "Выберите тип покупателя" : "Выберите тип продавца";
                    const selectControl = (
                      <>
                        <Select
                          value={currentValue || PARTY_TYPE_EMPTY_VALUE}
                          onValueChange={handleChange}
                          disabled={pending || isReadOnly}
                        >
                          <SelectTrigger id={`field-${fieldId}`} className="rounded-lg">
                            <SelectValue placeholder={placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PARTY_TYPE_EMPTY_VALUE}>Не выбрано</SelectItem>
                            {options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <input type="hidden" name={`field:${fieldId}`} value={hiddenValue} />
                        {fieldId === "buyer_type" && pendingBuyerType && pendingBuyerType !== buyerType ? (
                          <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <div>
                              Тип покупателя будет изменён на
                              {pendingBuyerType === "company" ? " «Юр. лицо»" : " «Физ. лицо»"}. Поля и файлы
                              для другого типа будут очищены.
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-lg"
                                onClick={() => {
                                  const normalized = pendingBuyerType;
                                  if (!normalized || normalized === buyerType) {
                                    setPendingBuyerType("");
                                    return;
                                  }
                                  setDocFieldFiles({});
                                  setDocFieldValues({});
                                  setFormResetToken((prev) => prev + 1);
                                  setBuyerType(normalized as PartyTypeValue);
                                  setPendingBuyerType("");
                                }}
                                disabled={pending || isReadOnly}
                              >
                                Применить
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                onClick={() => setPendingBuyerType("")}
                                disabled={pending || isReadOnly}
                              >
                                Отмена
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    );
                    return renderRow(selectControl);
                  }

                  if (type === "textarea") {
                    const textareaControl = (
                      <Textarea
                        id={`field-${fieldId}`}
                        name={`field:${fieldId}`}
                        defaultValue={(value as string) ?? ""}
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
                        readOnly={isReadOnly || field.readonly}
                        disabled={pending || isReadOnly || field.readonly}
                      />
                    );
                    return renderRow(textareaControl);
                  }

                  if (type === "checklist") {
                    const parsedChecklist = normalizeChecklistCandidate(value);
                    const checklist = parsedChecklist ? filterChecklistTypes(parsedChecklist) : [];
                    const checklistControl = (
                      <>
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
                      </>
                    );
                    return renderRow(checklistControl);
                  }

                  if (type === "boolean") {
                    const normalizedBoolean =
                      booleanFieldValues[fieldId] ?? normalizeBooleanValue(rawValue ?? value);
                    const booleanControl = (
                      <div className="flex items-center gap-3">
                        <Switch
                          id={`field-${fieldId}`}
                          checked={normalizedBoolean}
                          onCheckedChange={(checked) => {
                            setBooleanFieldValues((prev) => ({ ...prev, [fieldId]: checked }));
                          }}
                          disabled={pending || isReadOnly}
                        />
                        <input
                          type="hidden"
                          name={`field:${fieldId}`}
                          value={normalizedBoolean ? "true" : "false"}
                        />
                      </div>
                    );
                    return renderRow(booleanControl);
                  }

                  if (isDocField) {
                    const currentFile = docFieldFiles[fieldId] ?? null;
                    const attachedDoc =
                      docFieldType && guardDocumentsByType[docFieldType]
                        ? guardDocumentsByType[docFieldType]
                        : null;
                    const currentValue =
                      docFieldValues[fieldId] ??
                      value ??
                      attachedDoc?.storagePath ??
                      attachedDoc?.url ??
                      "";
                    const attachedFileName =
                      attachedDoc?.storagePath
                        ? getFileNameFromPath(attachedDoc.storagePath)
                        : attachedDoc?.url
                          ? getFileNameFromPath(attachedDoc.url)
                          : null;
                    const fileLabel =
                      currentFile?.name ||
                      getFileNameFromPath(currentValue) ||
                      attachedFileName ||
                      null;
                    const deletingAttached = attachedDoc ? isDocumentDeleting(attachedDoc.id) : false;
                    const effectiveDocType = docFieldType ?? "";
                    const docFieldInputId = `document-field-${fieldId}`;

                    // --- Logic for PREFILLED documents in schema fields ---
                    const prefilledDoc =
                      !currentFile && !attachedDoc && !dismissedPrefills[fieldId] && effectiveDocType && clientDocuments
                        ? clientDocuments.find((d) => d.document_type === effectiveDocType)
                        : null;
                    const isPrefilled = Boolean(prefilledDoc);
                    // -----------------------------------------------------

                    const fileControl = (
                      <div className="space-y-2">
                        <input type="hidden" name={`documentFields[${fieldId}][type]`} value={effectiveDocType} />
                        {isPrefilled && prefilledDoc ? (
                          <>
                            <input
                              type="hidden"
                              name={`documentFields[${fieldId}][prefilled_path]`}
                              value={prefilledDoc.storage_path ?? ""}
                            />
                            <input
                              type="hidden"
                              name={`documentFields[${fieldId}][prefilled_id]`}
                              value={prefilledDoc.id}
                            />
                            
                            <div className="flex items-center justify-end gap-2">
                              <div className="flex items-center gap-2">
                                {prefilledDoc.signedUrl ? (
                                  <Button asChild size="sm" variant="outline" className="rounded-lg">
                                    <Link href={prefilledDoc.signedUrl} target="_blank">
                                      Открыть
                                    </Link>
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => {
                                    setDismissedPrefills((prev) => ({ ...prev, [fieldId]: true }));
                                  }}
                                  disabled={pending || isReadOnly}
                                >
                                  Заменить
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <input
                              id={docFieldInputId}
                              type="file"
                              name={`documentFields[${fieldId}][file]`}
                              accept={CLIENT_DOCUMENT_ACCEPT_TYPES}
                              className="sr-only"
                              onChange={(event) => {
                                const file = event.currentTarget.files?.[0] ?? null;
                                const prevFile = docFieldFiles[fieldId] ?? null;
                                const currentTotal = getTotalUploadSize(docFieldFiles, documentDrafts);
                                const nextTotal = currentTotal - getFileSize(prevFile) + getFileSize(file);
                                if (nextTotal > MAX_TOTAL_UPLOAD_BYTES) {
                                  handleTotalOversize();
                                } else {
                                  setUploadValidationError(null);
                                }
                                setDocFieldFiles((prev) => ({ ...prev, [fieldId]: file }));
                                if (file && isFileLarge(file)) {
                                  setDocFieldWarning(fieldId, buildCompressionWarning());
                                } else {
                                  setDocFieldWarning(fieldId, null);
                                }
                                setRequiredDocErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[fieldId];
                                  return next;
                                });
                                if (file) {
                                  setDocFieldValues((prev) => ({ ...prev, [fieldId]: currentValue }));
                                }
                              }}
                              disabled={pending || isReadOnly}
                            />
                            <input type="hidden" name={`field:${fieldId}`} value={currentValue} />
                            <div className="flex flex-wrap items-center gap-2 justify-end">
                              {fileLabel ? (
                                <span className="text-xs font-medium text-foreground">{fileLabel}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Файл не выбран</span>
                              )}
                              <div className="flex items-center gap-2">
                                {attachedDoc?.url ? (
                                  <Button asChild type="button" variant="outline" size="sm" className="rounded-lg">
                                    <Link href={attachedDoc.url} target="_blank">
                                      Открыть
                                    </Link>
                                  </Button>
                                ) : null}
                                {fileLabel ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-lg"
                                    onClick={() => {
                                      triggerFilePicker(docFieldInputId);
                                    }}
                                    disabled={pending || isReadOnly}
                                  >
                                    <RefreshCcw className="h-4 w-4" />
                                    <span className="sr-only">Заменить файл</span>
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    className="rounded-lg"
                                    onClick={() => {
                                      triggerFilePicker(docFieldInputId);
                                    }}
                                    disabled={pending || isReadOnly}
                                  >
                                    <Paperclip className="mr-2 h-4 w-4" />
                                    Загрузить
                                  </Button>
                                )}
                                {fileLabel ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-lg text-destructive"
                                    onClick={() => {
                                      if (attachedDoc && !currentFile) {
                                        handleDeleteGuardDocument(attachedDoc.id);
                                      }
                                      resetFileInputValue(docFieldInputId);
                                      setDocFieldFiles((prev) => ({ ...prev, [fieldId]: null }));
                                      setDocFieldValues((prev) => ({ ...prev, [fieldId]: "" }));
                                      setDocFieldWarning(fieldId, null);
                                    }}
                                    disabled={pending || deletingAttached || isReadOnly}
                                  >
                                    {deletingAttached ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">Удалить файл</span>
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </>
                        )}
                        {requiredDocErrors[fieldId] ? (
                          <div className="flex justify-end">
                            <Badge
                              variant="danger"
                              className="bg-red-600 text-white border-red-600 text-[11px] font-medium"
                            >
                              {requiredDocErrors[fieldId]}
                            </Badge>
                          </div>
                        ) : docFieldWarnings[fieldId] ? (
                          <div className="flex justify-end">
                            <Badge
                              variant="secondary"
                              className="bg-amber-400 text-amber-950 border-amber-400 text-[11px] font-medium"
                            >
                              {docFieldWarnings[fieldId]}
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                    );

                    return renderRow(fileControl);
                  }

                  // Prefill contact fields from deal/profile data if available and not already set
                  let prefilledTextValue = effectiveValue;
                  if (!prefilledTextValue) {
                    if (fieldId === "buyer_contact_email" && deal?.buyerEmail) {
                      prefilledTextValue = deal.buyerEmail;
                    } else if (fieldId === "buyer_contact_phone" && deal?.buyerPhone) {
                      prefilledTextValue = deal.buyerPhone;
                    } else if (fieldId === "seller_contact_email" && deal?.sellerEmail) {
                      prefilledTextValue = deal.sellerEmail;
                    } else if (fieldId === "seller_contact_phone" && deal?.sellerPhone) {
                      prefilledTextValue = deal.sellerPhone;
                    }
                  }

                  const inputControl = (
                    <>
                      <Input
                        id={`field-${fieldId}`}
                        name={`field:${fieldId}`}
                        defaultValue={(prefilledTextValue as string) ?? ""}
                        required={isRequired}
                        placeholder={hint}
                        className="rounded-lg"
                        readOnly={isReadOnly || field.readonly || isRentyManagerFeeField}
                        disabled={pending || isReadOnly || field.readonly || isRentyManagerFeeField}
                        onChange={(e) => handleFieldValueChange(fieldId, e.target.value)}
                      />
                      {isRentyManagerFeeField ? (
                        <input type="hidden" name={`field:${fieldId}`} value={(effectiveValue as string) ?? ""} />
                      ) : null}
                    </>
                  );
                  return renderRow(inputControl);
                })}
              </div>
            ) : null}
            {isBuyerDocsTask ? (
              <input type="hidden" name="field:checklist" value={JSON.stringify(buyerChecklist)} />
            ) : null}

            {isSellerDocsTask ? (
              <input type="hidden" name="field:checklist" value={JSON.stringify(sellerChecklist)} />
            ) : null}

            {enableDocsSection ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border/70 p-4">
                <button
                  type="button"
                  onClick={() => setIsAdditionalDocsOpen(!isAdditionalDocsOpen)}
                  className="flex w-full items-start justify-between gap-2 text-left"
                >
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-foreground">Загрузка дополнительных документов</span>
                    <p className="text-xs text-muted-foreground">
                      {documentSectionDescription}
                    </p>
                  </div>
                  {isAdditionalDocsOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                {isAdditionalDocsOpen ? (
                  <div className="mt-4 space-y-4">
                    {uploadValidationError ? (
                  <p className="text-xs text-destructive">{uploadValidationError}</p>
                ) : null}

                <div className="space-y-3">
                  {documentDrafts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{documentEmptyStateText}</p>
                  ) : (
                    documentDrafts.map((draft, index) => {
                      const draftInputId = `document-file-${draft.id}`;
                      const isPrefilled = Boolean(draft.prefilledPath);

                      return (
                        <div
                          key={draft.id}
                          className="space-y-3 rounded-xl border border-border/70 p-3 shadow-sm"
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
                              disabled={pending || isReadOnly}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Удалить файл</span>
                            </Button>
                          </div>
                          <div className="flex flex-col gap-3 md:flex-row">
                            <div className="flex-1 space-y-2">
                              <Label>Тип документа</Label>
                              <Select
                                value={draft.type || DOCUMENT_TYPE_EMPTY_VALUE}
                                onValueChange={(nextValue) => {
                                  const normalized =
                                    nextValue === DOCUMENT_TYPE_EMPTY_VALUE
                                      ? ""
                                      : (nextValue as ClientDocumentTypeValue);
                                  handleDocumentDraftTypeChange(draft.id, normalized);
                                }}
                                disabled={pending || isReadOnly || isPrefilled}
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
                              {isPrefilled ? (
                                <>
                                  <input type="hidden" name={`documents[${draft.id}][prefilled_path]`} value={draft.prefilledPath ?? ""} />
                                  <input type="hidden" name={`documents[${draft.id}][prefilled_title]`} value={draft.prefilledTitle ?? ""} />
                                  <input type="hidden" name={`documents[${draft.id}][prefilled_id]`} value={draft.prefilledId ?? ""} />
                                </>
                              ) : null}
                            </div>
                            <div className="flex-1 space-y-2">
                              <Label htmlFor={draftInputId}>
                                {isPrefilled ? "Найден в профиле клиента" : "Файл"}
                              </Label>
                              
                              {isPrefilled ? (
                                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <Paperclip className="h-4 w-4 text-brand-600 flex-shrink-0" />
                                    <span className="truncate text-xs font-medium text-foreground" title={draft.prefilledTitle ?? ""}>
                                      {draft.prefilledTitle || "Документ"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {draft.prefilledUrl ? (
                                      <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                                        <Link href={draft.prefilledUrl} target="_blank">
                                          <span className="sr-only">Открыть</span>
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="h-4 w-4"
                                          >
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                          </svg>
                                        </Link>
                                      </Button>
                                    ) : null}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-xs"
                                      onClick={() => {
                                        // Clear prefilled data to switch to upload mode
                                        setDocumentDrafts((prev) => prev.map(d => 
                                          d.id === draft.id 
                                            ? { ...d, prefilledPath: undefined, prefilledTitle: undefined, prefilledUrl: undefined, prefilledId: undefined, file: null } 
                                            : d
                                        ));
                                      }}
                                    >
                                      Заменить
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <input
                                    id={draftInputId}
                                    type="file"
                                    name={`documents[${draft.id}][file]`}
                                    accept={CLIENT_DOCUMENT_ACCEPT_TYPES}
                                    onChange={(event) => {
                                      const file = event.currentTarget.files?.[0] ?? null;
                                      const currentTotal = getTotalUploadSize(docFieldFiles, documentDrafts);
                                      const prevDraft = documentDrafts.find((entry) => entry.id === draft.id);
                                      const prevSize = getFileSize(prevDraft?.file);
                                      const nextTotal = currentTotal - prevSize + getFileSize(file);
                                      if (nextTotal > MAX_TOTAL_UPLOAD_BYTES) {
                                        handleTotalOversize();
                                      } else {
                                        setUploadValidationError(null);
                                      }
                                      setDraftWarning(draft.id, file && isFileLarge(file) ? buildCompressionWarning() : null);
                                      handleDocumentDraftFileChange(draft.id, file);
                                    }}
                                    className="sr-only"
                                    disabled={pending || isReadOnly}
                                  />
                                  <div className="flex flex-wrap items-center gap-2 justify-end">
                                    <span className="text-xs text-muted-foreground">
                                      {draft.file?.name ? `Выбран файл: ${draft.file.name}` : "Файл не выбран"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {draft.file?.name ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="rounded-lg"
                                          onClick={() => {
                                            triggerFilePicker(draftInputId);
                                          }}
                                          disabled={pending || isReadOnly}
                                        >
                                          <RefreshCcw className="h-4 w-4" />
                                          <span className="sr-only">Заменить файл</span>
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="rounded-lg"
                                          onClick={() => {
                                            triggerFilePicker(draftInputId);
                                          }}
                                          disabled={pending || isReadOnly}
                                        >
                                          <Paperclip className="mr-2 h-4 w-4" />
                                          Выбрать файл
                                        </Button>
                                      )}
                                      {draft.file?.name ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="rounded-lg text-destructive"
                                          onClick={() => {
                                            resetFileInputValue(draftInputId);
                                            handleDocumentDraftFileChange(draft.id, null);
                                            setDraftWarning(draft.id, null);
                                          }}
                                          disabled={pending || isReadOnly}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Удалить файл</span>
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            {draftWarnings[draft.id] ? (
                              <div className="flex justify-end">
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-400 text-amber-950 border-amber-400 text-[11px] font-medium"
                                >
                                  {draftWarnings[draft.id]}
                                </Badge>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
              )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 rounded-lg"
                    onClick={handleAddDocumentDraft}
                    disabled={pending || isReadOnly}
                  >
                    <Plus className="h-4 w-4" />
                    Добавить документ
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    После отправки файлы автоматически попадут в карточку сделки.
                  </p>
                </div>
                  </div>
                ) : null}
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
                readOnly={isReadOnly}
                disabled={pending || isReadOnly}
              />
            </div>

            {formState.status === "error" ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formState.message ?? "Не удалось завершить задачу. Попробуйте снова."}
              </div>
            ) : null}

            {!isReadOnly ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                {pending || isUploading ? (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    {isUploading 
                      ? "Загружаем файлы в облако (может занять время)..." 
                      : "Сохраняем данные и завершаем задачу..."}
                  </span>
                ) : null}
                <Button
                  type="submit"
                  className="rounded-lg"
                  name="intent"
                  value="complete"
                  disabled={pending || isUploading}
                >
                  {pending || isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading 
                        ? "Загрузка..." 
                        : isApprovalTask
                          ? "Утверждаем..."
                          : "Завершаем..."}
                    </>
                  ) : (
                    isApprovalTask ? "Утвердить" : "Завершить задачу"
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Поля заблокированы — для изменений переоткройте задачу.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
