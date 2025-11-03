// Типы и константы для операций
// Серверные функции перемещены в operations-server.ts

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
  status?: string | null;
  signed_at?: string | null;
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
  customer_id?: string | null;
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


// Типы для операций
export type OpsClientRecord = {
  userId: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Blocked";
  statusLabel: string;
  scoring: string;
  overdue: number;
  limit: string;
  detailHref: string;
  memberSince: string | null;
  segment: string | null;
  tags: string[];
  metricsSummary?: {
    scoring: string;
    limit: string;
    overdue: string;
  };
  residencyStatus?: string | null;
  leasing?: {
    vehicle: string;
    amount: string;
    since: string;
    dealNumber?: string;
  };
};

export type OpsCarRecord = {
  id: string;
  vin: string;
  name: string;
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  bodyType: string | null;
  status: string;
  statusLabel: string;
  statusTone: OpsTone;
  price: string;
  priceValue: number | null;
  mileage: string;
  mileageValue: number | null;
  activeDealNumber: string | null;
  activeDealStatus: string | null;
  activeDealStatusLabel: string | null;
  activeDealStatusTone: OpsTone | null;
  activeDealHref: string | null;
  detailHref: string;
  type?: string;
};

export type OpsVehicleActiveDeal = {
  id: string;
  number: string | null;
  status: string | null;
  statusLabel: string | null;
  statusTone: OpsTone | null;
  monthlyPayment: string | null;
  monthlyPaymentValue: number | null;
  monthlyLeaseRate: string | null;
  monthlyLeaseRateValue: number | null;
  href: string | null;
};

export const OPS_DEAL_STATUS_META: Record<string, { label: string; tone: OpsTone }> = {
  draft: { label: "Черновик", tone: "muted" },
  pending_activation: { label: "Подготовка к активации", tone: "warning" },
  active: { label: "Активна", tone: "success" },
  suspended: { label: "Приостановлена", tone: "warning" },
  completed: { label: "Завершена", tone: "muted" },
  defaulted: { label: "Дефолт", tone: "danger" },
  cancelled: { label: "Отменена", tone: "danger" },
};

export type OpsDealSummary = {
  id: string;
  dealId: string;
  clientId?: string | null;
  customerId?: string | null;
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

export type OpsDealWorkflowTask = {
  id: string;
  title: string;
  status: string;
  guardKey: string | null;
  guardLabel: string | null;
  requiresDocument: boolean;
  fulfilled: boolean;
  slaDueAt?: string | null;
  completedAt?: string | null;
  assigneeRole?: string | null;
  assigneeUserId?: string | null;
  note?: string | null;
  attachmentPath?: string | null;
  attachmentUrl?: string | null;
};

export type OpsDealDocument = {
  id: string;
  title: string;
  status: string;
  url?: string | null;
  documentType?: string | null;
  category: "required" | "signature" | "archived" | "other";
  signaturesCollected?: number | null;
  signaturesRequired?: number | null;
  uploadedAt?: string | null;
  signedAt?: string | null;
  rawStatus?: string | null;
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
  vehicleId?: string | null;
  vehicleHref?: string | null;
};

export type OpsDealClientProfile = {
  name: string;
  phone: string;
  email: string;
  scoring: string;
  notes: string;
  userId?: string | null;
  detailHref?: string | null;
};

export type OpsDealKeyInfoEntry = {
  label: string;
  value: string;
};

export type OpsDealDetailsEntry = {
  label: string;
  value: string;
};

export type OpsDealDetailJsonBlock = {
  label: string;
  json: string;
  isEmpty: boolean;
};

export type OpsDealRelatedSection = {
  label: string;
  entries: OpsDealDetailsEntry[];
};

export type OpsDealEditDefaults = {
  dealNumber: string;
  source: string;
  statusKey: OpsDealStatusKey;
  principalAmount: number | null;
  totalAmount: number | null;
  monthlyPayment: number | null;
  monthlyLeaseRate: number | null;
  interestRate: number | null;
  downPaymentAmount: number | null;
  securityDeposit: number | null;
  processingFee: number | null;
  termMonths: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  firstPaymentDate: string | null;
  activatedAt: string | null;
  completedAt: string | null;
};

export type OpsDealTimelineEvent = {
  id: string;
  timestamp: string;
  text: string;
  icon: string;
};

export type OpsClientDeal = {
  id: string;
  dealNumber: string;
  status: string;
  statusKey?: OpsDealStatusKey;
  stageLabel?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  vehicleId: string | null;
  vehicleName: string;
  vehicleVin?: string | null;
  monthlyPayment?: string | null;
  totalAmount?: string | null;
  principalAmount?: string | null;
  termMonths?: number | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  nextPaymentDue?: string | null;
  overdueAmount?: string | null;
  assignedManagerId?: string | null;
  assignedManagerName?: string | null;
  source?: string | null;
};

export type OpsClientDocument = {
  id: string;
  name: string;
  status: string;
  documentType: string | null;
  category: string | null;
  source: "deal" | "application";
  bucket: string | null;
  storagePath: string | null;
  uploadedAt: string | null;
  signedAt: string | null;
  url?: string | null;
};

export type OpsClientNotification = {
  id: string;
  title: string;
  message: string | null;
  severity: string;
  icon: string | null;
  createdAt: string;
  readAt: string | null;
};

export type OpsClientSupportTicket = {
  id: string;
  ticketNumber: string;
  topic: string;
  priority: string;
  status: string;
  updatedAt: string;
  lastMessagePreview: string | null;
};

export type OpsClientReferralSummary = {
  code: string;
  shareUrl: string | null;
  createdAt: string | null;
  clicks: number;
  applications: number;
  deals: number;
  totalRewards: string | null;
};

export type OpsClientDetail = {
  profile: OpsClientProfile;
  deals: OpsClientDeal[];
  documents: OpsClientDocument[];
  notifications: OpsClientNotification[];
  supportTickets: OpsClientSupportTicket[];
  referrals: OpsClientReferralSummary | null;
};

export type OpsClientProfile = {
  userId: string;
  fullName: string;
  status: string;
  segment: string | null;
  memberSince: string | null;
  email: string | null;
  phone: string | null;
  emiratesId: string | null;
  passportNumber: string | null;
  nationality: string | null;
  residencyStatus: string | null;
  dateOfBirth: string | null;
  employment: {
    employer?: string | null;
    position?: string | null;
    years?: number | null;
    raw: Record<string, unknown> | null;
  };
  financial: {
    monthlyIncome?: number | null;
    existingLoans?: number | null;
    creditScore?: number | null;
    riskGrade?: string | null;
    raw: Record<string, unknown> | null;
  };
  lastLoginAt: string | null;
  createdAt: string | null;
  metrics: {
    scoring: string;
    overdue: string;
    overdueCount: number;
    limit: string;
    totalExposure: string;
    activeDeals: number;
  };
  tags?: string[];
};

export type OpsTone = "success" | "warning" | "info" | "danger" | "muted";

export const OPS_VEHICLE_STATUS_META: Record<string, { label: string; tone: OpsTone }> = {
  draft: { label: "Черновик", tone: "muted" },
  available: { label: "Доступен", tone: "success" },
  reserved: { label: "Зарезервирован", tone: "warning" },
  leased: { label: "В лизинге", tone: "info" },
  maintenance: { label: "На обслуживании", tone: "warning" },
  retired: { label: "Списан", tone: "danger" },
};

export type OpsVehicleDocument = {
  id: string;
  title: string;
  status: string;
  statusTone?: OpsTone;
  type?: string;
  date?: string;
  dealNumber?: string | null;
  url: string | null;
};

export type OpsVehicleServiceLogEntry = {
  id: string;
  timelineDate: string;
  title: string;
  status: string;
  statusTone?: OpsTone;
  description?: string;
  meta?: string[];
  attachments?: Array<{ label: string; url: string | null; path?: string | null }>;
};

export type OpsVehicleProfile = {
  heading: string;
  subtitle: string;
  status?: { label: string; tone: OpsTone } | null;
  image: string;
  highlights?: Array<{ label: string; value: string; hint?: string }>;
  gallery?: Array<{ id: string; url: string | null; label?: string | null; isPrimary?: boolean }>;
  specGroups: Array<{
    title: string;
    specs: Array<{ label: string; value: string }>;
  }>;
  features?: string[];
};

export type OpsVehicleTelematics = {
  odometer: number | null;
  batteryHealth: number | null;
  fuelLevel: number | null;
  tirePressure: Record<string, number | string>;
  location: Record<string, number | string>;
  lastReportedAt: string | null;
};

export type OpsVehicleData = {
  id: string;
  vin: string | null;
  make: string | null;
  model: string | null;
  variant: string | null;
  year: number | null;
  bodyType: string | null;
  fuelType: string | null;
  transmission: string | null;
  engineCapacity: number | null;
  mileage: number | null;
  colorExterior: string | null;
  colorInterior: string | null;
  status: string | null;
  purchasePrice: number | null;
  currentValue: number | null;
  residualValue: number | null;
  monthlyLeaseRate: number | null;
  features: string[];
  rawFeatures: unknown;
  telematics: OpsVehicleTelematics | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CarDetailResult = {
  slug: string;
  vehicleUuid: string;
  activeDeal: OpsVehicleActiveDeal | null;
  vehicle: OpsVehicleData;
  profile: OpsVehicleProfile;
  documents: OpsVehicleDocument[];
  serviceLog: OpsVehicleServiceLogEntry[];
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
  workflowTasks: OpsDealWorkflowTask[];
  profile: OpsDealProfile;
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
  documents: OpsDealDocument[];
  invoices: OpsDealInvoice[];
  timeline: OpsDealTimelineEvent[];
};

// Вспомогательные функции перемещены в operations-server.ts

// Серверные функции перемещены в operations-server.ts
