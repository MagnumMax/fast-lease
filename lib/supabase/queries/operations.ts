import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  type OpsDealClientProfile,
  type OpsDealDetailsEntry,
  type OpsDealDocument,
  type OpsDealInvoice,
  type OpsDealKeyInfoEntry,
  type OpsDealProfile,
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

function computePipelineFromDeals(deals: SupabaseDealRow[]): OpsPipelineDataset {
  if (!deals.length) {
    const fallbackStages: Record<string, number> = OPS_DEALS.reduce(
      (acc, deal) => {
        acc[deal.statusKey] = (acc[deal.statusKey] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return [
      { label: "Applications", value: fallbackStages.applications ?? 0 },
      { label: "Scoring", value: fallbackStages.documents ?? 0 },
      { label: "Documents", value: fallbackStages.documents ?? 0 },
      { label: "Handover", value: fallbackStages.handover ?? 0 },
      { label: "Active", value: fallbackStages.active ?? 0 },
    ];
  }

  const stages = deals.reduce(
    (acc, deal) => {
      const status = deal.status;
      if (status === "draft" || status === "pending_activation") {
        acc.applications += 1;
      } else if (status === "active") {
        acc.active += 1;
      } else if (status === "completed") {
        acc.handover += 1;
      } else if (status === "suspended") {
        acc.documents += 1;
      } else if (status === "defaulted") {
        acc.documents += 1;
      } else if (status === "cancelled") {
        acc.documents += 1;
      } else {
        acc.scoring += 1;
      }
      return acc;
    },
    {
      applications: 0,
      scoring: 0,
      documents: 0,
      handover: 0,
      active: 0,
    },
  );

  return [
    { label: "Applications", value: stages.applications || 1 },
    { label: "Scoring", value: stages.scoring || 1 },
    { label: "Documents", value: stages.documents || 1 },
    { label: "Handover", value: stages.handover || 1 },
    { label: "Active", value: stages.active || 1 },
  ];
}

export async function getOperationsDashboardSnapshot(): Promise<OpsDashboardSnapshot> {
  const supabase = await createSupabaseServerClient();

  const { data: dealRows, error } = await supabase
    .from("deals")
    .select("id, deal_number, status, updated_at, created_at, client_id, application_id, vehicle_id")
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

  const { data, error } = await supabase
    .from("deals")
    .select(
      `
        id,
        deal_number,
        status,
        updated_at,
        created_at,
        applications:application_id (
          application_number,
          status
        ),
        vehicles:vehicle_id (
          make,
          model
        ),
        profiles:client_id (
          full_name
        )
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
    const applicationRef = Array.isArray(row.applications)
      ? row.applications[0]
      : row.applications;
    const vehicleRef = Array.isArray(row.vehicles)
      ? row.vehicles[0]
      : row.vehicles;
    const profileRef = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;

    const dealNumber =
      (row.deal_number as string) ??
      (applicationRef?.application_number as string) ??
      (row.id as string);

    const vehicleMake = (vehicleRef?.make as string) ?? "Vehicle";
    const vehicleModel = (vehicleRef?.model as string) ?? "";
    const vehicle = [vehicleMake, vehicleModel].filter(Boolean).join(" ");

    const updatedAt =
      (row.updated_at as string) ??
      (row.created_at as string) ??
      new Date().toISOString();

    let statusKey: OpsDealSummary["statusKey"] = "applications";
    const status = (row.status as string) ?? "draft";
    switch (status) {
      case "active":
        statusKey = "active";
        break;
      case "completed":
      case "pending_activation":
        statusKey = "handover";
        break;
      case "draft":
      case "cancelled":
      case "defaulted":
      case "suspended":
        statusKey = "documents";
        break;
      default:
        statusKey = "applications";
    }

    return {
      id: row.id as string,
      dealId: dealNumber,
      client: (profileRef?.full_name as string) ?? "—",
      vehicle,
      updatedAt,
      stage: status.replace(/_/g, " "),
      statusKey,
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
    .select("user_id, full_name, status, phone, nationality")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[operations] failed to load clients", error);
    return OPS_CLIENTS;
  }

  if (!data?.length) {
    return OPS_CLIENTS;
  }

  return data.map((profile, index) => ({
    id: `CL-${(101 + index).toString().padStart(4, "0")}`,
    name: (profile.full_name as string) ?? "Client",
    email: `${(profile.full_name as string)?.replace(/\s+/g, ".").toLowerCase() ?? "client"}@fastlease.dev`,
    phone: (profile.phone as string) ?? "+971 50 000 0000",
    status: profile.status === "blocked" ? "Blocked" : "Active",
    scoring: "90/100",
    overdue: index % 3 === 0 ? 1 : 0,
    limit: "AED 350,000",
    detailHref: `/ops/clients/${((profile.full_name as string) ?? "client")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "client-104"}`,
  }));
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

export async function getOperationsDealDetail(slug: string): Promise<OpsDealDetail | null> {
  const normalizedSlug = toSlug(slug);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("deals")
    .select("id, deal_number, status, monthly_payment, total_amount, principal_amount, client_id, vehicle_id")
    .limit(25);

  if (error) {
    console.error("[operations] failed to load deal detail", error);
  }

  const fallbackSlug = toSlug(OPS_DEAL_PROFILE.dealId);

  const dealRow = data?.find((row) => toSlug(row.deal_number as string) === normalizedSlug);

  if (!dealRow && normalizedSlug !== fallbackSlug && !data?.length) {
    return null;
  }

  const profile: OpsDealProfile =
    dealRow && (dealRow.deal_number || dealRow.status)
      ? {
          dealId: (dealRow.deal_number as string) ?? (dealRow.id as string),
          vehicleName: OPS_DEAL_PROFILE.vehicleName,
          status: (dealRow.status as string) ?? OPS_DEAL_PROFILE.status,
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
        }
      : OPS_DEAL_PROFILE;

  const client: OpsDealClientProfile = OPS_DEAL_CLIENT;

  return {
    slug: toSlug(profile.dealId),
    profile,
    client,
    keyInformation: OPS_DEAL_KEY_INFO,
    overview: OPS_DEAL_DETAILS,
    documents: OPS_DEAL_DOCUMENTS,
    invoices: OPS_DEAL_INVOICES,
    timeline: OPS_DEAL_TIMELINE,
  };
}
