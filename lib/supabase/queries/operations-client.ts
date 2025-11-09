import { getSessionUser } from "@/lib/auth/session";
import type { AppRole } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatFallbackDealNumber } from "@/lib/deals/deal-number";
import {
  OPS_DEAL_STATUS_META,
  OPS_WORKFLOW_STATUS_MAP,
  OPS_VEHICLE_STATUS_META,
  WORKFLOW_ROLE_LABELS,
  type OpsDealSummary,
  type OpsCarRecord,
  type OpsClientRecord,
  type SupabaseClientData,
  type SupabaseVehicleData,
  type SupabaseDealRow,
  type OpsDashboardSnapshot,
  type OpsKpiMetric,
  type OpsPipelineDataset,
  type OpsDemandCapacitySeries,
  type OpsWatchItem,
  type OpsTeamLoadItem,
  type OpsBottleneckItem,
  type OpsAutomationMetric,
} from "./operations";
import { buildSlugWithId } from "@/lib/utils/slugs";
import { normalizeLicensePlate } from "@/lib/utils/license-plate";

// Локальные типы для данных дашборда
type SupabaseInvoiceRow = {
  id: string;
  deal_id: string | null;
  invoice_number: string | null;
  status: string | null;
  due_date: string | null;
  total_amount: number | null;
  created_at: string | null;
};

type SupabasePaymentRow = {
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

type DashboardDataSource = {
  deals: SupabaseDealRow[];
  invoices: SupabaseInvoiceRow[];
  payments: SupabasePaymentRow[];
  notificationQueue: WorkflowQueueRow[];
  webhookQueue: WorkflowQueueRow[];
  scheduleQueue: WorkflowQueueRow[];
  managerProfiles: Map<string, { id: string; full_name: string | null }>;
};

const OPS_DASHBOARD_ALLOWED_ROLES: AppRole[] = [
  "OP_MANAGER",
  "SUPPORT",
  "FINANCE",
  "TECH_SPECIALIST",
  "ADMIN",
];

function hasOpsDashboardAccess(roles: AppRole[] | undefined | null): boolean {
  if (!roles?.length) {
    return false;
  }
  return roles.some((role) => OPS_DASHBOARD_ALLOWED_ROLES.includes(role));
}

function createEmptyDashboardData(): DashboardDataSource {
  return {
    deals: [],
    invoices: [],
    payments: [],
    notificationQueue: [],
    webhookQueue: [],
    scheduleQueue: [],
    managerProfiles: new Map(),
  };
}

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

function normalizeClientStatusLabel(raw: unknown): { display: string; filter: "Active" | "Blocked" } {
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

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function mapStatusToWorkflow(status: string | null | undefined): OpsDealSummary["statusKey"] {
  const normalized = (status ?? "").toUpperCase();
  if (normalized in OPS_WORKFLOW_STATUS_MAP) {
    return normalized as OpsDealSummary["statusKey"];
  }
  return "NEW";
}

function buildOperationsDashboardSnapshotFromData(
  dashboardData: DashboardDataSource,
  now: Date
): OpsDashboardSnapshot {
  console.log("[DEBUG] Building dashboard snapshot from data");

  const { deals, invoices, payments, managerProfiles } = dashboardData;

  // Подсчёт KPI метрик
  const totalDeals = deals.length;
  const activeDeals = deals.filter(deal =>
    deal.status !== 'CANCELLED' && deal.status !== 'COMPLETED'
  ).length;

  const monthlyVolume = payments
    .filter(payment => {
      if (!payment.created_at) return false;
      const paymentDate = new Date(payment.created_at);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return paymentDate >= monthAgo && !isNaN(paymentDate.getTime());
    })
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

  const pendingInvoices = invoices.filter(invoice =>
    invoice.status === 'pending' || invoice.status === 'overdue'
  ).length;

  const kpis: OpsKpiMetric[] = [
    {
      id: "total-deals",
      label: "Всего сделок",
      value: totalDeals.toString(),
      change: "+12%",
      trend: "up",
      tone: "info",
    },
    {
      id: "active-deals",
      label: "Активные сделки",
      value: activeDeals.toString(),
      change: "+8%",
      trend: "up",
      tone: "success",
    },
    {
      id: "monthly-volume",
      label: "Месячный объём",
      value: `AED ${monthlyVolume.toLocaleString("en-US")}`,
      change: "+15%",
      trend: "up",
      tone: "success",
    },
    {
      id: "pending-invoices",
      label: "Ждут оплаты",
      value: pendingInvoices.toString(),
      change: "-5%",
      trend: "down",
      tone: "warning",
    },
  ];

  // Данные для pipeline диаграммы
  const pipelineStatus = OPS_WORKFLOW_STATUS_MAP;
  const pipeline: OpsPipelineDataset = Object.entries(pipelineStatus).map(([key, status]) => ({
    label: status.title,
    value: deals.filter(deal => deal.status === key).length,
  }));

  // Данные для диаграммы спроса/мощности (за последние 6 месяцев)
  const demandCapacity: OpsDemandCapacitySeries = {
    labels: [],
    submitted: [],
    activated: [],
  };

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = monthDate.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });

    demandCapacity.labels.push(monthLabel);

    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const submitted = deals.filter(deal => {
      const createdAt = new Date(deal.created_at || "");
      return createdAt >= monthStart && createdAt <= monthEnd;
    }).length;

    const activated = deals.filter(deal => {
      const updatedAt = new Date(deal.updated_at || "");
      return updatedAt >= monthStart && updatedAt <= monthEnd && deal.status === 'ACTIVE';
    }).length;

    demandCapacity.submitted.push(submitted);
    demandCapacity.activated.push(activated);
  }

  // Загрузка команды
  const teamLoad: OpsTeamLoadItem[] = Array.from(managerProfiles.values()).map(profile => ({
    id: profile.id,
    specialist: profile.full_name || "Неизвестный менеджер",
    activeCount: Math.floor(Math.random() * 10) + 1, // Заглушка
    overdueCount: Math.floor(Math.random() * 3), // Заглушка
  }));

  // Узкие места (упрощённо)
  const bottlenecks: OpsBottleneckItem[] = [
    {
      id: "risk-review",
      stage: "Проверка риска",
      count: deals.filter(deal => deal.status === 'RISK_REVIEW').length,
      avgTime: "32h",
      impact: "high",
    },
    {
      id: "docs-collect",
      stage: "Сбор документов",
      count: deals.filter(deal => deal.status === 'DOCS_COLLECT').length,
      avgTime: "28h",
      impact: "medium",
    },
  ];

  // Метрики автоматизации (упрощённо)
  const automationMetrics: OpsAutomationMetric[] = [
    {
      id: "notification-processing",
      process: "Обработка уведомлений",
      successRate: "98%",
      avgTime: "2.3s",
      volume: dashboardData.notificationQueue.length,
    },
    {
      id: "webhook-processing",
      process: "Обработка вебхуков",
      successRate: "95%",
      avgTime: "1.8s",
      volume: dashboardData.webhookQueue.length,
    },
  ];

  // Списки для наблюдения (пока пустые)
  const exceptionWatchlist: OpsWatchItem[] = [];
  const slaWatchlist: OpsWatchItem[] = [];

  return {
    kpis,
    pipeline,
    demandCapacity,
    exceptionWatchlist,
    slaWatchlist,
    teamLoad,
    bottlenecks,
    automationMetrics,
  };
}

export async function getOperationsDashboardSnapshotClient(): Promise<OpsDashboardSnapshot> {
  const now = new Date();
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    console.warn("[operations] dashboard requested without active session; returning fallback snapshot");
    return buildOperationsDashboardSnapshotFromData(createEmptyDashboardData(), now);
  }

  if (!hasOpsDashboardAccess(sessionUser.roles)) {
    console.warn("[operations] dashboard requested by user without operations role; returning fallback snapshot");
    return buildOperationsDashboardSnapshotFromData(createEmptyDashboardData(), now);
  }

  const supabase = await createSupabaseServerClient();
  const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgoIso = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [
    dealsResult,
    invoicesResult,
    paymentsResult,
    notificationsResult,
    webhooksResult,
    schedulesResult,
  ] = await Promise.all([
    supabase
      .from("deals")
      .select(
        `
          id,
          deal_number,
          status,
          created_at,
          updated_at,
          activated_at,
          assigned_account_manager,
          principal_amount,
          total_amount,
          monthly_payment,
          source,
          payload,
          client_id,
          application_id,
          vehicle_id
        `,
      )
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabase
      .from("invoices")
      .select("id, deal_id, invoice_number, status, due_date, total_amount, created_at")
      .gte("created_at", sixtyDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("payments")
      .select("id, deal_id, status, amount, created_at, received_at")
      .gte("created_at", sixtyDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("workflow_notification_queue")
      .select("id, status, created_at, processed_at")
      .gte("created_at", thirtyDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("workflow_webhook_queue")
      .select("id, status, created_at, processed_at")
      .gte("created_at", thirtyDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("workflow_schedule_queue")
      .select("id, status, created_at, processed_at")
      .gte("created_at", thirtyDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (dealsResult.error) {
    console.error("[operations] failed to load deals for dashboard", dealsResult.error);
  }
  if (invoicesResult.error) {
    console.error("[operations] failed to load invoices for dashboard", invoicesResult.error);
  }
  if (paymentsResult.error) {
    console.error("[operations] failed to load payments for dashboard", paymentsResult.error);
  }
  if (notificationsResult.error) {
    console.error(
      "[operations] failed to load notification queue for dashboard",
      notificationsResult.error,
    );
  }
  if (webhooksResult.error) {
    console.error(
      "[operations] failed to load webhook queue for dashboard",
      webhooksResult.error,
    );
  }
  if (schedulesResult.error) {
    console.error(
      "[operations] failed to load schedule queue for dashboard",
      schedulesResult.error,
    );
  }

  const deals = (dealsResult.data ?? []) as SupabaseDealRow[];
  const managerIds = Array.from(
    new Set(
      deals
        .map((deal) => deal.assigned_account_manager)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const managerProfiles = new Map<string, { id: string; full_name: string | null }>();

  if (managerIds.length) {
    const profilesResult = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", managerIds);

    if (profilesResult.error) {
      console.error("[operations] failed to load manager profiles", profilesResult.error);
    } else {
      (profilesResult.data ?? []).forEach(
        (profile: { user_id: string; full_name: string | null }) => {
          managerProfiles.set(profile.user_id, {
            id: profile.user_id,
            full_name: profile.full_name,
          });
        },
      );
    }
  }

  const dashboardData: DashboardDataSource = {
    deals,
    invoices: (invoicesResult.data ?? []) as DashboardDataSource["invoices"],
    payments: (paymentsResult.data ?? []) as DashboardDataSource["payments"],
    notificationQueue: (notificationsResult.data ?? []) as DashboardDataSource["notificationQueue"],
    webhookQueue: (webhooksResult.data ?? []) as DashboardDataSource["webhookQueue"],
    scheduleQueue: (schedulesResult.data ?? []) as DashboardDataSource["scheduleQueue"],
    managerProfiles,
  };

  return buildOperationsDashboardSnapshotFromData(dashboardData, now);
}

export async function getOperationsDealsClient(): Promise<OpsDealSummary[]> {
  const supabase = await createSupabaseServerClient();

  console.log("[CLIENT-OPS] getOperationsDealsClient called");

  // Загружаем данные сделок с связанными таблицами
  const { data, error } = await supabase
    .from("deals")
    .select(
      `
        id,
        deal_number,
        status,
        created_at,
        updated_at,
        client_id,
        customer_id,
        vehicle_id,
        payload,
        vehicles!vehicle_id(id, vin, make, model, year, body_type, mileage, status)
      `,
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[operations] failed to load deals", error);
    return [];
  }

  console.log("[operations] loaded deals count:", data?.length || 0);

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
  const clientsMap = new Map<string, SupabaseClientData>();
  (clientsData || []).forEach(client => {
    clientsMap.set(client.user_id, client as SupabaseClientData);
  });

  return data.map((row) => {
    const dealNumber =
      (row.deal_number as string) ??
      formatFallbackDealNumber({ id: row.id as string, createdAt: row.created_at as string });

    const payload = (row.payload as Record<string, unknown> | null) ?? null;
    const updatedAt =
      (row.updated_at as string) ??
      (row.created_at as string) ??
      new Date().toISOString();
    const statusKey = mapStatusToWorkflow(row.status as string);
    const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];
    const ownerRole = statusMeta.ownerRole;
    const ownerRoleLabel =
      WORKFLOW_ROLE_LABELS[ownerRole] ?? ownerRole;

    // Обрабатываем данные автомобиля из связанной таблицы
    const vehicleArray = (row as Record<string, unknown>).vehicles || [];
    const vehicleDataRaw = Array.isArray(vehicleArray) && vehicleArray.length > 0 ? vehicleArray[0] : {};
    const vehicleData = vehicleDataRaw as SupabaseVehicleData;

    // Получаем данные клиента из карты
    const clientData = clientsMap.get(row.client_id as string);

    // Формируем название клиента
    const clientName = clientData?.full_name ||
      `Client ${((row.customer_id as string) ?? (row.client_id as string) ?? "").slice(-4) || "0000"}`;

    // Формируем название автомобиля
    const vehicleName = vehicleData?.make && vehicleData?.model
      ? `${vehicleData.make} ${vehicleData.model}`
      : "Vehicle TBD";

    const source =
      getString(payload?.["source_label"]) ??
      getString(payload?.["source"]) ??
      "Website";

    return {
      id: row.id as string,
      dealId: dealNumber,
      clientId: row.client_id as string,
      customerId: (row.customer_id as string | null) ?? null,
      client: clientName,
      vehicleId: vehicleData?.id || row.vehicle_id as string,
      vehicle: vehicleName,
      vehicleVin: typeof vehicleData?.vin === "string" ? vehicleData.vin : null,
      updatedAt,
      stage: statusMeta.description,
      statusKey,
      ownerRole,
      ownerRoleLabel,
      ownerName: null,
      ownerUserId: null,
      source,
      nextAction: statusMeta.entryActions[0] ?? "Проверить текущий этап",
      guardStatuses: [],
    };
  });
}

export async function getOperationsCarsClient(): Promise<OpsCarRecord[]> {
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
    console.error("[operations] failed to load vehicles", error);
    return [];
  }

  if (!data?.length) {
    return [];
  }

  return data.map((vehicle) => {
    const id = (vehicle.id as string) ?? `${vehicle.vin ?? "vehicle"}`;
    const vin = ((vehicle.vin as string) ?? "—").toUpperCase();
    const licensePlateInfo = normalizeLicensePlate(
      (vehicle.license_plate as string | null | undefined) ?? null,
    );
    const licensePlateNormalized = licensePlateInfo.normalized;
    const licensePlateDisplay = licensePlateInfo.display ?? licensePlateNormalized ?? null;
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
    const statusMeta = OPS_VEHICLE_STATUS_META[statusRaw] ?? { label: statusRaw, tone: "muted" as const };

    const detailSlug =
      buildSlugWithId(`${make} ${model}`.trim() || vin, id) || id;

    const dealsData = Array.isArray(vehicle.deals) ? vehicle.deals : [];
    const activeDeal = dealsData.find((deal) => ["pending_activation", "active"].includes(String(deal.status ?? "").toLowerCase()));
    const activeDealNumber = activeDeal?.deal_number ?? null;
    const activeDealStatus = activeDeal?.status ? String(activeDeal.status) : null;
    const activeDealStatusMeta = activeDealStatus
      ? OPS_DEAL_STATUS_META[activeDealStatus] ?? { label: activeDealStatus, tone: "muted" as const }
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
      licensePlate: licensePlateNormalized,
      licensePlateDisplay,
      licensePlateEmirate: licensePlateInfo.emirate ?? null,
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
    } satisfies OpsCarRecord;
  });
}


export async function getOperationsClientsClient(): Promise<OpsClientRecord[]> {
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
    console.warn("[operations-client] profiles.source column missing, retrying without it");
    const response = await supabase
      .from("profiles")
      .select("user_id, full_name, status, phone, nationality, residency_status, created_at, metadata")
      .order("full_name", { ascending: true });
    profilesData = (response.data as SupabaseClientProfileRow[] | null) ?? null;
    profilesError = response.error;
  }

  if (profilesError) {
    console.error("[operations] failed to load clients", profilesError);
    return [];
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

  const profiles = profilesData ?? [];

  console.log("[operations] loaded clients count:", profiles.length);

  if (!profiles.length) {
    return [];
  }

  return profiles.map((profile, index) => {
    const metadata = isRecord(profile.metadata)
      ? (profile.metadata as Record<string, unknown>)
      : {};
    const statusInfo = normalizeClientStatusLabel(profile.status);
    const emailFromMetadata = getString(metadata?.["ops_email"]);
    const phoneFromMetadata = getString(metadata?.["ops_phone"]);
    const rawSegment =
      getString(metadata?.["segment"]) ??
      getString(metadata?.["client_segment"]) ??
      getString(metadata?.["customer_segment"]) ??
      null;
    const clientTypeValue = getString(metadata?.["client_type"]);
    const clientType =
      clientTypeValue === "Company" || clientTypeValue === "Personal" ? clientTypeValue : null;
    const segment = rawSegment ?? clientType;

    const memberSince = profile.created_at
      ? new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
          new Date(profile.created_at as string),
        )
      : null;
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

    const userId = (profile.user_id as string) ?? "";
    const clientName = (profile.full_name as string) ?? "Client";
    const detailSlug = buildSlugWithId(clientName, userId) || userId;

    return {
      userId,
      id: `CL-${(101 + index).toString().padStart(4, "0")}`,
      name: clientName,
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
      leasing: undefined,
    } satisfies OpsClientRecord;
  });
}
