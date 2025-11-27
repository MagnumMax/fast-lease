import type { DealCompanyCode } from "@/lib/data/deal-companies";
import type { WorkspaceTask } from "@/lib/supabase/queries/tasks";

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
  { code: "CLIENT", name: "Покупатель" },
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
  | "DOCS_COLLECT_SELLER"
  | "RISK_REVIEW"
  | "FINANCE_REVIEW"
  | "INVESTOR_PENDING"
  | "CONTRACT_PREP"
  | "DOC_SIGNING"
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
    entryActions: ["Подписание покупателем коммерческого предложения"],
    exitGuards: [
      {
        key: "quotationPrepared",
        label: "Подписанное КП загружено",
        requiresDocument: true,
      },
    ],
  },
  {
    key: "VEHICLE_CHECK",
    title: "Проверка авто",
    description: "Проверка технического состояния и рыночной стоимости автомобиля.",
    ownerRole: "TECH_SPECIALIST",
    slaLabel: "SLA 8h",
    entryActions: ["Проверка тех состояния и оценочной стоимости авто"],
    exitGuards: [
      {
        key: "vehicle.verified",
        label: "Проверка тех состояния и оценочной стоимости авто",
        requiresDocument: true,
      },
    ],
  },
  {
    key: "DOCS_COLLECT",
    title: "Сбор документов покупателя",
    description: "Комплектование KYC/финансовых документов покупателя.",
    ownerRole: "OP_MANAGER",
    slaLabel: "SLA 48h",
    entryActions: ["Собрать пакет документов покупателя"],
    exitGuards: [
      {
        key: "docs.required.allUploaded",
        label: "Документы покупателя загружены",
        requiresDocument: false,
        hint: "Документы загружаются по необходимости — выберите тип покупателя, чтобы показать список.",
      },
    ],
  },
  {
    key: "DOCS_COLLECT_SELLER",
    title: "Сбор документов продавца",
    description: "Комплектование пакета документов от продавца/дилера.",
    ownerRole: "OP_MANAGER",
    slaLabel: "SLA 48h",
    entryActions: ["Собрать пакет документов продавца"],
    exitGuards: [
      {
        key: "docs.seller.allUploaded",
        label: "Документы продавца загружены",
        requiresDocument: false,
        hint: "Документы загружаются по необходимости — выберите тип продавца, чтобы показать список.",
      },
    ],
  },
  {
    key: "RISK_REVIEW",
    title: "Проверка риска",
    description: "AECB скоринг и внутреннее одобрение риска.",
    ownerRole: "RISK_MANAGER",
    slaLabel: "SLA 24h",
    entryActions: ["Провести проверку и внутренний скоринг", "Отправить запрос AECB"],
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
    key: "DOC_SIGNING",
    title: "Подписание документов",
    description: "Загрузка подписанных договоров, графиков и актов.",
    ownerRole: "OP_MANAGER",
    slaLabel: "SLA 24h",
    entryActions: ["Подписание документов"],
    exitGuards: [
      {
        key: "contracts.signedUploaded",
        label: "Подписанные документы загружены",
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
      },
    ],
  },
  {
    key: "VEHICLE_DELIVERY",
    title: "Выдача автомобиля",
    description: "Подготовка и фактическая выдача авто покупателю.",
    ownerRole: "TECH_SPECIALIST",
    entryActions: ["Подготовить акт выдачи и слот доставки"],
    exitGuards: [
      {
        key: "delivery.confirmed",
        label: "Акт выдачи подтверждён",
        requiresDocument: false,
      },
    ],
  },
  {
    key: "ACTIVE",
    title: "Активный лизинг",
    description: "Договор активирован, обслуживание покупателя.",
    ownerRole: "ACCOUNTING",
    entryActions: ["Передать в пост-учёт и биллинг"],
    exitGuards: [],
  },
  {
    key: "CANCELLED",
    title: "Отменена",
    description: "Заявка закрыта до активации — покупатель или менеджер отменили процесс.",
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
  {
    label: "Docs Collection",
    statuses: ["DOCS_COLLECT" as OpsDealStatusKey, "DOCS_COLLECT_SELLER" as OpsDealStatusKey],
  },
  { label: "Risk Review", statuses: ["RISK_REVIEW" as OpsDealStatusKey] },
  { label: "Finance", statuses: ["FINANCE_REVIEW" as OpsDealStatusKey] },
  { label: "Investor", statuses: ["INVESTOR_PENDING" as OpsDealStatusKey] },
  { label: "Contract", statuses: ["CONTRACT_PREP" as OpsDealStatusKey] },
  { label: "Doc Signing", statuses: ["DOC_SIGNING" as OpsDealStatusKey] },
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
  DOCS_COLLECT_SELLER: "OP_MANAGER",
  RISK_REVIEW: "RISK_MANAGER",
  FINANCE_REVIEW: "FINANCE",
  INVESTOR_PENDING: "INVESTOR",
  CONTRACT_PREP: "LEGAL",
  DOC_SIGNING: "OP_MANAGER",
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
  status: string | null;
  image?: string | null;
  license_plate?: string | null;
  license_plate_display?: string | null;
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
    vin?: string | null;
  };
};

export type OpsClientType = "Personal" | "Company";

export type OpsClientCompanyProfile = {
  contactName: string | null;
  contactEmiratesId: string | null;
  trn: string | null;
  licenseNumber: string | null;
};

export type OpsCarRecord = {
  id: string;
  vin: string;
  licensePlate: string | null;
  licensePlateDisplay?: string | null;
  name: string;
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  bodyType: string | null;
  status: string;
  statusLabel: string;
  statusTone: OpsTone;
  mileage: string;
  mileageValue: number | null;
  activeDealNumber: string | null;
  activeDealStatus: string | null;
  activeDealStatusLabel: string | null;
  activeDealStatusTone: OpsTone | null;
  activeDealHref: string | null;
  detailHref: string;
  type: string | null;
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

export type OpsVehicleDeal = {
  id: string;
  dealNumber: string;
  status: string | null;
  statusLabel: string | null;
  statusTone: OpsTone | null;
  stageLabel?: string | null;
  monthlyPayment?: string | null;
  totalAmount?: string | null;
  principalAmount?: string | null;
  termMonths?: number | null;
  termLabel?: string | null;
  contractPeriod?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  firstPaymentDate?: string | null;
  nextPaymentDue?: string | null;
  overdueAmount?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientHref?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  href?: string | null;
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
  client: string;
  vehicleId?: string | null;
  vehicle: string;
  vehicleVin?: string | null;
  vehicleRegistration?: string | null;
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
  contractStartDate?: string | null;
  companyCode?: DealCompanyCode | null;
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

export type OpsSellerDocument = {
  id: string;
  title: string;
  status?: string | null;
  documentType?: string | null;
  uploadedAt?: string | null;
  url: string | null;
  bucket?: string | null;
  storagePath?: string | null;
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
  gallery?: Array<{ id: string; url: string | null; label?: string | null; isPrimary?: boolean }>;
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
  source: string;
  notes: string;
  userId?: string | null;
  detailHref?: string | null;
};

export type OpsDealCompany = {
  code: DealCompanyCode;
  name: string;
  prefix: string;
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
  statusKey: OpsDealStatusKey;
  companyCode: DealCompanyCode | null;
  buyerType: "individual" | "company" | null;
  sellerType: "individual" | "company" | null;
  principalAmount: number | null;
  totalAmount: number | null;
  monthlyPayment: number | null;
  monthlyLeaseRate: number | null;
  interestRate: number | null;
  downPaymentAmount: number | null;
  termMonths: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  firstPaymentDate: string | null;
  completedAt: string | null;
  insurance: OpsInsuranceEditDefaults | null;
};

export type OpsCommercialOffer = {
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
  source: "deal" | "application" | "client";
  bucket: string | null;
  storagePath: string | null;
  uploadedAt: string | null;
  signedAt: string | null;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
  context: "personal" | "company";
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
  clientType: OpsClientType | null;
  memberSince: string | null;
  source: string | null;
  email: string | null;
  phone: string | null;
  emiratesId: string | null;
  passportNumber: string | null;
  nationality: string | null;
  residencyStatus: string | null;
  dateOfBirth: string | null;
  company: OpsClientCompanyProfile;
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

const normalizeDocumentTypeKey = (value: string) => value.trim().toLowerCase();

function createDocumentTypeRegistry<
  TValue extends string,
  TEntry extends { value: TValue; label: string }
>(
  entries: readonly TEntry[],
  aliasEntries: ReadonlyArray<[string, TValue]>,
) {
  const canonicalIndex = entries.reduce<Record<string, TValue>>((acc, entry) => {
    acc[normalizeDocumentTypeKey(entry.value)] = entry.value;
    return acc;
  }, {});

  const aliasIndex = aliasEntries.reduce<Record<string, TValue>>((acc, [alias, target]) => {
    acc[normalizeDocumentTypeKey(alias)] = target;
    return acc;
  }, {});

  const labelMap = entries.reduce<Record<string, string>>((acc, entry) => {
    acc[entry.value] = entry.label;
    acc[normalizeDocumentTypeKey(entry.value)] = entry.label;
    return acc;
  }, {});

  for (const [alias, target] of aliasEntries) {
    const normalizedAlias = normalizeDocumentTypeKey(alias);
    const targetLabel = labelMap[target] ?? labelMap[normalizeDocumentTypeKey(target)];
    if (!targetLabel) {
      continue;
    }
    labelMap[alias] = targetLabel;
    labelMap[normalizedAlias] = targetLabel;
  }

  const normalizeValue = (value?: string | null): TValue | undefined => {
    if (!value) return undefined;
    const key = normalizeDocumentTypeKey(value);
    return canonicalIndex[key] ?? aliasIndex[key] ?? undefined;
  };

  const resolveLabel = (value?: string | null): string | undefined => {
    if (!value) return undefined;
    const normalized = normalizeDocumentTypeKey(value);
    return labelMap[value] ?? labelMap[normalized];
  };

  return {
    labelMap,
    normalizeValue,
    resolveLabel,
  } as const;
}

export const OPS_VEHICLE_STATUS_META: Record<string, { label: string; tone: OpsTone }> = {
  draft: { label: "Черновик", tone: "muted" },
  available: { label: "Доступен", tone: "success" },
  reserved: { label: "Зарезервирован", tone: "warning" },
  leased: { label: "В лизинге", tone: "info" },
  maintenance: { label: "На обслуживании", tone: "warning" },
  retired: { label: "Списан", tone: "danger" },
};

export const VEHICLE_DOCUMENT_TYPES = [
  { value: "vehicle_registration", label: "Регистрационные данные транспортного средства" },
  { value: "vehicle_inspection_certificate", label: "Сертификат техосмотра" },
  { value: "vehicle_possession_certificate", label: "Сертификат владения транспортным средством" },
  { value: "vehicle_transfer_certificate", label: "Сертификат передачи транспортного средства" },
  { value: "certificate_of_installation", label: "Сертификат установки" },
  { value: "delivery_form", label: "Акт приёма-передачи" },
  { value: "insurance_policy", label: "Страховой полис" },
  { value: "insurance_policy_with_tax_invoice", label: "Страховка с налоговым инвойсом" },
  { value: "other", label: "Другой документ" },
] as const;

export type VehicleDocumentTypeValue = (typeof VEHICLE_DOCUMENT_TYPES)[number]["value"];

const VEHICLE_DOCUMENT_TYPE_ALIAS_ENTRIES = [
  ["vehicle_license", "vehicle_registration"],
  ["vehicle_test_certificate", "vehicle_inspection_certificate"],
  ["certificate", "vehicle_inspection_certificate"],
  ["motor_insurance_policy", "insurance_policy"],
  ["motor_insurance_policy_schedule", "insurance_policy"],
] as const satisfies ReadonlyArray<[string, VehicleDocumentTypeValue]>;

const VEHICLE_DOCUMENT_TYPE_REGISTRY = createDocumentTypeRegistry<
  VehicleDocumentTypeValue,
  (typeof VEHICLE_DOCUMENT_TYPES)[number]
>(VEHICLE_DOCUMENT_TYPES, VEHICLE_DOCUMENT_TYPE_ALIAS_ENTRIES);

export const VEHICLE_DOCUMENT_TYPE_LABEL_MAP = VEHICLE_DOCUMENT_TYPE_REGISTRY.labelMap;

export const normalizeVehicleDocumentType = VEHICLE_DOCUMENT_TYPE_REGISTRY.normalizeValue;

export const getVehicleDocumentLabel = VEHICLE_DOCUMENT_TYPE_REGISTRY.resolveLabel;

export type ClientDocumentContext = "personal" | "company" | "any";

export const CLIENT_DOCUMENT_TYPES = [
  { value: "emirates_id", label: "Emirates ID", context: "personal" as const },
  { value: "passport", label: "Паспорт", context: "personal" as const },
  { value: "visa", label: "Виза", context: "personal" as const },
  { value: "driving_license", label: "Водительские права", context: "personal" as const },
  { value: "identity_document", label: "Документ, удостоверяющий личность", context: "personal" as const },
  { value: "salary_certificate", label: "Справка о доходах", context: "personal" as const },
  { value: "bank_statement", label: "Банковская выписка", context: "personal" as const },
  { value: "proof_of_address", label: "Подтверждение адреса", context: "personal" as const },
  { value: "vcc_certificate", label: "VCC (Vehicle Certificate of Conformity)", context: "any" as const },
  { value: "vehicle_possession_certificate", label: "Vehicle Possession Certificate", context: "any" as const },
  { value: "hiyaza_certificate", label: "Hiyaza", context: "any" as const },
  { value: "mulkia_certificate", label: "Mulkia", context: "any" as const },
  { value: "passing_certificate", label: "Passing", context: "any" as const },
  { value: "company_license", label: "Лицензия компании", context: "company" as const },
  { value: "corporate_documents", label: "Корпоративные документы", context: "company" as const },
  { value: "company_bank_statement", label: "Банковская выписка компании", context: "company" as const },
  { value: "lease_agreement", label: "Договор аренды", context: "any" as const },
  { value: "signed_lease_agreement", label: "Договор аренды (подписанный)", context: "any" as const },
  { value: "purchase_agreement", label: "Договор покупки", context: "any" as const },
  { value: "signed_purchase_agreement", label: "Договор покупки (подписанный)", context: "any" as const },
  {
    value: "preliminary_purchase_agreement",
    label: "Предварительный договор купли-продажи",
    context: "any" as const,
  },
  { value: "payment_schedule", label: "Платёжный график", context: "any" as const },
  { value: "signed_payment_schedule", label: "Платёжный график (подписанный)", context: "any" as const },
  { value: "tax_invoice", label: "Tax invoice", context: "any" as const },
  { value: "delivery_act", label: "Акт приёма-передачи", context: "any" as const },
  { value: "signed_delivery_act", label: "Акт приёма-передачи (подписанный)", context: "any" as const },
  { value: "technical_report", label: "Технический отчёт", context: "any" as const },
  { value: "aecb_credit_report", label: "AECB credit report", context: "any" as const },
  { value: "commercial_offer", label: "Коммерческое предложение", context: "any" as const },
  { value: "signed_commercial_offer", label: "Коммерческое предложение (подписанное)", context: "any" as const },
  { value: "quotation", label: "Quotation", context: "any" as const },
  { value: "payment_receipt", label: "Платёжка", context: "any" as const },
  { value: "spa_invoice", label: "Invoice от физлица (контракт SPA)", context: "any" as const },
  { value: "noc_company_letter", label: "NOC letter от компании", context: "any" as const },
  { value: "noc_gps_letter", label: "NOC letter от GPS", context: "any" as const },
  { value: "trn_certificate", label: "TRN-сертификат", context: "any" as const },
  { value: "other", label: "Другой документ", context: "any" as const },
] as const;

export type ClientDocumentTypeValue = (typeof CLIENT_DOCUMENT_TYPES)[number]["value"];

const CLIENT_DOCUMENT_TYPE_ALIAS_ENTRIES = [
  ["id_card", "identity_document"],
  ["identity_card", "identity_document"],
  ["identity_documents", "identity_document"],
  ["identification", "identity_document"],
  ["identification_document", "identity_document"],
  ["identification_documents", "identity_document"],
  ["personal_identification", "identity_document"],
  ["national_id", "identity_document"],
  ["passport_copy", "passport"],
  ["driver_license", "driving_license"],
  ["drivers_license", "driving_license"],
  ["bank_statements", "bank_statement"],
  ["proof_of_income", "salary_certificate"],
  ["salary_cert", "salary_certificate"],
  ["eid", "emirates_id"],
  ["emirates_id_card", "emirates_id"],
  ["tax invoice", "tax_invoice"],
  ["trade_license", "company_license"],
  ["commercial_license", "company_license"],
  ["company_registration_documents", "corporate_documents"],
  ["business_registration_documents", "corporate_documents"],
  ["company_and_transaction_documents", "corporate_documents"],
  ["company_documents", "corporate_documents"],
  ["company_corporate_documents", "corporate_documents"],
  ["corporate_document", "corporate_documents"],
  ["company_bank_statements", "company_bank_statement"],
  ["quote", "quotation"],
  ["quotation_doc", "quotation"],
  ["supplier_quotation", "quotation"],
  ["payment_receipt_doc", "payment_receipt"],
  ["payment_receipt_supplier", "payment_receipt"],
  ["payment_order", "payment_receipt"],
  ["vcc", "vcc_certificate"],
  ["vehicle_certificate_of_conformity", "vcc_certificate"],
  ["hiyaza", "hiyaza_certificate"],
  ["vehicle_possession_certificate/hiyaza", "vehicle_possession_certificate"],
  ["mulkia", "mulkia_certificate"],
  ["passing", "passing_certificate"],
  ["spa", "spa_invoice"],
  ["spa_contract", "spa_invoice"],
  ["noc", "noc_company_letter"],
  ["noc_letter", "noc_company_letter"],
  ["noc_gps", "noc_gps_letter"],
  ["trn", "trn_certificate"],
] as const satisfies ReadonlyArray<[string, ClientDocumentTypeValue]>;

const CLIENT_DOCUMENT_TYPE_REGISTRY = createDocumentTypeRegistry<
  ClientDocumentTypeValue,
  (typeof CLIENT_DOCUMENT_TYPES)[number]
>(CLIENT_DOCUMENT_TYPES, CLIENT_DOCUMENT_TYPE_ALIAS_ENTRIES);

export const CLIENT_DOCUMENT_TYPE_LABEL_MAP = CLIENT_DOCUMENT_TYPE_REGISTRY.labelMap;

export const normalizeClientDocumentType = CLIENT_DOCUMENT_TYPE_REGISTRY.normalizeValue;

export const getClientDocumentLabel = CLIENT_DOCUMENT_TYPE_REGISTRY.resolveLabel;

export type DealDocumentCategory = "required" | "signature" | "archived" | "other";

export const DEAL_DOCUMENT_TYPES = [
  { value: "account_confirmation_letter", label: "Справка об открытии счёта", category: "other" as const },
  { value: "addendum", label: "Дополнительное соглашение", category: "other" as const },
  { value: "assigning_letter", label: "Письмо об уступке прав", category: "signature" as const },
  { value: "authorization_letter", label: "Письмо-доверенность", category: "signature" as const },
  { value: "bank_account_details", label: "Банковские реквизиты", category: "other" as const },
  { value: "commercial_license", label: "Коммерческая лицензия", category: "required" as const },
  { value: "corporate_documents", label: "Корпоративные документы", category: "other" as const },
  { value: "contract", label: "Контракт", category: "required" as const },
  { value: "signed_quote", label: "Подписанное КП", category: "signature" as const },
  { value: "signed_commercial_offer", label: "Подписанное коммерческое предложение", category: "signature" as const },
  { value: "estimation", label: "Смета/оценка", category: "other" as const },
  { value: "investment_agreement", label: "Инвестиционный договор", category: "required" as const },
  { value: "invoice", label: "Инвойс", category: "other" as const },
  { value: "lease_agreement", label: "Договор аренды", category: "required" as const },
  { value: "purchase_agreement", label: "Договор покупки", category: "required" as const },
  { value: "memorandum_of_understanding", label: "Меморандум о взаимопонимании", category: "signature" as const },
  { value: "payment_schedule", label: "Платёжный график", category: "required" as const },
  { value: "proforma_invoice", label: "Проформа-инвойс", category: "other" as const },
  { value: "receipt", label: "Квитанция", category: "other" as const },
  { value: "receipt_voucher", label: "Приходный ордер", category: "archived" as const },
  { value: "sale_confirmation", label: "Подтверждение продажи", category: "signature" as const },
  { value: "statement", label: "Statement of Account", category: "other" as const },
  { value: "tax_credit_note", label: "Корректировочный налоговый документ", category: "archived" as const },
  { value: "tax_invoice", label: "Налоговый инвойс", category: "other" as const },
  { value: "termination_contract", label: "Договор расторжения", category: "archived" as const },
  { value: "vat_registration_certificate", label: "Сертификат регистрации VAT", category: "required" as const },
  { value: "vehicle_purchase_agreement", label: "Договор покупки транспортного средства", category: "required" as const },
  { value: "vehicle_sale_contract", label: "Контракт продажи транспортного средства", category: "required" as const },
  { value: "other", label: "Документ сделки", category: "other" as const },
] as const;

export type DealDocumentTypeValue = (typeof DEAL_DOCUMENT_TYPES)[number]["value"];

const DEAL_DOCUMENT_TYPE_ALIAS_ENTRIES = [
  ["additional_agreement", "addendum"],
  ["business_registration_documents", "corporate_documents"],
  ["company_registration_documents", "corporate_documents"],
  ["company_and_transaction_documents", "corporate_documents"],
  ["company_documents", "corporate_documents"],
  ["long_term_rental_agreement", "lease_agreement"],
  ["long_term_rental_vehicle_agreement", "lease_agreement"],
  ["long_term_vehicle_rental_agreement", "lease_agreement"],
  ["vehicle_rental_agreement", "lease_agreement"],
  ["rent_payment_schedule", "payment_schedule"],
  ["schedule", "payment_schedule"],
  ["preliminary_vehicle_purchase_agreement", "vehicle_purchase_agreement"],
  ["vehicle_sales_agreement", "vehicle_sale_contract"],
  ["sale_confirmation_letter", "sale_confirmation"],
] as const satisfies ReadonlyArray<[string, DealDocumentTypeValue]>;

const DEAL_DOCUMENT_TYPE_REGISTRY = createDocumentTypeRegistry<
  DealDocumentTypeValue,
  (typeof DEAL_DOCUMENT_TYPES)[number]
>(DEAL_DOCUMENT_TYPES, DEAL_DOCUMENT_TYPE_ALIAS_ENTRIES);

export const DEAL_DOCUMENT_TYPE_LABEL_MAP = DEAL_DOCUMENT_TYPE_REGISTRY.labelMap;

export const normalizeDealDocumentType = DEAL_DOCUMENT_TYPE_REGISTRY.normalizeValue;

export const getDealDocumentLabel = DEAL_DOCUMENT_TYPE_REGISTRY.resolveLabel;

export type OpsVehicleDocument = {
  id: string;
  title: string;
  status: string;
  statusTone?: OpsTone;
  typeCode?: string;
  type?: string;
  date?: string;
  uploadedAt?: string | null;
  dealNumber?: string | null;
  url: string | null;
  source?: "deal" | "vehicle";
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

export type OpsInsuranceInfo = {
  provider: string | null;
  policyNumber: string | null;
  policyType: string | null;
  premiumAmount: string | null;
  premiumValue: number | null;
  paymentFrequency: string | null;
  paymentFrequencyLabel: string | null;
  nextPaymentDue: string | null;
  nextPaymentDueLabel: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  coveragePeriodLabel: string | null;
  deductible: string | null;
  deductibleValue: number | null;
  lastPaymentStatus: string | null;
  lastPaymentStatusLabel: string | null;
  lastPaymentDate: string | null;
  lastPaymentDateLabel: string | null;
  contact?: string | null;
  notes?: string | null;
};

export type OpsInsuranceEditDefaults = {
  provider: string | null;
  policyNumber: string | null;
  policyType: string | null;
  premiumAmount: number | null;
  paymentFrequency: string | null;
  nextPaymentDue: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  deductible: number | null;
  lastPaymentStatus: string | null;
  lastPaymentDate: string | null;
  notes?: string | null;
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

export type OpsVehicleData = {
  id: string;
  vin: string | null;
  licensePlate: string | null;
  licensePlateDisplay?: string | null;
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
  monthlyLeaseRate: number | null;
  features: string[];
  rawFeatures: unknown;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CarDetailResult = {
  slug: string;
  vehicleUuid: string;
  activeDeal: OpsVehicleActiveDeal | null;
  deals: OpsVehicleDeal[];
  vehicle: OpsVehicleData;
  profile: OpsVehicleProfile;
  documents: OpsVehicleDocument[];
  serviceLog: OpsVehicleServiceLogEntry[];
  insurance: OpsInsuranceInfo | null;
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
  started: number[];
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
  tasks: WorkspaceTask[];
  profile: OpsDealProfile;
  company: OpsDealCompany | null;
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
  commercialOffer: OpsCommercialOffer | null;
  clientDocuments: OpsClientDocument[];
  documents: OpsDealDocument[];
  sellerDocuments: OpsSellerDocument[];
  invoices: OpsDealInvoice[];
  timeline: OpsDealTimelineEvent[];
  insurance: OpsInsuranceInfo | null;
};

// Вспомогательные функции перемещены в operations-server.ts

// Серверные функции перемещены в operations-server.ts
