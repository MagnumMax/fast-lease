import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";
import type { OpsDealGuardStatus } from "@/lib/supabase/queries/operations";

// Константы workflow ролей и статусов
export const WORKFLOW_ROLES = [
  { code: "OP_MANAGER", name: "Операционный менеджер" },
  { code: "OPERATOR", name: "Оператор процесса" },
  { code: "SUPPORT", name: "Поддержка операций" },
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
    ownerRole: "OP_MANAGER",
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
    ownerRole: "OP_MANAGER",
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
  year: number | null;
  body_type: string | null;
  mileage: number | null;
  current_value: number | null;
  status: string | null;
  image?: string | null;
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

type GuardStatusItem = {
  key: string;
  label: string;
  hint: string | null;
  requiresDocument: boolean;
  fulfilled: boolean;
  note: string | null;
  attachmentPath: string | null;
  attachmentUrl: string | null;
  completedAt: string | null;
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
  guardStatuses: GuardStatusItem[];
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
    .filter((guard: GuardStatusItem) => Boolean(guard.completedAt))
    .forEach((guard: GuardStatusItem) => {
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

type GuardTaskState = {
  fulfilled?: boolean;
  note?: string | null;
  attachment_path?: string | null;
  completed_at?: string | null;
};

function resolveGuardStatuses(
  statusKey: OpsDealStatusKey,
  payload: Record<string, unknown> | null | undefined,
): GuardStatusItem[] {
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
): Promise<GuardStatusItem[]> {
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
      status,
      created_at,
      updated_at,
      client_id,
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

  if (!data?.length) {
    return [];
  }

  // Загружаем уникальные client_id для запроса данных клиентов
  const uniqueClientIds = [...new Set(data.map(deal => deal.client_id).filter(Boolean))];

  // Загружаем данные клиентов отдельным запросом
  const { data: clientsData } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone, email, status, nationality, metadata")
    .in("user_id", uniqueClientIds);

  // Создаем карту клиентов для быстрого поиска
  type ClientData = {
    user_id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
    status: string | null;
    nationality: string | null;
    metadata: Record<string, unknown> | null;
  };

  const clientsMap = new Map<string, ClientData>();
  (clientsData || []).forEach(client => {
    clientsMap.set(client.user_id, client);
  });

  return data.map((row) => {
    const dealNumber = (row.deal_number as string) ?? `DEAL-${row.id.slice(-6)}`;

    const payload = (row.payload as Record<string, unknown> | null) ?? null;
    const updatedAt = (row.updated_at as string) ?? (row.created_at as string) ?? new Date().toISOString();

    const statusKey = mapStatusToWorkflow(row.status as string);
    const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];
    const ownerRole = statusMeta.ownerRole;
    const ownerRoleLabel = WORKFLOW_ROLE_LABELS[ownerRole] ?? ownerRole;

    // Обрабатываем данные автомобиля из связанной таблицы
    const vehicleArray = (row as Record<string, unknown>).vehicles || [];
    const vehicleDataRaw = Array.isArray(vehicleArray) && vehicleArray.length > 0 ? vehicleArray[0] : {};
    const vehicleData = vehicleDataRaw as SupabaseVehicleData;

    // Получаем данные клиента из карты
    const clientData = clientsMap.get(row.client_id as string);

    // Формируем название клиента
    const clientName = clientData?.full_name || `Client ${(row.client_id as string)?.slice(-4) ?? "0000"}`;

    // Формируем название автомобиля
    const vehicleName = vehicleData?.make && vehicleData?.model
      ? `${vehicleData.make} ${vehicleData.model}`
      : "Vehicle TBD";

    const source = getString(payload?.["source_label"]) ?? getString(payload?.["source"]) ?? "Website";

    return {
      id: row.id as string,
      dealId: dealNumber,
      clientId: row.client_id as string,
      client: clientName,
      vehicleId: vehicleData?.id || row.vehicle_id as string,
      vehicle: vehicleName,
      updatedAt,
      stage: statusMeta.description,
      statusKey,
      ownerRole,
      ownerRoleLabel: WORKFLOW_ROLE_LABELS[ownerRole] ?? ownerRole,
      source,
      nextAction: statusMeta.entryActions[0] ?? "Проверить текущий этап",
      guardStatuses: [],
      amount: row.total_amount ? `AED ${Number(row.total_amount).toLocaleString("en-US")}` : undefined,
    };
  });
}

type OperationsClient = {
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

export async function getOperationsCars(): Promise<OperationsCar[]> {
  console.log("[SERVER-OPS] getOperationsCars called");

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vehicles")
    .select("vin, make, model, year, body_type, mileage, current_value, status")
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
  guardStatuses: GuardStatusItem[];
  profile: {
    dealId: string;
    vehicleName: string;
    status: OpsDealStatusKey;
    description: string;
    image: string;
    monthlyPayment: string;
    nextPayment: string;
    dueAmount: string;
  };
  client: {
    name: string;
    phone: string;
    email: string;
    scoring: string;
    notes: string;
  };
  keyInformation: Array<{
    label: string;
    value: string;
  }>;
  overview: Array<{
    label: string;
    value: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    status: string;
    url: string | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    type: string;
    totalAmount: string;
    dueDate: string;
    status: string;
  }>;
  timeline: TimelineEvent[];
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
    vehicles!vehicle_id(id, vin, make, model, year, body_type, mileage, current_value, status),
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
    vehicles?: Array<{
      id: string;
      vin: string | null;
      make: string | null;
      model: string | null;
      year: number | null;
      body_type: string | null;
      mileage: number | null;
      current_value: number | null;
      status: string | null;
    }>;
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
  const { data: clientData } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, phone, email, status, nationality, metadata")
    .eq("user_id", dealRow.client_id)
    .maybeSingle();

  // Загружаем реальные документы с подписанными URL
  const documents = await Promise.all(
    (dealRow.deal_documents || []).map(async (doc: SupabaseDealDocument) => {
      const signedUrl = doc.storage_path
        ? await createSignedStorageUrl({ bucket: "deal-documents", path: doc.storage_path })
        : null;

      return {
        id: doc.id,
        title: doc.title || `${doc.document_type} document`,
        status: `Uploaded ${new Date(doc.created_at || new Date()).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })}`,
        url: signedUrl,
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

  const guardStatuses = await buildDetailGuardStatuses(statusKey, dealRow.payload, dealRow.deal_documents ?? []);
  const timeline = buildTimelineEvents({
    createdAt: dealRow.created_at,
    updatedAt: dealRow.updated_at,
    payload: dealRow.payload,
    guardStatuses,
    statusKey,
  });

  // Обрабатываем данные из Supabase (они приходят как массивы)
  const vehicleArray = dealRow.vehicles || [];
  const vehicle = Array.isArray(vehicleArray) && vehicleArray.length > 0 ? vehicleArray[0] : {};
  const vehicleData = vehicle as SupabaseVehicleData;
  const vehicleName = vehicleData?.make && vehicleData?.model
    ? `${vehicleData.make} ${vehicleData.model}`
    : "Vehicle TBD";

  const profile: DealDetailResult['profile'] = {
    dealId: (dealRow.deal_number as string) ?? dealRow.id,
    vehicleName,
    status: statusKey,
    description: `Client — ${clientData?.full_name || "Unknown client"}.`,
    image: "/assets/vehicle-placeholder.svg",
    monthlyPayment:
      dealRow.monthly_payment != null
        ? `AED ${Number(dealRow.monthly_payment).toLocaleString("en-US")}`
        : "AED 0",
    nextPayment: "15 Feb 2025",
    dueAmount:
      dealRow.total_amount != null
        ? `AED ${Number(dealRow.total_amount).toLocaleString("en-US")}`
        : "AED 0",
  };

  // Формируем профиль клиента с реальными данными
  const client = clientData || {} as SupabaseClientData;
  const clientProfile: DealDetailResult['client'] = {
    name: client.full_name || "Unknown Client",
    phone: client.phone || "+971 50 000 0000",
    email: (client.metadata as { ops_email?: string } | null)?.ops_email || client.email || "—",
    scoring: "90/100", // TODO: рассчитывать на основе реальных данных
    notes: "Client profile loaded from database",
  };

  // Формируем ключевую информацию об автомобиле
  const keyInformation: DealDetailResult['keyInformation'] = [];

  if (vehicleData?.vin) {
    keyInformation.push({ label: "VIN", value: vehicleData.vin });
  }

  if (vehicleData?.year) {
    keyInformation.push({ label: "Year", value: vehicleData.year.toString() });
  }

  if (vehicleData?.mileage) {
    keyInformation.push({
      label: "Mileage",
      value: `${Number(vehicleData.mileage).toLocaleString("en-US")} km`
    });
  }

  if (vehicleData?.body_type) {
    keyInformation.push({ label: "Body Type", value: vehicleData.body_type });
  }

  if (vehicleData?.current_value) {
    keyInformation.push({
      label: "Value",
      value: `AED ${Number(vehicleData.current_value).toLocaleString("en-US")}`
    });
  }

  // Добавляем дефолтные данные если нет реальных
  if (keyInformation.length === 0) {
    keyInformation.push(
      { label: "VIN", value: "TBD" },
      { label: "Program Term", value: "36 months" },
      { label: "Issue Date", value: new Date().toLocaleDateString("ru-RU") },
      { label: "Mileage", value: "0 km" },
      { label: "Last Service", value: "Not scheduled" },
      { label: "Odoo Card", value: "Not linked" }
    );
  }

  // Формируем обзор сделки
  const overview: DealDetailResult['overview'] = [
    {
      label: "Source",
      value: getString(dealRow.payload?.source) || "Website"
    },
    {
      label: "Created at",
      value: dealRow.created_at
        ? new Date(dealRow.created_at).toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "long",
            year: "numeric"
          }) + " " + new Date(dealRow.created_at).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
          })
        : "—"
    },
    {
      label: "Deal Number",
      value: dealRow.deal_number || computeFallbackDealNumber(dealRow.id)
    },
    {
      label: "Last status update",
      value: dealRow.updated_at
        ? new Date(dealRow.updated_at).toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "long",
            year: "numeric"
          }) + " " + new Date(dealRow.updated_at).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
          })
        : "—"
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
    profile,
    client: clientProfile,
    keyInformation,
    overview,
    documents,
    invoices,
    timeline,
  };
}
