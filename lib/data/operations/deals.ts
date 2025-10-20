export type WorkflowRole =
  | "OP_MANAGER"
  | "OPERATOR"
  | "SUPPORT"
  | "RISK_MANAGER"
  | "FINANCE"
  | "INVESTOR"
  | "LEGAL"
  | "ACCOUNTING"
  | "ADMIN"
  | "CLIENT";

export const WORKFLOW_ROLES: Array<{ code: WorkflowRole; name: string }> = [
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
];

export const WORKFLOW_ROLE_LABELS = WORKFLOW_ROLES.reduce(
  (acc, role) => {
    acc[role.code] = role.name;
    return acc;
  },
  {} as Record<WorkflowRole, string>,
);

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

export type WorkflowGuardMeta = {
  key: string;
  label: string;
  hint?: string;
  requiresDocument?: boolean;
};

export type WorkflowStatusMeta = {
  key: OpsDealStatusKey;
  title: string;
  description: string;
  ownerRole: WorkflowRole;
  slaLabel?: string;
  entryActions: string[];
  exitGuards: WorkflowGuardMeta[];
};

export const OPS_WORKFLOW_STATUSES: WorkflowStatusMeta[] = [
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
];

export const OPS_WORKFLOW_STATUS_MAP = OPS_WORKFLOW_STATUSES.reduce(
  (acc, status) => {
    acc[status.key] = status;
    return acc;
  },
  {} as Record<OpsDealStatusKey, WorkflowStatusMeta>,
);

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

export type OpsDealGuardStatus = {
  key: string;
  label: string;
  hint?: string;
  fulfilled: boolean;
  requiresDocument?: boolean;
  note?: string | null;
  attachmentPath?: string | null;
  attachmentUrl?: string | null;
  completedAt?: string | null;
};

export type OpsDealSummary = {
  id: string;
  dealId: string;
  client: string;
  vehicle: string;
  updatedAt: string;
  stage: string;
  statusKey: OpsDealStatusKey;
  ownerRole: WorkflowRole;
  source: string;
  nextAction: string;
  slaDueAt?: string | null;
  guardStatuses: OpsDealGuardStatus[];
  amount?: string;
};

function createGuardStatuses(statusKey: OpsDealStatusKey, fulfilledKeys: string[] = []) {
  const meta = OPS_WORKFLOW_STATUS_MAP[statusKey];
  return meta.exitGuards.map((guard) => ({
    key: guard.key,
    label: guard.label,
    hint: guard.hint,
    fulfilled: fulfilledKeys.includes(guard.key),
    requiresDocument: guard.requiresDocument ?? false,
    note: null,
    attachmentPath: null,
    attachmentUrl: null,
    completedAt: null,
  }));
}

export const OPS_DEALS: OpsDealSummary[] = [
  {
    id: "deal-new-3011",
    dealId: "FL-3011",
    client: "Ali Khan",
    vehicle: "BMW X5 2024",
    updatedAt: "2025-02-10T08:15:00Z",
    stage: "Waiting for vehicle confirmation",
    statusKey: "NEW",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.NEW.ownerRole,
    source: "Website",
    nextAction: "Связаться с дилером и подтвердить наличие авто",
    slaDueAt: "2025-02-10T16:15:00Z",
    guardStatuses: createGuardStatuses("NEW"),
    amount: "AED 240,000",
  },
  {
    id: "deal-offer-3020",
    dealId: "FL-3020",
    client: "Maria Gomez",
    vehicle: "Mercedes-Benz GLE",
    updatedAt: "2025-02-10T07:40:00Z",
    stage: "Quote draft in progress",
    statusKey: "OFFER_PREP",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.OFFER_PREP.ownerRole,
    source: "Broker",
    nextAction: "Согласовать условия предложения с клиентом",
    slaDueAt: "2025-02-10T15:40:00Z",
    guardStatuses: createGuardStatuses("OFFER_PREP"),
    amount: "AED 198,000",
  },
  {
    id: "deal-veh-2784",
    dealId: "FL-2784",
    client: "Chen Wei",
    vehicle: "Audi Q8",
    updatedAt: "2025-02-09T18:20:00Z",
    stage: "VIN verification scheduled",
    statusKey: "VEHICLE_CHECK",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.VEHICLE_CHECK.ownerRole,
    source: "Website",
    nextAction: "Загрузить фото VIN и подтверждение цены",
    slaDueAt: "2025-02-10T10:20:00Z",
    guardStatuses: createGuardStatuses("VEHICLE_CHECK", ["vehicle.verified"]),
    amount: "AED 210,000",
  },
  {
    id: "deal-docs-3122",
    dealId: "FL-3122",
    client: "Olesya Petrova",
    vehicle: "Range Rover Sport",
    updatedAt: "2025-02-09T15:05:00Z",
    stage: "Collecting bank statements",
    statusKey: "DOCS_COLLECT",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.DOCS_COLLECT.ownerRole,
    source: "Website",
    nextAction: "Получить Emirates ID и банковские выписки",
    slaDueAt: "2025-02-11T15:05:00Z",
    guardStatuses: createGuardStatuses("DOCS_COLLECT"),
    amount: "AED 265,000",
  },
  {
    id: "deal-risk-2204",
    dealId: "FL-2204",
    client: "Hassan Al Mansoori",
    vehicle: "Tesla Model X Plaid",
    updatedAt: "2025-02-09T12:30:00Z",
    stage: "Awaiting AECB report",
    statusKey: "RISK_REVIEW",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.RISK_REVIEW.ownerRole,
    source: "Partner referral",
    nextAction: "Получить скоринг AECB и обновить статус",
    slaDueAt: "2025-02-10T12:30:00Z",
    guardStatuses: createGuardStatuses("RISK_REVIEW"),
    amount: "AED 320,000",
  },
  {
    id: "deal-fin-1987",
    dealId: "FL-1987",
    client: "Lina Haddad",
    vehicle: "Porsche Cayenne Turbo",
    updatedAt: "2025-02-09T09:10:00Z",
    stage: "Financing package review",
    statusKey: "FINANCE_REVIEW",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.FINANCE_REVIEW.ownerRole,
    source: "Broker",
    nextAction: "Подтвердить финансовую модель и лимиты",
    slaDueAt: "2025-02-10T17:10:00Z",
    guardStatuses: createGuardStatuses("FINANCE_REVIEW"),
    amount: "AED 280,000",
  },
  {
    id: "deal-inv-1765",
    dealId: "FL-1765",
    client: "Yuki Tanaka",
    vehicle: "Lamborghini Urus",
    updatedAt: "2025-02-08T18:55:00Z",
    stage: "Investor package sent",
    statusKey: "INVESTOR_PENDING",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.INVESTOR_PENDING.ownerRole,
    source: "VIP referral",
    nextAction: "Дождаться подтверждения инвестора",
    slaDueAt: "2025-02-10T18:55:00Z",
    guardStatuses: createGuardStatuses("INVESTOR_PENDING"),
    amount: "AED 480,000",
  },
  {
    id: "deal-legal-1654",
    dealId: "FL-1654",
    client: "Sanjay Patel",
    vehicle: "Bentley Flying Spur",
    updatedAt: "2025-02-08T16:20:00Z",
    stage: "Contract draft in review",
    statusKey: "CONTRACT_PREP",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.CONTRACT_PREP.ownerRole,
    source: "Website",
    nextAction: "Подготовить финальную версию договора",
    slaDueAt: "2025-02-11T10:00:00Z",
    guardStatuses: createGuardStatuses("CONTRACT_PREP"),
    amount: "AED 350,000",
  },
  {
    id: "deal-sign-1544",
    dealId: "FL-1544",
    client: "Noora Al Farsi",
    vehicle: "Ferrari Roma",
    updatedAt: "2025-02-08T10:05:00Z",
    stage: "Awaiting supplier payment",
    statusKey: "SIGNING_FUNDING",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.SIGNING_FUNDING.ownerRole,
    source: "Broker",
    nextAction: "Подписать договор и провести оплату поставщику",
    slaDueAt: "2025-02-09T18:05:00Z",
    guardStatuses: createGuardStatuses("SIGNING_FUNDING", ["esign.allSigned", "payments.advanceReceived"]),
    amount: "AED 520,000",
  },
  {
    id: "deal-delivery-1499",
    dealId: "FL-1499",
    client: "Olivia Smith",
    vehicle: "Maserati Levante",
    updatedAt: "2025-02-07T17:45:00Z",
    stage: "Delivery scheduled 11 Feb",
    statusKey: "VEHICLE_DELIVERY",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.VEHICLE_DELIVERY.ownerRole,
    source: "Website",
    nextAction: "Подготовить акт выдачи и слоты доставки",
    slaDueAt: "2025-02-11T09:00:00Z",
    guardStatuses: createGuardStatuses("VEHICLE_DELIVERY"),
    amount: "AED 295,000",
  },
  {
    id: "deal-active-1401",
    dealId: "FL-1401",
    client: "Rahul Mehta",
    vehicle: "Rolls-Royce Cullinan",
    updatedAt: "2025-02-06T09:30:00Z",
    stage: "Active lease · billed monthly",
    statusKey: "ACTIVE",
    ownerRole: OPS_WORKFLOW_STATUS_MAP.ACTIVE.ownerRole,
    source: "Website",
    nextAction: "Контроль платежей и обслуживания",
    guardStatuses: createGuardStatuses("ACTIVE"),
    amount: "AED 600,000",
  },
];

export const OPS_DEAL_PIPELINE_GROUPS: Array<{
  label: string;
  statuses: OpsDealStatusKey[];
}> = [
  { label: "New Leads", statuses: ["NEW"] },
  { label: "Offer Prep", statuses: ["OFFER_PREP"] },
  { label: "Vehicle Check", statuses: ["VEHICLE_CHECK"] },
  { label: "Docs Collection", statuses: ["DOCS_COLLECT"] },
  { label: "Risk Review", statuses: ["RISK_REVIEW"] },
  { label: "Finance", statuses: ["FINANCE_REVIEW"] },
  { label: "Investor", statuses: ["INVESTOR_PENDING"] },
  { label: "Contract", statuses: ["CONTRACT_PREP"] },
  { label: "Signing & Funding", statuses: ["SIGNING_FUNDING"] },
  { label: "Delivery", statuses: ["VEHICLE_DELIVERY"] },
  { label: "Active", statuses: ["ACTIVE"] },
  { label: "Cancelled", statuses: ["CANCELLED"] },
];

export type OpsDealTimelineEvent = {
  id: string;
  timestamp: string;
  text: string;
  icon: string;
};

export const OPS_DEAL_TIMELINE: OpsDealTimelineEvent[] = [
  {
    id: "timeline-1",
    timestamp: "2025-01-14 12:05",
    text: "Vehicle handover scheduled for 15.01 18:00",
    icon: "calendar-check",
  },
  {
    id: "timeline-2",
    timestamp: "2025-01-14 11:22",
    text: "Agreement signed by client via digital signature",
    icon: "file-check",
  },
  {
    id: "timeline-3",
    timestamp: "2025-01-14 10:19",
    text: "AI confirmed Emirates ID and income",
    icon: "sparkles",
  },
  {
    id: "timeline-4",
    timestamp: "2025-01-14 10:00",
    text: "Application created by operator Maria T.",
    icon: "user-plus",
  },
];

export type OpsDealDocument = {
  id: string;
  title: string;
  status: string;
};

export const OPS_DEAL_DOCUMENTS: OpsDealDocument[] = [
  { id: "lease-agreement", title: "Leasing Agreement", status: "Signed · updated 14 Jan 2025 11:22" },
  { id: "eu-passport", title: "EU Passport", status: "AI check passed · updated 14 Jan 2025 10:19" },
  { id: "income-statement", title: "Income Statement", status: "Requires update · updated 13 Jan 2025 09:55" },
  { id: "payment-schedule", title: "Payment schedule (update)", status: "Version 02/2025" },
  { id: "delivery-form", title: "Delivery acceptance form", status: "Signature pending" },
  { id: "registration", title: "Registration Certificate (Mulkiya)", status: "Valid until 12.12.2025" },
  { id: "insurance", title: "Insurance Policy", status: "Version 2025" },
  { id: "inspection", title: "Inspection Protocol", status: "Passed 01.2025" },
  { id: "vehicle-rules", title: "Vehicle Usage Rules", status: "Current" },
];

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

export const OPS_DEAL_PROFILE: OpsDealProfile = {
  dealId: "FL-2042",
  vehicleName: "Bentley Continental GT",
  status: "Act Signing",
  description: "Client — Maxime Dupont. Created — January 14, 2025.",
  image: "/assets/bentley-bw.jpg",
  monthlyPayment: "AED 4,200",
  nextPayment: "15 Feb 2025",
  dueAmount: "AED 18,000",
};

export type OpsDealKeyInfoEntry = {
  label: string;
  value: string;
};

export const OPS_DEAL_KEY_INFO: OpsDealKeyInfoEntry[] = [
  { label: "VIN", value: "R1T-2204" },
  { label: "Program Term", value: "36 months" },
  { label: "Issue Date", value: "14.01.2025" },
  { label: "Mileage", value: "18 400 km" },
  { label: "Last Service", value: "12.01.2025" },
  { label: "Odoo Card", value: "Open Card" },
];

export type OpsDealDetailsEntry = {
  label: string;
  value: string;
};

export const OPS_DEAL_DETAILS: OpsDealDetailsEntry[] = [
  { label: "Source", value: "Renty website" },
  { label: "Created at", value: "14 Jan 2025 · 10:00" },
  { label: "Created by", value: "Operator Maria T." },
  { label: "Last status update", value: "14 Jan 2025 · 12:05" },
  { label: "Listing reference", value: "DL-7801-FL2042" },
  { label: "Lead priority", value: "High" },
];

export type OpsDealInvoice = {
  id: string;
  invoiceNumber: string;
  type: string;
  totalAmount: string;
  dueDate: string;
  status: string;
};

export const OPS_DEAL_INVOICES: OpsDealInvoice[] = [
  {
    id: "INV-2025-0001",
    invoiceNumber: "INV-2025-0001",
    type: "Monthly payment",
    totalAmount: "AED 31,500",
    dueDate: "Due · 12 Feb 2025",
    status: "Overdue",
  },
  {
    id: "INV-2025-0002",
    invoiceNumber: "INV-2025-0002",
    type: "Monthly payment",
    totalAmount: "AED 31,500",
    dueDate: "Due · 12 Mar 2025",
    status: "Pending",
  },
];

export type OpsDealClientProfile = {
  name: string;
  phone: string;
  email: string;
  scoring: string;
  notes: string;
};

export const OPS_DEAL_CLIENT: OpsDealClientProfile = {
  name: "Maxime Dupont",
  phone: "+7 999 123-45-67",
  email: "maxime.dupont@fastlease.io",
  scoring: "92/100",
  notes: "The client has a completed deal from 2023. No delinquencies recorded.",
};
