import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";
import type {
  OpsDealClientProfile,
  OpsDealDetailsEntry,
  OpsDealDocument,
  OpsDealGuardStatus,
  OpsDealInvoice,
  OpsDealKeyInfoEntry,
  OpsDealProfile,
  OpsDealTimelineEvent,
  OpsDealWorkflowTask,
} from "@/lib/supabase/queries/operations";
import { mapTaskRow, TASK_SELECT } from "@/lib/supabase/queries/tasks";
import type { WorkspaceTask } from "@/lib/supabase/queries/tasks";
import { resolveTaskGuardKey } from "@/lib/workflow/task-utils";

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
      },
      {
        key: "payments.supplierPaid",
        label: "Поставщику оплачено",
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
  make: string | null;
  model: string | null;
  variant?: string | null;
  year: number | null;
  body_type: string | null;
  mileage: number | null;
  current_value: number | null;
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
  created_at: string | null;
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
  activated_at?: string | null;
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

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
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

function formatShortDate(value: string | null | undefined): string {
  return formatDate(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
  if (!value) return "";
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function computeFallbackDealNumber(id: string) {
  return `DEAL-${id.slice(-6).toUpperCase()}`;
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
};

function matchesDealSlug(row: DealRow, slug: string) {
  const normalizedSlug = slug.toLowerCase();
  const byNumber = row.deal_number ? toSlug(row.deal_number).toLowerCase() : "";
  const byId = toSlug(row.id).toLowerCase();
  const fallback = toSlug(computeFallbackDealNumber(row.id)).toLowerCase();

  return normalizedSlug === byNumber || normalizedSlug === byId || normalizedSlug === fallback;
}

// Серверные функции для операций
type OperationsDeal = {
  id: string;
  dealId: string;
  clientId?: string | null;
  client: string;
  vehicleId?: string | null;
  vehicle: string;
  updatedAt: string;
  stage: string;
  statusKey: OpsDealStatusKey;
  ownerRole: WorkflowRole;
  ownerRoleLabel?: string | null;
  ownerName?: string | null;
  ownerUserId?: string | null;
  source: string;
  nextAction: string;
  guardStatuses: OpsDealGuardStatus[];
  amount?: string;
};

export async function getOperationsDeals(): Promise<OperationsDeal[]> {
  console.log("[SERVER-OPS] getOperationsDeals called");

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("deals")
    .select(`
      id,
      deal_number,
      op_manager_id,
      status,
      created_at,
      updated_at,
      client_id,
      customer_id,
      vehicle_id,
      total_amount,
      payload,
      vehicles!vehicle_id(id, vin, make, model, year, body_type, mileage, current_value, status)
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
  const uniqueCustomerIds = [...new Set(data.map(deal => deal.customer_id).filter(Boolean))];

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

  type ContactData = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };

  const contactsMap = new Map<string, ContactData>();

  if (uniqueCustomerIds.length > 0) {
    const { data: contactsData, error: contactsError } = await supabase
      .from("workflow_contacts")
      .select("id, full_name, email, phone")
      .in("id", uniqueCustomerIds);

    if (contactsError) {
      console.error("[SERVER-OPS] failed to load workflow contacts:", contactsError);
    } else {
      (contactsData || []).forEach((contact) => {
        contactsMap.set(contact.id, contact as ContactData);
      });
    }
  }

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
    const dealNumber = (row.deal_number as string) ?? `DEAL-${row.id.slice(-6)}`;

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
    const contactData = contactsMap.get(row.customer_id as string);

    // Формируем название клиента
    const resolvedClientId =
      typeof row.client_id === "string" && row.client_id.trim().length > 0
        ? (row.client_id as string)
        : typeof row.customer_id === "string" && row.customer_id.trim().length > 0
          ? (row.customer_id as string)
          : null;

    const clientIdentifier = resolvedClientId ?? "";

    const clientName =
      clientData?.full_name ||
      contactData?.full_name ||
      `Client ${clientIdentifier.slice(-4) || "0000"}`;

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
      customerId: typeof row.customer_id === "string" ? (row.customer_id as string) : null,
      client: clientName,
      vehicleId: vehicleData?.id || row.vehicle_id as string,
      vehicle: vehicleName,
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
    };
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

type OperationsClient = {
  userId: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Blocked";
  scoring: string;
  overdue: number;
  limit: string;
  detailHref: string;
};

export async function getOperationsClients(): Promise<OperationsClient[]> {
  console.log("[SERVER-OPS] getOperationsClients called");

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, status, phone, nationality, metadata")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[SERVER-OPS] failed to load clients:", error);
    return [];
  }

  console.log(`[SERVER-OPS] loaded ${data?.length || 0} clients`);

  if (!data?.length) {
    return [];
  }

  return data.map((profile, index) => {
    const metadata = (profile.metadata as { ops_email?: string } | null) ?? null;
    const emailFromMetadata = typeof metadata?.ops_email === "string" ? metadata.ops_email : null;

    return {
      userId: (profile.user_id as string) ?? "",
      id: `CL-${(101 + index).toString().padStart(4, "0")}`,
      name: (profile.full_name as string) ?? "Client",
      email: emailFromMetadata ?? "",
      phone: (profile.phone as string) ?? "+971 50 000 0000",
      status: (profile.status === "blocked" ? "Blocked" : "Active") as "Active" | "Blocked",
      scoring: "90/100",
      overdue: index % 3 === 0 ? 1 : 0,
      limit: "AED 350,000",
      detailHref: `/ops/clients/${((profile.full_name as string) ?? "client")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") || "client-104"}`,
    };
  });
}

type OperationsCar = {
  vin: string;
  name: string;
  year: number;
  type: string;
  price: string;
  mileage: string;
  battery: string;
  detailHref: string;
};

export type CarDetailResult = {
  slug: string;
  vehicleUuid: string;
  profile: {
    heading: string;
    subtitle: string;
    image: string;
    specs: Array<{ label: string; value: string }>;
  };
  documents: Array<{
    id: string;
    title: string;
    status: string;
    url: string | null;
  }>;
  serviceLog: Array<{
    id: string;
    date: string;
    description: string;
    note?: string;
    icon: string;
  }>;
};

export async function getOperationsCars(): Promise<OperationsCar[]> {
  console.log("[SERVER-OPS] getOperationsCars called");

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vehicles")
    .select("vin, make, model, year, body_type, mileage, current_value, status")
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

  return data.map((vehicle) => ({
    vin: (vehicle.vin as string) ?? "—",
    name: `${vehicle.make ?? "Vehicle"} ${vehicle.model ?? ""}`.trim(),
    year: (vehicle.year as number) ?? new Date().getFullYear(),
    type: (vehicle.body_type as string) ?? "Luxury SUV",
    price: vehicle.current_value ? `AED ${Number(vehicle.current_value).toLocaleString("en-US")}` : "—",
    mileage: vehicle.mileage != null ? `${Number(vehicle.mileage).toLocaleString("en-US")} km` : "—",
    battery: "97%",
    detailHref: `/ops/cars/${`${vehicle.make ?? "vehicle"}-${vehicle.model ?? ""}`
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")}`,
  }));
}

type DealDetailResult = {
  slug: string;
  dealUuid: string;
  statusKey: OpsDealStatusKey;
  guardStatuses: OpsDealGuardStatus[];
  workflowTasks: OpsDealWorkflowTask[];
  profile: OpsDealProfile;
  client: OpsDealClientProfile;
  keyInformation: OpsDealKeyInfoEntry[];
  overview: OpsDealDetailsEntry[];
  documents: OpsDealDocument[];
  invoices: OpsDealInvoice[];
  timeline: OpsDealTimelineEvent[];
};

// Серверные функции для операций
export async function getOperationsDealDetail(slug: string): Promise<DealDetailResult | null> {
  console.log(`[SERVER-OPS] getOperationsDealDetail called with slug: "${slug}"`);

  const normalizedSlug = toSlug(slug);
  console.log(`[SERVER-OPS] normalized slug: "${normalizedSlug}"`);

  const supabase = await createSupabaseServerClient();

  // Check authentication
  const { data: userData, error: userError } = await supabase.auth.getUser();
  console.log(`[SERVER-OPS] user authenticated:`, !!userData?.user, `error:`, userError);

  // Загружаем данные сделки с связанными таблицами
  const fetchFields = `
    id, deal_number, status, created_at, updated_at, monthly_payment, total_amount, principal_amount, payload, client_id,
    term_months, contract_start_date, contract_end_date, first_payment_date, source, customer_id,
    vehicles!vehicle_id(id, vin, make, model, variant, year, body_type, mileage, current_value, status, fuel_type, transmission, color_exterior, color_interior, vehicle_images(id, storage_path, label, is_primary, sort_order)),
    customer_contact:customer_id(id, full_name, email, phone, emirates_id),
    deal_documents(id, document_type, title, storage_path, created_at)
  `;

  type SupabaseDealDetailRow = {
    id: string;
    deal_number: string | null;
    status: string;
    created_at: string | null;
    updated_at: string | null;
    monthly_payment: number | null;
    total_amount: number | null;
    principal_amount: number | null;
    payload: Record<string, unknown> | null;
    client_id: string;
    term_months: number | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
    first_payment_date: string | null;
    source: string | null;
    customer_id: string | null;
    vehicles?: SupabaseVehicleData[] | SupabaseVehicleData | null;
    customer_contact?: {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      emirates_id: string | null;
    } | Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      emirates_id: string | null;
    }> | null;
    deal_documents?: SupabaseDealDocument[];
  };

  let dealRow: SupabaseDealDetailRow | null = null;

  console.log(`[SERVER-OPS] searching by exact deal_number: "${slug}"`);
  const byNumber = await supabase
    .from("deals")
    .select(fetchFields)
    .eq("deal_number", slug)
    .maybeSingle();

  if (byNumber.error) {
    console.error("[SERVER-OPS] failed to load deal detail by number:", byNumber.error);
  } else {
    console.log(`[SERVER-OPS] search by number result:`, !!byNumber.data);
  }

  if (byNumber.data) {
    console.log(`[SERVER-OPS] found deal by number:`, byNumber.data.id);
    dealRow = byNumber.data;
  }

  if (!dealRow) {
    console.log(`[SERVER-OPS] searching by case-insensitive deal_number: "${slug}"`);
    const { data: insensitiveMatch, error: insensitiveError } = await supabase
      .from("deals")
      .select(fetchFields)
      .ilike("deal_number", slug)
      .maybeSingle();

    if (insensitiveError) {
      console.error("[SERVER-OPS] failed to load deal detail by insensitive number:", insensitiveError);
    } else {
      console.log(`[SERVER-OPS] insensitive search result:`, !!insensitiveMatch);
    }

    if (insensitiveMatch) {
      console.log(`[SERVER-OPS] found deal by insensitive number:`, insensitiveMatch.id);
      dealRow = insensitiveMatch;
    }
  }

  if (!dealRow && z.string().uuid().safeParse(slug).success) {
    console.log(`[SERVER-OPS] searching by UUID: "${slug}"`);
    const byId = await supabase
      .from("deals")
      .select(fetchFields)
      .eq("id", slug)
      .maybeSingle();

    if (byId.error) {
      console.error("[SERVER-OPS] failed to load deal detail by id:", byId.error);
    } else {
      console.log(`[SERVER-OPS] UUID search result:`, !!byId.data);
    }

    if (byId.data) {
      console.log(`[SERVER-OPS] found deal by UUID:`, byId.data.id);
      dealRow = byId.data;
    }
  } else if (!dealRow) {
    console.log(`[SERVER-OPS] slug is not a valid UUID, skipping UUID search`);
  }

  if (!dealRow) {
    console.log(`[SERVER-OPS] searching in last 50 deals for slug: "${normalizedSlug}"`);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("deals")
      .select(fetchFields)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fallbackError) {
      console.error("[SERVER-OPS] failed to load fallback deals:", fallbackError);
    } else {
      console.log(`[SERVER-OPS] loaded ${fallbackData?.length || 0} recent deals for fallback search`);
      fallbackData?.slice(0, 5).forEach((deal: SupabaseDealDetailRow, index: number) => {
        console.log(`[SERVER-OPS] available deal ${index + 1}: ID=${deal.id}, deal_number=${deal.deal_number}`);
      });
    }

    const matched = fallbackData?.find((row: SupabaseDealDetailRow) => matchesDealSlug(row, normalizedSlug));
    console.log(`[SERVER-OPS] fallback search result:`, !!matched);

    if (matched) {
      console.log(`[SERVER-OPS] found deal in fallback search:`, matched.id);
      dealRow = matched;
    }
  }

  if (!dealRow) {
    console.log(`[SERVER-OPS] no deal found for slug: "${slug}" after all search attempts`);
    return null;
  }

  console.log(`[SERVER-OPS] successfully found deal:`, dealRow.id, `deal_number:`, dealRow.deal_number);

  const statusKey = mapStatusToWorkflow(dealRow.status);

  // Загружаем данные клиента отдельным запросом
  const { data: clientData, error: clientError } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, phone, status, nationality, metadata")
    .eq("user_id", dealRow.client_id)
    .maybeSingle();

  const contactRecord = Array.isArray(dealRow.customer_contact)
    ? (dealRow.customer_contact[0] ?? null)
    : (dealRow.customer_contact ?? null);

  // Загружаем email из auth.users (если есть клиент)
  let authUser: Awaited<ReturnType<typeof supabase.auth.admin.getUserById>>["data"] | null = null;
  if (dealRow.client_id) {
    const { data: fetchedAuthUser, error: authUserError } = await supabase.auth.admin.getUserById(
      dealRow.client_id,
    );
    if (authUserError) {
      console.error("[SERVER-OPS] failed to load auth user for deal client", {
        dealId: dealRow.id,
        clientId: dealRow.client_id,
        error: authUserError,
      });
    } else {
      authUser = fetchedAuthUser;
    }
  }

  // Загружаем scoring из applications
  const { data: applicationData } = await supabase
    .from("applications")
    .select("scoring_results")
    .eq("user_id", dealRow.client_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  console.log(`[DEBUG] Client data query result:`, { clientData, clientError, clientId: dealRow.client_id });
  console.log(`[DEBUG] Client full_name: "${clientData?.full_name}"`);
  console.log(`[DEBUG] Client phone: "${clientData?.phone}"`);
  console.log(`[DEBUG] Auth user email: "${authUser?.user?.email}"`);
  console.log(`[DEBUG] Client metadata:`, clientData?.metadata);
  console.log(`[DEBUG] Application scoring results:`, applicationData?.scoring_results);

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
      const documentType = doc.document_type ?? null;
      const normalizedType = documentType?.toLowerCase() ?? "";
      const title = doc.title || `${doc.document_type ?? "Document"}`.trim();
      const normalizedTitle = title.toLowerCase();
      let category: "required" | "signature" | "archived" | "other" = "required";
      if (
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

      return {
        id: doc.id,
        title,
        status: `Uploaded ${new Date(doc.created_at || new Date()).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })}`,
        url: signedUrl,
        documentType,
        category,
        signaturesCollected,
        signaturesRequired,
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

  const images = vehicleData?.vehicle_images ?? [];
  const primaryImage = images.find((img) => img.is_primary) ?? images[0];
  const signedUrl = primaryImage?.storage_path
    ? await createSignedStorageUrl({ bucket: "vehicle-images", path: primaryImage.storage_path })
    : null;
  const imageUrl = signedUrl || "/assets/vehicle-placeholder.svg";

  const profileMetadata = (clientData?.metadata as Record<string, unknown> | null) ?? null;
  const metadataEmailCandidates = ["ops_email", "work_email", "email"];
  const metadataEmail =
    metadataEmailCandidates
      .map((key) => profileMetadata?.[key])
      .find((value): value is string => typeof value === "string" && value.includes("@")) ?? null;

  const resolvedClientName =
    clientData?.full_name ??
    contactRecord?.full_name ??
    (typeof authUser?.user?.user_metadata?.full_name === "string"
      ? authUser.user.user_metadata.full_name
      : null);
  const resolvedClientPhone = clientData?.phone ?? contactRecord?.phone ?? null;
  const resolvedClientEmail = metadataEmail ?? contactRecord?.email ?? authUser?.user?.email ?? "—";

  const clientNotesParts: string[] = [];
  if (clientData?.status) {
    clientNotesParts.push(`Статус: ${clientData.status}`);
  }
  if (clientData?.nationality) {
    clientNotesParts.push(`Гражданство: ${clientData.nationality}`);
  }
  if (contactRecord?.emirates_id) {
    clientNotesParts.push(`Emirates ID: ${contactRecord.emirates_id}`);
  }

  const scoringValue = resolveScore(applicationData?.scoring_results);
  const scoringDisplay =
    scoringValue != null ? `${Math.round(scoringValue)}/100` : "—";

  const clientProfile: DealDetailResult["client"] = {
    name: resolvedClientName ?? "—",
    phone: resolvedClientPhone ?? "—",
    email: resolvedClientEmail,
    scoring: scoringDisplay,
    notes: clientNotesParts.length > 0 ? clientNotesParts.join(" • ") : "—",
  };

  console.log(`[DEBUG] Final client profile:`, {
    name: clientProfile.name,
    phone: clientProfile.phone,
    email: clientProfile.email,
    scoring: clientProfile.scoring,
    notes: clientProfile.notes,
  });

  const profileDescription = resolvedClientName
    ? `Клиент: ${resolvedClientName}`
    : contactRecord?.full_name
      ? `Контакт: ${contactRecord.full_name}`
      : "Клиент не указан";

  const profile: DealDetailResult["profile"] = {
    dealId: dealRow.deal_number ?? computeFallbackDealNumber(dealRow.id),
    vehicleName: vehicleName ?? "Автомобиль не выбран",
    status: statusKey,
    description: profileDescription,
    image: imageUrl,
    monthlyPayment: formatCurrency(dealRow.monthly_payment),
    nextPayment: nextPaymentDisplay,
    dueAmount: outstandingAmountDisplay,
  };

  // Формируем ключевую информацию об автомобиле
  const rawKeyInformation: DealDetailResult["keyInformation"] = [
    { label: "VIN", value: vehicleData?.vin ?? "—" },
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
      label: "Статус авто",
      value: vehicleData?.status ?? "—",
    },
    {
      label: "Стоимость",
      value: formatCurrency(vehicleData?.current_value ?? null),
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
      label: "Source",
      value:
        getString(dealRow.source) ??
        getString(dealRow.payload?.source) ??
        "—",
    },
    {
      label: "Created at",
      value: formatDateTime(dealRow.created_at),
    },
    {
      label: "Deal Number",
      value: dealRow.deal_number || computeFallbackDealNumber(dealRow.id),
    },
    {
      label: "Last status update",
      value: formatDateTime(dealRow.updated_at),
    },
  ];

  const outboundSlug = matchesDealSlug(dealRow, normalizedSlug)
    ? normalizedSlug
    : toSlug(dealRow.deal_number ?? computeFallbackDealNumber(dealRow.id));

  return {
    slug: outboundSlug,
    dealUuid: dealRow.id,
    statusKey,
    guardStatuses,
    workflowTasks,
    profile,
    client: clientProfile,
    keyInformation,
    overview,
    documents,
    invoices,
    timeline,
  };
}

// Функция для загрузки деталей автомобиля
export async function getOperationsCarDetail(slug: string): Promise<CarDetailResult | null> {
  console.log(`[SERVER-OPS] getOperationsCarDetail called with slug: "${slug}"`);

  const normalizedSlug = toSlug(slug);
  console.log(`[SERVER-OPS] normalized slug: "${normalizedSlug}"`);

  const supabase = await createSupabaseServerClient();

  // Check authentication
  const { data: userData, error: userError } = await supabase.auth.getUser();
  console.log(`[SERVER-OPS] user authenticated:`, !!userData?.user, `error:`, userError);

  // Сначала загружаем все автомобили для поиска по комбинированному slug
  const { data: allVehicles, error: vehicleError } = await supabase
    .from("vehicles")
    .select(`
      id, vin, make, model, year, body_type, mileage, current_value, status,
      vehicle_images(id, storage_path, label, is_primary, sort_order)
    `);

  if (vehicleError) {
    console.error("[SERVER-OPS] failed to load vehicles:", vehicleError);
    return null;
  }

  // Ищем автомобиль по комбинированному slug или отдельным полям
  const vehicleData = allVehicles?.find(vehicle => {
    // Создаем комбинированный slug из make и model
    const combinedSlug = toSlug(`${vehicle.make || ''} ${vehicle.model || ''}`);
    
    // Проверяем различные варианты совпадения
    return (
      combinedSlug === normalizedSlug ||
      toSlug(vehicle.vin || '') === normalizedSlug ||
      toSlug(vehicle.make || '') === normalizedSlug ||
      toSlug(vehicle.model || '') === normalizedSlug
    );
  });

  if (!vehicleData) {
    console.log(`[SERVER-OPS] no vehicle found for slug: "${slug}"`);
    return null;
  }

  console.log(`[SERVER-OPS] successfully found vehicle:`, vehicleData.id);

  // Загружаем изображения
  const images = vehicleData.vehicle_images || [];
  const primaryImage = images.find(img => img.is_primary) || images[0];
  const imageUrl = primaryImage?.storage_path
    ? await createSignedStorageUrl({ bucket: "vehicle-images", path: primaryImage.storage_path })
    : "/assets/vehicle-placeholder.svg";

  console.log(`[DEBUG] Vehicle image:`, imageUrl);

  // Формируем профиль автомобиля
  const vehicleName = `${vehicleData.make} ${vehicleData.model}`.trim();
  const profile: CarDetailResult['profile'] = {
    heading: vehicleName,
    subtitle: `${vehicleData.year} ${vehicleData.body_type || "Vehicle"}`,
    image: imageUrl || "/assets/vehicle-placeholder.svg",
    specs: [
      { label: "VIN", value: vehicleData.vin || "TBD" },
      { label: "Year", value: vehicleData.year?.toString() || "TBD" },
      { label: "Mileage", value: vehicleData.mileage ? `${Number(vehicleData.mileage).toLocaleString("en-US")} km` : "0 km" },
      { label: "Body Type", value: vehicleData.body_type || "TBD" },
      { label: "Value", value: vehicleData.current_value ? `AED ${Number(vehicleData.current_value).toLocaleString("en-US")}` : "TBD" },
    ],
  };

  console.log(`[DEBUG] Vehicle profile:`, profile);

  // Загружаем документы (пока пусто, можно расширить)
  const documents: CarDetailResult['documents'] = [];

  // Загружаем сервис-лог (пока пусто, можно расширить)
  const serviceLog: CarDetailResult['serviceLog'] = [
    // Добавляем пустой элемент для соответствия типу
    {
      id: "empty",
      date: new Date().toISOString(),
      description: "No service records",
      icon: "info"
    }
  ];

  return {
    slug: normalizedSlug,
    vehicleUuid: vehicleData.id,
    profile,
    documents,
    serviceLog,
  };
}
