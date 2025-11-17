import { z } from "zod";

import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";
import { formatFallbackDealNumber } from "@/lib/deals/deal-number";
import {
  DEFAULT_DEAL_COMPANY_CODE,
  getDealCompanyName,
  getDealCompanyPrefix,
  resolveDealCompanyCode,
  toDealCompanyCode,
  type DealCompanyCode,
} from "@/lib/data/deal-companies";
import { buildSlugWithId, extractIdFromSlug, slugify } from "@/lib/utils/slugs";
import {
  OPS_DEAL_STATUS_META,
  OPS_VEHICLE_STATUS_META,
  getClientDocumentLabel,
  getDealDocumentLabel,
  getVehicleDocumentLabel,
  normalizeClientDocumentType,
  normalizeDealDocumentType,
  normalizeVehicleDocumentType,
} from "@/lib/supabase/queries/operations";
import type {
  OpsClientRecord,
  OpsClientDeal,
  OpsClientDetail,
  OpsClientDocument,
  OpsClientNotification,
  OpsClientProfile,
  OpsClientReferralSummary,
  OpsClientSupportTicket,
  OpsDealClientProfile,
  OpsDealCompany,
  OpsDealDetailJsonBlock,
  OpsDealDetailsEntry,
  OpsDealDocument,
  OpsDealGuardStatus,
  OpsDealInvoice,
  OpsDealKeyInfoEntry,
  OpsDealRelatedSection,
  OpsDealSummary,
  OpsDealEditDefaults,
  OpsDealProfile,
  OpsDealTimelineEvent,
  OpsDealWorkflowTask,
  OpsInsuranceInfo,
  OpsInsuranceEditDefaults,
  OpsSellerDocument,
  CarDetailResult,
  OpsCarRecord,
  OpsTone,
  OpsVehicleData,
  OpsVehicleDocument,
  OpsVehicleDeal,
  OpsVehicleProfile,
  OpsVehicleServiceLogEntry,
} from "@/lib/supabase/queries/operations";
import { mapTaskRow, TASK_SELECT } from "@/lib/supabase/queries/tasks";
import type { WorkspaceTask } from "@/lib/supabase/queries/tasks";
import { resolveTaskGuardKey } from "@/lib/workflow/task-utils";

const humanizeKey = (key: string): string => {
  return key
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
};

// Optional flag to re-enable verbose deal-detail traces without spamming every local dev session.
const opsDealDetailDebugEnabled = process.env.NEXT_PUBLIC_DEBUG_OPS_DEAL_DETAIL === "true";

const logOpsDealDetailDebug = (...args: unknown[]): void => {
  if (!opsDealDetailDebugEnabled) {
    return;
  }
  console.log(...args);
};

// Константы workflow ролей и статусов
export const WORKFLOW_ROLES = [
  { code: "OP_MANAGER", name: "Операционный менеджер" },
  { code: "SUPPORT", name: "Поддержка операций" },
  { code: "TECH_SPECIALIST", name: "Технический специалист" },
  { code: "RISK_MANAGER", name: "Менеджер по управлению рисками" },
  { code: "FINANCE", name: "Финансовый отдел" },
  { code: "INVESTOR", name: "Инвестор / ЛПР" },
  { code: "LEGAL", name: "Юридический отдел" },
  { code: "ACCOUNTING", name: "Бухгалтерия" },
  { code: "ADMIN", name: "Администратор процесса" },
  { code: "CLIENT", name: "Клиент" },
] as const;

export const WORKFLOW_ROLE_LABELS = WORKFLOW_ROLES.reduce(
  (acc, role) => {
    acc[role.code] = role.name;
    return acc;
  },
  {} as Record<string, string>,
);

export type WorkflowRole = typeof WORKFLOW_ROLES[number]["code"];

export type OpsDealStatusKey =
  | "NEW"
  | "OFFER_PREP"
  | "VEHICLE_CHECK"
  | "DOCS_COLLECT"
  | "RISK_REVIEW"
  | "FINANCE_REVIEW"
  | "INVESTOR_PENDING"
  | "CONTRACT_PREP"
  | "SIGNING_FUNDING"
  | "VEHICLE_DELIVERY"
  | "ACTIVE"
  | "CANCELLED";

export const OPS_WORKFLOW_STATUSES = [
  {
    key: "NEW",
    title: "Новая заявка",
    description: "Лид создан (сайт/брокер).",
    ownerRole: "OP_MANAGER",
    slaLabel: "SLA 8h",
    entryActions: ["Подтвердить авто у дилера/брокера"],
    exitGuards: [
      {
        key: "tasks.confirmCar.completed",
        label: "Авто подтверждено у дилера/брокера",
      },
    ],
  },
  {
    key: "OFFER_PREP",
    title: "Подготовка предложения",
    description: "Формирование коммерческого предложения и расчётов.",
    ownerRole: "OP_MANAGER",
    slaLabel: "SLA 8h",
    entryActions: ["Подготовить коммерческое предложение"],
    exitGuards: [
      {
        key: "quotationPrepared",
        label: "Коммерческое предложение сформировано",
        requiresDocument: true,
      },
    ],
  },
  {
    key: "VEHICLE_CHECK",
    title: "Проверка авто",
    description: "Проверка VIN, комплектации и цены поставщика.",
    ownerRole: "TECH_SPECIALIST",
    slaLabel: "SLA 8h",
    entryActions: ["Проверить VIN/комплектацию/цену"],
    exitGuards: [
      {
        key: "vehicle.verified",
        label: "Данные по авто подтверждены",
      },
    ],
  },
  {
    key: "DOCS_COLLECT",
    title: "Сбор документов",
    description: "Комплектование KYC/финансовых документов клиента.",
    ownerRole: "OP_MANAGER",
    slaLabel: "SLA 48h",
    entryActions: ["Собрать пакет документов от клиента"],
    exitGuards: [
      {
        key: "docs.required.allUploaded",
        label: "Все обязательные документы загружены",
        requiresDocument: true,
      },
    ],
  },
  {
    key: "RISK_REVIEW",
    title: "Проверка риска",
    description: "AECB скоринг и внутреннее одобрение риска.",
    ownerRole: "RISK_MANAGER",
    slaLabel: "SLA 24h",
    entryActions: ["AECB и скоринг", "Отправить запрос AECB"],
    exitGuards: [
      {
        key: "risk.approved",
        label: "Одобрение отдела рисков",
      },
    ],
  },
  {
    key: "FINANCE_REVIEW",
    title: "Финансовое утверждение",
    description: "Проверка финансирования и условий сделки.",
    ownerRole: "FINANCE",
    entryActions: ["Финансовый анализ и подтверждение бюджета"],
    exitGuards: [
      {
        key: "finance.approved",
        label: "Финансовое одобрение получено",
      },
    ],
  },
  {
    key: "INVESTOR_PENDING",
    title: "Одобрение инвестора",
    description: "Передача сделки инвестору/ЛПР на подтверждение.",
    ownerRole: "INVESTOR",
    entryActions: ["Отправить пакет инвестору"],
    exitGuards: [
      {
        key: "investor.approved",
        label: "Одобрение инвестора получено",
      },
    ],
  },
  {
    key: "CONTRACT_PREP",
    title: "Подготовка договора",
    description: "Юридическая проверка и подготовка договора.",
    ownerRole: "LEGAL",
    entryActions: ["Сформировать договор и пакеты документов"],
    exitGuards: [
      {
        key: "legal.contractReady",
        label: "Договор готов к подписанию",
        requiresDocument: true,
      },
    ],
  },
  {
    key: "SIGNING_FUNDING",
    title: "Подписание и финансирование",
    description: "Организация подписания и платежей поставщику.",
    ownerRole: "FINANCE",
    entryActions: ["Создать конверт для e-sign", "Контроль оплаты аванса"],
    exitGuards: [
      {
        key: "esign.allSigned",
        label: "Все подписи собраны",
      },
      {
        key: "payments.advanceReceived",
        label: "Аванс получен",
        requiresDocument: true,
      },
      {
        key: "payments.supplierPaid",
        label: "Поставщику оплачено",
        requiresDocument: true,
      },
    ],
  },
  {
    key: "VEHICLE_DELIVERY",
    title: "Выдача автомобиля",
    description: "Подготовка и фактическая выдача авто клиенту.",
    ownerRole: "TECH_SPECIALIST",
    entryActions: ["Подготовить акт выдачи и слот доставки"],
    exitGuards: [
      {
        key: "delivery.confirmed",
        label: "Акт выдачи подтверждён",
        requiresDocument: true,
      },
    ],
  },
  {
    key: "ACTIVE",
    title: "Активный лизинг",
    description: "Договор активирован, обслуживание клиента.",
    ownerRole: "ACCOUNTING",
    entryActions: ["Передать в пост-учёт и биллинг"],
    exitGuards: [],
  },
  {
    key: "CANCELLED",
    title: "Отменена",
    description: "Заявка закрыта до активации — клиент или менеджер отменили процесс.",
    ownerRole: "OP_MANAGER",
    entryActions: ["Зафиксировать причину отмены", "Уведомить команду"],
    exitGuards: [],
  },
] as const;

export type WorkflowStatusItem = {
  readonly key: OpsDealStatusKey;
  readonly title: string;
  readonly description: string;
  readonly ownerRole: WorkflowRole;
  readonly slaLabel?: string;
  readonly entryActions: readonly string[];
  readonly exitGuards: readonly {
    readonly key: string;
    readonly label: string;
    readonly hint?: string;
    readonly requiresDocument?: boolean;
  }[];
};

export const OPS_WORKFLOW_STATUS_MAP: Record<string, WorkflowStatusItem> = OPS_WORKFLOW_STATUSES.reduce(
  (acc, status) => {
    acc[status.key] = status as WorkflowStatusItem;
    return acc;
  },
  {} as Record<string, WorkflowStatusItem>,
);

export const OPS_DEAL_PIPELINE_GROUPS = [
  { label: "New Leads", statuses: ["NEW" as OpsDealStatusKey] },
  { label: "Offer Prep", statuses: ["OFFER_PREP" as OpsDealStatusKey] },
  { label: "Vehicle Check", statuses: ["VEHICLE_CHECK" as OpsDealStatusKey] },
  { label: "Docs Collection", statuses: ["DOCS_COLLECT" as OpsDealStatusKey] },
  { label: "Risk Review", statuses: ["RISK_REVIEW" as OpsDealStatusKey] },
  { label: "Finance", statuses: ["FINANCE_REVIEW" as OpsDealStatusKey] },
  { label: "Investor", statuses: ["INVESTOR_PENDING" as OpsDealStatusKey] },
  { label: "Contract", statuses: ["CONTRACT_PREP" as OpsDealStatusKey] },
  { label: "Signing & Funding", statuses: ["SIGNING_FUNDING" as OpsDealStatusKey] },
  { label: "Delivery", statuses: ["VEHICLE_DELIVERY" as OpsDealStatusKey] },
  { label: "Active", statuses: ["ACTIVE" as OpsDealStatusKey] },
  { label: "Cancelled", statuses: ["CANCELLED" as OpsDealStatusKey] },
] as const;

export const OPS_DEAL_STATUS_ORDER: OpsDealStatusKey[] = OPS_WORKFLOW_STATUSES.map(
  (status) => status.key,
);

export const OPS_DEAL_STATUS_LABELS = OPS_WORKFLOW_STATUSES.reduce(
  (acc, status) => {
    acc[status.key] = status.title;
    return acc;
  },
  {} as Record<OpsDealStatusKey, string>,
);

export const OPS_WORKFLOW_STATUS_EXIT_ROLE: Record<OpsDealStatusKey, WorkflowRole | null> = {
  NEW: "OP_MANAGER",
  OFFER_PREP: "OP_MANAGER",
  VEHICLE_CHECK: "OP_MANAGER",
  DOCS_COLLECT: "OP_MANAGER",
  RISK_REVIEW: "RISK_MANAGER",
  FINANCE_REVIEW: "FINANCE",
  INVESTOR_PENDING: "INVESTOR",
  CONTRACT_PREP: "LEGAL",
  SIGNING_FUNDING: "FINANCE",
  VEHICLE_DELIVERY: "OP_MANAGER",
  ACTIVE: null,
  CANCELLED: null,
};

// Типы для данных из Supabase
export type SupabaseClientData = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  nationality: string | null;
  metadata: Record<string, unknown> | null;
};

export type SupabaseVehicleData = {
  id: string;
  vin: string | null;
  license_plate?: string | null;
  make: string | null;
  model: string | null;
  variant?: string | null;
  year: number | null;
  body_type: string | null;
  mileage: number | null;
  status: string | null;
  fuel_type?: string | null;
  transmission?: string | null;
  color_exterior?: string | null;
  color_interior?: string | null;
  image?: string | null;
  vehicle_images?: Array<{
    id: string;
    storage_path: string | null;
    label: string | null;
    is_primary: boolean | null;
    sort_order: number | null;
  }>;
};

export type SupabaseDealDocument = {
  id: string;
  document_type: string | null;
  title: string | null;
  storage_path: string | null;
  status?: string | null;
  signed_at?: string | null;
  created_at: string | null;
  document_category?: string | null;
  metadata?: unknown;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
};

export type SupabaseClientDocumentRow = {
  id: string;
  document_type: string | null;
  document_category: string | null;
  title: string | null;
  storage_path: string | null;
  status: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SupabaseInvoice = {
  id: string;
  invoice_number: string | null;
  type: string | null;
  amount: number | null;
  due_date: string | null;
  status: string | null;
  created_at: string | null;
};

export type SupabaseDealRow = {
  id: string;
  deal_number: string | null;
  status: string;
  updated_at: string | null;
  created_at: string | null;
  client_id: string;
  application_id: string;
  vehicle_id: string;
  contract_start_date?: string | null;
  assigned_account_manager?: string | null;
  principal_amount?: number | null;
  total_amount?: number | null;
  monthly_payment?: number | null;
  source?: string | null;
  payload: Record<string, unknown> | null;
};

// Вспомогательные функции
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code && String(code) === "42703") {
    return true;
  }
  const message = String((error as { message?: string }).message ?? "");
  const details = String((error as { details?: string }).details ?? "");
  const needle = `column ${column}`;
  return message.toLowerCase().includes(needle) || details.toLowerCase().includes(needle);
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric",
  },
): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("ru-RU", options).format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${datePart} ${timePart}`;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }
  return `AED ${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatRate(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }

  const isFractional = Math.abs(numeric) <= 1;
  const percentValue = isFractional ? numeric * 100 : numeric;
  const percentText = `${percentValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;

  if (isFractional) {
    const rawText = numeric.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
    return `${percentText} (raw ${rawText})`;
  }

  return percentText;
}

function formatJsonObject(value: Record<string, unknown> | null | undefined): {
  formatted: string;
  isEmpty: boolean;
} {
  if (!value || Object.keys(value).length === 0) {
    return { formatted: "{}", isEmpty: true };
  }

  try {
    return {
      formatted: JSON.stringify(value, null, 2),
      isEmpty: false,
    };
  } catch (error) {
    console.warn("[SERVER-OPS] failed to stringify json object", { value, error });
    return {
      formatted: JSON.stringify({ error: "Failed to render JSON" }),
      isEmpty: false,
    };
  }
}

function normalizeClientStatus(raw: unknown): { display: string; filter: "Active" | "Blocked" } {
  const status = typeof raw === "string" ? raw : "";
  const normalized = status.toLowerCase();
  if (normalized === "suspended" || normalized === "blocked") {
    return { display: "Blocked", filter: "Blocked" };
  }
  if (normalized === "active") {
    return { display: "Active", filter: "Active" };
  }
  if (status.length) {
    const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
    return { display: capitalized, filter: "Active" };
  }
  return { display: "Pending", filter: "Active" };
}

function formatShortDate(value: string | null | undefined): string {
  return formatDate(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Ежемесячно",
  quarterly: "Ежеквартально",
  yearly: "Ежегодно",
  annual: "Ежегодно",
  semiannual: "Раз в полгода",
  weekly: "Еженедельно",
};

function formatInsuranceFrequency(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return PAYMENT_FREQUENCY_LABELS[normalized] ?? humanizeKey(value);
}

function resolveInsuranceDetails(
  raw: unknown,
): { info: OpsInsuranceInfo | null; editDefaults: OpsInsuranceEditDefaults | null } {
  if (!isRecord(raw) || Object.keys(raw).length === 0) {
    return { info: null, editDefaults: null };
  }

  const pickString = (...keys: string[]): string | null => {
    for (const key of keys) {
      if (key in raw) {
        const value = getString(raw[key]);
        if (value) {
          return value;
        }
      }
    }
    return null;
  };

  const pickNumber = (...keys: string[]): number | null => {
    for (const key of keys) {
      if (key in raw) {
        const value = getNumber(raw[key]);
        if (value != null) {
          return value;
        }
      }
    }
    return null;
  };

  const provider = pickString("provider", "provider_name", "company");
  const policyNumber = pickString("policy_number", "policyNumber", "number");
  const policyType = pickString("policy_type", "policyType", "coverage_type", "coverageType");
  const premiumValue = pickNumber("premium_amount", "premiumAmount");
  const premiumAmount = premiumValue != null
    ? formatCurrency(premiumValue)
    : pickString("premium_amount_label", "premiumLabel", "premium_amount_display");
  const paymentFrequencyRaw = pickString("payment_frequency", "paymentFrequency");
  const paymentFrequencyLabel = formatInsuranceFrequency(paymentFrequencyRaw);
  const nextPaymentDue = pickString("next_payment_due", "nextPaymentDue");
  const nextPaymentDueLabel = nextPaymentDue ? formatShortDate(nextPaymentDue) : null;
  const coverageStart = pickString("coverage_start", "coverageStart", "effective_date");
  const coverageEnd = pickString("coverage_end", "coverageEnd", "expiry_date", "expiration_date");
  const coveragePeriodLabel = coverageStart || coverageEnd
    ? [coverageStart ? formatShortDate(coverageStart) : null, coverageEnd ? formatShortDate(coverageEnd) : null]
        .filter((value): value is string => Boolean(value))
        .join(" → ") || null
    : null;
  const deductibleValue = pickNumber("deductible", "deductible_amount", "deductibleAmount");
  const deductible = deductibleValue != null
    ? formatCurrency(deductibleValue)
    : pickString("deductible_label", "deductible_display");
  const lastPaymentStatus = pickString("last_payment_status", "lastPaymentStatus");
  const lastPaymentStatusLabel = lastPaymentStatus ? humanizeKey(lastPaymentStatus) : null;
  const lastPaymentDate = pickString("last_payment_date", "lastPaymentDate");
  const lastPaymentDateLabel = lastPaymentDate ? formatShortDate(lastPaymentDate) : null;
  const notes = pickString("notes", "comments");
  const contact = pickString("contact", "contact_name", "broker_contact");

  const info: OpsInsuranceInfo = {
    provider: provider ?? null,
    policyNumber: policyNumber ?? null,
    policyType: policyType ?? null,
    premiumAmount: premiumAmount ?? null,
    premiumValue,
    paymentFrequency: paymentFrequencyRaw ?? null,
    paymentFrequencyLabel,
    nextPaymentDue: nextPaymentDue ?? null,
    nextPaymentDueLabel,
    coverageStart: coverageStart ?? null,
    coverageEnd: coverageEnd ?? null,
    coveragePeriodLabel,
    deductible: deductible ?? null,
    deductibleValue,
    lastPaymentStatus: lastPaymentStatus ?? null,
    lastPaymentStatusLabel,
    lastPaymentDate: lastPaymentDate ?? null,
    lastPaymentDateLabel,
    contact: contact ?? null,
    notes: notes ?? null,
  };

  const editDefaults: OpsInsuranceEditDefaults = {
    provider: provider ?? null,
    policyNumber: policyNumber ?? null,
    policyType: policyType ?? null,
    premiumAmount: premiumValue,
    paymentFrequency: paymentFrequencyRaw ?? null,
    nextPaymentDue: nextPaymentDue ?? null,
    coverageStart: coverageStart ?? null,
    coverageEnd: coverageEnd ?? null,
    deductible: deductibleValue,
    lastPaymentStatus: lastPaymentStatus ?? null,
    lastPaymentDate: lastPaymentDate ?? null,
    notes: notes ?? null,
  };

  const hasDisplayValue = Object.values(info).some((value) => {
    if (value == null) {
      return false;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return true;
  });

  return {
    info: hasDisplayValue ? info : null,
    editDefaults,
  };
}

type VehicleDocumentRow = {
  id?: string;
  document_type?: string | null;
  title?: string | null;
  status?: string | null;
  storage_path?: string | null;
  uploaded_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

function resolveVehicleDocumentTone(statusRaw: string): OpsTone {
  switch (statusRaw) {
    case "uploaded":
      return "info";
    case "verified":
      return "success";
    case "expired":
      return "warning";
    case "archived":
      return "muted";
    default:
      return "muted";
  }
}

function resolveVehicleDocumentStatus(statusRaw: string): string {
  switch (statusRaw) {
    case "uploaded":
      return "Загружен";
    case "verified":
      return "Проверен";
    case "expired":
      return "Просрочен";
    case "archived":
      return "Архив";
    default:
      if (!statusRaw) {
        return "Не указан";
      }
      return humanizeKey(statusRaw.replace(/[_\.]+/g, " "));
  }
}

async function buildVehicleDocumentList(
  rows: VehicleDocumentRow[] | null | undefined,
): Promise<OpsVehicleDocument[]> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const documents = await Promise.all(
    rows.map(async (doc, index) => {
      const url =
        doc?.storage_path && typeof doc.storage_path === "string" && doc.storage_path.length > 0
          ? await createSignedStorageUrl({ bucket: "vehicle-documents", path: doc.storage_path })
          : null;
      const statusRaw = typeof doc?.status === "string" ? doc.status : "uploaded";
      const rawTypeCode = typeof doc?.document_type === "string" ? doc.document_type : undefined;
      const normalizedTypeCode = normalizeVehicleDocumentType(rawTypeCode);
      const resolvedTypeCode = normalizedTypeCode ?? (rawTypeCode ? rawTypeCode.trim() : undefined);
      const typeLabel =
        getVehicleDocumentLabel(rawTypeCode) ??
        (resolvedTypeCode ? humanizeKey(resolvedTypeCode.replace(/\./g, " ")) : undefined);
      const title = (() => {
        const explicit = typeof doc?.title === "string" ? doc.title.trim() : "";
        if (explicit.length > 0) {
          return doc?.title as string;
        }
        if (typeLabel) {
          return typeLabel;
        }
        if (resolvedTypeCode) {
          return resolvedTypeCode
            .replace(/[_\.]+/g, " ")
            .split(" ")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
        }
        return "Документ";
      })();
      const uploadedAtIso = typeof doc?.uploaded_at === "string" ? doc.uploaded_at : null;
      const dateLabel = formatShortDate(uploadedAtIso);
      const identifier = typeof doc?.id === "string" && doc.id.length > 0 ? doc.id : `vehicle-doc-${index}`;

      return {
        id: identifier,
        title,
        status: resolveVehicleDocumentStatus(statusRaw),
        statusTone: resolveVehicleDocumentTone(statusRaw),
        typeCode: resolvedTypeCode,
        type: typeLabel,
        date: dateLabel !== "—" ? dateLabel : undefined,
        uploadedAt: uploadedAtIso,
        dealNumber: null,
        url,
        source: "vehicle",
      } satisfies OpsVehicleDocument;
    }),
  );

  return documents.sort((a, b) => {
    const left = a.uploadedAt ?? a.date ?? "";
    const right = b.uploadedAt ?? b.date ?? "";
    return (right || "").localeCompare(left || "");
  });
}

type SellerDocumentCandidate = Record<string, unknown>;

function collectSellerDocumentCandidates(...sources: unknown[]): SellerDocumentCandidate[] {
  const normalize = (value: unknown): SellerDocumentCandidate[] => {
    if (Array.isArray(value)) {
      return value.filter((entry): entry is SellerDocumentCandidate => isRecord(entry));
    }
    if (isRecord(value)) {
      return [value];
    }
    return [];
  };

  return sources.flatMap((source) => normalize(source));
}

async function buildSellerDocumentList(
  candidates: SellerDocumentCandidate[],
): Promise<OpsSellerDocument[]> {
  const documents = await Promise.all(
    candidates.map(async (candidate, index) => {
      const metadata = isRecord(candidate.metadata) ? (candidate.metadata as Record<string, unknown>) : null;
      const idCandidate =
        getString(candidate["id"]) ??
        getString(candidate["document_id"]) ??
        getString(candidate["uuid"]) ??
        getString(metadata?.document_id);
      const title =
        getString(candidate["title"]) ??
        getString(candidate["name"]) ??
        getString(candidate["document_name"]) ??
        getString(candidate["display_name"]) ??
        getString(candidate["document_type"]) ??
        getString(candidate["documentType"]) ??
        "Документ продавца";
      const status =
        getString(candidate["status"]) ??
        getString(candidate["state"]) ??
        getString(candidate["stage"]) ??
        getString(metadata?.status);
      const documentType =
        getString(candidate["document_type"]) ??
        getString(candidate["documentType"]) ??
        getString(metadata?.document_type);
      const uploadedAt =
        getString(candidate["uploaded_at"]) ??
        getString(candidate["uploadedAt"]) ??
        getString(candidate["created_at"]) ??
        getString(candidate["createdAt"]) ??
        getString(metadata?.uploaded_at);
      let url =
        getString(candidate["url"]) ??
        getString(candidate["signed_url"]) ??
        getString(candidate["download_url"]) ??
        getString(metadata?.url) ??
        null;
      const storagePath =
        getString(candidate["storage_path"]) ??
        getString(candidate["storagePath"]) ??
        getString(candidate["path"]) ??
        getString(candidate["file_path"]) ??
        getString(metadata?.storage_path) ??
        getString(metadata?.path) ??
        null;
      const bucketCandidate =
        getString(candidate["bucket"]) ??
        getString(metadata?.bucket) ??
        getString(metadata?.storage_bucket) ??
        getString(metadata?.bucket_id) ??
        (storagePath ? "seller-documents" : null);
      if (!url && storagePath && bucketCandidate) {
        try {
          url = await createSignedStorageUrl({ bucket: bucketCandidate, path: storagePath });
        } catch (error) {
          console.error("[SERVER-OPS] failed to sign seller document", {
            bucket: bucketCandidate,
            storagePath,
            error,
          });
        }
      }

      return {
        id: idCandidate ?? `seller-doc-${index}`,
        title,
        status,
        documentType,
        uploadedAt,
        url,
        bucket: bucketCandidate ?? null,
        storagePath,
      } satisfies OpsSellerDocument;
    }),
  );

  return documents
    .filter((doc) => doc != null)
    .sort((a, b) => {
      const left = a.uploadedAt ?? "";
      const right = b.uploadedAt ?? "";
      return (right || "").localeCompare(left || "");
    });
}

function resolveScore(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const searchKeys = ["score", "overall_score", "total", "value"];
  for (const key of searchKeys) {
    const raw = (payload as Record<string, unknown>)[key];
    if (typeof raw === "number") {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  if ("summary" in payload && payload.summary && typeof payload.summary === "object") {
    const summaryScore = resolveScore(payload.summary);
    if (summaryScore != null) {
      return summaryScore;
    }
  }
  if ("scorecard" in payload && payload.scorecard && typeof payload.scorecard === "object") {
    const scorecardScore = resolveScore(payload.scorecard);
    if (scorecardScore != null) {
      return scorecardScore;
    }
  }
  return null;
}


function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatTimelineTimestamp(date: Date): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

type TimelineDraft = {
  id: string;
  date: Date;
  text: string;
  icon: string;
};

type TimelineEvent = {
  id: string;
  text: string;
  timestamp: string;
  icon: string;
};


type RawTransition = {
  from?: string | null;
  to?: string | null;
  performedAt?: string | null;
};

function extractWorkflowTransitions(payload: Record<string, unknown> | null | undefined): RawTransition[] {
  if (!payload) return [];

  const candidates = [
    payload.workflow_history,
    payload.workflowHistory,
    payload.workflow_transitions,
    payload.workflowTransitions,
    payload.status_history,
  ];

  const transitions: RawTransition[] = [];

  candidates.forEach((candidate) => {
    if (!Array.isArray(candidate)) {
      return;
    }

    candidate.forEach((entry) => {
      if (!isRecord(entry)) return;

      const from =
        getString(entry.from) ??
        getString(entry.from_status) ??
        getString(entry.fromState);
      const to =
        getString(entry.to) ??
        getString(entry.to_status) ??
        getString(entry.toState);
      const performedAt =
        getString(entry.performed_at) ??
        getString(entry.timestamp) ??
        getString(entry.at) ??
        getString(entry.updated_at) ??
        getString(entry.created_at);

      transitions.push({
        from,
        to,
        performedAt,
      });
    });
  });

  return transitions;
}

function buildTimelineEvents(params: {
  createdAt: string | null;
  updatedAt: string | null;
  payload: Record<string, unknown> | null | undefined;
  guardStatuses: OpsDealGuardStatus[];
  statusKey: OpsDealStatusKey;
}): TimelineEvent[] {
  const drafts: TimelineDraft[] = [];
  const pushDraft = (id: string, timestamp: string | null | undefined, text: string, icon: string) => {
    const date = parseDate(timestamp ?? null);
    if (!date) return;
    drafts.push({ id, date, text, icon });
  };

  pushDraft("deal-created", params.createdAt, "Заявка создана", "circle-dot");

  const transitions = extractWorkflowTransitions(params.payload);
  transitions.forEach((transition, index) => {
    const fromKey =
      transition.from && transition.from.toUpperCase() in OPS_WORKFLOW_STATUS_MAP
        ? (transition.from.toUpperCase() as OpsDealStatusKey)
        : null;
    const toKey =
      transition.to && transition.to.toUpperCase() in OPS_WORKFLOW_STATUS_MAP
        ? (transition.to.toUpperCase() as OpsDealStatusKey)
        : null;
    const fromLabel = fromKey ? OPS_WORKFLOW_STATUS_MAP[fromKey].title : transition.from ?? null;
    const toLabel = toKey ? OPS_WORKFLOW_STATUS_MAP[toKey].title : transition.to ?? null;

    const textParts: string[] = [];
    if (fromLabel) {
      textParts.push(`с «${fromLabel}»`);
    }
    if (toLabel) {
      textParts.push(`на «${toLabel}»`);
    }

    const text =
      textParts.length > 0 ? `Статус изменён ${textParts.join(" ")}` : "Изменение статуса";

    pushDraft(`transition-${index}`, transition.performedAt ?? null, text, "shuffle");
  });

  params.guardStatuses
    .filter((guard: OpsDealGuardStatus) => Boolean(guard.completedAt))
    .forEach((guard: OpsDealGuardStatus) => {
      pushDraft(
        `guard-${guard.key}`,
        guard.completedAt ?? null,
        `Выполнена задача: ${guard.label}`,
        "check-circle-2",
      );
    });

  pushDraft(
    "status-current",
    params.updatedAt,
    `Текущий статус: ${OPS_WORKFLOW_STATUS_MAP[params.statusKey].title}`,
    "bookmark",
  );

  if (drafts.length === 0) {
    return [];
  }

  drafts.sort((a, b) => b.date.getTime() - a.date.getTime());

  return drafts.map((draft, index) => ({
    id: `${draft.id}-${index}`,
    text: draft.text,
    timestamp: formatTimelineTimestamp(draft.date),
    icon: draft.icon,
  }));
}

function toSlug(value: string | null | undefined): string {
  return slugify(value);
}

function mapStatusToWorkflow(status: string | null | undefined): OpsDealStatusKey {
  const normalized = (status ?? "").toUpperCase();
  if (normalized in OPS_WORKFLOW_STATUS_MAP) {
    return normalized as OpsDealStatusKey;
  }
  return "NEW";
}

function normalizeWorkflowRole(role: string | null | undefined): WorkflowRole | null {
  if (!role || typeof role !== "string") {
    return null;
  }
  const normalized = role.toUpperCase();
  if (normalized in WORKFLOW_ROLE_LABELS) {
    return normalized as WorkflowRole;
  }
  return null;
}

type GuardTaskState = {
  fulfilled?: boolean;
  note?: string | null;
  attachment_path?: string | null;
  completed_at?: string | null;
};

function resolveGuardStatuses(
  statusKey: OpsDealStatusKey,
  payload: Record<string, unknown> | null | undefined,
): OpsDealGuardStatus[] {
  const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];
  const tasks = (payload?.guard_tasks as Record<string, GuardTaskState> | undefined) ?? {};

  return statusMeta.exitGuards.map((guard: { key: string; label: string; hint?: string; requiresDocument?: boolean }) => {
    const taskState = tasks[guard.key] ?? {};

    return {
      key: guard.key,
      label: guard.label,
      hint: guard.hint ?? null,
      requiresDocument: guard.requiresDocument ?? false,
      fulfilled: Boolean(taskState.fulfilled),
      note: taskState.note ?? null,
      attachmentPath: taskState.attachment_path ?? null,
      attachmentUrl: null,
      completedAt: taskState.completed_at ?? null,
    };
  });
}

async function buildDetailGuardStatuses(
  statusKey: OpsDealStatusKey,
  payload: Record<string, unknown> | null,
  documents: SupabaseDealDocument[],
): Promise<OpsDealGuardStatus[]> {
  const baseStatuses = resolveGuardStatuses(statusKey, payload);

  return Promise.all(
    baseStatuses.map(async (status) => {
      let attachmentPath = status.attachmentPath;

      if (!attachmentPath) {
        const doc = documents.find((document) => document.document_type === status.key && document.storage_path);
        attachmentPath = doc?.storage_path ?? null;
      }

      const attachmentUrl = attachmentPath
        ? await createSignedStorageUrl({ bucket: "deal-documents", path: attachmentPath })
        : null;

      return {
        ...status,
        attachmentPath,
        attachmentUrl,
      };
    }),
  );
}

function buildDealWorkflowTasks(options: {
  statusKey: OpsDealStatusKey;
  tasks: WorkspaceTask[];
  guardStatuses: OpsDealGuardStatus[];
}): OpsDealWorkflowTask[] {
  const { statusKey, tasks, guardStatuses } = options;
  const guardMap = guardStatuses.reduce<Record<string, OpsDealGuardStatus>>((acc, guard) => {
    acc[guard.key] = guard;
    return acc;
  }, {});
  const guardMetaMap = OPS_WORKFLOW_STATUS_MAP[statusKey].exitGuards.reduce<
    Record<string, { label: string; requiresDocument?: boolean }>
  >((acc, guard) => {
    acc[guard.key] = { label: guard.label, requiresDocument: guard.requiresDocument };
    return acc;
  }, {});

  return tasks.map<OpsDealWorkflowTask>((task) => {
    const guardKey = resolveTaskGuardKey(task);
    const guardState = guardKey ? guardMap[guardKey] : null;
    const guardMeta = guardKey ? guardMetaMap[guardKey] : null;

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      guardKey: guardKey ?? null,
      guardLabel: guardMeta?.label ?? null,
      requiresDocument: Boolean(guardMeta?.requiresDocument),
      fulfilled: guardState ? guardState.fulfilled : task.status === "DONE",
      slaDueAt: task.slaDueAt,
      completedAt: task.completedAt,
      assigneeRole: task.assigneeRole,
      assigneeUserId: task.assigneeUserId,
      note: guardState?.note ?? null,
      attachmentPath: guardState?.attachmentPath ?? null,
      attachmentUrl: guardState?.attachmentUrl ?? null,
    };
  });
}

type DealRow = {
  id: string;
  deal_number: string | null;
  created_at?: string | null;
  company_code?: string | null;
};

function matchesDealSlug(row: DealRow, slug: string) {
  const normalizedSlug = slug.toLowerCase();
  const byNumber = row.deal_number ? toSlug(row.deal_number).toLowerCase() : "";
  const byId = toSlug(row.id).toLowerCase();
  const normalizedCompanyCode = toDealCompanyCode(row.company_code ?? null);
  const fallback = toSlug(
    formatFallbackDealNumber({
      id: row.id,
      createdAt: row.created_at ?? null,
      prefix: getDealCompanyPrefix(normalizedCompanyCode ?? null),
    }),
  ).toLowerCase();

  return normalizedSlug === byNumber || normalizedSlug === byId || normalizedSlug === fallback;
}

// Серверные функции для операций
export async function getOperationsDeals(): Promise<OpsDealSummary[]> {
  console.log("[SERVER-OPS] getOperationsDeals called");

  const supabase = await createSupabaseServerClient();
  const supabaseService = await createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("deals")
    .select(`
      id,
      deal_number,
      company_code,
      op_manager_id,
      status,
      created_at,
      updated_at,
      client_id,
      vehicle_id,
      contract_start_date,
      total_amount,
      payload,
      vehicles!vehicle_id(id, vin, license_plate, make, model, year, body_type, mileage, status)
    `)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[SERVER-OPS] failed to load deals:", error);
    return [];
  }

  console.log(`[SERVER-OPS] loaded ${data?.length || 0} deals`);

  // Диагностика: проверяем структуру данных из Supabase
  if (data?.length > 0) {
    const firstDeal = data[0];
    console.log("[DEBUG] First deal structure:", {
      id: firstDeal.id,
      client_id: firstDeal.client_id,
      vehicle_id: firstDeal.vehicle_id,
      vehicles_type: typeof firstDeal.vehicles,
      vehicles_array: Array.isArray(firstDeal.vehicles) ? firstDeal.vehicles.length : 'not array',
      vehicles_content: firstDeal.vehicles
    });
  }

  if (!data?.length) {
    return [];
  }

  // Загружаем уникальные client_id для запроса данных клиентов
  const uniqueClientIds = [...new Set(data.map(deal => deal.client_id).filter(Boolean))];

  // Загружаем данные клиентов отдельным запросом
  console.log(`[DEBUG] Loading clients for IDs:`, uniqueClientIds.slice(0, 5), `... (total: ${uniqueClientIds.length})`);
  const { data: clientsData, error: clientsError } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone, status, nationality, metadata")
    .in("user_id", uniqueClientIds);

  console.log(`[DEBUG] Clients query result:`, {
    data_length: clientsData?.length || 0,
    error: clientsError,
    first_client: clientsData?.[0]
  });

  // Создаем карту клиентов для быстрого поиска
  type ClientData = {
    user_id: string;
    full_name: string | null;
    phone: string | null;
    status: string | null;
    nationality: string | null;
    metadata: Record<string, unknown> | null;
  };

  const clientsMap = new Map<string, ClientData>();
  (clientsData || []).forEach(client => {
    clientsMap.set(client.user_id, client);
  });

  console.log(`[DEBUG] Clients loaded: ${clientsData?.length || 0}`);
  console.log(`[DEBUG] Unique client IDs from deals: ${uniqueClientIds.length}`);
  console.log(`[DEBUG] Sample client data:`, clientsData?.slice(0, 3));

  const dealIds = data.map((deal) => deal.id as string).filter(Boolean);
  const fallbackOwnerIds = new Set<string>();
  data.forEach((row) => {
    const managerId = typeof row.op_manager_id === "string" ? row.op_manager_id : null;
    if (managerId) {
      fallbackOwnerIds.add(managerId);
    }
  });

  type TaskAssignmentRow = {
    deal_id: string | null;
    status: string | null;
    assignee_role: string | null;
    assignee_user_id: string | null;
    updated_at: string | null;
  };

  type AssignmentEntry = {
    assigneeUserId: string | null;
    assigneeRole: string | null;
  };

  const activeStatuses = new Set(["OPEN", "IN_PROGRESS"]);
  const primaryAssignments = new Map<string, AssignmentEntry>();
  const fallbackAssignments = new Map<string, AssignmentEntry>();
  const assigneeUserIds = new Set<string>();

  if (dealIds.length > 0) {
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("deal_id, status, assignee_role, assignee_user_id, updated_at")
      .in("deal_id", dealIds)
      .order("updated_at", { ascending: false });

    if (tasksError) {
      if ((tasksError as { code?: string }).code === "PGRST205") {
        console.info("[SERVER-OPS] tasks table not available; falling back to op_manager assignments only");
      } else {
        console.error("[SERVER-OPS] failed to load task assignments:", tasksError);
      }
    } else {
      (tasksData as TaskAssignmentRow[] | null | undefined)?.forEach((task) => {
        const dealId = task.deal_id ?? undefined;
        if (!dealId) {
          return;
        }

        const status = typeof task.status === "string" ? task.status.toUpperCase() : "";
        const assigneeUserId =
          typeof task.assignee_user_id === "string" && task.assignee_user_id.length > 0
            ? task.assignee_user_id
            : null;
        const assigneeRole =
          typeof task.assignee_role === "string" && task.assignee_role.length > 0
            ? task.assignee_role.toUpperCase()
            : null;

        if (!assigneeUserId) {
          return;
        }

        if (activeStatuses.has(status)) {
          if (!primaryAssignments.has(dealId)) {
            primaryAssignments.set(dealId, { assigneeUserId, assigneeRole });
            assigneeUserIds.add(assigneeUserId);
          }
          return;
        }

        if (!fallbackAssignments.has(dealId)) {
          fallbackAssignments.set(dealId, { assigneeUserId, assigneeRole });
          assigneeUserIds.add(assigneeUserId);
        }
      });
    }
  }

  const assigneeProfiles = new Map<string, { name: string | null }>();

  fallbackOwnerIds.forEach((id) => assigneeUserIds.add(id));

  if (assigneeUserIds.size > 0) {
    const { data: assigneesData, error: assigneesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, metadata")
      .in("user_id", Array.from(assigneeUserIds));

    if (assigneesError) {
      console.error("[SERVER-OPS] failed to load assignment profiles:", assigneesError);
    } else {
      (assigneesData || []).forEach((profile) => {
        const metadata = (profile.metadata as { ops_name?: string } | null) ?? null;
        const fullName = (profile.full_name as string | null | undefined) ?? metadata?.ops_name ?? null;
        assigneeProfiles.set(profile.user_id as string, { name: fullName });
      });
    }
  }

  return data.map((row, index) => {
    const rawCompanyCode = (row as { company_code?: string | null }).company_code ?? null;
    const companyCode = toDealCompanyCode(rawCompanyCode) ?? null;
    const dealNumber =
      (row.deal_number as string) ??
      formatFallbackDealNumber({
        id: row.id as string,
        createdAt: row.created_at as string,
        prefix: getDealCompanyPrefix(companyCode),
      });

    const payload = (row.payload as Record<string, unknown> | null) ?? null;
    const updatedAt = (row.updated_at as string) ?? (row.created_at as string) ?? new Date().toISOString();

    const statusKey = mapStatusToWorkflow(row.status as string);
    const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];

    const assignment = primaryAssignments.get(row.id as string) ?? fallbackAssignments.get(row.id as string) ?? null;
    const normalizedAssignmentRole = normalizeWorkflowRole(assignment?.assigneeRole ?? null);
    const ownerRole = normalizedAssignmentRole ?? statusMeta.ownerRole;
    const ownerRoleLabel = WORKFLOW_ROLE_LABELS[ownerRole] ?? ownerRole;

    // Обрабатываем данные автомобиля из связанной таблицы
    const vehicleRaw = (row as Record<string, unknown>).vehicles;
    const vehicleDataRaw = (vehicleRaw && typeof vehicleRaw === 'object' && !Array.isArray(vehicleRaw))
      ? vehicleRaw
      : Array.isArray(vehicleRaw) && vehicleRaw.length > 0 ? vehicleRaw[0] : {};
    const vehicleData = vehicleDataRaw as SupabaseVehicleData;

    // Получаем данные клиента из карты
    const clientData = clientsMap.get(row.client_id as string);

    // Формируем название клиента
    const resolvedClientId =
      typeof row.client_id === "string" && row.client_id.trim().length > 0
        ? (row.client_id as string)
        : null;

    const clientName =
      clientData?.full_name ||
      `Client ${(resolvedClientId ?? "").slice(-4) || "0000"}`;

    // Формируем название автомобиля
    const vehicleName = vehicleData?.make && vehicleData?.model
      ? `${vehicleData.make} ${vehicleData.model}`
      : "Vehicle TBD";

    // Диагностика обработки данных
    if (index < 5) {
      console.log(`[DEBUG] Deal ${index + 1} data processing:`, {
        dealId: row.id,
        client_id: row.client_id,
        clientData_exists: !!clientData,
        clientName,
        vehicleDataRaw,
        vehicleData_make: vehicleData?.make,
        vehicleData_model: vehicleData?.model,
        vehicleName,
        vehicles_type: typeof (row as Record<string, unknown>).vehicles,
        vehicles_isArray: Array.isArray((row as Record<string, unknown>).vehicles),
        vehicles_isObject: !!(row as Record<string, unknown>).vehicles && typeof (row as Record<string, unknown>).vehicles === 'object' && !Array.isArray((row as Record<string, unknown>).vehicles)
      });
    }

    const source = getString(payload?.["source_label"]) ?? getString(payload?.["source"]) ?? "Website";
    const guardStatuses = resolveGuardStatuses(statusKey, payload);
    const fallbackOwnerId = typeof row.op_manager_id === "string" ? row.op_manager_id : null;
    const ownerUserId = assignment?.assigneeUserId ?? fallbackOwnerId;
    const ownerProfile = ownerUserId ? assigneeProfiles.get(ownerUserId) ?? null : null;
    const ownerName = ownerProfile?.name ?? null;

    const result = {
      id: row.id as string,
      dealId: dealNumber,
      clientId: resolvedClientId,
      client: clientName,
      vehicleId: vehicleData?.id || row.vehicle_id as string,
      vehicle: vehicleName,
      vehicleVin: typeof vehicleData?.vin === "string" ? vehicleData.vin : null,
      vehicleRegistration: getString(vehicleData?.license_plate) ?? null,
      updatedAt,
      stage: statusMeta.description,
      statusKey,
      ownerRole,
      ownerRoleLabel,
      ownerName,
      ownerUserId,
      source,
      nextAction: statusMeta.entryActions[0] ?? "Проверить текущий этап",
      guardStatuses,
      amount: row.total_amount ? `AED ${Number(row.total_amount).toLocaleString("en-US")}` : undefined,
      contractStartDate: getString((row as Record<string, unknown>).contract_start_date),
      companyCode,
    } satisfies OpsDealSummary;
    if (index < 3) {
      console.log("[SERVER-OPS] deal assignment snapshot:", {
        dealId: result.dealId,
        ownerName: result.ownerName,
        ownerUserId: result.ownerUserId,
        ownerRole: result.ownerRole,
      });
    }
    return result;
  });
}

type SupabaseClientProfileRow = {
  user_id: string;
  full_name: string | null;
  status: string | null;
  phone: string | null;
  nationality: string | null;
  residency_status: string | null;
  created_at: string | null;
  metadata: unknown;
};

export async function getOperationsClients(): Promise<OpsClientRecord[]> {
  console.log("[SERVER-OPS] getOperationsClients called");

  const supabase = await createSupabaseServerClient();

  const profileSelect =
    "user_id, full_name, status, phone, nationality, residency_status, created_at, metadata, source";

  let profilesData: SupabaseClientProfileRow[] | null = null;
  let profilesError: unknown = null;

  {
    const response = await supabase
      .from("profiles")
      .select(profileSelect)
      .order("full_name", { ascending: true });
    profilesData = (response.data as SupabaseClientProfileRow[] | null) ?? null;
    profilesError = response.error;
  }

  if (profilesError && isMissingColumnError(profilesError, "source")) {
    console.warn("[SERVER-OPS] profiles.source column missing, retrying without it");
    const response = await supabase
      .from("profiles")
      .select(
        "user_id, full_name, status, phone, nationality, residency_status, created_at, metadata",
      )
      .order("full_name", { ascending: true });
    profilesData = (response.data as SupabaseClientProfileRow[] | null) ?? null;
    profilesError = response.error;
  }

  if (profilesError) {
    console.error("[SERVER-OPS] failed to load clients:", profilesError);
    return [];
  }

  const profiles = profilesData ?? [];

  console.log(`[SERVER-OPS] loaded ${profiles.length} clients`);

  if (!profiles.length) {
    return [];
  }

  const clientIds = profiles.map((profile) => profile.user_id);

  let leasingRows: Array<{
    client_id: string;
    deal_number: string | null;
    company_code: string | null;
    vehicle_name: string | null;
    vehicle_vin: string | null;
    total_amount: number | null;
    contract_start_date: string | null;
  }> = [];

  if (clientIds.length) {
    const leasingResult = await supabase
      .from("deals")
      .select(
        "client_id, deal_number, company_code, total_amount, contract_start_date, vehicles:vehicle_id(make, model, vin)",
      )
      .in("client_id", clientIds)
      .order("contract_start_date", { ascending: false, nullsFirst: false });

    if (leasingResult.error) {
      console.error("[SERVER-OPS] failed to load leasing aggregates", leasingResult.error);
    } else {
      leasingRows = (leasingResult.data ?? []).map((row) => {
        const vehicle = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles;
        const vehicleName =
          vehicle && typeof vehicle === "object"
            ? `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim()
            : null;
        const vehicleVin =
          vehicle && typeof vehicle === "object"
            ? getString((vehicle as { vin?: string | null }).vin)
            : null;
        return {
          client_id: row.client_id as string,
          deal_number: getString(row.deal_number),
          company_code: getString(row.company_code),
          total_amount: typeof row.total_amount === "number" ? row.total_amount : null,
          contract_start_date: getString(row.contract_start_date),
          vehicle_name: vehicleName && vehicleName.length ? vehicleName : null,
          vehicle_vin: vehicleVin,
        };
      });
    }
  }

  const leasingMap = leasingRows.reduce<Map<string, typeof leasingRows[number]>>((acc, row) => {
    if (!row.client_id) return acc;
    if (!acc.has(row.client_id)) {
      acc.set(row.client_id, row);
    }
    return acc;
  }, new Map());

  return profiles.map((profile, index) => {
    const metadata = isRecord(profile.metadata)
      ? (profile.metadata as Record<string, unknown>)
      : {};
    const statusInfo = normalizeClientStatus(profile.status);
    const rawClient = isRecord(metadata?.["raw_client"])
      ? (metadata["raw_client"] as Record<string, unknown>)
      : null;
    const emailFromMetadata =
      [
        getString(metadata?.["ops_email"]),
        getString(metadata?.["work_email"]),
        getString(metadata?.["email"]),
        getString(metadata?.["contact_email"]),
        getString(metadata?.["primary_email"]),
        getString(rawClient?.["email"]),
      ].find(Boolean) ?? null;

    const phoneFromMetadata =
      [
        getString(metadata?.["ops_phone"]),
        getString(metadata?.["work_phone"]),
        getString(metadata?.["phone"]),
        getString(metadata?.["contact_phone"]),
        getString(metadata?.["primary_phone"]),
        getString(rawClient?.["phone"]),
      ].find(Boolean) ?? null;
    const rawSegment =
      getString(metadata?.["segment"]) ??
      getString(metadata?.["client_segment"]) ??
      getString(metadata?.["customer_segment"]) ??
      null;
    const clientTypeValue = getString(metadata?.["client_type"]);
    const clientType =
      clientTypeValue === "Company" || clientTypeValue === "Personal" ? clientTypeValue : null;
    const segment = rawSegment ?? clientType;

    const rawMemberSince = profile.created_at
      ? formatDate(profile.created_at as string, { month: "long", year: "numeric" })
      : null;
    const memberSince = rawMemberSince && rawMemberSince !== "—" ? rawMemberSince : null;

    const overdueCount = index % 3 === 0 ? 1 : 0;
    const overdueSummary = overdueCount > 0 ? `${overdueCount} проср.` : "Нет просрочек";

    const tags = Array.from(
      new Set(
        [
          statusInfo.display,
          getString(profile.residency_status),
          clientType,
          segment,
          getString(profile.nationality),
        ]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.trim()),
      ),
    );

    const leasing = leasingMap.get(profile.user_id as string) ?? null;
    const leasingAmount = leasing?.total_amount != null ? formatCurrency(leasing.total_amount) : "—";
    const leasingStart = leasing?.contract_start_date
      ? formatDate(leasing.contract_start_date, { day: "2-digit", month: "2-digit", year: "numeric" })
      : "—";
    const leasingVehicle = leasing?.vehicle_name ?? "—";
    const leasingVin = leasing?.vehicle_vin ?? null;

    const userId = (profile.user_id as string) ?? "";
    const clientName = (profile.full_name as string) ?? "";
    const detailSlug = buildSlugWithId(clientName, userId) || userId;
    return {
      userId,
      id: `CL-${(101 + index).toString().padStart(4, "0")}`,
      name: clientName || "Client",
      email: emailFromMetadata ?? "",
      phone: phoneFromMetadata ?? (profile.phone as string) ?? "+971 50 000 0000",
      status: statusInfo.filter,
      statusLabel: statusInfo.display,
      scoring: "90/100",
      overdue: overdueCount,
      limit: "AED 350,000",
      detailHref: `/ops/clients/${detailSlug}`,
      memberSince,
      segment,
      tags,
      metricsSummary: {
        scoring: "90/100",
        limit: "AED 350,000",
        overdue: overdueSummary,
      },
      residencyStatus: getString(profile.residency_status),
      leasing:
        leasing
          ? {
              vehicle: leasingVehicle,
              amount: leasingAmount,
              since: leasingStart,
              dealNumber: leasing.deal_number ?? undefined,
              vin: leasingVin,
            }
          : undefined,
    } satisfies OpsClientRecord;
  });
}

function formatPaymentsLabel(count: number): string {
  if (count <= 0) return "Нет просрочек";
  if (count === 1) return "1 просроченный платёж";
  if (count >= 2 && count <= 4) return `${count} просроченных платежа`;
  return `${count} просроченных платежей`;
}

export async function getOperationsClientDetail(identifier: string): Promise<OpsClientDetail | null> {
  const trimmedInput = (identifier ?? "").trim();
  if (!trimmedInput) {
    console.warn("[SERVER-OPS] getOperationsClientDetail called with empty identifier");
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { id: extractedUuid, slug: slugRemainder } = extractIdFromSlug(trimmedInput);
  const normalizedIdentifier = slugRemainder || trimmedInput;

  let userId: string | null = null;

  if (extractedUuid && isUuid(extractedUuid)) {
    userId = extractedUuid;
  } else if (isUuid(trimmedInput)) {
    userId = trimmedInput;
  }

  if (!userId) {
    const slugCandidate = toSlug(normalizedIdentifier);
    const nameSearch = normalizedIdentifier.replace(/[-_]+/g, " ").trim();

    let profileQuery = supabase
      .from("profiles")
      .select("user_id, full_name")
      .order("full_name", { ascending: true })
      .limit(50);

    if (nameSearch) {
      const pattern = `%${nameSearch.replace(/\s+/g, "%")}%`;
      profileQuery = profileQuery.ilike("full_name", pattern);
    }

    const { data: profileCandidates, error: profileSearchError } = await profileQuery;
    if (profileSearchError) {
      console.error("[SERVER-OPS] failed to search profile by slug", {
        identifier,
        error: profileSearchError,
      });
    } else if (profileCandidates?.length) {
      const match = profileCandidates.find((candidate) => {
        const candidateName = getString(candidate.full_name);
        if (!candidateName) return false;
        return toSlug(candidateName) === slugCandidate;
      });
      userId = match?.user_id ?? null;
    }
  }

  if (!userId) {
    console.warn("[SERVER-OPS] client detail user id not resolved", { identifier });
    return null;
  }

  const profileSelect = `user_id, full_name, status, phone, emirates_id, passport_number, nationality, residency_status, date_of_birth,
       employment_info, financial_profile, metadata, created_at, last_login_at, source`;

  let {
    data: profileRow,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError && isMissingColumnError(profileError, "source")) {
    console.warn("[SERVER-OPS] profiles.source column missing, retrying client profile without it", {
      userId,
    });
    ({ data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select(
        `user_id, full_name, status, phone, emirates_id, passport_number, nationality, residency_status, date_of_birth,
         employment_info, financial_profile, metadata, created_at, last_login_at`
      )
      .eq("user_id", userId)
      .maybeSingle());
  }

  if (profileError) {
    console.error("[SERVER-OPS] failed to load client profile", { userId, error: profileError });
    return null;
  }

  if (!profileRow) {
    console.warn("[SERVER-OPS] profile not found for user", { userId });
    return null;
  }

  let authEmail: string | null = null;
  let authPhone: string | null = null;

  try {
    const serviceClient = await createSupabaseServiceClient();
    const { data: authData, error: authError } = await serviceClient.auth.admin.getUserById(userId);
    if (authError) {
      console.warn("[SERVER-OPS] auth user not available for client", { userId, error: authError.message ?? authError });
    } else if (authData?.user) {
      authEmail = authData.user.email ?? null;
      authPhone = authData.user.phone ?? null;
    }
  } catch (error) {
    console.warn("[SERVER-OPS] auth lookup skipped (service key not configured?)", { userId, error });
  }

  const metadata = isRecord(profileRow.metadata) ? (profileRow.metadata as Record<string, unknown>) : {};
  const metadataEmailCandidates = ["ops_email", "work_email", "email", "contact_email"];
  for (const key of metadataEmailCandidates) {
    const candidateEmail = getString(metadata[key]);
    if (candidateEmail) {
      authEmail = authEmail ?? candidateEmail;
      break;
    }
  }

  const metadataPhoneCandidates = ["ops_phone", "work_phone", "phone"];
  for (const key of metadataPhoneCandidates) {
    const candidatePhone = getString(metadata[key]);
    if (candidatePhone) {
      authPhone = authPhone ?? candidatePhone;
      break;
    }
  }

  const employmentRecord = isRecord(profileRow.employment_info)
    ? (profileRow.employment_info as Record<string, unknown>)
    : null;
  const financialRecord = isRecord(profileRow.financial_profile)
    ? (profileRow.financial_profile as Record<string, unknown>)
    : null;

  const employment = {
    employer: getString(employmentRecord?.employer ?? employmentRecord?.company),
    position: getString(employmentRecord?.position ?? employmentRecord?.title),
    years: getNumber(employmentRecord?.years ?? employmentRecord?.tenure_years),
    raw: employmentRecord,
  };

  const financial = {
    monthlyIncome: getNumber(financialRecord?.monthly_income ?? financialRecord?.income_monthly),
    existingLoans: getNumber(financialRecord?.existing_loans ?? financialRecord?.loans_total),
    creditScore: getNumber(financialRecord?.credit_score),
    riskGrade: getString(financialRecord?.risk_grade),
    raw: financialRecord,
  };

  const profileSourceRaw = getString(profileRow.source);
  const metadataSourceCandidates = [
    getString(metadata?.["lead_source"]),
    getString(metadata?.["source_label"]),
    getString(metadata?.["source"]),
  ];
  const resolvedSource =
    (profileSourceRaw && profileSourceRaw.trim().length > 0 ? profileSourceRaw.trim() : null) ??
    metadataSourceCandidates.find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ) ??
    null;

  const rawSegment =
    getString(metadata?.segment) ??
    getString(metadata?.client_segment) ??
    getString(metadata?.customer_segment) ??
    null;
  const clientTypeValue = getString(metadata?.client_type);
  const clientType =
    clientTypeValue === "Company" || clientTypeValue === "Personal" ? clientTypeValue : null;
  const segment = rawSegment ?? clientType;

  const statusInfo = normalizeClientStatus(profileRow.status);

  const companyProfile = {
    contactName: getString(metadata?.company_contact_name),
    contactEmiratesId: getString(metadata?.company_contact_emirates_id),
    trn: getString(metadata?.company_trn),
    licenseNumber: getString(metadata?.company_license_number),
  };

  const tagSource = [
    statusInfo.display,
    getString(profileRow.residency_status),
    clientType,
    segment,
    getString(profileRow.nationality),
  ];

  const tags = tagSource
    .map((value) => (value ? value.trim() : null))
    .filter((value): value is string => Boolean(value));

  const profile: OpsClientProfile = {
    userId,
    fullName: getString(profileRow.full_name) ?? "Без имени",
    status: statusInfo.display,
    segment,
    clientType,
    memberSince: profileRow.created_at ? formatDate(profileRow.created_at, { month: "long", year: "numeric" }) : null,
    source: resolvedSource,
    email: authEmail,
    phone: getString(profileRow.phone) ?? authPhone,
    emiratesId: getString(profileRow.emirates_id),
    passportNumber: getString(profileRow.passport_number),
    nationality: getString(profileRow.nationality),
    residencyStatus: getString(profileRow.residency_status),
    dateOfBirth: profileRow.date_of_birth ?? null,
    company: companyProfile,
    employment,
    financial,
    lastLoginAt: profileRow.last_login_at ?? null,
    createdAt: profileRow.created_at ?? null,
    metrics: {
      scoring: "—",
      overdue: "Нет данных",
      overdueCount: 0,
      limit: "—",
      totalExposure: "—",
      activeDeals: 0,
    },
    tags,
  };

  type SupabaseDealRow = {
    id: string;
    deal_number: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
    monthly_payment: number | null;
    total_amount: number | null;
    principal_amount: number | null;
    term_months: number | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
    first_payment_date: string | null;
    source: string | null;
    assigned_account_manager: string | null;
    vehicle_id: string | null;
    vehicles?:
      | Array<{
          id: string;
          vin: string | null;
          make: string | null;
          model: string | null;
          year: number | null;
        }>
      | null;
  };

  type SupabaseScheduleRow = {
    id: string;
    deal_id: string;
    due_date: string | null;
    amount: number | null;
    status: string | null;
  };

  const [
    { data: applicationRow, error: applicationError },
    { data: dealsData, error: dealsError },
    { data: notificationsData, error: notificationsError },
    { data: ticketsData, error: ticketsError },
    { data: referralRows, error: referralError },
    { data: clientDocumentsData, error: clientDocumentsError },
  ] = await Promise.all([
    supabase
      .from("applications")
      .select(
        `id, application_number, status, requested_amount, term_months, monthly_payment,
         financial_info, employment_info, scoring_results, risk_assessment`
      )
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("deals")
      .select(
        `id, deal_number, company_code, status, created_at, updated_at, monthly_payment, total_amount,
         principal_amount, term_months, contract_start_date, contract_end_date, first_payment_date,
         source, assigned_account_manager, vehicle_id,
         vehicles!vehicle_id (id, vin, make, model, year)`
      )
      .eq("client_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_notifications")
      .select("id, title, message, icon, severity, created_at, read_at")
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("support_tickets")
      .select("id, ticket_number, topic, priority, status, last_message_preview, created_at, updated_at")
      .eq("client_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("referral_codes")
      .select(
        `id, code, share_url, created_at,
         referral_events (event_type),
         referral_deals (id),
         referral_rewards (reward_amount, status)`
      )
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("client_documents")
      .select(
        "id, document_type, document_category, title, storage_path, status, uploaded_at, verified_at, metadata",
      )
      .eq("client_id", userId)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (applicationError) {
    console.error("[SERVER-OPS] failed to load client application", { userId, error: applicationError });
  }
  if (dealsError) {
    console.error("[SERVER-OPS] failed to load client deals", { userId, error: dealsError });
  }
  if (notificationsError) {
    console.error("[SERVER-OPS] failed to load client notifications", { userId, error: notificationsError });
  }
  if (ticketsError) {
    console.error("[SERVER-OPS] failed to load client support tickets", { userId, error: ticketsError });
  }
  if (referralError) {
    console.error("[SERVER-OPS] failed to load client referral data", { userId, error: referralError });
  }
  if (clientDocumentsError) {
    console.error("[SERVER-OPS] failed to load client identity documents", { userId, error: clientDocumentsError });
  }

  const deals = (dealsData ?? []) as SupabaseDealRow[];
  const dealIds = deals.map((deal) => deal.id);
  const managerIds = Array.from(
    new Set(
      deals
        .map((deal) => deal.assigned_account_manager)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [managerProfilesResult, schedulesResult] = await Promise.all([
    managerIds.length
      ? supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", managerIds)
      : Promise.resolve({ data: [], error: null } as const),
    dealIds.length
      ? supabase
          .from("payment_schedules")
          .select("id, deal_id, due_date, amount, status")
          .in("deal_id", dealIds)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  const managerProfiles = new Map<string, string>();
  if (managerProfilesResult?.data?.length) {
    for (const manager of managerProfilesResult.data as Array<{ user_id: string; full_name: string | null }>) {
      if (manager.user_id) {
        managerProfiles.set(manager.user_id, getString(manager.full_name) ?? manager.user_id.slice(0, 8));
      }
    }
  }

  if (managerProfilesResult && "error" in managerProfilesResult && managerProfilesResult.error) {
    console.error("[SERVER-OPS] failed to load manager profiles", managerProfilesResult.error);
  }

  if (schedulesResult && "error" in schedulesResult && schedulesResult.error) {
    console.error("[SERVER-OPS] failed to load payment schedules", schedulesResult.error);
  }

  const schedules = (schedulesResult?.data ?? []) as SupabaseScheduleRow[];
  const schedulesByDeal = schedules.reduce<Map<string, SupabaseScheduleRow[]>>((acc, schedule) => {
    if (!schedule.deal_id) return acc;
    const list = acc.get(schedule.deal_id) ?? [];
    list.push(schedule);
    acc.set(schedule.deal_id, list);
    return acc;
  }, new Map());

  const scheduleNow = new Date();
  scheduleNow.setHours(0, 0, 0, 0);

  let totalExposureValue = 0;
  let activeDealsCount = 0;
  let overdueCount = 0;
  let overdueAmountTotal = 0;

  const clientDeals: OpsClientDeal[] = deals.map((deal) => {
    const vehicleCandidates = Array.isArray(deal.vehicles)
      ? deal.vehicles
      : deal.vehicles
        ? [deal.vehicles]
        : [];
    const vehicle = vehicleCandidates[0] ?? null;
    const statusKey = mapStatusToWorkflow(deal.status ?? null);
    const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];
    const managerName = deal.assigned_account_manager
      ? managerProfiles.get(deal.assigned_account_manager) ?? null
      : null;

    if (deal.total_amount != null) {
      totalExposureValue += Number(deal.total_amount) || 0;
    } else if (deal.principal_amount != null) {
      totalExposureValue += Number(deal.principal_amount) || 0;
    }

    if ((deal.status ?? "").toLowerCase() === "active") {
      activeDealsCount += 1;
    }

    const dealSchedules = schedulesByDeal.get(deal.id) ?? [];
    let nextPaymentDue: string | null = null;
    let overdueAmount: number | null = null;

    if (dealSchedules.length) {
      const upcoming = dealSchedules
        .filter((schedule) => schedule.status?.toLowerCase() !== "paid" && schedule.due_date)
        .map((schedule) => ({
          ...schedule,
          dueDate: new Date(schedule.due_date as string),
        }))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      const next = upcoming.find((item) => item.dueDate.getTime() >= scheduleNow.getTime());
      if (next) {
        nextPaymentDue = formatShortDate(next.due_date ?? null);
      }

      const overdueSchedules = upcoming.filter((item) => item.dueDate.getTime() < scheduleNow.getTime());
      if (overdueSchedules.length) {
        overdueCount += overdueSchedules.length;
        const sum = overdueSchedules.reduce((acc, schedule) => acc + (Number(schedule.amount) || 0), 0);
        overdueAmount = sum > 0 ? sum : null;
        overdueAmountTotal += sum;
      }
    }

    const companyCode =
      toDealCompanyCode((deal as { company_code?: string | null }).company_code ?? null) ?? null;

    return {
      id: deal.id,
      dealNumber:
        deal.deal_number ??
        formatFallbackDealNumber({
          id: deal.id,
          createdAt: deal.created_at,
          prefix: getDealCompanyPrefix(companyCode),
        }),
      status: (deal.status ?? "unknown").toUpperCase(),
      statusKey,
      stageLabel: statusMeta?.title ?? null,
      createdAt: deal.created_at,
      updatedAt: deal.updated_at,
      vehicleId: deal.vehicle_id ?? vehicle?.id ?? null,
      vehicleName: vehicle ? `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || "Авто не выбрано" : "Авто не выбрано",
      vehicleVin: vehicle?.vin ?? null,
      monthlyPayment: formatCurrency(deal.monthly_payment),
      totalAmount: formatCurrency(deal.total_amount),
      principalAmount: formatCurrency(deal.principal_amount),
      termMonths: deal.term_months ?? null,
      contractStartDate: formatShortDate(deal.contract_start_date),
      contractEndDate: formatShortDate(deal.contract_end_date),
      nextPaymentDue,
      overdueAmount: overdueAmount != null ? formatCurrency(overdueAmount) : null,
      assignedManagerId: deal.assigned_account_manager ?? null,
      assignedManagerName: managerName,
      source: getString(deal.source),
    } satisfies OpsClientDeal;
  });

  const overdueDisplay = overdueCount > 0
    ? `${formatPaymentsLabel(overdueCount)}${overdueAmountTotal > 0 ? ` • ${formatCurrency(overdueAmountTotal)}` : ""}`
    : "Нет просрочек";

  const limitValue =
    getNumber(financial.raw?.["credit_limit"]) ??
    (applicationRow?.financial_info && isRecord(applicationRow.financial_info)
      ? getNumber(applicationRow.financial_info.credit_limit)
      : null) ??
    getNumber(applicationRow?.requested_amount) ??
    null;

  const scoringValue = resolveScore(applicationRow?.scoring_results ?? metadata);
  const scoringDisplay = scoringValue != null ? `${Math.round(scoringValue)}/100` : financial.creditScore != null ? `${Math.round(financial.creditScore)}` : "—";

  profile.metrics = {
    scoring: scoringDisplay,
    overdue: overdueDisplay,
    overdueCount,
    limit: limitValue != null ? formatCurrency(limitValue) : "—",
    totalExposure: totalExposureValue > 0 ? formatCurrency(totalExposureValue) : "—",
    activeDeals: activeDealsCount,
  };

  const clientDocumentsRows = (clientDocumentsData ?? []) as SupabaseClientDocumentRow[];

  const documentDescriptors = (await Promise.all(
    clientDocumentsRows.map(async (document) => {
      const signedUrl = document.storage_path
        ? await createSignedStorageUrl({ bucket: "client-documents", path: document.storage_path })
        : null;
      const metadata = (document.metadata ?? {}) as Record<string, unknown>;
      const rawDocumentType = getString(document.document_type);
      const normalizedDocumentType = normalizeClientDocumentType(rawDocumentType);
      const typeLabel = getClientDocumentLabel(rawDocumentType);
      const preferredName =
        getString(document.title) ??
        getString(metadata?.["label"]) ??
        typeLabel ??
        normalizedDocumentType ??
        rawDocumentType ??
        "Документ";

      const contextRaw = getString(metadata?.["upload_context"]);
      const context =
        contextRaw === "company"
          ? ("company" as const)
          : contextRaw === "personal"
            ? ("personal" as const)
            : normalizedDocumentType === "company_license" || normalizedDocumentType === "corporate_documents"
              ? ("company" as const)
              : ("personal" as const);

      return {
        id: document.id,
        name: preferredName,
        status: getString(document.status) ?? "uploaded",
        documentType: normalizedDocumentType ?? rawDocumentType,
        category: getString(document.document_category),
        source: "client" as const,
        bucket: "client-documents",
        storagePath: document.storage_path ?? null,
        uploadedAt: document.uploaded_at ?? null,
        signedAt: document.verified_at ?? null,
        metadata,
        context,
        url: signedUrl,
      } satisfies OpsClientDocument;
    }),
  )) as Array<OpsClientDocument | null>;

  const notifications: OpsClientNotification[] = (notificationsData ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? "",
    message: row.message ?? null,
    severity: row.severity ?? "info",
    icon: row.icon ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    readAt: row.read_at ?? null,
  }));

  const supportTickets: OpsClientSupportTicket[] = (ticketsData ?? []).map((row) => ({
    id: row.id,
    ticketNumber: row.ticket_number ?? "—",
    topic: row.topic ?? "—",
    priority: row.priority ?? "normal",
    status: row.status ?? "open",
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    lastMessagePreview: row.last_message_preview ?? null,
  }));

  let referralSummary: OpsClientReferralSummary | null = null;
  if (referralRows && referralRows.length) {
    const referral = referralRows[0] as {
      code: string;
      share_url: string | null;
      created_at: string | null;
      referral_events?: Array<{ event_type: string | null }>;
      referral_deals?: Array<{ id: string }>;
      referral_rewards?: Array<{ reward_amount: number | null; status: string | null }>;
    };

    const clicks = referral.referral_events?.filter((event) => event.event_type === "click").length ?? 0;
    const applicationsCount = referral.referral_events?.filter((event) => event.event_type === "application").length ?? 0;
    const dealsCount = referral.referral_events?.filter((event) => event.event_type === "deal").length ?? referral.referral_deals?.length ?? 0;
    const totalRewardsValue = (referral.referral_rewards ?? []).reduce((sum, reward) => {
      if (!reward || reward.reward_amount == null) return sum;
      const status = reward.status?.toLowerCase() ?? "";
      if (["earned", "paid"].includes(status)) {
        return sum + Number(reward.reward_amount);
      }
      return sum;
    }, 0);

    referralSummary = {
      code: referral.code,
      shareUrl: referral.share_url,
      createdAt: referral.created_at,
      clicks,
      applications: applicationsCount,
      deals: dealsCount,
      totalRewards: totalRewardsValue > 0 ? formatCurrency(totalRewardsValue) : null,
    };
  }

  const clientDocuments = documentDescriptors
    .filter((descriptor): descriptor is OpsClientDocument => descriptor !== null)
    .sort((a, b) => {
      const left = a.uploadedAt ?? "";
      const right = b.uploadedAt ?? "";
      return right.localeCompare(left);
    });

  const detail: OpsClientDetail = {
    profile,
    deals: clientDeals,
    documents: clientDocuments,
    notifications,
    supportTickets,
    referrals: referralSummary,
  };

  return detail;
}

type OperationsCar = OpsCarRecord;

type VehicleHighlight = NonNullable<OpsVehicleProfile["highlights"]>[number];

export async function getOperationsCars(): Promise<OperationsCar[]> {
  console.log("[SERVER-OPS] getOperationsCars called");

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vehicles")
    .select(
      `
        id,
        vin,
        license_plate,
        make,
        model,
        variant,
        year,
        body_type,
        mileage,
        status,
        updated_at,
        deals:deals!deals_vehicle_id_fkey (id, deal_number, status)
      `,
    )
    .not("vin", "is", null)
    .not("vin", "eq", "")
    .neq("vin", "—")
    .order("make", { ascending: true });

  if (error) {
    console.error("[SERVER-OPS] failed to load vehicles:", error);
    return [];
  }

  console.log(`[SERVER-OPS] loaded ${data?.length || 0} vehicles`);

  if (!data?.length) {
    return [];
  }

  const ACTIVE_DEAL_STATUSES = new Set(["pending_activation", "active"]);

  return data.map((vehicle) => {
    const id = (vehicle.id as string) ?? `${vehicle.vin ?? "vehicle"}`;
    const vin = ((vehicle.vin as string) ?? "—").toUpperCase();
    const licensePlateRaw = typeof vehicle.license_plate === "string" ? vehicle.license_plate : null;
    const licensePlateDisplay = (() => {
      const trimmed = licensePlateRaw?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : null;
    })();
    const make = String(vehicle.make ?? "").trim() || "Vehicle";
    const model = String(vehicle.model ?? "").trim();
    const name = `${make} ${model}`.trim();
    const variant = vehicle.variant ? String(vehicle.variant) : null;
    const yearValue = vehicle.year != null ? Number(vehicle.year) : null;
    const bodyType = vehicle.body_type ? String(vehicle.body_type) : null;
    const mileageValue = vehicle.mileage != null ? Number(vehicle.mileage) : null;
    const mileage = mileageValue != null
      ? `${mileageValue.toLocaleString("en-US", { maximumFractionDigits: 0 })} km`
      : "—";
    const statusRaw = typeof vehicle.status === "string" ? vehicle.status : "draft";
    const statusMeta = OPS_VEHICLE_STATUS_META[statusRaw] ?? { label: statusRaw, tone: "muted" as OpsTone };

    const baseSlugSource = (() => {
      const combined = `${make} ${model}`.trim();
      if (combined.length > 0) {
        return combined;
      }
      if (vin && vin.trim().length > 0 && vin !== id) {
        return vin;
      }
      return null;
    })();
    const detailSlug = buildSlugWithId(baseSlugSource, id) || id;

    const dealsData = Array.isArray(vehicle.deals) ? vehicle.deals : [];
    const activeDeal = dealsData.find((deal) => ACTIVE_DEAL_STATUSES.has(String(deal.status ?? "").toLowerCase()));
    const activeDealNumber = activeDeal?.deal_number ?? null;
    const activeDealStatus = activeDeal?.status ? String(activeDeal.status) : null;
    const activeDealStatusMeta = activeDealStatus
      ? OPS_DEAL_STATUS_META[activeDealStatus] ?? { label: activeDealStatus, tone: "muted" as OpsTone }
      : null;
    const activeDealSlug = activeDeal
      ? buildSlugWithId(
          (activeDeal.deal_number as string) ?? null,
          (activeDeal.id as string) ?? null,
        ) || (activeDeal.id as string) || null
      : null;

    return {
      id,
      vin,
      licensePlate: licensePlateDisplay,
      licensePlateDisplay,
      name,
      make,
      model: model || make,
      variant,
      year: yearValue,
      bodyType,
      status: statusRaw,
      statusLabel: statusMeta.label,
      statusTone: statusMeta.tone,
      mileage,
      mileageValue,
      activeDealNumber,
      activeDealStatus,
      activeDealStatusLabel: activeDealStatusMeta?.label ?? null,
      activeDealStatusTone: activeDealStatusMeta?.tone ?? null,
      activeDealHref: activeDealSlug ? `/ops/deals/${activeDealSlug}` : null,
      detailHref: `/ops/cars/${detailSlug}`,
      type: bodyType ?? "—",
    } satisfies OperationsCar;
  });
}

type DealDetailResult = {
  slug: string;
  dealUuid: string;
  statusKey: OpsDealStatusKey;
  guardStatuses: OpsDealGuardStatus[];
  workflowTasks: OpsDealWorkflowTask[];
  tasks: WorkspaceTask[];
  profile: OpsDealProfile;
  company: OpsDealCompany;
  client: OpsDealClientProfile;
  keyInformation: OpsDealKeyInfoEntry[];
  overview: OpsDealDetailsEntry[];
  financials: OpsDealDetailsEntry[];
  contract: OpsDealDetailsEntry[];
  workflowMeta: OpsDealDetailsEntry[];
  relatedEntities: OpsDealRelatedSection[];
  structuredData: OpsDealDetailJsonBlock[];
  paymentSchedule: OpsDealDetailsEntry[];
  editDefaults: OpsDealEditDefaults;
  clientDocuments: OpsClientDocument[];
  documents: OpsDealDocument[];
  sellerDocuments: OpsSellerDocument[];
  invoices: OpsDealInvoice[];
  timeline: OpsDealTimelineEvent[];
  insurance: OpsInsuranceInfo | null;
};

// Серверные функции для операций
export async function getOperationsDealDetail(slug: string): Promise<DealDetailResult | null> {
  logOpsDealDetailDebug(`[SERVER-OPS] getOperationsDealDetail called with slug: "${slug}"`);

  const trimmedSlug = (slug ?? "").trim();
  const { id: extractedUuid, slug: slugWithoutId } = extractIdFromSlug(trimmedSlug);
  const normalizedSlug = toSlug(slugWithoutId || trimmedSlug);
  logOpsDealDetailDebug(`[SERVER-OPS] normalized slug: "${normalizedSlug}"`);

  const supabase = await createSupabaseServerClient();
  const supabaseService = await createSupabaseServiceClient();

  // Check authentication
  const { data: userData, error: userError } = await supabase.auth.getUser();
  logOpsDealDetailDebug(`[SERVER-OPS] user authenticated:`, !!userData?.user, `error:`, userError);

  // Загружаем данные сделки с связанными таблицами
  const fetchFields = `
    id,
    deal_number,
    company_code,
    application_id,
    status,
    created_at,
    updated_at,
    completed_at,
    monthly_payment,
    monthly_lease_rate,
    total_amount,
    principal_amount,
    interest_rate,
    down_payment_amount,
    security_deposit,
    processing_fee,
    payload,
    contract_terms,
    insurance_details,
    client_id,
    term_months,
    contract_start_date,
    contract_end_date,
    first_payment_date,
    workflow_id,
    workflow_version_id,
    op_manager_id,
    assigned_account_manager,
    asset_id,
    company:deal_companies(code, name, prefix),
    vehicles!vehicle_id(id, vin, make, model, variant, year, body_type, mileage, status, fuel_type, transmission, color_exterior, color_interior, vehicle_images(id, storage_path, label, is_primary, sort_order)),
    deal_documents(id, document_type, title, storage_path, status, signed_at, created_at, document_category, metadata, mime_type, file_size, uploaded_at, uploaded_by)
  `;

  type SupabaseDealDetailRow = {
    id: string;
    deal_number: string | null;
    company_code: string | null;
    application_id: string | null;
    status: string;
    created_at: string | null;
    updated_at: string | null;
    completed_at: string | null;
    monthly_payment: number | null;
    monthly_lease_rate: number | null;
    total_amount: number | null;
    principal_amount: number | null;
    interest_rate: number | null;
    down_payment_amount: number | null;
    security_deposit: number | null;
    processing_fee: number | null;
    payload: Record<string, unknown> | null;
    contract_terms: Record<string, unknown> | null;
    insurance_details: Record<string, unknown> | null;
    client_id: string;
    term_months: number | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
    first_payment_date: string | null;
    workflow_id: string | null;
    workflow_version_id: string | null;
    op_manager_id: string | null;
    assigned_account_manager: string | null;
    asset_id: string | null;
    vehicles?: SupabaseVehicleData[] | SupabaseVehicleData | null;
    deal_documents?: SupabaseDealDocument[];
    company?: { code?: string | null; name?: string | null; prefix?: string | null } | Array<{
      code?: string | null;
      name?: string | null;
      prefix?: string | null;
    }> | null;
  };

  let dealRow: SupabaseDealDetailRow | null = null;

  const uuidCandidate =
    extractedUuid && z.string().uuid().safeParse(extractedUuid).success ? extractedUuid : null;
  const slugIsUuidOnly =
    !uuidCandidate && z.string().uuid().safeParse(trimmedSlug).success ? trimmedSlug : null;
  const dealNumberCandidate = slugWithoutId || (!uuidCandidate ? trimmedSlug : "");

  if (uuidCandidate) {
    logOpsDealDetailDebug(`[SERVER-OPS] searching by extracted UUID: "${uuidCandidate}"`);
    const byId = await supabase.from("deals").select(fetchFields).eq("id", uuidCandidate).maybeSingle();

    if (byId.error) {
      console.error("[SERVER-OPS] failed to load deal detail by extracted id:", byId.error);
    } else {
      logOpsDealDetailDebug(`[SERVER-OPS] extracted UUID search result:`, !!byId.data);
    }

    if (byId.data) {
      logOpsDealDetailDebug(`[SERVER-OPS] found deal by extracted UUID:`, byId.data.id);
      dealRow = byId.data;
    }
  }

  if (!dealRow && slugIsUuidOnly) {
    logOpsDealDetailDebug(`[SERVER-OPS] slug itself is UUID, searching by id: "${slugIsUuidOnly}"`);
    const byId = await supabase.from("deals").select(fetchFields).eq("id", slugIsUuidOnly).maybeSingle();

    if (byId.error) {
      console.error("[SERVER-OPS] failed to load deal detail by slug UUID:", byId.error);
    } else {
      logOpsDealDetailDebug(`[SERVER-OPS] slug UUID search result:`, !!byId.data);
    }

    if (byId.data) {
      logOpsDealDetailDebug(`[SERVER-OPS] found deal by slug UUID:`, byId.data.id);
      dealRow = byId.data;
    }
  }

  if (!dealRow && dealNumberCandidate) {
    logOpsDealDetailDebug(`[SERVER-OPS] searching by exact deal_number: "${dealNumberCandidate}"`);
    const byNumber = await supabase
      .from("deals")
      .select(fetchFields)
      .eq("deal_number", dealNumberCandidate)
      .maybeSingle();

    if (byNumber.error) {
      console.error("[SERVER-OPS] failed to load deal detail by number:", byNumber.error);
    } else {
      logOpsDealDetailDebug(`[SERVER-OPS] search by number result:`, !!byNumber.data);
    }

    if (byNumber.data) {
      logOpsDealDetailDebug(`[SERVER-OPS] found deal by number:`, byNumber.data.id);
      dealRow = byNumber.data;
    }
  }

  if (
    !dealRow &&
    dealNumberCandidate &&
    dealNumberCandidate.toUpperCase() !== dealNumberCandidate
  ) {
    logOpsDealDetailDebug(
      `[SERVER-OPS] retrying exact deal_number search with uppercase: "${dealNumberCandidate.toUpperCase()}"`,
    );
    const byNumberUpper = await supabase
      .from("deals")
      .select(fetchFields)
      .eq("deal_number", dealNumberCandidate.toUpperCase())
      .maybeSingle();

    if (byNumberUpper.error) {
      console.error("[SERVER-OPS] failed to load deal detail by uppercase number:", byNumberUpper.error);
    } else {
      logOpsDealDetailDebug(`[SERVER-OPS] uppercase number search result:`, !!byNumberUpper.data);
    }

    if (byNumberUpper.data) {
      logOpsDealDetailDebug(`[SERVER-OPS] found deal by uppercase number:`, byNumberUpper.data.id);
      dealRow = byNumberUpper.data;
    }
  }

  if (!dealRow && dealNumberCandidate) {
    logOpsDealDetailDebug(`[SERVER-OPS] searching by case-insensitive deal_number: "${dealNumberCandidate}"`);
    const { data: insensitiveMatch, error: insensitiveError } = await supabase
      .from("deals")
      .select(fetchFields)
      .ilike("deal_number", dealNumberCandidate)
      .maybeSingle();

    if (insensitiveError) {
      console.error("[SERVER-OPS] failed to load deal detail by insensitive number:", insensitiveError);
    } else {
      logOpsDealDetailDebug(`[SERVER-OPS] insensitive search result:`, !!insensitiveMatch);
    }

    if (insensitiveMatch) {
      logOpsDealDetailDebug(`[SERVER-OPS] found deal by insensitive number:`, insensitiveMatch.id);
      dealRow = insensitiveMatch;
    }
  }

  if (!dealRow) {
    logOpsDealDetailDebug(`[SERVER-OPS] searching in last 50 deals for slug: "${normalizedSlug}"`);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("deals")
      .select(fetchFields)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fallbackError) {
      console.error("[SERVER-OPS] failed to load fallback deals:", fallbackError);
    } else {
      logOpsDealDetailDebug(`[SERVER-OPS] loaded ${fallbackData?.length || 0} recent deals for fallback search`);
      fallbackData?.slice(0, 5).forEach((deal: SupabaseDealDetailRow, index: number) => {
        logOpsDealDetailDebug(`[SERVER-OPS] available deal ${index + 1}: ID=${deal.id}, deal_number=${deal.deal_number}`);
      });
    }

    const matched = fallbackData?.find((row: SupabaseDealDetailRow) => matchesDealSlug(row, normalizedSlug));
    logOpsDealDetailDebug(`[SERVER-OPS] fallback search result:`, !!matched);

    if (matched) {
      logOpsDealDetailDebug(`[SERVER-OPS] found deal in fallback search:`, matched.id);
      dealRow = matched;
    }
  }

  if (!dealRow) {
    logOpsDealDetailDebug(`[SERVER-OPS] no deal found for slug: "${slug}" after all search attempts`);
    return null;
  }

  logOpsDealDetailDebug(`[SERVER-OPS] successfully found deal:`, dealRow.id, `deal_number:`, dealRow.deal_number);

  const normalizedCompanyCodeValue = resolveDealCompanyCode(dealRow.company_code ?? null);
  const companyRelation = Array.isArray(dealRow.company) ? dealRow.company[0] : dealRow.company;
  const resolvedCompanyPrefix =
    typeof companyRelation?.prefix === "string" && companyRelation.prefix.trim().length > 0
      ? companyRelation.prefix.trim().toUpperCase()
      : getDealCompanyPrefix(normalizedCompanyCodeValue);
  const resolvedCompanyName =
    typeof companyRelation?.name === "string" && companyRelation.name.trim().length > 0
      ? companyRelation.name.trim()
      : getDealCompanyName(normalizedCompanyCodeValue);
  const dealCompany: OpsDealCompany = {
    code: normalizedCompanyCodeValue,
    prefix: resolvedCompanyPrefix,
    name: resolvedCompanyName,
  };

  const statusKey = mapStatusToWorkflow(dealRow.status);
  const fallbackDealNumber = formatFallbackDealNumber({
    id: dealRow.id,
    createdAt: dealRow.created_at ?? null,
    prefix: dealCompany.prefix,
  });

  // Загружаем данные клиента отдельным запросом
  const clientIdRaw = typeof dealRow.client_id === "string" ? dealRow.client_id.trim() : "";
  const clientId = clientIdRaw.length > 0 ? clientIdRaw : null;
  let clientData: {
    id?: string | null;
    user_id?: string | null;
    full_name?: string | null;
    phone?: string | null;
    status?: string | null;
    nationality?: string | null;
    metadata?: unknown;
    source?: string | null;
  } | null = null;
  let clientError: unknown = null;

  if (clientId) {
    ({ data: clientData, error: clientError } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, phone, status, nationality, metadata, source")
      .eq("user_id", clientId)
      .maybeSingle());

    if (clientError && isMissingColumnError(clientError, "source")) {
      console.warn("[SERVER-OPS] profiles.source column missing, retrying client lookup without it", {
        clientId,
      });
      ({ data: clientData, error: clientError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone, status, nationality, metadata")
        .eq("user_id", clientId)
        .maybeSingle());
    }
  } else {
    console.warn("[SERVER-OPS] deal has no linked client, skipping profile lookup", {
      dealId: dealRow.id,
    });
  }

  if (clientError) {
    console.error("[SERVER-OPS] failed to load client profile for deal", {
      dealId: dealRow.id,
      clientId,
      error: clientError,
    });
  }


  // Загружаем email из auth.users (если есть клиент)
  let authUser: Awaited<ReturnType<typeof supabaseService.auth.admin.getUserById>>["data"] | null = null;
  if (clientId) {
    try {
      const { data: fetchedAuthUser, error: authUserError } = await supabaseService.auth.admin.getUserById(
        clientId,
      );

      if (authUserError) {
        const status = (authUserError as { status?: number | null } | null)?.status ?? null;
        const message = (authUserError as { message?: string } | null)?.message ?? "";
        const normalizedMessage = message.toLowerCase();
        const isMissing = status === 404;
        const isForbidden =
          status === 401 ||
          status === 403 ||
          normalizedMessage.includes("service role") ||
          normalizedMessage.includes("not authorized");

        if (!isMissing && !isForbidden) {
          console.warn("[SERVER-OPS] unexpected failure while loading auth user for deal client", {
            dealId: dealRow.id,
            clientId,
            status,
            message,
          });
        } else {
          console.debug("[SERVER-OPS] auth user lookup skipped", {
            dealId: dealRow.id,
            clientId,
            status,
            message,
          });
        }
      } else {
        authUser = fetchedAuthUser;
      }
    } catch (error) {
      console.warn("[SERVER-OPS] auth user lookup threw", {
        dealId: dealRow.id,
        clientId,
        error,
      });
    }
  }

  let clientDocuments: OpsClientDocument[] = [];
  if (clientId) {
    const { data: clientDocumentsRows, error: clientDocumentsError } = await supabase
      .from("client_documents")
      .select(
        "id, document_type, document_category, title, storage_path, status, uploaded_at, verified_at, metadata",
      )
      .eq("client_id", clientId)
      .order("uploaded_at", { ascending: false });

    if (clientDocumentsError) {
      console.error("[SERVER-OPS] failed to load client documents for deal", {
        dealId: dealRow.id,
        clientId,
        error: clientDocumentsError,
      });
    }

    const mappedClientDocuments = await Promise.all(
      (clientDocumentsRows ?? []).map(async (document: SupabaseClientDocumentRow) => {
        const signedUrl = document.storage_path
          ? await createSignedStorageUrl({ bucket: "client-documents", path: document.storage_path })
          : null;
        const metadata = (document.metadata ?? {}) as Record<string, unknown>;
        const rawDocumentType = getString(document.document_type);
        const normalizedDocumentType = normalizeClientDocumentType(rawDocumentType);
        const typeLabel = getClientDocumentLabel(rawDocumentType);
        const preferredName =
          getString(document.title) ??
          getString(metadata?.["label"]) ??
          typeLabel ??
          normalizedDocumentType ??
          rawDocumentType ??
          "Документ";

        const contextRaw = getString(metadata?.["upload_context"]);
        const context =
          contextRaw === "company"
            ? ("company" as const)
            : contextRaw === "personal"
              ? ("personal" as const)
              : normalizedDocumentType === "company_license" || normalizedDocumentType === "corporate_documents"
                ? ("company" as const)
                : ("personal" as const);

        return {
          id: document.id,
          name: preferredName,
          status: getString(document.status) ?? "uploaded",
          documentType: normalizedDocumentType ?? rawDocumentType,
          category: getString(document.document_category),
          source: "client" as const,
          bucket: "client-documents",
          storagePath: document.storage_path ?? null,
          uploadedAt: document.uploaded_at ?? null,
          signedAt: document.verified_at ?? null,
          metadata,
          context,
          url: signedUrl,
        } satisfies OpsClientDocument;
      }),
    );

    clientDocuments = mappedClientDocuments.sort((left, right) => {
      const leftUploaded = left.uploadedAt ?? "";
      const rightUploaded = right.uploadedAt ?? "";
      return rightUploaded.localeCompare(leftUploaded);
    });
  }

  // Загружаем scoring из applications
  const applicationScoringData = clientId
    ? (
        await supabase
          .from("applications")
          .select("scoring_results")
          .eq("user_id", clientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data
    : null;

  // Загружаем график платежей
  type SupabasePaymentScheduleRow = { due_date: string | null; amount: number | null; status: string | null };
  const { data: paymentSchedules, error: paymentSchedulesError } = await supabase
    .from("payment_schedules")
    .select("due_date, amount, status")
    .eq("deal_id", dealRow.id)
    .order("due_date", { ascending: true });

  if (paymentSchedulesError) {
    console.error("[SERVER-OPS] failed to load payment schedules", {
      dealId: dealRow.id,
      error: paymentSchedulesError,
    });
  }

  const managerIds = [dealRow.assigned_account_manager, dealRow.op_manager_id].filter(
    (value): value is string => Boolean(value),
  );

  let managerProfiles: Array<{ user_id: string; full_name: string | null; status: string | null }> = [];
  if (managerIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, status")
      .in("user_id", managerIds);

    if (profilesError) {
      console.error("[SERVER-OPS] failed to load manager profiles", {
        dealId: dealRow.id,
        managerIds,
        error: profilesError,
      });
    } else {
      managerProfiles = profilesData ?? [];
    }
  }

  type WorkflowAssetRecord = {
    id: string;
    type: string | null;
    vin: string | null;
    make: string | null;
    model: string | null;
    trim: string | null;
    year: number | null;
    supplier: string | null;
    price: number | null;
    meta: Record<string, unknown> | null;
    created_at: string | null;
  };

  type WorkflowVersionRecord = {
    id: string;
    workflow_id: string | null;
    version: string | null;
    title: string | null;
    description: string | null;
    is_active: boolean | null;
    created_at: string | null;
  };

  type ApplicationRecord = {
    id: string;
    application_number: string | null;
    status: string | null;
    submitted_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  const [workflowAssetResult, workflowVersionResult, applicationRecordResult] =
    await Promise.all([
      dealRow.asset_id
        ? supabase
            .from("workflow_assets")
            .select("id, type, vin, make, model, trim, year, supplier, price, meta, created_at")
            .eq("id", dealRow.asset_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      dealRow.workflow_version_id
        ? supabase
            .from("workflow_versions")
            .select("id, workflow_id, version, title, description, is_active, created_at")
            .eq("id", dealRow.workflow_version_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      dealRow.application_id
        ? supabase
            .from("applications")
            .select("id, application_number, status, submitted_at, created_at, updated_at")
            .eq("id", dealRow.application_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const workflowAsset = (workflowAssetResult as { data: WorkflowAssetRecord | null }).data ?? null;
  const workflowAssetMeta = isRecord(workflowAsset?.meta)
    ? (workflowAsset?.meta as Record<string, unknown>)
    : null;
  const workflowVersion = (workflowVersionResult as { data: WorkflowVersionRecord | null }).data ?? null;
  const applicationRecord = (applicationRecordResult as { data: ApplicationRecord | null }).data ?? null;

  if ((workflowAssetResult as { error?: unknown }).error) {
    console.error("[SERVER-OPS] failed to load workflow asset", {
      dealId: dealRow.id,
      assetId: dealRow.asset_id,
      error: (workflowAssetResult as { error?: unknown }).error,
    });
  }

  if ((workflowVersionResult as { error?: unknown }).error) {
    console.error("[SERVER-OPS] failed to load workflow version", {
      dealId: dealRow.id,
      workflowVersionId: dealRow.workflow_version_id,
      error: (workflowVersionResult as { error?: unknown }).error,
    });
  }

  if ((applicationRecordResult as { error?: unknown }).error) {
    console.error("[SERVER-OPS] failed to load application record", {
      dealId: dealRow.id,
      applicationId: dealRow.application_id,
      error: (applicationRecordResult as { error?: unknown }).error,
    });
  }

  logOpsDealDetailDebug(`[DEBUG] Client data query result:`, { clientData, clientError, clientId });
  logOpsDealDetailDebug(`[DEBUG] Client full_name: "${clientData?.full_name}"`);
  logOpsDealDetailDebug(`[DEBUG] Client phone: "${clientData?.phone}"`);
  logOpsDealDetailDebug(`[DEBUG] Auth user email: "${authUser?.user?.email}"`);
  logOpsDealDetailDebug(`[DEBUG] Client metadata:`, clientData?.metadata);
  logOpsDealDetailDebug(`[DEBUG] Application scoring results:`, applicationScoringData?.scoring_results);

  const paymentScheduleRows = (paymentSchedules ?? []) as SupabasePaymentScheduleRow[];
  const pendingStatuses = new Set(["pending", "overdue", "draft"]);

  const nextScheduleEntry = paymentScheduleRows.find((row) =>
    pendingStatuses.has((row.status ?? "").toLowerCase()),
  );

  const outstandingAmount = paymentScheduleRows
    .filter((row) => pendingStatuses.has((row.status ?? "").toLowerCase()))
    .reduce((acc, row) => acc + Number(row.amount ?? 0), 0);

  const nextPaymentDisplay = (() => {
    if (nextScheduleEntry) {
      const parts: string[] = [];
      const datePart = formatShortDate(nextScheduleEntry.due_date);
      if (datePart !== "—") {
        parts.push(datePart);
      }
      if (nextScheduleEntry.amount != null) {
        parts.push(formatCurrency(nextScheduleEntry.amount));
      }
      return parts.length > 0 ? parts.join(" • ") : "—";
    }
    if (dealRow.first_payment_date) {
      return formatShortDate(dealRow.first_payment_date);
    }
    return "—";
  })();

  const outstandingAmountDisplay =
    outstandingAmount > 0
      ? formatCurrency(outstandingAmount)
      : formatCurrency(dealRow.principal_amount ?? dealRow.total_amount ?? null);

  // Загружаем реальные документы с подписанными URL
  const documents = await Promise.all(
    (dealRow.deal_documents || []).map(async (doc: SupabaseDealDocument) => {
      const signedUrl = doc.storage_path
        ? await createSignedStorageUrl({ bucket: "deal-documents", path: doc.storage_path })
        : null;
      const rawDocumentType = typeof doc.document_type === "string" ? doc.document_type : null;
      const normalizedDocumentType = normalizeDealDocumentType(rawDocumentType ?? undefined);
      const resolvedDocumentType = normalizedDocumentType ?? (rawDocumentType ? rawDocumentType.trim() : null);
      const typeLabel = getDealDocumentLabel(rawDocumentType ?? undefined);
      const title = (() => {
        const explicit = typeof doc.title === "string" ? doc.title.trim() : "";
        if (explicit.length > 0) {
          return doc.title as string;
        }
        if (typeLabel) {
          return typeLabel;
        }
        if (resolvedDocumentType) {
          return resolvedDocumentType
            .replace(/[_\.]+/g, " ")
            .split(" ")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
        }
        return "Document";
      })();
      const normalizedTitle = title.toLowerCase();
      const normalizedType = (resolvedDocumentType ?? "").toLowerCase();
      const categoryCandidate = typeof doc.document_category === "string" ? doc.document_category.toLowerCase() : null;
      let category: "required" | "signature" | "archived" | "other";
      if (categoryCandidate && ["required", "signature", "archived", "other"].includes(categoryCandidate)) {
        category = categoryCandidate as "required" | "signature" | "archived" | "other";
      } else if (
        normalizedType.includes("sign") ||
        normalizedTitle.includes("signature") ||
        normalizedTitle.includes("подпис")
      ) {
        category = "signature";
      } else if (
        normalizedType.includes("archive") ||
        normalizedTitle.includes("archive") ||
        normalizedTitle.includes("архив")
      ) {
        category = "archived";
      } else if (
        normalizedType.includes("invoice") ||
        normalizedTitle.includes("invoice") ||
        normalizedTitle.includes("инвойс")
      ) {
        category = "other";
      } else if (
        normalizedType.includes("statement") ||
        normalizedTitle.includes("statement")
      ) {
        category = "other";
      } else if (
        normalizedType.includes("other") ||
        normalizedTitle.includes("other") ||
        normalizedTitle.includes("проч")
      ) {
        category = "other";
      } else {
        category = "required";
      }

      const signaturePattern = /(\d+)\s*\/*\s*(из|from)?\s*(\d+)/i;
      let signaturesCollected: number | null = null;
      let signaturesRequired: number | null = null;
      const signatureMatch = title.match(signaturePattern);
      if (signatureMatch) {
        signaturesCollected = Number(signatureMatch[1]);
        signaturesRequired = Number(signatureMatch[3]);
      } else if (category === "signature") {
        signaturesCollected = normalizedTitle.includes("signed") ? 2 : 0;
        signaturesRequired = 2;
      }

      const createdAtIso = doc.uploaded_at ?? doc.created_at ?? null;
      const signedAtIso = doc.signed_at ?? null;
      const statusRaw = typeof doc.status === "string" ? doc.status.trim() : null;

      const formatRuDate = (iso: string | null) => {
        if (!iso) return null;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
          return null;
        }
        return date.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      };

      const signedDate = formatRuDate(signedAtIso);
      const uploadedDate = formatRuDate(createdAtIso);
      const normalizeStatus = (value: string) =>
        value
          .split(/[_\s]+/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(" ");

      const statusDictionary: Record<string, string> = {
        signed: "Подписано",
        pending_signature: "Ожидает подписи",
        pending: "В ожидании",
        recorded: "Зафиксировано",
        active: "Активно",
        uploaded: "Загружено",
        archived: "В архиве",
      };

      const statusLabel = (() => {
        if (!statusRaw) return null;
        const key = statusRaw.toLowerCase();
        if (statusDictionary[key]) {
          return statusDictionary[key];
        }
        return normalizeStatus(statusRaw);
      })();

      const timelineDate = signedDate ?? uploadedDate ?? null;

      let statusDisplay: string;
      if (statusLabel && timelineDate) {
        statusDisplay = `${statusLabel} • ${timelineDate}`;
      } else if (statusLabel) {
        statusDisplay = statusLabel;
      } else if (signedDate) {
        statusDisplay = `Подписано • ${signedDate}`;
      } else if (uploadedDate) {
        statusDisplay = `Загружено • ${uploadedDate}`;
      } else {
        statusDisplay = "Загружено";
      }

      return {
        id: doc.id,
        title,
        status: statusDisplay,
        rawStatus: statusRaw,
        url: signedUrl,
        documentType: resolvedDocumentType,
        category,
        signaturesCollected,
        signaturesRequired,
        uploadedAt: createdAtIso,
        signedAt: signedAtIso,
      };
    })
  );

  // Загружаем реальные инвойсы
  const { data: invoicesData } = await supabase
    .from("invoices")
    .select("id, invoice_number, type, amount, due_date, status, created_at")
    .eq("deal_id", dealRow.id)
    .order("created_at", { ascending: false });

  const invoices = (invoicesData || []).map((invoice: SupabaseInvoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoice_number || `INV-${invoice.id.slice(-6)}`,
    type: invoice.type || "Payment",
    totalAmount: `AED ${Number(invoice.amount || 0).toLocaleString("en-US")}`,
    dueDate: `Due ${new Date(invoice.due_date || new Date()).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })}`,
    status: invoice.status || "Pending",
  }));

  const guardStatuses = await buildDetailGuardStatuses(
    statusKey,
    dealRow.payload,
    dealRow.deal_documents ?? [],
  );

  const { data: tasksData, error: tasksError } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("deal_id", dealRow.id)
    .order("created_at", { ascending: true });

  if (tasksError) {
    console.error("[SERVER-OPS] failed to load deal tasks", tasksError);
  }

  const allDealTasks = (tasksData ?? []).map(mapTaskRow);
  const stageTasks = allDealTasks.filter((task) => task.workflowStageKey === statusKey);
  const workflowTasks = buildDealWorkflowTasks({
    statusKey,
    tasks: stageTasks,
    guardStatuses,
  });

  const timeline = buildTimelineEvents({
    createdAt: dealRow.created_at,
    updatedAt: dealRow.updated_at,
    payload: dealRow.payload,
    guardStatuses,
    statusKey,
  });

  const vehicleRelation = dealRow.vehicles;
  const vehicleArray: SupabaseVehicleData[] = Array.isArray(vehicleRelation)
    ? (vehicleRelation as SupabaseVehicleData[])
    : vehicleRelation && typeof vehicleRelation === "object"
      ? [(vehicleRelation as SupabaseVehicleData)]
      : [];
  const vehicleData = vehicleArray[0] ?? null;
  const vehicleName = (() => {
    const parts = [vehicleData?.make, vehicleData?.model, vehicleData?.variant]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter((part) => part.length > 0);
    return parts.length > 0 ? parts.join(" ") : null;
  })();

  const rawImages = Array.isArray(vehicleData?.vehicle_images) ? vehicleData.vehicle_images : [];
  const sortedImages = [...rawImages].sort(
    (a, b) => (a?.sort_order ?? Number.MAX_SAFE_INTEGER) - (b?.sort_order ?? Number.MAX_SAFE_INTEGER),
  );
  const galleryEntries = await Promise.all(
    sortedImages.map(async (img, index) => {
      if (!img || typeof img.storage_path !== "string" || img.storage_path.length === 0) {
        return {
          id: img?.id ?? `vehicle-image-${index}`,
          url: null,
          label: img?.label ?? null,
          isPrimary: Boolean(img?.is_primary),
        };
      }
      const url = await createSignedStorageUrl({ bucket: "vehicle-images", path: img.storage_path });
      return {
        id: img.id ?? `vehicle-image-${index}`,
        url,
        label: img.label ?? null,
        isPrimary: Boolean(img.is_primary),
      };
    }),
  );
  const vehicleGallery = galleryEntries.filter((entry) => entry.url);
  const primaryGalleryImage =
    vehicleGallery.find((img) => img?.isPrimary && img?.url) ??
    vehicleGallery.find((img) => img?.url) ??
    null;
  const imageUrl = primaryGalleryImage?.url ?? "/assets/vehicle-placeholder.svg";

  const profileMetadata = (clientData?.metadata as Record<string, unknown> | null) ?? null;
  const metadataEmailCandidates = ["ops_email", "work_email", "email"];
  const metadataEmail =
    metadataEmailCandidates
      .map((key) => profileMetadata?.[key])
      .find((value): value is string => typeof value === "string" && value.includes("@")) ?? null;

  const resolvedClientName =
    clientData?.full_name ??
    (typeof authUser?.user?.user_metadata?.full_name === "string"
      ? authUser.user.user_metadata.full_name
      : null);
  const resolvedClientPhone = clientData?.phone ?? null;
  const resolvedClientEmail = metadataEmail ?? authUser?.user?.email ?? "—";
  const profileSourceRaw = typeof clientData?.source === "string" ? clientData.source : null;
  const profileSource = profileSourceRaw ? profileSourceRaw.trim() : "";
  const payloadSourceCandidates = [
    getString(dealRow.payload?.["source_label"]),
    getString(dealRow.payload?.source),
  ];
  const payloadSource =
    payloadSourceCandidates.find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ) ?? null;
  const resolvedClientSource =
    profileSource.length > 0 ? profileSource : payloadSource ?? "—";

  const clientNotesParts: string[] = [];
  if (clientData?.status) {
    clientNotesParts.push(`Статус: ${clientData.status}`);
  }
  if (clientData?.nationality) {
    clientNotesParts.push(`Гражданство: ${clientData.nationality}`);
  }
  // contact-specific notes removed; rely on client profile only

  const scoringValue = resolveScore(applicationScoringData?.scoring_results);
  const scoringDisplay =
    scoringValue != null ? `${Math.round(scoringValue)}/100` : "—";

  const clientSlug = clientId ? buildSlugWithId(resolvedClientName ?? null, clientId) : null;

  const clientDetailHref =
    clientSlug && clientSlug.length
      ? `/ops/clients/${clientSlug}`
      : clientId
        ? `/ops/clients/${clientId}`
        : null;

  const clientProfile: DealDetailResult["client"] = {
    name: resolvedClientName ?? "—",
    phone: resolvedClientPhone ?? "—",
    email: resolvedClientEmail,
    scoring: scoringDisplay,
    source: resolvedClientSource,
    notes: clientNotesParts.length > 0 ? clientNotesParts.join(" • ") : "—",
    userId: clientId,
    detailHref: clientDetailHref,
  };

  logOpsDealDetailDebug(`[DEBUG] Final client profile:`, {
    name: clientProfile.name,
    phone: clientProfile.phone,
    email: clientProfile.email,
    scoring: clientProfile.scoring,
    source: clientProfile.source,
    notes: clientProfile.notes,
  });

  const profileDescription = resolvedClientName ? `Клиент: ${resolvedClientName}` : "Клиент не указан";
  const vehicleId = vehicleData?.id ?? null;
  const vehicleDetailSlug = vehicleId ? buildSlugWithId(vehicleName, vehicleId) || vehicleId : null;

  const sellerDocumentCandidates = collectSellerDocumentCandidates(
    dealRow.payload?.["seller_documents"],
    dealRow.payload?.["sellerDocuments"],
    dealRow.payload?.["supplier_documents"],
    dealRow.payload?.["supplierDocuments"],
    workflowAssetMeta?.["seller_documents"],
    workflowAssetMeta?.["sellerDocuments"],
  );
  const sellerDocuments: OpsSellerDocument[] = await buildSellerDocumentList(sellerDocumentCandidates);

  const profile: DealDetailResult["profile"] = {
    dealId:
      dealRow.deal_number ?? fallbackDealNumber,
    vehicleName: vehicleName ?? "Автомобиль не выбран",
    status: statusKey,
    description: profileDescription,
    image: imageUrl,
    gallery: vehicleGallery.length > 0 ? vehicleGallery : undefined,
    monthlyPayment: formatCurrency(dealRow.monthly_payment),
    nextPayment: nextPaymentDisplay,
    dueAmount: outstandingAmountDisplay,
    vehicleId,
    vehicleHref: vehicleDetailSlug ? `/ops/cars/${vehicleDetailSlug}` : null,
  };

  // Формируем ключевую информацию об автомобиле
  const rawKeyInformation: DealDetailResult["keyInformation"] = [
    { label: "VIN", value: vehicleData?.vin ?? "—" },
    {
      label: "Производитель",
      value: vehicleData?.make ?? "—",
    },
    {
      label: "Модель",
      value: vehicleData?.model ?? "—",
    },
    {
      label: "Год выпуска",
      value: vehicleData?.year != null ? vehicleData.year.toString() : "—",
    },
    {
      label: "Пробег",
      value:
        vehicleData?.mileage != null
          ? `${Number(vehicleData.mileage).toLocaleString("en-US")} км`
          : "—",
    },
    {
      label: "Кузов",
      value: vehicleData?.body_type ?? "—",
    },
    {
      label: "Топливо",
      value: vehicleData?.fuel_type ?? "—",
    },
    {
      label: "Трансмиссия",
      value: vehicleData?.transmission ?? "—",
    },
    {
      label: "Цвет (экст.)",
      value: vehicleData?.color_exterior ?? "—",
    },
    {
      label: "Цвет (инт.)",
      value: vehicleData?.color_interior ?? "—",
    },
    {
      label: "Срок договора",
      value: dealRow.term_months != null ? `${dealRow.term_months} мес.` : "—",
    },
    {
      label: "Первая оплата",
      value: formatShortDate(dealRow.first_payment_date),
    },
    {
      label: "Старт договора",
      value: formatDate(dealRow.contract_start_date),
    },
    {
      label: "Окончание договора",
      value: formatDate(dealRow.contract_end_date),
    },
  ];

  const keyInformation = rawKeyInformation.filter((entry) => entry.value && entry.value !== "—");

  // Формируем обзор сделки
  const overview: DealDetailResult["overview"] = [
    {
      label: "Created at",
      value: formatDateTime(dealRow.created_at),
    },
    {
      label: "Company",
      value: `${dealCompany.name} (${dealCompany.prefix})`,
    },
    {
      label: "Deal Number",
      value: dealRow.deal_number || fallbackDealNumber,
    },
    {
      label: "Last status update",
      value: formatDateTime(dealRow.updated_at),
    },
  ];

  const accountManagerProfileEntry = dealRow.assigned_account_manager
    ? managerProfiles.find((profile) => profile.user_id === dealRow.assigned_account_manager) ?? null
    : null;
  const operationsManagerProfileEntry = dealRow.op_manager_id
    ? managerProfiles.find((profile) => profile.user_id === dealRow.op_manager_id) ?? null
    : null;

  const formatProfileValue = (
    id: string | null,
    profile: { full_name: string | null; status: string | null } | null,
  ): string => {
    if (!id) {
      return "—";
    }
    const parts: string[] = [];
    if (profile?.full_name && profile.full_name.trim().length > 0) {
      parts.push(profile.full_name.trim());
    }
    parts.push(id);
    if (profile?.status) {
      parts.push(`статус: ${profile.status}`);
    }
    return parts.join(" • ");
  };

  const financials: OpsDealDetailsEntry[] = [
    { label: "Principal amount", value: formatCurrency(dealRow.principal_amount) },
    { label: "Total amount", value: formatCurrency(dealRow.total_amount) },
    { label: "Monthly payment", value: formatCurrency(dealRow.monthly_payment) },
    { label: "Monthly lease rate", value: formatRate(dealRow.monthly_lease_rate) },
    { label: "Interest rate", value: formatRate(dealRow.interest_rate) },
    { label: "Down payment", value: formatCurrency(dealRow.down_payment_amount) },
    { label: "Security deposit", value: formatCurrency(dealRow.security_deposit) },
    { label: "Processing fee", value: formatCurrency(dealRow.processing_fee) },
    { label: "Outstanding amount", value: outstandingAmountDisplay },
  ];

  const contractDetails: OpsDealDetailsEntry[] = [
    {
      label: "Term (months)",
      value: dealRow.term_months != null ? `${dealRow.term_months}` : "—",
    },
    {
      label: "Contract start",
      value: formatDate(dealRow.contract_start_date),
    },
    {
      label: "Contract end",
      value: formatDate(dealRow.contract_end_date),
    },
    {
      label: "First payment date",
      value: formatDate(dealRow.first_payment_date),
    },
    {
      label: "Completed at",
      value: formatDateTime(dealRow.completed_at),
    },
    {
      label: "Created at",
      value: formatDateTime(dealRow.created_at),
    },
    {
      label: "Updated at",
      value: formatDateTime(dealRow.updated_at),
    },
  ];

  const workflowMeta: OpsDealDetailsEntry[] = [
    { label: "Application ID", value: dealRow.application_id ?? "—" },
    { label: "Workflow ID", value: dealRow.workflow_id ?? "—" },
    { label: "Workflow version ID", value: dealRow.workflow_version_id ?? "—" },
    {
      label: "Account manager",
      value: formatProfileValue(dealRow.assigned_account_manager, accountManagerProfileEntry),
    },
    {
      label: "Operations manager",
      value: formatProfileValue(dealRow.op_manager_id, operationsManagerProfileEntry),
    },
    { label: "Workflow asset ID", value: dealRow.asset_id ?? "—" },
    { label: "Client source", value: clientProfile.source ?? "—" },
    {
      label: "Source (payload)",
      value:
        getString(dealRow.payload?.["source_label"]) ??
        getString(dealRow.payload?.source) ??
        "—",
    },
  ];

  const paymentScheduleEntries: OpsDealDetailsEntry[] = paymentScheduleRows.map((row, index) => {
    const parts: string[] = [];
    const dueDate = formatShortDate(row.due_date);
    if (dueDate !== "—") {
      parts.push(dueDate);
    }
    const amount = formatCurrency(row.amount ?? null);
    if (amount !== "—") {
      parts.push(amount);
    }
    const status = row.status ? row.status.toString() : null;
    if (status) {
      parts.push(status);
    }
    return {
      label: `Платёж #${index + 1}`,
      value: parts.length > 0 ? parts.join(" • ") : "—",
    };
  });

  const relatedEntities: OpsDealRelatedSection[] = [];

  if (applicationRecord) {
    relatedEntities.push({
      label: "Заявка",
      entries: [
        { label: "ID", value: applicationRecord.id },
        { label: "Номер заявки", value: applicationRecord.application_number ?? "—" },
        { label: "Статус", value: applicationRecord.status ?? "—" },
        { label: "Подана", value: formatDateTime(applicationRecord.submitted_at) },
        { label: "Создана", value: formatDateTime(applicationRecord.created_at) },
        { label: "Обновлена", value: formatDateTime(applicationRecord.updated_at) },
      ],
    });
  }

  if (workflowVersion) {
    relatedEntities.push({
      label: "Workflow версия",
      entries: [
        { label: "ID", value: workflowVersion.id },
        { label: "Workflow", value: workflowVersion.workflow_id ?? "—" },
        { label: "Версия", value: workflowVersion.version ?? "—" },
        { label: "Название", value: workflowVersion.title ?? "—" },
        { label: "Описание", value: workflowVersion.description ?? "—" },
        {
          label: "Активна",
          value:
            workflowVersion.is_active == null
              ? "—"
              : workflowVersion.is_active
                ? "Да"
                : "Нет",
        },
        { label: "Создана", value: formatDateTime(workflowVersion.created_at) },
      ],
    });
  }

  if (workflowAsset) {
    relatedEntities.push({
      label: "Workflow актив",
      entries: [
        { label: "ID", value: workflowAsset.id },
        { label: "Тип", value: workflowAsset.type ?? "—" },
        { label: "VIN", value: workflowAsset.vin ?? "—" },
        { label: "Марка", value: workflowAsset.make ?? "—" },
        { label: "Модель", value: workflowAsset.model ?? "—" },
        { label: "Комплектация", value: workflowAsset.trim ?? "—" },
        {
          label: "Год",
          value: workflowAsset.year != null ? workflowAsset.year.toString() : "—",
        },
        { label: "Поставщик", value: workflowAsset.supplier ?? "—" },
        { label: "Цена", value: formatCurrency(workflowAsset.price ?? null) },
        { label: "Создан", value: formatDateTime(workflowAsset.created_at) },
      ],
    });
  }

  if (accountManagerProfileEntry || operationsManagerProfileEntry) {
    relatedEntities.push({
      label: "Команда сделки",
      entries: [
        {
          label: "Аккаунт-менеджер",
          value: formatProfileValue(dealRow.assigned_account_manager, accountManagerProfileEntry),
        },
        {
          label: "Операционный менеджер",
          value: formatProfileValue(dealRow.op_manager_id, operationsManagerProfileEntry),
        },
      ],
    });
  }

  const { info: insuranceInfo, editDefaults: insuranceEditDefaults } = resolveInsuranceDetails(
    dealRow.insurance_details,
  );

  const structuredData: OpsDealDetailJsonBlock[] = [];

  const contractTermsData = formatJsonObject(dealRow.contract_terms);
  structuredData.push({
    label: "Contract terms",
    json: contractTermsData.formatted,
    isEmpty: contractTermsData.isEmpty,
  });

  const insuranceDetailsData = formatJsonObject(dealRow.insurance_details);
  structuredData.push({
    label: "Insurance details",
    json: insuranceDetailsData.formatted,
    isEmpty: insuranceDetailsData.isEmpty,
  });

  const payloadData = formatJsonObject(dealRow.payload);
  structuredData.push({
    label: "Deal payload",
    json: payloadData.formatted,
    isEmpty: payloadData.isEmpty,
  });

  const workflowAssetMetaData = formatJsonObject(workflowAssetMeta);
  structuredData.push({
    label: "Workflow asset meta",
    json: workflowAssetMetaData.formatted,
    isEmpty: workflowAssetMetaData.isEmpty,
  });

  const clientMetadataData = formatJsonObject(profileMetadata);
  structuredData.push({
    label: "Client metadata",
    json: clientMetadataData.formatted,
    isEmpty: clientMetadataData.isEmpty,
  });

  const editDefaults: OpsDealEditDefaults = {
    dealNumber: dealRow.deal_number ?? fallbackDealNumber,
    statusKey,
    companyCode: dealCompany.code,
    principalAmount: getNumber(dealRow.principal_amount),
    totalAmount: getNumber(dealRow.total_amount),
    monthlyPayment: getNumber(dealRow.monthly_payment),
    monthlyLeaseRate: getNumber(dealRow.monthly_lease_rate),
    interestRate: getNumber(dealRow.interest_rate),
    downPaymentAmount: getNumber(dealRow.down_payment_amount),
    securityDeposit: getNumber(dealRow.security_deposit),
    processingFee: getNumber(dealRow.processing_fee),
    termMonths:
      typeof dealRow.term_months === "number"
        ? dealRow.term_months
        : getNumber(dealRow.term_months) ?? null,
    contractStartDate: getString(dealRow.contract_start_date),
    contractEndDate: getString(dealRow.contract_end_date),
    firstPaymentDate: getString(dealRow.first_payment_date),
    completedAt: getString(dealRow.completed_at),
    insurance: insuranceEditDefaults,
  };

  const canonicalDealSlug =
    buildSlugWithId(
      dealRow.deal_number ?? fallbackDealNumber,
      dealRow.id,
    ) || dealRow.id;

  const outboundSlug = canonicalDealSlug;

  return {
    slug: outboundSlug,
    dealUuid: dealRow.id,
    statusKey,
    guardStatuses,
    workflowTasks,
    tasks: allDealTasks,
    profile,
    company: dealCompany,
    client: clientProfile,
    keyInformation,
    overview,
    financials,
    contract: contractDetails,
    workflowMeta,
    relatedEntities,
    structuredData,
    paymentSchedule: paymentScheduleEntries,
    editDefaults,
    clientDocuments,
    documents,
    sellerDocuments,
    invoices,
    timeline,
    insurance: insuranceInfo,
  };
}

// Функция для загрузки деталей автомобиля
export async function getOperationsCarDetail(slug: string): Promise<CarDetailResult | null> {
  console.log(`[SERVER-OPS] getOperationsCarDetail called with slug: "${slug}"`);

  const trimmedSlug = (slug ?? "").trim();
  const { id: extractedUuid, slug: slugWithoutId } = extractIdFromSlug(trimmedSlug);
  const normalizedSlug = toSlug(slugWithoutId || trimmedSlug);
  console.log(`[SERVER-OPS] normalized slug: "${normalizedSlug}"`);

  const supabase = await createSupabaseServerClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  console.log(`[SERVER-OPS] user authenticated:`, !!userData?.user, `error:`, userError);

  const { data: vehiclesLookup, error: lookupError } = await supabase
    .from("vehicles")
    .select("id, vin, make, model");

  if (lookupError) {
    console.error("[SERVER-OPS] failed to load vehicle list for slug matching", lookupError);
    return null;
  }

  const uuidCandidate =
    extractedUuid && z.string().uuid().safeParse(extractedUuid).success ? extractedUuid : null;

  let matchedVehicle =
    uuidCandidate && vehiclesLookup?.find((vehicle) => vehicle.id === uuidCandidate);

  if (!matchedVehicle) {
    matchedVehicle = vehiclesLookup?.find((vehicle) => {
      if (uuidCandidate && vehicle.id === uuidCandidate) {
        return true;
      }

      const combinedSlug = toSlug(`${vehicle.make || ""} ${vehicle.model || ""}`);
      const vinSlug = toSlug(vehicle.vin || "");
      const makeSlug = toSlug(vehicle.make || "");
      const modelSlug = toSlug(vehicle.model || "");

      return (
        (normalizedSlug.length > 0 && combinedSlug === normalizedSlug) ||
        (normalizedSlug.length > 0 && vinSlug === normalizedSlug) ||
        (normalizedSlug.length > 0 && makeSlug === normalizedSlug) ||
        (normalizedSlug.length > 0 && modelSlug === normalizedSlug)
      );
    });
  }

  if (!matchedVehicle) {
    console.log(`[SERVER-OPS] no vehicle found for slug: "${slug}"`);
    return null;
  }

  console.log(`[SERVER-OPS] matched vehicle id:`, matchedVehicle.id);

  const { data: vehicleDetail, error: detailError } = await supabase
    .from("vehicles")
    .select(
      `
        id,
        vin,
        license_plate,
        make,
        model,
        variant,
        year,
        body_type,
        fuel_type,
        transmission,
        engine_capacity,
        mileage,
        color_exterior,
        color_interior,
        status,
        features,
        created_at,
        updated_at,
        vehicle_images(id, storage_path, label, is_primary, sort_order),
        vehicle_specifications(id, category, spec_key, spec_value, unit, sort_order),
        vehicle_services(id, deal_id, service_type, title, description, due_date, mileage_target, status, completed_at, attachments, created_at, updated_at),
        vehicle_documents(id, document_type, title, status, storage_path, mime_type, file_size, uploaded_at, metadata),
        deals:deals!deals_vehicle_id_fkey (
          id,
          deal_number,
          status,
          client_id,
          assigned_account_manager,
          created_at,
          updated_at,
          monthly_payment,
          monthly_lease_rate,
          principal_amount,
          total_amount,
          term_months,
          contract_start_date,
          contract_end_date,
          first_payment_date,
          insurance_details,
          source,
          deal_documents(id, title, document_type, status, storage_path, signed_at, created_at, document_category, metadata, mime_type, file_size, uploaded_at, uploaded_by)
        )
      `,
    )
    .eq("id", matchedVehicle.id)
    .maybeSingle();

  if (detailError) {
    console.error("[SERVER-OPS] failed to load vehicle detail", detailError);
    return null;
  }

  if (!vehicleDetail) {
    console.warn("[SERVER-OPS] vehicle detail not found after lookup", { id: matchedVehicle.id });
    return null;
  }

  type JsonRecord = Record<string, unknown>;

  const toneStyles: Record<string, OpsTone> = {
    draft: "muted",
    available: "success",
    reserved: "warning",
    leased: "info",
    maintenance: "warning",
    retired: "danger",
  };

  const vehicleStatusLabel = (() => {
    const status = typeof vehicleDetail.status === "string" ? vehicleDetail.status : "";
    switch (status) {
      case "draft":
        return "Черновик";
      case "available":
        return "Доступен";
      case "reserved":
        return "Зарезервирован";
      case "leased":
        return "В лизинге";
      case "maintenance":
        return "На обслуживании";
      case "retired":
        return "Списан";
      default:
        if (!status) {
          return "Не указан";
        }
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  })();

  const vehicleDisplayName = `${vehicleDetail.make ?? ""} ${vehicleDetail.model ?? ""}`.trim() || null;

  const formatNumber = (value: number | null | undefined, options?: Intl.NumberFormatOptions): string => {
    if (value == null || Number.isNaN(Number(value))) {
      return "—";
    }
    return Number(value).toLocaleString("ru-RU", options);
  };

  const formatMileage = (value: number | null | undefined): string => {
    if (value == null || Number.isNaN(Number(value))) {
      return "—";
    }
    return `${formatNumber(value)} км`;
  };

  type GalleryEntry = { id: string; url: string | null; label: string | null; isPrimary: boolean };
  const rawImages = Array.isArray(vehicleDetail.vehicle_images) ? vehicleDetail.vehicle_images : [];
  const sortedImages = [...rawImages].sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0));
  const galleryEntries = await Promise.all(
    sortedImages.map(async (image, index) => {
      if (!image) {
        return null;
      }
      const path = typeof image.storage_path === "string" ? image.storage_path : null;
      const url = path ? await createSignedStorageUrl({ bucket: "vehicle-images", path }) : null;
      return {
        id: image.id ?? `vehicle-image-${index}`,
        url,
        label: image.label ?? null,
        isPrimary: Boolean(image.is_primary),
      } as GalleryEntry;
    }),
  );
  const gallery = galleryEntries.filter((item): item is GalleryEntry => item !== null);
  const primaryGalleryImage = gallery.find((image) => image.isPrimary && image.url)
    ?? gallery.find((image) => image.url)
    ?? null;
  const imageUrl = primaryGalleryImage?.url ?? "/assets/vehicle-placeholder.svg";

  const rawFeatureList = (() => {
    const raw = vehicleDetail.features;
    if (!raw) {
      return [] as string[];
    }
    if (Array.isArray(raw)) {
      return raw
        .map((item) => (typeof item === "string" ? item.trim() : String(item)))
        .filter((value) => value.length > 0);
    }
    if (typeof raw === "object") {
      return Object.entries(raw as JsonRecord)
        .map(([key, value]) => {
          if (value == null) {
            return null;
          }
          const label = humanizeKey(key);
          if (typeof value === "object") {
            return `${label}: ${JSON.stringify(value)}`;
          }
          return `${label}: ${String(value)}`;
        })
        .filter((entry): entry is string => Boolean(entry));
    }
    return [String(raw)];
  })();

  const licensePlateFromFeatures = (() => {
    for (const entry of rawFeatureList) {
      const match = entry.match(/license\s*plate\s*[:\-–]?\s*(.+)/i);
      if (match?.[1]) {
        const value = match[1].trim();
        if (value.length > 0) {
          return value;
        }
      }
    }
    return null;
  })();

  const licensePlateColumn = getString((vehicleDetail as { license_plate?: unknown })?.license_plate);
  const licensePlateSource = licensePlateColumn ?? licensePlateFromFeatures;
  const licensePlateDisplay = (() => {
    const value = typeof licensePlateSource === "string" ? licensePlateSource.trim() : null;
    return value && value.length > 0 ? value : null;
  })();

  const featureList = rawFeatureList.filter((entry) => !/^license\s*plate\b/i.test(entry));

  const generalSpecs = [
    { label: "Статус", value: vehicleStatusLabel },
    { label: "VIN", value: vehicleDetail.vin ?? "—" },
    { label: "Госномер", value: licensePlateDisplay ?? "—" },
    { label: "Марка", value: vehicleDetail.make ?? "—" },
    { label: "Модель", value: vehicleDetail.model ?? "—" },
    { label: "Комплектация", value: vehicleDetail.variant ?? "—" },
    { label: "Год выпуска", value: vehicleDetail.year ? `${vehicleDetail.year}` : "—" },
    { label: "Тип кузова", value: vehicleDetail.body_type ?? "—" },
    { label: "Тип топлива", value: vehicleDetail.fuel_type ?? "—" },
    { label: "Трансмиссия", value: vehicleDetail.transmission ?? "—" },
    { label: "Пробег", value: formatMileage(vehicleDetail.mileage) },
    { label: "Цвет кузова", value: vehicleDetail.color_exterior ?? "—" },
    { label: "Цвет салона", value: vehicleDetail.color_interior ?? "—" },
    {
      label: "Объём двигателя",
      value: vehicleDetail.engine_capacity != null
        ? formatNumber(vehicleDetail.engine_capacity, { maximumFractionDigits: 2 })
        : "—",
    },
  ];

  const lifecycleSpecs = [
    { label: "Создано", value: formatDateTime(vehicleDetail.created_at) },
    { label: "Обновлено", value: formatDateTime(vehicleDetail.updated_at) },
  ];

  const specificationGroups = (() => {
    const specifications = Array.isArray(vehicleDetail.vehicle_specifications)
      ? vehicleDetail.vehicle_specifications
      : [];
    const groups = new Map<string, Array<{ label: string; value: string }>>();
    for (const spec of specifications) {
      if (!spec) continue;
      const category = spec.category || "Дополнительные параметры";
      const label = spec.spec_key ? humanizeKey(spec.spec_key) : "Параметр";
      const valueBody = [spec.spec_value, spec.unit].filter(Boolean).join(" ").trim();
      const value = valueBody.length > 0 ? valueBody : "—";
      const existing = groups.get(category) ?? [];
      existing.push({ label, value });
      groups.set(category, existing);
    }
    return Array.from(groups.entries()).map(([title, specs]) => ({
      title,
      specs: specs.sort((a, b) => a.label.localeCompare(b.label, "ru")),
    }));
  })();

  const specGroups: Array<{ title: string; specs: Array<{ label: string; value: string }> }> = [];
  specGroups.push({ title: "Основная информация", specs: generalSpecs });
  if (specificationGroups.length > 0) {
    specGroups.push(...specificationGroups);
  }
  specGroups.push({ title: "Учёт", specs: lifecycleSpecs });

  type SupabaseVehicleDealRow = {
    id: string;
    deal_number: string | null;
    status: string | null;
    client_id: string | null;
    assigned_account_manager: string | null;
    created_at: string | null;
    updated_at: string | null;
    monthly_payment: number | null;
    monthly_lease_rate: number | null;
    principal_amount: number | null;
    total_amount: number | null;
    term_months: number | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
    first_payment_date: string | null;
    source: string | null;
    insurance_details?: Record<string, unknown> | null;
    deal_documents:
      | Array<{
          id: string | null;
          title: string | null;
          document_type: string | null;
          status: string | null;
          storage_path: string | null;
          signed_at: string | null;
          created_at: string | null;
          document_category?: string | null;
          metadata?: unknown;
          mime_type?: string | null;
          file_size?: number | null;
          uploaded_at?: string | null;
          uploaded_by?: string | null;
        }>
      | null;
  };

  const deals = (Array.isArray(vehicleDetail.deals) ? vehicleDetail.deals : []) as SupabaseVehicleDealRow[];

  const dealById = new Map<string, SupabaseVehicleDealRow>();
  for (const deal of deals) {
    if (deal?.id) {
      dealById.set(String(deal.id), deal);
    }
  }

  const dealIds = deals
    .map((deal) => getString(deal?.id))
    .filter((value): value is string => Boolean(value));
  const uniqueClientIds = Array.from(
    new Set(
      deals
        .map((deal) => getString(deal?.client_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const uniqueManagerIds = Array.from(
    new Set(
      deals
        .map((deal) => getString(deal?.assigned_account_manager))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const profileLookupIds = Array.from(new Set([...uniqueClientIds, ...uniqueManagerIds]));
  const clientIdSet = new Set(uniqueClientIds);
  const managerIdSet = new Set(uniqueManagerIds);

  let profileRows: Array<{ user_id: string; full_name: string | null; phone: string | null }> = [];
  if (profileLookupIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", profileLookupIds);

    if (profileError) {
      console.error("[SERVER-OPS] failed to load profiles for vehicle deals", profileError);
    } else {
      profileRows = (profileData ?? []) as Array<{
        user_id: string;
        full_name: string | null;
        phone: string | null;
      }>;
    }
  }

  type VehicleScheduleRow = {
    id: string;
    deal_id: string | null;
    due_date: string | null;
    amount: number | null;
    status: string | null;
  };

  let scheduleRows: VehicleScheduleRow[] = [];
  if (dealIds.length > 0) {
    const { data: scheduleData, error: schedulesError } = await supabase
      .from("payment_schedules")
      .select("id, deal_id, due_date, amount, status")
      .in("deal_id", dealIds);

    if (schedulesError) {
      console.error("[SERVER-OPS] failed to load payment schedules for vehicle deals", schedulesError);
    } else {
      scheduleRows = (scheduleData ?? []) as VehicleScheduleRow[];
    }
  }

  const clientProfiles = new Map<string, { name: string | null; phone: string | null }>();
  const managerProfiles = new Map<string, { name: string | null; phone: string | null }>();

  for (const profile of profileRows) {
    const userId = getString(profile.user_id);
    if (!userId) continue;
    const name = getString(profile.full_name);
    const phone = getString(profile.phone);
    if (clientIdSet.has(userId)) {
      clientProfiles.set(userId, { name, phone });
    }
    if (managerIdSet.has(userId)) {
      managerProfiles.set(userId, { name, phone });
    }
  }

  const schedulesByDeal = scheduleRows.reduce<Map<string, VehicleScheduleRow[]>>((acc, schedule) => {
    const dealId = getString(schedule.deal_id);
    if (!dealId) {
      return acc;
    }
    const existing = acc.get(dealId) ?? [];
    existing.push(schedule);
    acc.set(dealId, existing);
    return acc;
  }, new Map());

  const ACTIVE_DEAL_STATUSES = new Set([
    "pending_activation",
    "active",
    "signing_funding",
  ]);

  const activeDealRow = deals.find((deal) =>
    ACTIVE_DEAL_STATUSES.has(String(deal?.status ?? "").toLowerCase()),
  );

  const activeDealMonthlyPaymentValue = activeDealRow?.monthly_payment != null
    ? Number(activeDealRow.monthly_payment)
    : null;
  const activeDealMonthlyRateValue = activeDealRow?.monthly_lease_rate != null
    ? Number(activeDealRow.monthly_lease_rate)
    : activeDealMonthlyPaymentValue;
  const activeDealStatusRaw = activeDealRow?.status ? String(activeDealRow.status) : null;
  const activeDealStatusMeta = activeDealStatusRaw
    ? OPS_DEAL_STATUS_META[activeDealStatusRaw] ?? { label: activeDealStatusRaw, tone: "muted" as OpsTone }
    : null;
  const activeDealSlug = activeDealRow
    ? toSlug((activeDealRow.deal_number as string) || (activeDealRow.id as string) || "")
    : null;

  const activeDeal = activeDealRow
    ? {
        id: String(activeDealRow.id ?? crypto.randomUUID()),
        number: activeDealRow.deal_number ?? null,
        status: activeDealStatusRaw,
        statusLabel: activeDealStatusMeta?.label ?? null,
        statusTone: activeDealStatusMeta?.tone ?? null,
        monthlyPayment: activeDealMonthlyPaymentValue != null ? formatCurrency(activeDealMonthlyPaymentValue) : null,
        monthlyPaymentValue: activeDealMonthlyPaymentValue,
        monthlyLeaseRate: activeDealMonthlyRateValue != null ? formatCurrency(activeDealMonthlyRateValue) : null,
        monthlyLeaseRateValue: activeDealMonthlyRateValue,
        href: activeDealSlug ? `/ops/deals/${activeDealSlug}` : null,
      }
    : null;

  const activeDealInsurance = activeDealRow
    ? resolveInsuranceDetails((activeDealRow as { insurance_details?: unknown }).insurance_details).info
    : null;

  const scheduleNow = new Date();
  scheduleNow.setHours(0, 0, 0, 0);

  const vehicleDeals: OpsVehicleDeal[] = deals.map((deal) => {
    const dealId = getString(deal.id) ?? crypto.randomUUID();
    const rawNumber = getString(deal.deal_number);
    const companyCode =
      toDealCompanyCode((deal as { company_code?: string | null }).company_code ?? null) ?? null;
    const dealNumber =
      rawNumber ??
      formatFallbackDealNumber({
        id: dealId,
        createdAt: getString(deal.created_at),
        prefix: getDealCompanyPrefix(companyCode),
      });
    const statusRaw = getString(deal.status);
    const statusKey = statusRaw ? statusRaw.toLowerCase() : null;
    const statusMeta = statusKey ? OPS_DEAL_STATUS_META[statusKey] ?? null : null;
    const statusLabel = statusMeta?.label ?? (statusRaw ? humanizeKey(statusRaw.replace(/[_\.]+/g, " ")) : null);
    const statusTone = statusMeta?.tone ?? null;

    const clientId = getString(deal.client_id);
    const clientProfile = clientId ? clientProfiles.get(clientId) ?? null : null;
    const clientName = clientProfile?.name ?? null;
    const clientPhone = clientProfile?.phone ?? null;
    const clientSlug = clientId ? buildSlugWithId(clientName ?? clientId, clientId) || clientId : null;

    const managerId = getString(deal.assigned_account_manager);
    const managerProfile = managerId ? managerProfiles.get(managerId) ?? null : null;
    const managerName = managerProfile?.name ?? null;

    const monthlyPaymentLabel =
      deal.monthly_payment != null ? formatCurrency(Number(deal.monthly_payment)) : null;
    const totalAmountLabel =
      deal.total_amount != null
        ? formatCurrency(Number(deal.total_amount))
        : deal.principal_amount != null
          ? formatCurrency(Number(deal.principal_amount))
          : null;
    const principalAmountLabel =
      deal.principal_amount != null ? formatCurrency(Number(deal.principal_amount)) : null;

    const contractStartLabel = formatShortDate(deal.contract_start_date);
    const contractEndLabel = formatShortDate(deal.contract_end_date);
    const firstPaymentLabel = formatShortDate(deal.first_payment_date);
    const contractPeriod = [
      contractStartLabel !== "—" ? contractStartLabel : null,
      contractEndLabel !== "—" ? contractEndLabel : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" → ") || null;

    const termLabel = deal.term_months != null ? `${deal.term_months} мес.` : null;

    const scheduleRowsForDeal = schedulesByDeal.get(dealId) ?? [];
    let nextPaymentDue: string | null = null;
    let overdueAmountValue: number | null = null;

    if (scheduleRowsForDeal.length > 0) {
      const upcoming = scheduleRowsForDeal
        .filter((schedule) => {
          const status = String(schedule.status ?? "").toLowerCase();
          return status !== "paid" && Boolean(schedule.due_date);
        })
        .map((schedule) => {
          if (!schedule.due_date) {
            return null;
          }
          const dueDate = new Date(schedule.due_date);
          if (Number.isNaN(dueDate.getTime())) {
            return null;
          }
          return { row: schedule, dueDate };
        })
        .filter((entry): entry is { row: VehicleScheduleRow; dueDate: Date } => entry !== null)
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      const nextEntry = upcoming.find((entry) => entry.dueDate.getTime() >= scheduleNow.getTime());
      if (nextEntry) {
        nextPaymentDue = formatShortDate(nextEntry.row.due_date);
      }

      const overdueEntries = upcoming.filter((entry) => entry.dueDate.getTime() < scheduleNow.getTime());
      if (overdueEntries.length > 0) {
        const sum = overdueEntries.reduce((acc, entry) => acc + (Number(entry.row.amount) || 0), 0);
        overdueAmountValue = sum > 0 ? sum : null;
      }
    }

    const overdueAmountLabel = overdueAmountValue != null ? formatCurrency(overdueAmountValue) : null;

    const dealSlug = buildSlugWithId(dealNumber, dealId) || dealId;

    return {
      id: dealId,
      dealNumber,
      status: statusRaw ?? null,
      statusLabel,
      statusTone,
      stageLabel: null,
      monthlyPayment: monthlyPaymentLabel,
      totalAmount: totalAmountLabel,
      principalAmount: principalAmountLabel,
      termMonths: deal.term_months ?? null,
      termLabel,
      contractPeriod,
      contractStartDate: contractStartLabel !== "—" ? contractStartLabel : null,
      contractEndDate: contractEndLabel !== "—" ? contractEndLabel : null,
      firstPaymentDate: firstPaymentLabel !== "—" ? firstPaymentLabel : null,
      nextPaymentDue: nextPaymentDue ?? null,
      overdueAmount: overdueAmountLabel,
      clientId,
      clientName,
      clientPhone,
      clientHref: clientSlug ? `/ops/clients/${clientSlug}` : null,
      managerId,
      managerName,
      href: dealSlug ? `/ops/deals/${dealSlug}` : null,
    } satisfies OpsVehicleDeal;
  });

  vehicleDeals.sort((a, b) => {
    const aStatus = String(a.status ?? "").toLowerCase();
    const bStatus = String(b.status ?? "").toLowerCase();
    if (aStatus === bStatus) {
      return (b.contractStartDate ?? "").localeCompare(a.contractStartDate ?? "");
    }
    if (aStatus === "active") return -1;
    if (bStatus === "active") return 1;
    return aStatus.localeCompare(bStatus);
  });

  const highlightCandidates = (
    [
      { label: "VIN", value: vehicleDetail.vin ?? "—" },
      { label: "Госномер", value: licensePlateDisplay ?? "—" },
      { label: "Год выпуска", value: vehicleDetail.year ? String(vehicleDetail.year) : "—" },
      { label: "Пробег", value: formatMileage(vehicleDetail.mileage) },
      ] satisfies VehicleHighlight[]
  ).filter((item) => item.value && item.value !== "—");

  const highlights = highlightCandidates.slice(0, 4);

  const vehicleRecord: OpsVehicleData = {
    id: vehicleDetail.id,
    vin: vehicleDetail.vin ?? null,
    licensePlate: licensePlateDisplay,
    licensePlateDisplay,
    make: vehicleDetail.make ?? null,
    model: vehicleDetail.model ?? null,
    variant: vehicleDetail.variant ?? null,
    year: vehicleDetail.year ?? null,
    bodyType: vehicleDetail.body_type ?? null,
    fuelType: vehicleDetail.fuel_type ?? null,
    transmission: vehicleDetail.transmission ?? null,
    engineCapacity:
      vehicleDetail.engine_capacity != null ? Number(vehicleDetail.engine_capacity) : null,
    mileage: vehicleDetail.mileage != null ? Number(vehicleDetail.mileage) : null,
    colorExterior: vehicleDetail.color_exterior ?? null,
    colorInterior: vehicleDetail.color_interior ?? null,
    status: vehicleDetail.status ?? null,
    monthlyLeaseRate: activeDealMonthlyRateValue ?? null,
    features: featureList,
    rawFeatures: vehicleDetail.features,
    createdAt: vehicleDetail.created_at ?? null,
    updatedAt: vehicleDetail.updated_at ?? null,
  };

  const vehicleDocumentRows = Array.isArray(vehicleDetail.vehicle_documents)
    ? vehicleDetail.vehicle_documents
    : [];

  const documents: OpsVehicleDocument[] = await buildVehicleDocumentList(vehicleDocumentRows);

  const serviceRows = Array.isArray(vehicleDetail.vehicle_services)
    ? vehicleDetail.vehicle_services
    : [];

  const serviceLog: OpsVehicleServiceLogEntry[] = await Promise.all(
    serviceRows
      .sort((a, b) => {
        const left = a?.due_date ?? a?.created_at ?? "";
        const right = b?.due_date ?? b?.created_at ?? "";
        return (right || "").localeCompare(left || "");
      })
      .map(async (service) => {
        const statusRaw = typeof service?.status === "string" ? service.status : "";
        const statusTone: OpsTone = (() => {
          switch (statusRaw) {
            case "completed":
              return "success";
            case "overdue":
              return "danger";
            case "in_progress":
              return "info";
            case "scheduled":
              return "warning";
            default:
              return "muted";
          }
        })();
        const status = (() => {
          switch (statusRaw) {
            case "completed":
              return "Завершено";
            case "overdue":
              return "Просрочено";
            case "in_progress":
              return "В работе";
            case "scheduled":
              return "Запланировано";
            default:
              if (!statusRaw) {
                return "Не указан";
              }
              return statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
          }
        })();

        const serviceTypeLabel = (() => {
          const typeRaw = typeof service?.service_type === "string" ? service.service_type : "";
          switch (typeRaw) {
            case "maintenance":
              return "ТО";
            case "inspection":
              return "Осмотр";
            case "telemetry":
              return "Телеметрия";
            case "repair":
              return "Ремонт";
            default:
              return typeRaw ? humanizeKey(typeRaw) : "Сервис";
          }
        })();

        const relatedDeal = service?.deal_id ? dealById.get(service.deal_id) : null;

        const metaDetails: string[] = [];
        if (serviceTypeLabel) {
          metaDetails.push(`Тип: ${serviceTypeLabel}`);
        }
        const dueDate = formatShortDate(service?.due_date ?? null);
        if (dueDate !== "—") {
          metaDetails.push(`Срок: ${dueDate}`);
        }
        const mileageTarget = service?.mileage_target;
        if (mileageTarget != null) {
          metaDetails.push(`Пробег: ${formatMileage(mileageTarget)}`);
        }
        const completed = formatShortDate(service?.completed_at ?? null);
        if (completed !== "—") {
          metaDetails.push(`Завершено: ${completed}`);
        }
        if (relatedDeal?.deal_number) {
          metaDetails.push(`Сделка: ${relatedDeal.deal_number}`);
        }
        const updatedAt = formatDateTime(service?.updated_at ?? null);
        if (updatedAt !== "—") {
          metaDetails.push(`Обновлено: ${updatedAt}`);
        }

        const attachmentsRaw = Array.isArray(service?.attachments) ? service.attachments : [];
        const attachmentResults = await Promise.all(
          attachmentsRaw.map(async (attachment, index) => {
            if (!attachment || typeof attachment !== "object") {
              return null;
            }
            const attachmentRecord = attachment as JsonRecord;
            const label = typeof attachmentRecord.label === "string" && attachmentRecord.label.length > 0
              ? attachmentRecord.label
              : `Вложение ${index + 1}`;
            const path = typeof attachmentRecord.storage_path === "string" ? attachmentRecord.storage_path : null;
            const url = path
              ? await createSignedStorageUrl({ bucket: "vehicle-services", path })
              : null;
            return { label, url, path: path ?? null };
          }),
        );
        const attachments = attachmentResults.filter((value): value is { label: string; url: string | null; path: string | null } => value !== null);

        const timelineDate = formatShortDate(
          service?.due_date ?? service?.completed_at ?? service?.created_at ?? null,
        );

        const serviceId = service?.id ?? `service-${Math.random().toString(36).slice(2)}`;
        return {
          id: serviceId,
          timelineDate,
          title: service?.title ?? serviceTypeLabel ?? "Сервисное событие",
          status,
          statusTone,
          description: service?.description ?? undefined,
          meta: metaDetails,
          attachments: attachments,
        } satisfies OpsVehicleServiceLogEntry;
      }),
  );

  const profile: OpsVehicleProfile = {
    heading: `${vehicleDetail.make ?? ""} ${vehicleDetail.model ?? ""}`.trim() || "Автомобиль",
    subtitle: (() => {
      const parts: string[] = [];
      if (vehicleDetail.year) {
        parts.push(String(vehicleDetail.year));
      }
      if (vehicleDetail.body_type) {
        parts.push(vehicleDetail.body_type);
      }
      return parts.length > 0 ? parts.join(" • ") : "Детали автомобиля";
    })(),
    status: vehicleDetail.status
      ? {
          label: vehicleStatusLabel,
          tone: toneStyles[vehicleDetail.status] ?? "muted",
        }
      : null,
    image: imageUrl,
    highlights: highlights.length > 0 ? highlights : undefined,
    gallery: gallery.length > 0 ? gallery : undefined,
    specGroups,
    features: featureList.length > 0 ? featureList : undefined,
  };

  const canonicalVehicleSlug = buildSlugWithId(vehicleDisplayName, vehicleDetail.id) ||
    buildSlugWithId(vehicleDetail.vin ?? null, vehicleDetail.id) ||
    vehicleDetail.id;

  return {
    slug: canonicalVehicleSlug,
    vehicleUuid: vehicleDetail.id,
    activeDeal,
    deals: vehicleDeals,
    vehicle: vehicleRecord,
    profile,
    documents,
    serviceLog,
    insurance: activeDealInsurance,
  };
}
