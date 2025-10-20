import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";

import {
  OPS_AUTOMATION_METRICS,
  OPS_BOTTLENECKS,
  OPS_DASHBOARD_KPIS,
  OPS_EXCEPTION_WATCHLIST,
  OPS_SLA_WATCHLIST,
  OPS_TEAM_LOAD,
  type OpsAutomationMetric,
  type OpsBottleneckItem,
  type OpsKpiMetric,
  type OpsTeamLoadItem,
  type OpsWatchItem,
} from "@/lib/data/operations/dashboard";
import {
  OPS_DEAL_CLIENT,
  OPS_DEAL_DETAILS,
  OPS_DEAL_DOCUMENTS,
  OPS_DEAL_INVOICES,
  OPS_DEAL_KEY_INFO,
  OPS_DEAL_PROFILE,
  OPS_DEAL_TIMELINE,
  OPS_DEALS,
  OPS_DEAL_PIPELINE_GROUPS,
  OPS_WORKFLOW_STATUS_MAP,
  type OpsDealClientProfile,
  type OpsDealDetailsEntry,
  type OpsDealDocument,
  type OpsDealInvoice,
  type OpsDealKeyInfoEntry,
  type OpsDealProfile,
  type OpsDealStatusKey,
  type OpsDealGuardStatus,
  type OpsDealSummary,
  type OpsDealTimelineEvent,
} from "@/lib/data/operations/deals";
import {
  OPS_CARS,
  OPS_VEHICLE_DOCUMENTS,
  OPS_VEHICLE_PROFILE,
  OPS_VEHICLE_SERVICE_LOG,
  type OpsCarRecord,
  type OpsVehicleDocument,
  type OpsVehicleProfile,
  type OpsVehicleServiceLogEntry,
} from "@/lib/data/operations/cars";
import {
  OPS_CLIENTS,
  OPS_CLIENT_DEALS,
  OPS_CLIENT_DOCUMENTS,
  OPS_CLIENT_PROFILE,
  type OpsClientDeal,
  type OpsClientDocument,
  type OpsClientProfile,
  type OpsClientRecord,
} from "@/lib/data/operations/clients";

type SupabaseDealRow = {
  id: string;
  deal_number: string | null;
  status: string;
  updated_at: string | null;
  created_at: string | null;
  client_id: string;
  application_id: string;
  vehicle_id: string;
  payload: Record<string, unknown> | null;
};

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

function toSlug(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapStatusToWorkflow(status: string | null | undefined): OpsDealSummary["statusKey"] {
  const normalized = (status ?? "").toUpperCase();
  if (normalized in OPS_WORKFLOW_STATUS_MAP) {
    return normalized as OpsDealSummary["statusKey"];
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
): OpsDealGuardStatus[] {
  const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];
  const tasks = (payload?.guard_tasks as Record<string, GuardTaskState> | undefined) ?? {};

  return statusMeta.exitGuards.map((guard) => {
    const taskState = tasks[guard.key] ?? {};

    return {
      key: guard.key,
      label: guard.label,
      hint: guard.hint,
      requiresDocument: guard.requiresDocument ?? false,
      fulfilled: Boolean(taskState.fulfilled),
      note: taskState.note ?? null,
      attachmentPath: taskState.attachment_path ?? null,
      attachmentUrl: null,
      completedAt: taskState.completed_at ?? null,
    } satisfies OpsDealGuardStatus;
  });
}

function computePipelineFromDeals(deals: SupabaseDealRow[]): OpsPipelineDataset {
  if (!deals.length) {
    return OPS_DEAL_PIPELINE_GROUPS.map((group) => ({
      label: group.label,
      value: OPS_DEALS.filter((deal) => group.statuses.includes(deal.statusKey)).length,
    }));
  }

  const groups = OPS_DEAL_PIPELINE_GROUPS.map((group) => ({
    label: group.label,
    value: 0,
  }));

  deals.forEach((deal) => {
    const statusKey = mapStatusToWorkflow(deal.status);
    const index = OPS_DEAL_PIPELINE_GROUPS.findIndex((group) =>
      group.statuses.includes(statusKey),
    );
    if (index >= 0) {
      groups[index].value += 1;
    }
  });

  return groups;
}

export async function getOperationsDashboardSnapshot(): Promise<OpsDashboardSnapshot> {
   const supabase = await createSupabaseServerClient();

   // Using more secure authentication method
   const { data: userData, error: userError } = await supabase.auth.getUser();

   if (userError) {
     console.error("[operations] authentication error:", userError);
   }

   const { data: dealRows, error } = await supabase
     .from("deals")
     .select("id, deal_number, status, updated_at, created_at")
     .limit(50);

   if (error) {
     console.error("[operations] failed to load deals for dashboard", error);
   }

   const pipeline = computePipelineFromDeals((dealRows ?? []) as SupabaseDealRow[]);

   const demandCapacity: OpsDemandCapacitySeries = {
     labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
     submitted: [18, 24, 21, 27, 30, 22, 16],
     activated: [16, 22, 19, 25, 28, 20, 18],
   };

   return {
     kpis: OPS_DASHBOARD_KPIS,
     pipeline,
     demandCapacity,
     exceptionWatchlist: OPS_EXCEPTION_WATCHLIST,
     slaWatchlist: OPS_SLA_WATCHLIST,
     teamLoad: OPS_TEAM_LOAD,
     bottlenecks: OPS_BOTTLENECKS,
     automationMetrics: OPS_AUTOMATION_METRICS,
   };
}

export async function getOperationsDeals(): Promise<OpsDealSummary[]> {
   const supabase = await createSupabaseServerClient();

   // Using more secure authentication method
   const { data: userData, error: userError } = await supabase.auth.getUser();

   if (userError) {
     console.error("[operations] authentication error:", userError);
   }

  const { data, error } = await supabase
    .from("deals")
    .select(
      `
        id,
        deal_number,
        status,
        updated_at,
        created_at,
        client_id,
        application_id,
        vehicle_id,
        payload
      `,
    )
    .order("updated_at", { ascending: false });

   if (error) {
     console.error("[operations] failed to load deals", error);
     return OPS_DEALS;
   }

   if (!data?.length) {
     return OPS_DEALS;
   }

   return data.map((row) => {
     const dealNumber = (row.deal_number as string) ?? `DEAL-${row.id.slice(-6)}`;

     const vehicle = "Luxury Vehicle"; // Placeholder instead of connection to vehicles table

    const updatedAt =
      (row.updated_at as string) ??
      (row.created_at as string) ??
      new Date().toISOString();

    const statusKey = mapStatusToWorkflow(row.status as string);
    const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];

    return {
      id: row.id as string,
      dealId: dealNumber,
      client: `Client ${row.client_id?.slice(-4) ?? "0000"}`, // Placeholder instead of connection to profiles
      vehicle,
      updatedAt,
      stage: statusMeta.description,
      statusKey,
      ownerRole: statusMeta.ownerRole,
      source: "Supabase import",
      nextAction: statusMeta.entryActions[0] ?? "Проверить текущий этап",
      slaDueAt: null,
      guardStatuses: resolveGuardStatuses(statusKey, row.payload as Record<string, unknown> | null),
    };
  });
}

export async function getOperationsCars(): Promise<OpsCarRecord[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vehicles")
    .select("vin, make, model, year, body_type, mileage, current_value, status")
    .order("make", { ascending: true });

  if (error) {
    console.error("[operations] failed to load vehicles", error);
    return OPS_CARS;
  }

  if (!data?.length) {
    return OPS_CARS;
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

export async function getOperationsClients(): Promise<OpsClientRecord[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, status, phone, nationality, metadata")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[operations] failed to load clients", error);
    return OPS_CLIENTS;
  }

  if (!data?.length) {
    return OPS_CLIENTS;
  }

  return data.map((profile, index) => {
    const metadata = (profile.metadata as { ops_email?: string } | null) ?? null;
    const emailFromMetadata =
      typeof metadata?.ops_email === "string" ? metadata.ops_email : null;

    return {
      id: `CL-${(101 + index).toString().padStart(4, "0")}`,
      name: (profile.full_name as string) ?? "Client",
      email:
        emailFromMetadata ??
        `${(profile.full_name as string)?.replace(/\s+/g, ".").toLowerCase() ?? "client"}@fastlease.dev`,
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

export function getOperationsDealDocuments(): OpsDealDocument[] {
  return OPS_DEAL_DOCUMENTS;
}

export function getOperationsDealTimeline(): OpsDealTimelineEvent[] {
  return OPS_DEAL_TIMELINE;
}

export function getOperationsClientProfile(): OpsClientProfile {
  return OPS_CLIENT_PROFILE;
}

export function getOperationsClientDeals(): OpsClientDeal[] {
  return OPS_CLIENT_DEALS;
}

export function getOperationsClientDocuments(): OpsClientDocument[] {
  return OPS_CLIENT_DOCUMENTS;
}

export function getOperationsVehicleDocuments(): OpsVehicleDocument[] {
  return OPS_VEHICLE_DOCUMENTS;
}

export function getOperationsVehicleServiceLog(): OpsVehicleServiceLogEntry[] {
  return OPS_VEHICLE_SERVICE_LOG;
}

export function getOperationsVehicleProfile(): OpsVehicleProfile {
  return OPS_VEHICLE_PROFILE;
}

type DealDetailRow = {
  id: string;
  deal_number: string | null;
  status: string;
  monthly_payment: number | null;
  total_amount: number | null;
  principal_amount: number | null;
  payload: Record<string, unknown> | null;
  deal_documents: {
    id: string;
    document_type: string | null;
    title: string | null;
    storage_path: string | null;
    created_at: string | null;
  }[];
};

function computeFallbackDealNumber(id: string) {
  return `DEAL-${id.slice(-6).toUpperCase()}`;
}

function matchesDealSlug(row: DealDetailRow, slug: string) {
  const normalizedSlug = slug.toLowerCase();
  const byNumber = row.deal_number ? toSlug(row.deal_number).toLowerCase() : "";
  const byId = toSlug(row.id).toLowerCase();
  const fallback = toSlug(computeFallbackDealNumber(row.id)).toLowerCase();

  return normalizedSlug === byNumber || normalizedSlug === byId || normalizedSlug === fallback;
}

async function buildDetailGuardStatuses(
  statusKey: OpsDealStatusKey,
  payload: Record<string, unknown> | null,
  documents: DealDetailRow["deal_documents"],
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
      } satisfies OpsDealGuardStatus;
    }),
  );
}

export async function getOperationsDealDetail(slug: string): Promise<OpsDealDetail | null> {
  const normalizedSlug = toSlug(slug);
  const supabase = await createSupabaseServerClient();

  const fetchFields =
    "id, deal_number, status, monthly_payment, total_amount, principal_amount, payload, deal_documents (id, document_type, title, storage_path, created_at)";

  let dealRow: DealDetailRow | null = null;

  const byNumber = await supabase
    .from("deals")
    .select(fetchFields)
    .eq("deal_number", slug)
    .maybeSingle();

  if (byNumber.error) {
    console.error("[operations] failed to load deal detail by number", byNumber.error);
  }

  if (byNumber.data) {
    dealRow = byNumber.data as DealDetailRow;
  }

  if (!dealRow) {
    const { data: insensitiveMatch, error: insensitiveError } = await supabase
      .from("deals")
      .select(fetchFields)
      .ilike("deal_number", slug)
      .maybeSingle();

    if (insensitiveError) {
      console.error("[operations] failed to load deal detail by insensitive number", insensitiveError);
    }

    if (insensitiveMatch) {
      dealRow = insensitiveMatch as DealDetailRow;
    }
  }

  if (!dealRow && z.string().uuid().safeParse(slug).success) {
    const byId = await supabase
      .from("deals")
      .select(fetchFields)
      .eq("id", slug)
      .maybeSingle();

    if (byId.error) {
      console.error("[operations] failed to load deal detail by id", byId.error);
    }

    if (byId.data) {
      dealRow = byId.data as DealDetailRow;
    }
  }

  if (!dealRow) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("deals")
      .select(fetchFields)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fallbackError) {
      console.error("[operations] failed to load fallback deals", fallbackError);
    }

    const matched = fallbackData?.find((row) => matchesDealSlug(row as DealDetailRow, normalizedSlug));

    if (matched) {
      dealRow = matched as DealDetailRow;
    }
  }

  if (!dealRow) {
    return null;
  }

  const statusKey = mapStatusToWorkflow(dealRow.status);
  const guardStatuses = await buildDetailGuardStatuses(statusKey, dealRow.payload, dealRow.deal_documents ?? []);

  const profile: OpsDealProfile = {
    dealId: (dealRow.deal_number as string) ?? dealRow.id,
    vehicleName: OPS_DEAL_PROFILE.vehicleName,
    status: statusKey,
    description: `Client — ${OPS_DEAL_CLIENT.name}.`,
    image: OPS_DEAL_PROFILE.image,
    monthlyPayment:
      dealRow.monthly_payment != null
        ? `AED ${Number(dealRow.monthly_payment).toLocaleString("en-US")}`
        : OPS_DEAL_PROFILE.monthlyPayment,
    nextPayment: OPS_DEAL_PROFILE.nextPayment,
    dueAmount:
      dealRow.total_amount != null
        ? `AED ${Number(dealRow.total_amount).toLocaleString("en-US")}`
        : OPS_DEAL_PROFILE.dueAmount,
  };

  const client: OpsDealClientProfile = OPS_DEAL_CLIENT;

  const outboundSlug = matchesDealSlug(dealRow, normalizedSlug)
    ? normalizedSlug
    : toSlug(dealRow.deal_number ?? computeFallbackDealNumber(dealRow.id));

  return {
    slug: outboundSlug,
    dealUuid: dealRow.id,
    statusKey,
    guardStatuses,
    profile,
    client,
    keyInformation: OPS_DEAL_KEY_INFO,
    overview: OPS_DEAL_DETAILS,
    documents: OPS_DEAL_DOCUMENTS,
    invoices: OPS_DEAL_INVOICES,
    timeline: OPS_DEAL_TIMELINE,
  };
}
