import type { DealCompanyCode } from "@/lib/data/deal-companies";
import type { WorkspaceTask } from "@/lib/supabase/queries/tasks";
import workflowTemplateSource from "@/lib/workflow/catalog.runtime.json";
import { parseWorkflowTemplate } from "@/lib/workflow/parser";
import { buildWorkflowCatalog } from "@/lib/workflow/catalog-builder";
import type {
  WorkflowDocumentCategory,
  WorkflowDocumentTypeAlias,
  WorkflowDocumentTypeEntry,
} from "@/lib/workflow/types";
import { stringify as stringifyYaml } from "yaml";

// Типы и константы для операций
// Серверные функции перемещены в operations-server.ts

const workflowTemplate = parseWorkflowTemplate(stringifyYaml(workflowTemplateSource as unknown));
const workflowCatalog = buildWorkflowCatalog(workflowTemplate);

// Константы workflow ролей и статусов из YAML
export const WORKFLOW_ROLES = workflowCatalog.template.roles;

export const WORKFLOW_ROLE_LABELS = workflowCatalog.roleLabels;

export type WorkflowRole = typeof WORKFLOW_ROLES[number]["code"];

export type OpsDealStatusKey = string;

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

const deriveStatusItems = (): WorkflowStatusItem[] => {
  return workflowCatalog.kanbanOrder.map((key) => {
    const status = workflowCatalog.statusByKey[key];
    const taskActions = status?.entryActions?.filter((action) => action.type === "TASK_CREATE") ?? [];
    const ownerRole =
      (taskActions[0]?.type === "TASK_CREATE" ? taskActions[0].task.assigneeRole : undefined) ??
      workflowCatalog.template.workflow.ownerRole;
    const slaHours = taskActions[0]?.type === "TASK_CREATE" ? taskActions[0].task.sla?.hours : undefined;
    const exitGuards =
      status?.exitRequirements?.map((req) => ({
        key: req.key,
        label: req.message ?? req.key,
      })) ?? [];

    return {
      key,
      title: status?.title ?? key,
      description: status?.description ?? "",
      ownerRole: ownerRole as WorkflowRole,
      slaLabel: slaHours ? `SLA ${slaHours}h` : undefined,
      entryActions: taskActions.map((action) => action.task.title),
      exitGuards,
    };
  });
};

export const OPS_WORKFLOW_STATUSES = deriveStatusItems();

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
    statuses: ["DOCS_COLLECT_BUYER" as OpsDealStatusKey, "DOCS_COLLECT_SELLER" as OpsDealStatusKey],
  },
  { label: "Risk Review", statuses: ["RISK_REVIEW" as OpsDealStatusKey] },
  { label: "Finance", statuses: ["FINANCE_REVIEW" as OpsDealStatusKey] },
  { label: "Investor", statuses: ["INVESTOR_PENDING" as OpsDealStatusKey] },
  { label: "Contract", statuses: ["CONTRACT_PREP" as OpsDealStatusKey] },
  { label: "Doc Signing", statuses: ["DOC_SIGNING" as OpsDealStatusKey] },
  { label: "Legal Check", statuses: ["DOC_CHECK_LEGAL" as OpsDealStatusKey] },
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

export const OPS_WORKFLOW_STATUS_EXIT_ROLE: Record<OpsDealStatusKey, WorkflowRole | null> =
  OPS_WORKFLOW_STATUSES.reduce<Record<OpsDealStatusKey, WorkflowRole | null>>((acc, status) => {
    acc[status.key] = status.ownerRole ?? null;
    return acc;
  }, {});

export const WORKFLOW_TASK_TEMPLATES_BY_TYPE = workflowCatalog.taskTemplatesByType;
export const WORKFLOW_TASK_TEMPLATES = workflowCatalog.taskTemplates;

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
  source?: string | null;
  entity_type?: string | null;
  seller_details?: Record<string, unknown> | null;
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

export type OpsSellerDealSummary = {
  id: string;
  number: string;
  vehicle: string;
  vin?: string | null;
  amount: string;
  amountValue: number | null;
  since: string;
  href: string;
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
  entityType?: OpsClientEntityType | null;
  deals?: OpsSellerDealSummary[];
  leasing?: {
    vehicle: string;
    amount: string;
    since: string;
    dealNumber?: string;
    dealId?: string;
    vin?: string | null;
  };
};

export type OpsClientType = "Personal" | "Company";

export type OpsClientEntityType = "personal" | "company";

export function normalizeOpsEntityType(value: string | null | undefined): OpsClientEntityType | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "company") {
    return "company";
  }
  if (normalized === "personal") {
    return "personal";
  }
  return null;
}

export function getOpsClientTypeLabel(entityType: OpsClientEntityType | null): OpsClientType | null {
  if (!entityType) {
    return null;
  }
  if (entityType === "company") {
    return "Company";
  }
  return "Personal";
}

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
  sellerId?: string | null;
  sellerName?: string | null;
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
  metadata?: Record<string, unknown> | null;
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

export type OpsSellerProfile = {
  userId: string;
  fullName: string;
  status: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  source: string | null;
  createdAt: string | null;
  metadata: Record<string, unknown> | null;
  entityType: "personal" | "company" | null;
  sellerDetails: Record<string, unknown> | null;
};

export type OpsSellerDetail = {
  profile: OpsSellerProfile;
  deals: OpsClientDeal[]; // Sellers can be associated with deals just like clients
  documents: OpsSellerDocument[];
  allDocuments?: OpsSellerDocument[]; // Unfiltered list for editing
  documentsError?: string | null;
};

export type OpsBrokerDocument = {
  id: string;
  title: string;
  status?: string | null;
  documentType?: string | null;
  uploadedAt?: string | null;
  url: string | null;
  bucket?: string | null;
  storagePath?: string | null;
};

export type OpsBrokerProfile = {
  userId: string;
  fullName: string;
  status: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  source: string | null;
  createdAt: string | null;
  metadata: Record<string, unknown> | null;
  entityType: "personal" | "company" | null;
  brokerDetails: Record<string, unknown> | null;
};

export type OpsBrokerDetail = {
  profile: OpsBrokerProfile;
  deals: OpsClientDeal[];
  documents: OpsBrokerDocument[];
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
  type?: string | null;
  scoring: string;
  source: string;
  notes: string;
  userId?: string | null;
  detailHref?: string | null;
  documents?: OpsClientDocument[];
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
  buyerType: "personal" | "company" | null;
  sellerType: "personal" | "company" | null;
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
  downPaymentPercent: number | null;
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

export type VehicleDocumentTypeEntry = { value: string; label: string };
export type VehicleDocumentTypeValue = VehicleDocumentTypeEntry["value"];

const deriveVehicleDocumentTypesFromCatalog = (): VehicleDocumentTypeEntry[] => {
  const registry = workflowCatalog.vehicleDocumentTypeRegistry ?? [];
  return registry.map((entry) => ({
    value: entry.value,
    label: entry.label,
  }));
};

export const VEHICLE_DOCUMENT_TYPES = deriveVehicleDocumentTypesFromCatalog();

const vehicleDocumentTypeValueSet = new Set(VEHICLE_DOCUMENT_TYPES.map((entry) => entry.value));

const VEHICLE_DOCUMENT_TYPE_ALIAS_ENTRIES: ReadonlyArray<[string, VehicleDocumentTypeValue]> = (
  workflowCatalog.vehicleDocumentTypeAliases ?? []
)
  .filter((alias) => vehicleDocumentTypeValueSet.has(alias.target))
  .map((alias) => [alias.alias, alias.target as VehicleDocumentTypeValue]);

const VEHICLE_DOCUMENT_TYPE_REGISTRY = createDocumentTypeRegistry<
  VehicleDocumentTypeValue,
  VehicleDocumentTypeEntry
>(VEHICLE_DOCUMENT_TYPES, VEHICLE_DOCUMENT_TYPE_ALIAS_ENTRIES);

export const VEHICLE_DOCUMENT_TYPE_LABEL_MAP = VEHICLE_DOCUMENT_TYPE_REGISTRY.labelMap;

export const normalizeVehicleDocumentType = VEHICLE_DOCUMENT_TYPE_REGISTRY.normalizeValue;

export const getVehicleDocumentLabel = VEHICLE_DOCUMENT_TYPE_REGISTRY.resolveLabel;

export type ClientDocumentContext = "personal" | "company" | "any";

export type ClientDocumentTypeEntry = {
  value: string;
  label: string;
  context: ClientDocumentContext;
};

export type ClientDocumentTypeValue = ClientDocumentTypeEntry["value"];

const deriveClientDocumentTypesFromCatalog = (): ClientDocumentTypeEntry[] => {
  const registry = workflowCatalog.clientDocumentTypeRegistry ?? [];
  return registry.map((entry) => ({
    value: entry.value,
    label: entry.label,
    context: (entry.context as ClientDocumentContext | undefined) ?? "any",
  }));
};

export const CLIENT_DOCUMENT_TYPES = deriveClientDocumentTypesFromCatalog();

const clientDocumentTypeValueSet = new Set(CLIENT_DOCUMENT_TYPES.map((entry) => entry.value));

const CLIENT_DOCUMENT_TYPE_ALIAS_ENTRIES: ReadonlyArray<[string, ClientDocumentTypeValue]> = (
  workflowCatalog.clientDocumentTypeAliases ?? []
)
  .filter((alias) => clientDocumentTypeValueSet.has(alias.target))
  .map((alias) => [alias.alias, alias.target as ClientDocumentTypeValue]);

const CLIENT_DOCUMENT_TYPE_REGISTRY = createDocumentTypeRegistry<ClientDocumentTypeValue, ClientDocumentTypeEntry>(
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_ALIAS_ENTRIES,
);

export const CLIENT_DOCUMENT_TYPE_LABEL_MAP = CLIENT_DOCUMENT_TYPE_REGISTRY.labelMap;

export const normalizeClientDocumentType = CLIENT_DOCUMENT_TYPE_REGISTRY.normalizeValue;

export const getClientDocumentLabel = CLIENT_DOCUMENT_TYPE_REGISTRY.resolveLabel;

export type SellerDocumentContext = "personal" | "company" | "any";

export type SellerDocumentTypeEntry = {
  value: string;
  label: string;
  context: SellerDocumentContext;
};

export type SellerDocumentTypeValue = SellerDocumentTypeEntry["value"];

const deriveSellerDocumentTypesFromCatalog = (): SellerDocumentTypeEntry[] => {
  const registry = workflowCatalog.sellerDocumentTypeRegistry ?? [];
  return registry.map((entry) => ({
    value: entry.value,
    label: entry.label,
    context: (entry.context as SellerDocumentContext | undefined) ?? "any",
  }));
};

export const SELLER_DOCUMENT_TYPES = deriveSellerDocumentTypesFromCatalog();

const sellerDocumentTypeValueSet = new Set(SELLER_DOCUMENT_TYPES.map((entry) => entry.value));

const SELLER_DOCUMENT_TYPE_ALIAS_ENTRIES: ReadonlyArray<[string, SellerDocumentTypeValue]> = (
  workflowCatalog.sellerDocumentTypeAliases ?? []
)
  .filter((alias) => sellerDocumentTypeValueSet.has(alias.target))
  .map((alias) => [alias.alias, alias.target as SellerDocumentTypeValue]);

const SELLER_DOCUMENT_TYPE_REGISTRY = createDocumentTypeRegistry<SellerDocumentTypeValue, SellerDocumentTypeEntry>(
  SELLER_DOCUMENT_TYPES,
  SELLER_DOCUMENT_TYPE_ALIAS_ENTRIES,
);

export const SELLER_DOCUMENT_TYPE_LABEL_MAP = SELLER_DOCUMENT_TYPE_REGISTRY.labelMap;

export const normalizeSellerDocumentType = SELLER_DOCUMENT_TYPE_REGISTRY.normalizeValue;

export const getSellerDocumentLabel = SELLER_DOCUMENT_TYPE_REGISTRY.resolveLabel;

export type DealDocumentCategory = WorkflowDocumentCategory;

export type DealDocumentTypeEntry = {
  value: string;
  label: string;
  category: DealDocumentCategory;
};

const inferDealDocumentCategory = (
  documentType: string,
  options: { statusKey?: string; required?: boolean },
): DealDocumentCategory => {
  if (documentType.startsWith("signed_") || options.statusKey === "DOC_SIGNING") return "signature";
  if (options.required === false) return "other";
  return "required";
};

const deriveDealDocumentTypesFromCatalog = (): DealDocumentTypeEntry[] => {
  const merged = new Map<string, DealDocumentTypeEntry>();

  // 1) Явный реестр из YAML (document_types.registry)
  (workflowCatalog.documentTypeRegistry ?? []).forEach((entry: WorkflowDocumentTypeEntry) => {
    const category: DealDocumentCategory = entry.category ?? "required";
    merged.set(entry.value, {
      value: entry.value,
      label: entry.label,
      category,
    });
  });

  // 2) Документы из схем задач — чтобы не пропустить новые поля
  Object.values(workflowCatalog.taskTemplates).forEach((template) => {
    const statusKey = template.statusKey;
    const fields = template.schema?.fields ?? [];
    fields.forEach((field) => {
      const documentType =
        (field as { document_type?: string }).document_type ??
        (field as { documentType?: string }).documentType ??
        null;
      if (!documentType) return;
      if (merged.has(documentType)) return;

      const label =
        typeof field.label === "string" && field.label.trim().length > 0 ? field.label.trim() : documentType;
      const category = inferDealDocumentCategory(documentType, { statusKey, required: field.required });

      merged.set(documentType, {
        value: documentType,
        label,
        category,
      });
    });
  });

  return Array.from(merged.values());
};

export const DEAL_DOCUMENT_TYPES = deriveDealDocumentTypesFromCatalog();

export type DealDocumentTypeValue = (typeof DEAL_DOCUMENT_TYPES)[number]["value"];

const dealDocumentTypeValueSet = new Set(DEAL_DOCUMENT_TYPES.map((entry) => entry.value));

const DEAL_DOCUMENT_TYPE_ALIAS_ENTRIES: ReadonlyArray<[string, DealDocumentTypeValue]> = (
  workflowCatalog.documentTypeAliases ?? []
)
  .filter((alias: WorkflowDocumentTypeAlias) => dealDocumentTypeValueSet.has(alias.target))
  .map((alias) => [alias.alias, alias.target as DealDocumentTypeValue]);

const DEAL_DOCUMENT_TYPE_REGISTRY = createDocumentTypeRegistry<DealDocumentTypeValue, DealDocumentTypeEntry>(
  DEAL_DOCUMENT_TYPES,
  DEAL_DOCUMENT_TYPE_ALIAS_ENTRIES,
);

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

export type OpsDashboardPeriodKey =
  | "current-month"
  | "previous-month"
  | "last-30-days"
  | "last-90-days";

export type OpsDashboardPeriodOption = {
  id: OpsDashboardPeriodKey;
  label: string;
  description: string;
  badgeLabel: string;
  comparisonLabel: string;
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

export type OpsDashboardSnapshotSet = {
  defaultPeriod: OpsDashboardPeriodKey;
  periods: OpsDashboardPeriodOption[];
  snapshots: Record<OpsDashboardPeriodKey, OpsDashboardSnapshot>;
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
  seller?: OpsDealClientProfile | null;
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
