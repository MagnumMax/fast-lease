import { notFound } from "next/navigation";

import { TaskDetailView } from "@/app/(dashboard)/ops/_components/task-detail";
import {
  CLIENT_DOCUMENT_TYPES,
  DEAL_DOCUMENT_TYPES,
  OPS_VEHICLE_STATUS_META,
  OPS_WORKFLOW_STATUS_MAP,
  VEHICLE_DOCUMENT_TYPES,
  getClientDocumentLabel,
  getDealDocumentLabel,
  getVehicleDocumentLabel,
  normalizeClientDocumentType,
  normalizeDealDocumentType,
  normalizeVehicleDocumentType,
  type ClientDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import { getWorkspaceTaskById } from "@/lib/supabase/queries/tasks";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";
import { resolveTaskGuardKey } from "@/lib/workflow/task-utils";
import { completeTaskFormAction, reopenTaskAction } from "./actions";
import {
  TASK_DOCUMENT_MAPPING,
} from "@/lib/constants/task-documents";
import {
  evaluateClientDocumentChecklist,
  extractChecklistFromTaskPayload,
  isOptionalGuardDocument,
  type ClientDocumentChecklist,
  type ClientDocumentSummary,
} from "@/lib/workflow/documents-checklist";

const VEHICLE_VERIFICATION_GUARD_KEY = "vehicle.verified";
const TECHNICAL_REPORT_TYPE: ClientDocumentTypeValue = "technical_report";
const FINANCE_REVIEW_TASK_TYPE = "FIN_CALC";
const INVESTOR_APPROVAL_TASK_TYPE = "INVESTOR_APPROVAL";
const PREPARE_CONTRACT_TASK_TYPE = "PREPARE_CONTRACT";
const BUYER_DOCS_GUARD_KEY = "docs.required.allUploaded";
const SELLER_DOCS_GUARD_KEY = "docs.seller.allUploaded";

type GuardDocumentLink = {
  id: string;
  title: string | null;
  documentType: string | null;
  storagePath: string | null;
  status: string | null;
  url: string | null;
};

type TaskPageParams = {
  params: Promise<{ id: string }>;
};

const ALLOWED_PROFILE_DOC_TYPES = [
  // Buyer (Company)
  "doc_company_license",
  "company_license", // Correct type from template
  "doc_emirates_id_manager",
  "doc_passport_manager",
  "doc_emirates_id_driver",
  "doc_passport_driver",
  "doc_driving_license",

  // Buyer (Individual)
  "doc_passport_buyer",
  "doc_emirates_id_buyer",
  "doc_driving_license_buyer",
  "doc_second_driver_bundle",

  // Seller (Company)
  "doc_emirates_id_owner",
  "emirates_id_owner", // Seen in DB
  "doc_trn_certificate",
  "trn_certificate", // Correct type from template

  // Seller (Individual)
  "doc_emirates_id_seller",
  "emirates_id_seller", // Potential variant

  // Generic / Registry (Personal)
  "identity_document",
  "salary_certificate",
  "bank_statement",
  "proof_of_address",
  "emirates_id", // Generic type seen in DB

  // Generic / Registry (Company)
  "corporate_documents",
  "company_bank_statement",
];

const DEAL_STORAGE_BUCKET = "deal-documents";
const CLIENT_STORAGE_BUCKET = "client-documents";
const VEHICLE_STORAGE_BUCKET = "vehicle-documents";
type SummaryDataPoint = { label: string; value: string };
type SummaryDocumentEntry = {
  label: string;
  value: string;
  status?: string | null;
  url?: string | null;
  kind?: "document" | "parameter";
};
type WorkflowDocumentDefinition = {
  documentType: string;
  label: string;
};
type TaskSchemaEntry =
  | { kind: "document"; id: string; label: string; documentType: string }
  | { kind: "parameter"; id: string; label: string; value: string };
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
type CommercialOfferExtract = {
  priceVat: number | null;
  termMonths: number | null;
  downPaymentAmount: number | null;
  interestRateAnnual: number | null;
  insuranceRateAnnual: number | null;
  comment: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  updatedByEmail: string | null;
  updatedByPhone: string | null;
};

type ClientDocumentWithUrl = ClientDocumentSummary & { signedUrl: string | null };
type DealDocumentWithUrl = {
  id: string;
  document_type: string | null;
  title: string | null;
  status: string | null;
  storage_path: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
  signedUrl: string | null;
};
type VehicleDocumentWithUrl = {
  id: string;
  document_type: string | null;
  title: string | null;
  status: string | null;
  storage_path: string | null;
  metadata?: unknown;
  signedUrl: string | null;
};

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat("ru-RU");

function formatCurrencyValue(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) ? currencyFormatter.format(num) : "—";
}

function formatPercentValue(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) ? `${percentFormatter.format(num)}%` : "—";
}

function formatNumberValue(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) ? numberFormatter.format(num) : "—";
}

function formatDateValue(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ru-RU");
}

function formatStringValue(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
  }
  if (value == null) return "—";
  return String(value);
}

function getStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function pickString(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const value = (obj as Record<string, unknown>)[key];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function pickNumber(obj: unknown, key: string): number | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const value = (obj as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function parseQuoteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[^0-9.,-]/g, "")
    .replace(/\s+/g, "")
    .replace(/,(?=\\d{3}\\b)/g, "")
    .replace(/,/g, ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDocumentTypeValue(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function stripFileSuffix(label?: string | null): string {
  if (!label) return "";
  return label.replace(/\s*\(файл\)/gi, "").trim();
}

const EXCLUDED_FIELD_LABELS = new Set([
  "id сделки",
  "текущий этап",
  "номер сделки",
  "этап workflow",
  "статус сделки",
]);

function isDocumentSchemaEntry(entry: TaskSchemaEntry): entry is Extract<TaskSchemaEntry, { kind: "document" }> {
  return entry.kind === "document";
}

function isParameterSchemaEntry(entry: TaskSchemaEntry): entry is Extract<TaskSchemaEntry, { kind: "parameter" }> {
  return entry.kind === "parameter";
}

function extractDocumentDefinitionsFromPayload(payload: Record<string, unknown> | null): WorkflowDocumentDefinition[] {
  const schemaBranch =
    payload && typeof payload.schema === "object" && !Array.isArray(payload.schema)
      ? (payload.schema as Record<string, unknown>)
      : null;
  const fieldsRaw = Array.isArray(schemaBranch?.fields) ? schemaBranch?.fields : [];
  const definitions: WorkflowDocumentDefinition[] = [];

  fieldsRaw.forEach((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const branch = raw as Record<string, unknown>;
    const docType =
      typeof branch.document_type === "string"
        ? (branch.document_type as string)
        : typeof branch.documentType === "string"
          ? (branch.documentType as string)
          : null;
    if (!docType) return;
    const labelRaw = typeof branch.label === "string" ? (branch.label as string) : docType;
    const label = stripFileSuffix(labelRaw);
    definitions.push({ documentType: docType, label: label.length > 0 ? label : docType });
  });

  return definitions;
}

function resolveDocumentLabelFromType(documentType: string | null, fallbackLabel?: string | null): string {
  const candidates = [
    fallbackLabel,
    documentType ? getDealDocumentLabel(documentType) : null,
    documentType ? getClientDocumentLabel(documentType as ClientDocumentTypeValue) : null,
    documentType,
  ];
  const match = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  return match ? match.trim() : "Документ";
}

function extractFieldDefinitionsFromPayload(payload: Record<string, unknown> | null): Array<{ id: string; label: string }> {
  const schemaBranch =
    payload && typeof payload.schema === "object" && !Array.isArray(payload.schema)
      ? (payload.schema as Record<string, unknown>)
      : null;
  const fieldsRaw = Array.isArray(schemaBranch?.fields) ? schemaBranch.fields : [];

  const definitions: Array<{ id: string; label: string }> = [];

  fieldsRaw.forEach((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const branch = raw as Record<string, unknown>;
    const id = typeof branch.id === "string" ? branch.id : null;
    if (!id) return;
    const type = typeof branch.type === "string" ? branch.type.toLowerCase() : "";
    const hasDocumentType =
      typeof branch.document_type === "string" ||
      typeof (branch as { documentType?: unknown }).documentType === "string";
    if (type === "file" || hasDocumentType) return;
    const label = typeof branch.label === "string" ? branch.label : id;
    const normalizedLabel = label.trim().toLowerCase();
    if (EXCLUDED_FIELD_LABELS.has(normalizedLabel)) return;
    definitions.push({ id, label: label.trim().length > 0 ? label : id });
  });

  return definitions;
}

function resolveTaskFieldValue(fieldId: string, payload: Record<string, unknown> | null): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const fieldsBranch =
    payload.fields && typeof payload.fields === "object" && !Array.isArray(payload.fields)
      ? (payload.fields as Record<string, unknown>)
      : {};
  const defaultsBranch =
    payload.defaults && typeof payload.defaults === "object" && !Array.isArray(payload.defaults)
      ? (payload.defaults as Record<string, unknown>)
      : {};
  if (fieldId in fieldsBranch) return fieldsBranch[fieldId];
  if (fieldId in defaultsBranch) return defaultsBranch[fieldId];
  return null;
}

function formatTaskFieldValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString("ru-RU") : "—";
  }
  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => formatTaskFieldValue(entry))
      .filter((entry) => entry && entry !== "—");
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "—" : value.toLocaleDateString("ru-RU");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }
  return String(value);
}

function extractOrderedSchemaEntriesFromPayload(payload: Record<string, unknown> | null): TaskSchemaEntry[] {
  const schemaBranch =
    payload && typeof payload.schema === "object" && !Array.isArray(payload.schema)
      ? (payload.schema as Record<string, unknown>)
      : null;
  const fieldsRaw = Array.isArray(schemaBranch?.fields) ? schemaBranch.fields : [];
  const entries: TaskSchemaEntry[] = [];

  fieldsRaw.forEach((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const branch = raw as Record<string, unknown>;
    const id = typeof branch.id === "string" ? branch.id : null;
    if (!id) return;
    const labelRaw = typeof branch.label === "string" ? branch.label : id;
    const normalizedLabel = labelRaw.trim().toLowerCase();
    const fieldType = typeof branch.type === "string" ? branch.type.toLowerCase() : "";
    const documentType =
      typeof branch.document_type === "string"
        ? (branch.document_type as string)
        : typeof (branch as { documentType?: unknown }).documentType === "string"
          ? ((branch as { documentType?: string }).documentType as string)
          : null;
    const hasDocumentType = Boolean(documentType);

    if (fieldType === "file" || hasDocumentType) {
      if (!documentType) return;
      const docLabel = stripFileSuffix(labelRaw);
      entries.push({
        kind: "document",
        id,
        documentType,
        label: docLabel.length > 0 ? docLabel : documentType,
      });
      return;
    }

    if (EXCLUDED_FIELD_LABELS.has(normalizedLabel)) return;

    entries.push({
      kind: "parameter",
      id,
      label: labelRaw.trim().length > 0 ? labelRaw : id,
      value: formatTaskFieldValue(resolveTaskFieldValue(id, payload)),
    });
  });

  return entries;
}

type DealTaskSnapshot = {
  id: string;
  title: string;
  guardKey: string | null;
  stageKey: string | null;
  stageTitle: string | null;
  createdAt: string | null;
  schemaEntries: TaskSchemaEntry[];
  documents: WorkflowDocumentDefinition[];
  parameters: Array<{ id: string; label: string; value: string }>;
};

function buildTaskDocumentGroups(
  tasks: DealTaskSnapshot[],
  dealDocuments: DealDocumentWithUrl[],
): WorkflowDocumentGroupEntry[] {
  const taskByGuard = new Map<string | null, DealTaskSnapshot>();
  tasks.forEach((task) => {
    const guardKey = task.guardKey ?? null;
    if (!taskByGuard.has(guardKey)) {
      taskByGuard.set(guardKey, task);
    }
  });

  const defaultGuardlessTask = tasks.find((t) => !t.guardKey) ?? null;
  const groups = new Map<string, WorkflowDocumentGroupEntry>();
  const groupDocTypeMap = new Map<string, Map<string, SummaryDocumentEntry>>();

  // инициализируем группы по задачам, чтобы показать даже не загруженные документы
  tasks.forEach((task) => {
    const groupKey = task.id;
    const orderedEntries: TaskSchemaEntry[] =
      task.schemaEntries.length > 0
        ? task.schemaEntries
        : [
            ...task.documents.map((def) => ({
              kind: "document" as const,
              id: def.documentType,
              label: def.label,
              documentType: def.documentType,
            })),
            ...task.parameters.map((param) => ({
              kind: "parameter" as const,
              id: param.id,
              label: param.label,
              value: param.value,
            })),
          ];
    const groupDocs: SummaryDocumentEntry[] = [];
    const docMap = new Map<string, SummaryDocumentEntry>();

    orderedEntries.forEach((entry) => {
      if (isDocumentSchemaEntry(entry)) {
        const docEntry: SummaryDocumentEntry = {
          label: resolveDocumentLabelFromType(entry.documentType, entry.label),
          value: "—",
          status: null,
          url: null,
        };
        groupDocs.push(docEntry);
        const normalized = normalizeDocumentTypeValue(entry.documentType);
        if (normalized) {
          docMap.set(normalized, docEntry);
        }
      } else if (isParameterSchemaEntry(entry)) {
        groupDocs.push({
          label: entry.label ?? entry.id,
          value: entry.value ?? "—",
          status: null,
          url: null,
          kind: "parameter",
        });
      }
    });
    groups.set(groupKey, {
      stageKey: task.stageKey ?? "deal",
      stageTitle: task.stageTitle ?? task.stageKey ?? "Сделка",
      taskTitle: task.title,
      taskTemplateId: task.id,
      documents: groupDocs,
    });
    groupDocTypeMap.set(groupKey, docMap);
  });

  const requiredDocs = dealDocuments.filter((doc) => !isOptionalGuardDocument(doc.metadata));
  const docsByType = new Map<string, DealDocumentWithUrl[]>();
  for (const doc of requiredDocs) {
    const normalized = normalizeDocumentTypeValue(doc.document_type);
    if (!normalized) continue;
    const list = docsByType.get(normalized) ?? [];
    list.push(doc);
    docsByType.set(normalized, list);
  }

  requiredDocs.forEach((doc) => {
    const metadata =
      doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
        ? (doc.metadata as Record<string, unknown>)
        : null;
    const docGuard = metadata && typeof metadata.guard_key === "string" ? (metadata.guard_key as string) : null;
    const targetTask =
      (docGuard ? taskByGuard.get(docGuard) : null) ?? defaultGuardlessTask ?? tasks[0] ?? null;
    const groupKey = targetTask ? targetTask.id : `doc-${docGuard ?? "unassigned"}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        stageKey: targetTask?.stageKey ?? "deal",
        stageTitle: targetTask?.stageTitle ?? targetTask?.stageKey ?? "Сделка",
        taskTitle: targetTask?.title ?? "Документы",
        taskTemplateId: groupKey,
        documents: [],
      });
      groupDocTypeMap.set(groupKey, new Map());
    }
    const entryMap = groupDocTypeMap.get(groupKey) ?? new Map<string, SummaryDocumentEntry>();
    const normalizedType = normalizeDocumentTypeValue(doc.document_type);
    const existing = normalizedType ? entryMap.get(normalizedType) : null;

    const label = resolveDocumentLabelFromType(doc.document_type, doc.title ?? null);
    const value = formatDateValue(doc.created_at ?? null);
    const status = doc.status ?? null;
    const url = doc.signedUrl ?? null;

    if (existing) {
      existing.value = value;
      existing.status = status;
      existing.url = url;
    } else {
      const entry: SummaryDocumentEntry = { label, value, status, url };
      groups.get(groupKey)!.documents.push(entry);
      if (normalizedType) {
        entryMap.set(normalizedType, entry);
      }
    }
    groupDocTypeMap.set(groupKey, entryMap);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    documents: group.documents,
  }));
}

function buildAdditionalDocumentEntries(dealDocuments: DealDocumentWithUrl[]): SummaryDocumentEntry[] {
  const optionalDocs = dealDocuments.filter((doc) => isOptionalGuardDocument(doc.metadata));
  return optionalDocs.map((doc) => {
    const metadata =
      doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
        ? (doc.metadata as Record<string, unknown>)
        : null;
    const guardLabel =
      metadata && typeof metadata.guard_label === "string" && metadata.guard_label.trim().length > 0
        ? (metadata.guard_label as string)
        : null;

    const label = resolveDocumentLabelFromType(doc.document_type, guardLabel ?? doc.title ?? null);
    const value = formatDateValue(doc.created_at ?? null);

    return {
      label,
      value,
      status: doc.status ?? null,
      url: doc.signedUrl ?? null,
    };
  });
}

function extractCommercialOfferFromPayload(payload: unknown): CommercialOfferExtract | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const branch = payload as Record<string, unknown>;
  const priceVat = parseQuoteNumber(branch["price_vat"]);
  const termMonths = parseQuoteNumber(branch["term_months"]);
  const downPaymentAmount = parseQuoteNumber(branch["down_payment_amount"]);
  const interestRateAnnual = parseQuoteNumber(branch["interest_rate_annual"]);
  const insuranceRateAnnual = parseQuoteNumber(branch["insurance_rate_annual"]);

  const metaBranch =
    branch["quote_meta"] && typeof branch["quote_meta"] === "object" && !Array.isArray(branch["quote_meta"])
      ? (branch["quote_meta"] as Record<string, unknown>)
      : {};

  const comment = getStringValue(metaBranch["comment"]) ?? getStringValue(branch["guard_note"]) ?? null;

  const offer: CommercialOfferExtract = {
    priceVat,
    termMonths,
    downPaymentAmount,
    interestRateAnnual,
    insuranceRateAnnual,
    comment,
    updatedAt: getStringValue(metaBranch["updated_at"]),
    updatedBy: getStringValue(metaBranch["updated_by"]),
    updatedByName: getStringValue(metaBranch["updated_by_name"]),
    updatedByEmail: getStringValue(metaBranch["updated_by_email"]),
    updatedByPhone: getStringValue(metaBranch["updated_by_phone"]),
  };

  const hasValue =
    offer.priceVat != null ||
    offer.termMonths != null ||
    offer.downPaymentAmount != null ||
    offer.interestRateAnnual != null ||
    offer.insuranceRateAnnual != null ||
    (offer.comment && offer.comment.length > 0);

  return hasValue ? offer : null;
}

function buildDocumentEntries<T extends { document_type?: string | null; title?: string | null; status?: string | null; signedUrl?: string | null }>(
  registry: ReadonlyArray<{ value: string; label: string }>,
  normalize: (value?: string | null) => string | undefined,
  resolveLabel: (value?: string | null) => string | undefined,
  documents: T[],
): SummaryDocumentEntry[] {
  const map = new Map<string, T>();
  documents.forEach((doc) => {
    const normalized = normalize(doc.document_type ?? undefined) ?? doc.document_type ?? "";
    if (!normalized) return;
    if (!map.has(normalized)) {
      map.set(normalized, doc);
    }
  });

  return registry.map((entry) => {
    const normalized = normalize(entry.value) ?? entry.value;
    const match = normalized ? map.get(normalized) : undefined;
    return {
      label: resolveLabel(entry.value) ?? entry.label,
      value: match ? formatStringValue(match.title ?? entry.label) : "—",
      status: match?.status ?? null,
      url: match?.signedUrl ?? null,
    };
  });
}

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
  let dealSummary: {
    id: string;
    dealNumber: string | null;
    clientId: string | null;
    sellerId: string | null;
    sellerName?: string | null;
    sellerType?: string | null;
    sellerEmail?: string | null;
    sellerPhone?: string | null;
    vehicleId: string | null;
    buyerEmail?: string | null;
    buyerPhone?: string | null;
    buyerType?: string | null;
  } | null = null;
  let clientChecklist: ClientDocumentChecklist | null = null;
  let guardDocuments: GuardDocumentLink[] = [];
  let financeSnapshot: FinanceReviewSnapshot | null = null;
  let dealDocuments: DealDocumentWithUrl[] = [];
  let clientDocuments: ClientDocumentWithUrl[] = [];
  let relatedTasks: DealTaskSnapshot[] = [];
  let commercialOffer: CommercialOfferExtract | null = null;

  if (task.dealId) {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServiceClient();
    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select(
        `
          id,
          deal_number,
          client_id,
          seller_id,
          seller:profiles!deals_seller_id_fkey(id, full_name, entity_type, phone, metadata),
          vehicle_id,
          status,
          monthly_payment,
          monthly_lease_rate,
          total_amount,
          principal_amount,
          interest_rate,
          down_payment_amount,
          term_months,
          contract_start_date,
          contract_end_date,
          first_payment_date,
          payload,
          deal_documents:deal_documents (
            id,
            document_type,
            storage_path,
            title,
            status,
            created_at,
            metadata
          )
        `,
      )
      .eq("id", task.dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[workflow] failed to load deal for task page", dealError);
    }

    if (dealRow) {
      const effectiveClientId = (dealRow.client_id as string | null) ?? null;

      let buyerEmail: string | null = null;
      let buyerPhone: string | null = null;
      let buyerType: string | null = null;

      // Try fetching from profiles (using client_id)
      if (effectiveClientId) {
        const { data: profileData } = await serviceClient
          .from("profiles")
          .select("phone, metadata, entity_type")
          .eq("user_id", effectiveClientId)
          .maybeSingle();

        if (profileData) {
          buyerType = profileData.entity_type;
          if (!buyerPhone) buyerPhone = profileData.phone;
          // Try to get email from metadata if not found
          if (
            !buyerEmail &&
            profileData.metadata &&
            typeof profileData.metadata === "object" &&
            profileData.metadata !== null &&
            "email" in profileData.metadata
          ) {
            buyerEmail = (profileData.metadata as { email?: string }).email ?? null;
          }
        }

        // 3. Last resort: Fetch email from auth.users using service client
        if (!buyerEmail && effectiveClientId) {
          try {
            const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(
              effectiveClientId,
            );
            if (!userError && userData?.user?.email) {
              buyerEmail = userData.user.email;
            } else if (userError) {
              console.warn("[workflow] failed to fetch user email from auth", userError);
            }
          } catch (err) {
            console.warn("[workflow] failed to fetch user email", err);
          }
        }
      }

      let sellerType = ((dealRow.seller as unknown) as { entity_type: string | null } | null)?.entity_type ?? null;
      let sellerProfileId = ((dealRow.seller as unknown) as { id: string | null } | null)?.id ?? null;
      let sellerPhone = ((dealRow.seller as unknown) as { phone: string | null } | null)?.phone ?? null;
      let sellerMetadata = ((dealRow.seller as unknown) as { metadata: Record<string, unknown> | null } | null)?.metadata ?? null;
      let sellerEmail: string | null = null;

      if (sellerMetadata && typeof sellerMetadata === "object" && "email" in sellerMetadata) {
        sellerEmail = (sellerMetadata as { email?: string }).email ?? null;
      }

      if ((!sellerType || !sellerProfileId) && dealRow.seller_id) {
        const { data: sellerData } = await serviceClient
          .from("profiles")
          .select("id, entity_type, phone, metadata")
          .eq("user_id", dealRow.seller_id)
          .maybeSingle();
        if (sellerData) {
          if (!sellerType) sellerType = sellerData.entity_type;
          if (!sellerProfileId) sellerProfileId = sellerData.id;
          if (!sellerPhone) sellerPhone = sellerData.phone;
          
          if (!sellerEmail && sellerData.metadata && typeof sellerData.metadata === "object" && "email" in sellerData.metadata) {
            sellerEmail = (sellerData.metadata as { email?: string }).email ?? null;
          }
        }
      }

      // Last resort for seller email: Fetch from auth.users
      if (!sellerEmail && dealRow.seller_id) {
        try {
          const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(
            dealRow.seller_id,
          );
          if (!userError && userData?.user?.email) {
            sellerEmail = userData.user.email;
          }
        } catch (err) {
          console.warn("[workflow] failed to fetch seller email", err);
        }
      }

      dealSummary = {
        id: dealRow.id,
        dealNumber: dealRow.deal_number ?? null,
        clientId: effectiveClientId,
        sellerId: (dealRow.seller_id as string | null) ?? null,
        sellerName: ((dealRow.seller as unknown) as { full_name: string | null } | null)?.full_name ?? null,
        sellerType,
        sellerEmail,
        sellerPhone,
        vehicleId: dealRow.vehicle_id ?? null,
        buyerEmail,
        buyerPhone,
        buyerType,
      };
      commercialOffer = extractCommercialOfferFromPayload(dealRow.payload ?? null);
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, type, payload, created_at")
        .eq("deal_id", task.dealId)
        .order("created_at", { ascending: true });

      if (tasksError) {
        console.error("[workflow] failed to load related tasks for finance snapshot", tasksError);
      } else if (Array.isArray(tasksData)) {
        relatedTasks = tasksData.map((row) => {
          const payload =
            row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
              ? (row.payload as Record<string, unknown>)
              : {};
          const guardNote = getStringValue((payload as { guard_note?: unknown }).guard_note);
          const guardKey = resolveTaskGuardKey({
            guardKey: typeof payload.guard_key === "string" ? (payload.guard_key as string) : null,
            payload,
          });
          const stageKey =
            typeof payload.status_key === "string"
              ? (payload.status_key as string)
              : typeof (payload.status as Record<string, unknown> | undefined)?.key === "string"
                ? ((payload.status as Record<string, unknown>).key as string)
                : null;
          const stageTitle = stageKey && OPS_WORKFLOW_STATUS_MAP[stageKey] ? OPS_WORKFLOW_STATUS_MAP[stageKey].title : stageKey;
          const schemaEntriesBase = extractOrderedSchemaEntriesFromPayload(payload);

          const checklist = extractChecklistFromTaskPayload(payload);
          let extendedChecklist = [...checklist];

          // Merge static mapping with payload checklist
          if (row.type) {
            const taskType = row.type.toUpperCase();
            let mappingKey: string | null = null;

            if (taskType === "COLLECT_SELLER_DOCS" && sellerType) {
              const suffix = sellerType.toLowerCase() === "personal" ? "INDIVIDUAL" : sellerType.toUpperCase();
              mappingKey = `${taskType}_${suffix}`;
            } else if (taskType === "COLLECT_BUYER_DOCS" && buyerType) {
              const suffix = buyerType.toLowerCase() === "personal" ? "INDIVIDUAL" : buyerType.toUpperCase();
              mappingKey = `${taskType}_${suffix}`;
            }

            if (mappingKey && TASK_DOCUMENT_MAPPING[mappingKey]) {
              const mappedDocs = TASK_DOCUMENT_MAPPING[mappingKey];
              for (const doc of mappedDocs) {
                if (!extendedChecklist.includes(doc)) {
                  extendedChecklist.push(doc);
                }
              }
            }
          }

          const checklistEntries: TaskSchemaEntry[] = extendedChecklist.map((docType) => ({
            kind: "document" as const,
            id: docType,
            documentType: docType,
            label: getClientDocumentLabel(docType as ClientDocumentTypeValue) || docType,
          }));

          const existingDocTypes = new Set(
            schemaEntriesBase
              .filter(isDocumentSchemaEntry)
              .map((e) => e.documentType)
          );

          const uniqueChecklistEntries = checklistEntries.filter(
            (entry) => isDocumentSchemaEntry(entry) && !existingDocTypes.has(entry.documentType)
          );

          const schemaEntriesCombined = [...schemaEntriesBase, ...uniqueChecklistEntries];

          const schemaEntries =
            guardNote && !schemaEntriesCombined.some((entry) => isParameterSchemaEntry(entry) && entry.id === "guard_note")
              ? [
                  ...schemaEntriesCombined,
                  {
                    kind: "parameter" as const,
                    id: "guard_note",
                    label: "Комментарий",
                    value: guardNote,
                  },
                ]
              : schemaEntriesCombined;
          const parameters = schemaEntries
            .filter(isParameterSchemaEntry)
            .map((entry) => ({
              id: entry.id,
              label: entry.label,
              value: entry.value,
            }));
          const documents = schemaEntries
            .filter(isDocumentSchemaEntry)
            .map((entry) => ({
              documentType: entry.documentType,
              label: entry.label,
            }));
          const parametersFallback =
            parameters.length > 0
              ? parameters
              : extractFieldDefinitionsFromPayload(payload).map((field) => ({
                  id: field.id,
                  label: field.label,
                  value: formatTaskFieldValue(resolveTaskFieldValue(field.id, payload)),
                }));
          const documentsFallback =
            documents.length > 0 ? documents : extractDocumentDefinitionsFromPayload(payload);

          return {
            id: row.id,
            title: typeof row.title === "string" && row.title.trim().length > 0 ? row.title : "Задача",
            guardKey,
            stageKey,
            stageTitle: stageTitle ?? null,
            createdAt: row.created_at ?? null,
            schemaEntries,
            documents: documentsFallback,
            parameters: parametersFallback,
          };
        });
      }

      const dealDocumentsRaw = Array.isArray(dealRow.deal_documents)
        ? (dealRow.deal_documents as Array<{
            id?: string;
            document_type?: string | null;
            storage_path?: string | null;
            title?: string | null;
            status?: string | null;
            metadata?: unknown;
          }>)
        : [];

      dealDocuments = await Promise.all(
        dealDocumentsRaw.map(async (doc) => ({
          id:
            (doc.id as string | undefined) ??
            (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `deal-doc-${Math.random().toString(36).slice(2, 10)}`),
          document_type: (doc.document_type as string | null | undefined) ?? null,
          storage_path: (doc.storage_path as string | null | undefined) ?? null,
          title: (doc.title as string | null | undefined) ?? null,
          status: (doc.status as string | null | undefined) ?? null,
          created_at: (doc as { created_at?: string }).created_at ?? null,
          metadata: (doc.metadata as Record<string, unknown> | null) ?? null,
          signedUrl: doc.storage_path
            ? await createSignedStorageUrl({ bucket: DEAL_STORAGE_BUCKET, path: doc.storage_path as string })
            : null,
        })),
      );

      if (sellerProfileId) {
        // Only fetch documents that are actually relevant to the seller profile (Entity documents).
        // Vehicle/Deal specific documents (Mulkia, Passing, etc.) should not be pulled from the seller profile
        // as they are bound to the specific deal/vehicle, not the seller entity.
        const { data: sellerDocsData, error: sellerDocsError } = await serviceClient
          .from("profile_documents")
          .select("id, document_type, title, status, storage_path, metadata, uploaded_at")
          .eq("profile_id", sellerProfileId)
          .in("document_type", ALLOWED_PROFILE_DOC_TYPES);

        if (sellerDocsError) {
          console.error("[workflow] failed to load seller documents", sellerDocsError);
        } else if (Array.isArray(sellerDocsData)) {
          const sellerDocs = await Promise.all(
            sellerDocsData.map(async (doc) => {
              const metadata = (doc.metadata as Record<string, unknown> | null) ?? null;
              const metaBucket =
                metadata && typeof metadata.bucket === "string" ? (metadata.bucket as string) : null;
              
              let signedUrl: string | null = null;
              if (doc.storage_path) {
                 const bucketsToTry = metaBucket
                  ? [metaBucket, "profile-documents", DEAL_STORAGE_BUCKET, CLIENT_STORAGE_BUCKET]
                  : ["profile-documents", DEAL_STORAGE_BUCKET, CLIENT_STORAGE_BUCKET];
                 
                 // Remove duplicates
                 const uniqueBuckets = Array.from(new Set(bucketsToTry));

                 for (const bucket of uniqueBuckets) {
                   const url = await createSignedStorageUrl({ bucket, path: doc.storage_path });
                   if (url) {
                     signedUrl = url;
                     break;
                   }
                 }
              }

              return {
                id: doc.id,
                document_type: doc.document_type,
                title: doc.title,
                status: doc.status,
                storage_path: doc.storage_path,
                created_at: doc.uploaded_at,
                metadata,
                signedUrl,
              };
            }),
          );
          dealDocuments = [...dealDocuments, ...sellerDocs];
        }
      }

      if (effectiveClientId) {
        const { data: clientDocsData, error: clientDocsError } = await supabase
          .from("client_documents")
          .select("id, document_type, title, status, storage_path, metadata")
          .eq("client_id", effectiveClientId)
          .in("document_type", ALLOWED_PROFILE_DOC_TYPES);

        if (clientDocsError) {
          console.error("[workflow] failed to load client documents for task page", clientDocsError);
        } else if (Array.isArray(clientDocsData)) {
          const documents = clientDocsData as ClientDocumentSummary[];
          clientDocuments = await Promise.all(
            documents.map(async (doc) => ({
              ...doc,
              signedUrl: doc.storage_path
                ? await createSignedStorageUrl({ bucket: CLIENT_STORAGE_BUCKET, path: doc.storage_path })
                : null,
            })),
          );
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

        if (dealDocuments.length > 0) {
          const matchingDoc = dealDocuments.find((document) => {
            const metadata =
              document.metadata && typeof document.metadata === "object" && !Array.isArray(document.metadata)
                ? (document.metadata as Record<string, unknown>)
                : null;
            const metadataGuardKey =
              metadata && typeof metadata.guard_key === "string" ? (metadata.guard_key as string) : null;
            const metadataGuardDealId =
              metadata && typeof metadata.guard_deal_id === "string" ? (metadata.guard_deal_id as string) : null;
            const metadataGuardType =
              metadata && typeof metadata.guard_document_type === "string"
                ? (metadata.guard_document_type as string)
                : null;

            if (metadataGuardKey && metadataGuardKey !== guardKey) return false;
            if (metadataGuardDealId && metadataGuardDealId !== task.dealId) return false;

            return (
              Boolean(document.storage_path) &&
              (metadataGuardKey === guardKey ||
                document.document_type === guardKey ||
                metadataGuardType === guardKey)
            );
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
            resolvedDocumentType = metadataDocType ?? (matchingDoc.document_type ?? null);
          }
        }

        if (guardKey && dealDocuments.length > 0) {
          const seenPaths = new Set<string>();
          const guardDealId = task.dealId;
          const relevantDocs = dealDocuments.filter((doc) => {
            const metadata =
              doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
                ? (doc.metadata as Record<string, unknown>)
                : null;
            const metadataGuardKey =
              metadata && typeof metadata.guard_key === "string" ? (metadata.guard_key as string) : null;
            const metadataGuardType =
              metadata && typeof metadata.guard_document_type === "string"
                ? (metadata.guard_document_type as string)
                : null;
            const metadataDealId = metadata && typeof metadata.guard_deal_id === "string"
              ? (metadata.guard_deal_id as string)
              : null;

            if (metadataGuardKey && metadataGuardKey !== guardKey) return false;
            if (guardDealId && metadataDealId && metadataDealId !== guardDealId) return false;
            if (
              !metadataGuardKey &&
              resolvedDocumentType &&
              doc.document_type !== resolvedDocumentType &&
              metadataGuardType !== resolvedDocumentType
            ) {
              return false;
            }
            if (!metadataGuardKey && !resolvedDocumentType && doc.document_type !== guardKey) return false;
            return doc.storage_path ? !seenPaths.has(doc.storage_path) : true;
          });

          const guardDocsWithUrls: GuardDocumentLink[] = [];
          for (const doc of relevantDocs) {
            const storagePath = doc.storage_path ?? null;
            const signedUrl = doc.signedUrl ?? null;
            const titleFallback = guardMeta?.label ?? "Документ";
            const link: GuardDocumentLink = {
              id: doc.id,
              title: doc.title ?? titleFallback,
              documentType: doc.document_type ?? null,
              storagePath,
              status: doc.status ?? null,
              url: signedUrl,
            };

            if (storagePath) {
              seenPaths.add(storagePath);
            }
            guardDocsWithUrls.push(link);
          }

          if (guardDocsWithUrls.length > 0) {
            guardDocuments = guardDocsWithUrls;
          }
        }

        let attachmentUrl: string | null = null;
        if (attachmentPath != null) {
          const bucketsToTry = [DEAL_STORAGE_BUCKET, CLIENT_STORAGE_BUCKET];
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

        const enforcedChecklist =
          guardKey === VEHICLE_VERIFICATION_GUARD_KEY ? [TECHNICAL_REPORT_TYPE] : [];
        const baseChecklist =
          guardKey === BUYER_DOCS_GUARD_KEY || guardKey === SELLER_DOCS_GUARD_KEY
            ? []
            : extractChecklistFromTaskPayload(task.payload ?? null);
        const requiredChecklist = Array.from(new Set([...baseChecklist, ...enforcedChecklist]));
        if (requiredChecklist.length > 0 && dealDocuments.length > 0) {
          const checklistDocs = dealDocuments
            .filter((doc) => !isOptionalGuardDocument(doc.metadata))
            .map<ClientDocumentSummary>((doc) => ({
              id: doc.id,
              document_type: doc.document_type,
              status: doc.status,
              title: doc.title,
              storage_path: doc.storage_path,
              metadata:
                doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
                  ? (doc.metadata as Record<string, unknown>)
                  : null,
            }));
          clientChecklist = evaluateClientDocumentChecklist(requiredChecklist, checklistDocs);
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

      if (
        task.type === FINANCE_REVIEW_TASK_TYPE ||
        task.type === INVESTOR_APPROVAL_TASK_TYPE ||
        task.type === PREPARE_CONTRACT_TASK_TYPE
      ) {
        const dealDataPoints: SummaryDataPoint[] = [];
        commercialOffer = commercialOffer ?? extractCommercialOfferFromPayload(dealRow.payload ?? null);
        if (commercialOffer) {
          const commercialOfferEntries: SummaryDataPoint[] = [];
          if (commercialOffer.priceVat != null) {
            commercialOfferEntries.push({
              label: "Стоимость с VAT, AED",
              value: formatCurrencyValue(commercialOffer.priceVat),
            });
          }
          if (commercialOffer.downPaymentAmount != null) {
            commercialOfferEntries.push({
              label: "Аванс (КП), AED",
              value: formatCurrencyValue(commercialOffer.downPaymentAmount),
            });
          }
          if (commercialOffer.termMonths != null) {
            commercialOfferEntries.push({
              label: "Срок, месяцев",
              value: formatNumberValue(commercialOffer.termMonths),
            });
          }
          if (commercialOffer.interestRateAnnual != null) {
            commercialOfferEntries.push({
              label: "Ставка финансирования, % годовых",
              value: formatPercentValue(commercialOffer.interestRateAnnual),
            });
          }
          if (commercialOffer.insuranceRateAnnual != null) {
            commercialOfferEntries.push({
              label: "Ставка страхования, % годовых",
              value: formatPercentValue(commercialOffer.insuranceRateAnnual),
            });
          }
          if (commercialOffer.comment) {
            commercialOfferEntries.push({
              label: "Комментарий КП",
              value: formatStringValue(commercialOffer.comment),
            });
          }
          if (commercialOffer.updatedAt) {
            commercialOfferEntries.push({
              label: "КП обновлено",
              value: formatDateValue(commercialOffer.updatedAt),
            });
          }
          dealDataPoints.push(...commercialOfferEntries);

          const price = commercialOffer.priceVat;
          const termMonths = commercialOffer.termMonths;
          const downPayment = commercialOffer.downPaymentAmount ?? 0;
          const annualRate = commercialOffer.interestRateAnnual;
          const insuranceAnnualRate = commercialOffer.insuranceRateAnnual;

          const principal = price != null ? Math.max(0, price - downPayment) : null;
          const monthlyRatePercent = annualRate != null ? annualRate / 12 : null;
          const periodRatePercent =
            annualRate != null && termMonths != null ? (annualRate * termMonths) / 12 : null;
          const totalInterestAmount =
            principal != null && annualRate != null && termMonths != null && termMonths > 0
              ? principal * (annualRate / 100) * (termMonths / 12)
              : null;
          const payoffWithInterest =
            principal != null && totalInterestAmount != null ? principal + totalInterestAmount : null;
          const monthlyLeasePayment =
            payoffWithInterest != null && termMonths != null && termMonths > 0
              ? payoffWithInterest / termMonths
              : null;
          const insuranceTotal =
            price != null && insuranceAnnualRate != null && termMonths != null && termMonths > 0
              ? price * (insuranceAnnualRate / 100) * (termMonths / 12)
              : null;
          const totalForClient =
            payoffWithInterest != null && insuranceTotal != null
              ? payoffWithInterest + insuranceTotal + downPayment
              : null;

          const calculationEntries: SummaryDataPoint[] = [
            { label: "Месячная ставка, %", value: formatPercentValue(monthlyRatePercent) },
            { label: "Ставка за срок, %", value: formatPercentValue(periodRatePercent) },
            { label: "Финансируемая сумма", value: formatCurrencyValue(principal) },
            { label: "Итого к погашению", value: formatCurrencyValue(payoffWithInterest) },
            { label: "Ежемесячный платёж", value: formatCurrencyValue(monthlyLeasePayment) },
            { label: "Доход по процентам", value: formatCurrencyValue(totalInterestAmount) },
            { label: "Страховые платежи", value: formatCurrencyValue(insuranceTotal) },
            { label: "Итого для покупателя (страх. + аванс)", value: formatCurrencyValue(totalForClient) },
          ];

          dealDataPoints.push(...calculationEntries);
        }

        const dealDocumentEntries = buildDocumentEntries(
          DEAL_DOCUMENT_TYPES,
          normalizeDealDocumentType,
          getDealDocumentLabel,
          dealDocuments,
        );
        const workflowDocuments = buildTaskDocumentGroups(relatedTasks, dealDocuments);
        const additionalDocuments = buildAdditionalDocumentEntries(dealDocuments);

        let vehicleSnapshot: FinanceEntitySnapshot | null = null;
        const vehicleId = dealSummary?.vehicleId ?? null;
        if (vehicleId) {
          const { data: vehicleRow, error: vehicleError } = await supabase
            .from("vehicles")
            .select(
              "id, vin, make, model, variant, year, mileage, color_exterior, color_interior, fuel_type, transmission, engine_capacity, license_plate, body_type, status",
            )
            .eq("id", vehicleId)
            .maybeSingle();

          if (vehicleError) {
            console.error("[workflow] failed to load vehicle for finance review", vehicleError);
          }

          let vehicleDocs: VehicleDocumentWithUrl[] = [];
          const { data: vehicleDocsData, error: vehicleDocsError } = await supabase
            .from("vehicle_documents")
            .select("id, document_type, title, status, storage_path, metadata")
            .eq("vehicle_id", vehicleId);

          if (vehicleDocsError) {
            console.error("[workflow] failed to load vehicle documents", vehicleDocsError);
          } else if (Array.isArray(vehicleDocsData)) {
            vehicleDocs = await Promise.all(
              vehicleDocsData.map(async (doc) => ({
                id:
                  (doc.id as string | undefined) ??
                  (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `vehicle-doc-${Math.random().toString(36).slice(2, 10)}`),
                document_type: (doc.document_type as string | null | undefined) ?? null,
                title: (doc.title as string | null | undefined) ?? null,
                status: (doc.status as string | null | undefined) ?? null,
                storage_path: (doc.storage_path as string | null | undefined) ?? null,
                metadata: doc.metadata ?? null,
                signedUrl: doc.storage_path
                  ? await createSignedStorageUrl({ bucket: VEHICLE_STORAGE_BUCKET, path: doc.storage_path as string })
                  : null,
              })),
            );
          }

          if (vehicleRow) {
            const vehicleTitle = [vehicleRow.make, vehicleRow.model, vehicleRow.variant].filter(Boolean).join(" ");
            const engineLabel =
              vehicleRow.engine_capacity != null && Number.isFinite(Number(vehicleRow.engine_capacity))
                ? `${formatNumberValue(vehicleRow.engine_capacity)} л`
                : "—";
            const mileageLabel =
              vehicleRow.mileage != null && Number.isFinite(Number(vehicleRow.mileage))
                ? `${formatNumberValue(vehicleRow.mileage)} км`
                : "—";
            const vehicleStatusLabel =
              vehicleRow.status && OPS_VEHICLE_STATUS_META[vehicleRow.status]
                ? OPS_VEHICLE_STATUS_META[vehicleRow.status].label
                : formatStringValue(vehicleRow.status);

            const vehicleDataPoints: SummaryDataPoint[] = [
              { label: "Авто", value: vehicleTitle.length > 0 ? vehicleTitle : "—" },
              { label: "VIN", value: formatStringValue(vehicleRow.vin) },
              { label: "Год", value: vehicleRow.year ? String(vehicleRow.year) : "—" },
              { label: "Статус авто", value: vehicleStatusLabel },
              { label: "Тип кузова", value: formatStringValue(vehicleRow.body_type) },
              { label: "Топливо", value: formatStringValue(vehicleRow.fuel_type) },
              { label: "Коробка", value: formatStringValue(vehicleRow.transmission) },
              { label: "Двигатель", value: engineLabel },
              { label: "Пробег", value: mileageLabel },
              { label: "Цвет (наружный)", value: formatStringValue(vehicleRow.color_exterior) },
              { label: "Цвет (салон)", value: formatStringValue(vehicleRow.color_interior) },
              { label: "Номерной знак", value: formatStringValue(vehicleRow.license_plate) },
            ];

            const vehicleDocumentEntries = buildDocumentEntries(
              VEHICLE_DOCUMENT_TYPES,
              normalizeVehicleDocumentType,
              getVehicleDocumentLabel,
              vehicleDocs,
            );

            vehicleSnapshot = {
              title: "Авто",
              data: vehicleDataPoints,
              documents: vehicleDocumentEntries,
            };
          }
        }

        let clientSnapshot: FinanceEntitySnapshot | null = null;
        if (effectiveClientId) {
          const { data: profileRow, error: profileError } = await supabase
            .from("profiles")
            .select(
              "full_name, phone, emirates_id, passport_number, nationality, residency_status, date_of_birth, address, employment_info, financial_profile",
            )
            .eq("user_id", effectiveClientId)
            .maybeSingle();

          if (profileError) {
            console.error("[workflow] failed to load client profile", profileError);
          } else if (profileRow) {
            const employmentInfo =
              profileRow.employment_info && typeof profileRow.employment_info === "object" && !Array.isArray(profileRow.employment_info)
                ? (profileRow.employment_info as Record<string, unknown>)
                : null;
            const financialProfile =
              profileRow.financial_profile && typeof profileRow.financial_profile === "object" && !Array.isArray(profileRow.financial_profile)
                ? (profileRow.financial_profile as Record<string, unknown>)
                : null;
            const addressBranch =
              profileRow.address && typeof profileRow.address === "object" && !Array.isArray(profileRow.address)
                ? (profileRow.address as Record<string, unknown>)
                : null;

            const monthlyIncome = pickNumber(financialProfile, "monthly_income");
            const employer = pickString(employmentInfo, "company") ?? pickString(employmentInfo, "employer");
            const position = pickString(employmentInfo, "position") ?? pickString(employmentInfo, "role");
            const employmentType = pickString(employmentInfo, "employment_type");
            const city = pickString(addressBranch, "city") ?? pickString(addressBranch, "city_name");

            const clientDataPoints: SummaryDataPoint[] = [
              { label: "ФИО", value: formatStringValue(profileRow.full_name) },
              { label: "Телефон", value: formatStringValue(profileRow.phone) },
              { label: "Emirates ID", value: formatStringValue(profileRow.emirates_id) },
              { label: "Паспорт", value: formatStringValue(profileRow.passport_number) },
              { label: "Гражданство", value: formatStringValue(profileRow.nationality) },
              { label: "Резиденство", value: formatStringValue(profileRow.residency_status) },
              { label: "Дата рождения", value: formatDateValue(profileRow.date_of_birth) },
              { label: "Город", value: formatStringValue(city) },
              { label: "Работодатель", value: formatStringValue(employer) },
              { label: "Должность", value: formatStringValue(position) },
              { label: "Тип занятости", value: formatStringValue(employmentType) },
              { label: "Месячный доход", value: monthlyIncome != null ? formatCurrencyValue(monthlyIncome) : "—" },
            ];

            const clientDocumentEntries = buildDocumentEntries(
              CLIENT_DOCUMENT_TYPES,
              normalizeClientDocumentType,
              getClientDocumentLabel,
              clientDocuments,
            );

            clientSnapshot = {
              title: "Покупатель",
              data: clientDataPoints,
              documents: clientDocumentEntries,
            };
          }
        }

        financeSnapshot = {
          deal: {
            title: "Сделка",
            data: dealDataPoints,
            documents: dealDocumentEntries,
            workflowDocuments,
            additionalDocuments,
          },
          vehicle: vehicleSnapshot,
          client: clientSnapshot,
        };
      }
    }
  }

  return (
    <TaskDetailView
      task={task}
      guardKey={guardKey}
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
      guardDocuments={guardDocuments}
      clientDocuments={[...clientDocuments, ...dealDocuments]}
      financeSnapshot={financeSnapshot}
      commercialOfferPriceVat={commercialOffer?.priceVat ?? null}
      completeAction={completeTaskFormAction}
      reopenAction={reopenTaskAction}
    />
  );
}
