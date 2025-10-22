// Типы и константы для операций
// Серверные функции перемещены в operations-server.ts

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

type DashboardProfileSummary = {
  id: string;
  full_name: string | null;
};

type SupabaseDashboardInvoiceRow = {
  id: string;
  deal_id: string | null;
  invoice_number: string | null;
  status: string | null;
  due_date: string | null;
  total_amount: number | null;
  created_at: string | null;
};

type SupabaseDashboardPaymentRow = {
  id: string;
  deal_id: string | null;
  status: string | null;
  amount: number | null;
  created_at: string | null;
  received_at: string | null;
};

type WorkflowQueueRow = {
  id: string;
  status: string | null;
  created_at: string | null;
  processed_at: string | null;
};

// Типы для операций
export type OpsClientRecord = {
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

export type OpsCarRecord = {
  vin: string;
  name: string;
  year: number;
  type: string;
  price: string;
  mileage: string;
  battery: string;
  detailHref: string;
};

export type OpsDealSummary = {
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
  source: string;
  nextAction: string;
  slaDueAt?: string | null;
  slaLabel?: string | null;
  ownerRoleLabel?: string | null;
  ownerName?: string | null;
  ownerUserId?: string | null;
  guardStatuses: OpsDealGuardStatus[];
  amount?: string;
};

export type OpsDealGuardStatus = {
  key: string;
  label: string;
  hint?: string | null;
  fulfilled: boolean;
  requiresDocument?: boolean;
  note?: string | null;
  attachmentPath?: string | null;
  attachmentUrl?: string | null;
  completedAt?: string | null;
};

export type OpsDealDocument = {
  id: string;
  title: string;
  status: string;
  url?: string | null;
};

export type OpsDealInvoice = {
  id: string;
  invoiceNumber: string;
  type: string;
  totalAmount: string;
  dueDate: string;
  status: string;
};

export type OpsDealProfile = {
  dealId: string;
  vehicleName: string;
  status: string;
  description: string;
  image: string;
  monthlyPayment: string;
  nextPayment: string;
  dueAmount: string;
};

export type OpsDealClientProfile = {
  name: string;
  phone: string;
  email: string;
  scoring: string;
  notes: string;
};

export type OpsDealKeyInfoEntry = {
  label: string;
  value: string;
};

export type OpsDealDetailsEntry = {
  label: string;
  value: string;
};

export type OpsDealTimelineEvent = {
  id: string;
  timestamp: string;
  text: string;
  icon: string;
};

export type OpsClientDeal = {
  id: string;
  dealId: string;
  vehicle: string;
  status: string;
  updatedAt: string;
};

export type OpsClientDocument = {
  id: string;
  name: string;
  status: string;
  icon: string;
};

export type OpsClientProfile = {
  fullName: string;
  clientId: string;
  program: string;
  memberSince: string;
  email: string;
  phone: string;
  address: string;
  passport: string;
  metrics: {
    scoring: string;
    overdue: string;
    limit: string;
  };
};

export type OpsVehicleDocument = {
  id: string;
  title: string;
  status: string;
  icon?: string;
};

export type OpsVehicleServiceLogEntry = {
  id: string;
  date: string;
  description: string;
  note?: string;
  icon: string;
};

export type OpsVehicleProfile = {
  heading: string;
  subtitle: string;
  image: string;
  specs: Array<{ label: string; value: string }>;
};

export type CarDetailResult = {
  slug: string;
  vehicleUuid: string;
  profile: OpsVehicleProfile;
  documents: Array<{
    id: string;
    title: string;
    status: string;
    url: string | null;
    icon?: string;
  }>;
  serviceLog: Array<{
    id: string;
    date: string;
    description: string;
    note?: string;
    icon: string;
  }>;
};

export type OpsKpiMetric = {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  tone?: "success" | "warning" | "danger" | "info" | "muted";
  helpText?: string;
};

export type OpsWatchItem = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  assignee: string;
  dueDate: string;
  tone?: "emerald" | "indigo" | "amber" | "rose";
};

export type OpsTeamLoadItem = {
  id: string;
  specialist: string;
  activeCount: number;
  overdueCount: number;
};

export type OpsBottleneckItem = {
  id: string;
  stage: string;
  count: number;
  avgTime: string;
  impact: "low" | "medium" | "high";
  average?: number;
  sla?: string;
  loadPercent?: number;
};

export type OpsAutomationMetric = {
  id: string;
  process: string;
  successRate: string;
  avgTime: string;
  volume: number;
  label?: string;
  primary?: string;
  helper?: string;
};

export type OpsTaskStatus = "new" | "in-progress" | "done" | "cancelled";

export type OpsTask = {
  id: string;
  title: string;
  description?: string;
  owner: string;
  due: string;
  priority: "normal" | "high";
  source: string;
  status: OpsTaskStatus;
  createdBy: string;
};

export const OPS_TASKS: OpsTask[] = [];

// Константы для дашборда
export const OPS_DASHBOARD_KPIS = [
  {
    id: "total-deals",
    label: "Total Deals",
    value: "0",
    change: "+0%",
    trend: "neutral" as const,
  },
  {
    id: "active-deals",
    label: "Active Deals",
    value: "0",
    change: "+0%",
    trend: "neutral" as const,
  },
  {
    id: "monthly-volume",
    label: "Monthly Volume",
    value: "AED 0",
    change: "+0%",
    trend: "neutral" as const,
  },
  {
    id: "avg-approval-time",
    label: "Avg Approval Time",
    value: "0h",
    change: "+0%",
    trend: "neutral" as const,
  },
];

export const OPS_EXCEPTION_WATCHLIST = [];
export const OPS_SLA_WATCHLIST = [];
export const OPS_TEAM_LOAD = [];
export const OPS_BOTTLENECKS = [];
export const OPS_AUTOMATION_METRICS = [];

// Константы для документов и профилей
export const OPS_DEAL_DOCUMENTS = [];
export const OPS_DEAL_TIMELINE = [];
export const OPS_CLIENT_PROFILE = {
  fullName: "Client",
  clientId: "CL-0000",
  program: "Lease-to-own program",
  memberSince: "2024",
  email: "client@example.com",
  phone: "+971 50 000 0000",
  address: "Dubai, UAE",
  passport: "UAE 123456789",
  metrics: {
    scoring: "90/100",
    overdue: "0",
    limit: "AED 350 000",
  },
};

export const OPS_CLIENT_DEALS = [];
export const OPS_CLIENT_DOCUMENTS = [];
export const OPS_VEHICLE_DOCUMENTS = [];
export const OPS_VEHICLE_SERVICE_LOG = [];
export const OPS_VEHICLE_PROFILE = {
  heading: "Vehicle Profile",
  subtitle: "Vehicle information",
  image: "/assets/vehicle-placeholder.svg",
  specs: [
    { label: "Engine Type", value: "V8" },
    { label: "Range", value: "500 km" },
    { label: "Mileage", value: "0 km" },
    { label: "Battery Condition", value: "100%" },
  ],
};

// Временные фоллбеки для отладки
console.log("[DEBUG] Using fallback vehicle profile:", OPS_VEHICLE_PROFILE);


export type OpsPipelineDataset = Array<{
  label: string;
  value: number;
}>;

export type OpsDemandCapacitySeries = {
  labels: string[];
  submitted: number[];
  activated: number[];
};

export type OpsDashboardSnapshot = {
  kpis: OpsKpiMetric[];
  pipeline: OpsPipelineDataset;
  demandCapacity: OpsDemandCapacitySeries;
  exceptionWatchlist: OpsWatchItem[];
  slaWatchlist: OpsWatchItem[];
  teamLoad: OpsTeamLoadItem[];
  bottlenecks: OpsBottleneckItem[];
  automationMetrics: OpsAutomationMetric[];
};

export type OpsDealDetail = {
  slug: string;
  dealUuid: string;
  statusKey: OpsDealStatusKey;
  guardStatuses: OpsDealGuardStatus[];
  profile: OpsDealProfile;
  client: OpsDealClientProfile;
  keyInformation: OpsDealKeyInfoEntry[];
  overview: OpsDealDetailsEntry[];
  documents: OpsDealDocument[];
  invoices: OpsDealInvoice[];
  timeline: OpsDealTimelineEvent[];
};

// Вспомогательные функции перемещены в operations-server.ts

// Серверные функции перемещены в operations-server.ts
