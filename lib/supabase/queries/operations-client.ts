import { getSessionUser } from "@/lib/auth/session";
import type { AppRole } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  OPS_WORKFLOW_STATUS_MAP,
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

// Вспомогательная функция для проверки объектов (используется в других местах)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Расчёт среднего времени одобрения (упрощённо)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const avgApprovalTime = deals.length > 0 ? "24h" : "0h";

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
        vehicles!vehicle_id(id, vin, make, model, year, body_type, mileage, current_value, status)
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
      (row.deal_number as string) ?? `DEAL-${row.id.slice(-6)}`;

    const payload = (row.payload as Record<string, unknown> | null) ?? null;
    const updatedAt =
      (row.updated_at as string) ??
      (row.created_at as string) ??
      new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updatedAtDate = parseDate(updatedAt) ?? new Date();

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
    .select("vin, make, model, year, body_type, mileage, current_value, status")
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

export async function getOperationsClientsClient(): Promise<OpsClientRecord[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, status, phone, nationality, metadata")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[operations] failed to load clients", error);
    return [];
  }

  console.log("[operations] loaded clients count:", data?.length || 0);

  if (!data?.length) {
    return [];
  }

  return data.map((profile, index) => {
    const metadata = (profile.metadata as { ops_email?: string } | null) ?? null;
    const emailFromMetadata =
      typeof metadata?.ops_email === "string" ? metadata.ops_email : null;

    return {
      userId: (profile.user_id as string) ?? "",
      id: `CL-${(101 + index).toString().padStart(4, "0")}`,
      name: (profile.full_name as string) ?? "Client",
      email: emailFromMetadata ?? "",
      phone: (profile.phone as string) ?? "+971 50 000 0000",
      status: profile.status === "blocked" ? "Blocked" : "Active",
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
