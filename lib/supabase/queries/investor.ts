import { randomUUID } from "node:crypto";

import {
  INVESTOR_DASHBOARD_FALLBACK,
  type InvestorActivityEvent,
  type InvestorKpiMetric,
  type InvestorPayoutSeriesPoint,
  type InvestorStatusSummary,
} from "@/lib/data/investor/dashboard";
import {
  INVESTOR_PORTFOLIO_FALLBACK,
  type InvestorPortfolioAssetRecord,
} from "@/lib/data/investor/portfolio";
import {
  INVESTOR_REPORTS_FALLBACK,
  type InvestorReportRecord,
} from "@/lib/data/investor/reports";
import { createSignedStorageUrl } from "@/lib/supabase/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseJson = Record<string, unknown> | null | undefined;

type InvestorRow = {
  id: string;
  investor_code: string | null;
  display_name: string;
  total_investment: number | null;
  available_funds: number | null;
  metadata: SupabaseJson;
};

type PortfolioRow = {
  id: string;
  portfolio_name: string;
  portfolio_type: string | null;
  total_value: number | null;
  allocated_amount: number | null;
  available_amount: number | null;
  irr_percent: number | null;
  risk_band: string | null;
  performance_metrics: SupabaseJson;
  metadata: SupabaseJson;
};

const INVESTOR_REPORTS_BUCKET = "investor-reports";

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toString(value: unknown): string | null {
  if (typeof value === "string") return value;
  return null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return (value && typeof value === "object" ? (value as Record<string, unknown>) : {}) ?? {};
}

function toArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null);
  }
  return [];
}

function fallbackDashboard(): InvestorDashboardSnapshot {
  return {
    investor: {
      id: null,
      code: null,
      name: "Fast Lease Investor",
      aum: INVESTOR_DASHBOARD_FALLBACK.kpis.find((item) => item.id === "aum")?.value ?? 0,
      currency:
        INVESTOR_DASHBOARD_FALLBACK.kpis.find((item) => item.id === "aum")?.currency ?? "AED",
      yieldYtd: INVESTOR_DASHBOARD_FALLBACK.kpis.find((item) => item.id === "yield_ytd")?.value ?? 0,
      overdueRatio:
        INVESTOR_DASHBOARD_FALLBACK.kpis.find((item) => item.id === "overdue_ratio")?.value ?? 0,
      availableFunds: 0,
    },
    kpis: INVESTOR_DASHBOARD_FALLBACK.kpis,
    payoutSeries: INVESTOR_DASHBOARD_FALLBACK.payoutSeries,
    statusSummary: INVESTOR_DASHBOARD_FALLBACK.statusSummary,
    activity: INVESTOR_DASHBOARD_FALLBACK.activity,
  };
}

function fallbackPortfolio(): InvestorPortfolioSnapshot {
  const fallbackDashboardSnapshot = fallbackDashboard();
  return {
    investor: fallbackDashboardSnapshot.investor,
    assets: INVESTOR_PORTFOLIO_FALLBACK,
    statusSummary: INVESTOR_DASHBOARD_FALLBACK.statusSummary,
  };
}

function fallbackReports(): InvestorReportsSnapshot {
  return {
    reports: INVESTOR_REPORTS_FALLBACK.map((report) => ({
      id: report.id,
      reportCode: report.reportCode,
      reportType: report.reportType,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      format: report.format,
      status: report.status,
      storagePath: report.storagePath,
      downloadUrl: null,
      createdAt: report.createdAt,
      generatedAt: report.generatedAt,
    })),
    lastReadyAt:
      INVESTOR_REPORTS_FALLBACK.find((report) => report.status === "ready")?.generatedAt ?? null,
  };
}

async function loadInvestorContext(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<{ investor: InvestorRow; portfolio: PortfolioRow | null } | null> {
  const { data: investor, error: investorError } = await supabase
    .from("investors")
    .select("id, investor_code, display_name, total_investment, available_funds, metadata")
    .eq("user_id", userId)
    .maybeSingle();

  if (investorError) {
    console.error("[investor] failed to load investor record", investorError);
    return null;
  }

  if (!investor) {
    return null;
  }

  const { data: portfolios, error: portfolioError } = await supabase
    .from("investment_portfolios")
    .select(
      "id, portfolio_name, portfolio_type, total_value, allocated_amount, available_amount, irr_percent, risk_band, performance_metrics, metadata",
    )
    .eq("investor_id", investor.id)
    .order("created_at", { ascending: true });

  if (portfolioError) {
    console.error("[investor] failed to load portfolios", portfolioError);
  }

  const portfolio = portfolios?.[0] ?? null;

  return { investor: investor as InvestorRow, portfolio: portfolio as PortfolioRow | null };
}

const STATUS_META: Record<
  InvestorStatusSummary["status"],
  { label: string; tone: InvestorStatusSummary["tone"] }
> = {
  in_operation: { label: "In operation", tone: "emerald" },
  pending_delivery: { label: "Being issued", tone: "indigo" },
  under_review: { label: "Under review", tone: "amber" },
  attention_required: { label: "Require attention", tone: "rose" },
};

function buildStatusSummary(
  performanceMetrics: Record<string, unknown>,
  assets: InvestorPortfolioAssetRecord[] | null,
): InvestorStatusSummary[] {
  const fromMetrics = toArray(performanceMetrics.status_breakdown);
  if (fromMetrics.length) {
    return fromMetrics.map((entry, index) => {
      const status =
        (entry.status as InvestorStatusSummary["status"]) ?? "in_operation";
      const meta = STATUS_META[status] ?? STATUS_META.in_operation;
      return {
        id: `status-${status}-${index}`,
        status,
        label: meta.label,
        count: toNumber(entry.count) ?? 0,
        tone: meta.tone,
      };
    });
  }

  if (assets?.length) {
    const counts = assets.reduce((acc, asset) => {
      const status = asset.status;
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {} as Record<InvestorStatusSummary["status"], number>);

    return (Object.keys(STATUS_META) as InvestorStatusSummary["status"][]).map(
      (status) => {
        const meta = STATUS_META[status];
        return {
          id: `status-${status}`,
          status,
          label: meta.label,
          count: counts[status] ?? 0,
          tone: meta.tone,
        };
      },
    );
  }

  return INVESTOR_DASHBOARD_FALLBACK.statusSummary;
}

function buildPayoutSeries(
  rows: Array<Record<string, unknown>> | undefined | null,
): InvestorPayoutSeriesPoint[] {
  if (!rows?.length) {
    return INVESTOR_DASHBOARD_FALLBACK.payoutSeries;
  }

  return rows.map((row) => ({
    label: toString(row.period_label) ?? "—",
    accrued: toNumber(row.accrued_amount) ?? 0,
    actual: toNumber(row.actual_amount) ?? 0,
  }));
}

function buildActivity(
  rows: Array<Record<string, unknown>> | undefined | null,
): InvestorActivityEvent[] {
  if (!rows?.length) {
    return INVESTOR_DASHBOARD_FALLBACK.activity;
  }

  return rows.map((row) => {
    const amount = toNumber(row.amount);
    const directionRaw = toString(row.amount_direction);
    const direction: InvestorActivityEvent["direction"] =
      directionRaw === "debit"
        ? "debit"
        : directionRaw === "neutral"
          ? "neutral"
          : "credit";

    return {
      id: toString(row.id) ?? randomUUID(),
      occurredAt: toString(row.occurred_at) ?? new Date().toISOString(),
      description: toString(row.description) ?? "Activity",
      amount: amount,
      currency: toString(row.currency) ?? "AED",
      direction,
    };
  });
}

function buildKpis(
  investor: InvestorRow,
  portfolio: PortfolioRow | null,
  performanceMetrics: Record<string, unknown>,
): InvestorKpiMetric[] {
  const currency =
    toString(performanceMetrics.primary_currency) ??
    toString(portfolio?.metadata?.primary_currency) ??
    "AED";

  const aum =
    investor.total_investment ??
    toNumber(performanceMetrics.aum) ??
    portfolio?.total_value ??
    INVESTOR_DASHBOARD_FALLBACK.kpis.find((kpi) => kpi.id === "aum")?.value ??
    0;

  const yieldYtd =
    toNumber(performanceMetrics.yield_ytd) ??
    portfolio?.irr_percent ??
    INVESTOR_DASHBOARD_FALLBACK.kpis.find((kpi) => kpi.id === "yield_ytd")?.value ??
    0;

  const overdueRatio =
    toNumber(performanceMetrics.overdue_ratio) ??
    INVESTOR_DASHBOARD_FALLBACK.kpis.find((kpi) => kpi.id === "overdue_ratio")?.value ??
    0;

  return [
    {
      id: "aum",
      label: "Assets under management",
      value: aum ?? 0,
      format: "currency",
      currency,
      helper: "+12% vs LY",
      tone: "positive",
    },
    {
      id: "yield_ytd",
      label: "Yield YTD",
      value: yieldYtd ?? 0,
      format: "percent",
      helper: "Updated weekly",
      tone: "positive",
    },
    {
      id: "overdue_ratio",
      label: "Overdue exposure",
      value: overdueRatio ?? 0,
      format: "percent",
      helper: overdueRatio ? "Requires additional monitoring" : "All assets in green zone",
      tone: overdueRatio > 0 ? "warning" : "positive",
    },
  ];
}

export type InvestorDashboardSnapshot = {
  investor: {
    id: string | null;
    code: string | null;
    name: string;
    aum: number;
    currency: string;
    yieldYtd: number;
    overdueRatio: number;
    availableFunds: number;
  };
  kpis: InvestorKpiMetric[];
  payoutSeries: InvestorPayoutSeriesPoint[];
  statusSummary: InvestorStatusSummary[];
  activity: InvestorActivityEvent[];
};

export async function getInvestorDashboardSnapshot(
  userId: string,
): Promise<InvestorDashboardSnapshot> {
  try {
    const supabase = await createSupabaseServerClient();
    const context = await loadInvestorContext(supabase, userId);

    if (!context) {
      return fallbackDashboard();
    }

    const { investor, portfolio } = context;
    const performanceMetrics = toRecord(portfolio?.performance_metrics);

    const { data: payoutRows, error: payoutError } = await supabase
      .from("portfolio_performance_snapshots")
      .select("id, period_label, accrued_amount, actual_amount")
      .eq("portfolio_id", portfolio?.id ?? "")
      .order("period_start", { ascending: true });

    if (payoutError) {
      console.error("[investor] failed to load performance snapshots", payoutError);
    }

    const { data: activityRows, error: activityError } = await supabase
      .from("portfolio_activity_events")
      .select("id, occurred_at, description, amount, currency, amount_direction")
      .eq("portfolio_id", portfolio?.id ?? "")
      .order("occurred_at", { ascending: false })
      .limit(10);

    if (activityError) {
      console.error("[investor] failed to load activity", activityError);
    }

    const assetsForStatus = await loadPortfolioAssetsForStatus(supabase, portfolio?.id ?? null);

    const kpis = buildKpis(investor, portfolio, performanceMetrics);

    const currency =
      kpis.find((kpi) => kpi.id === "aum")?.currency ??
      INVESTOR_DASHBOARD_FALLBACK.kpis.find((kpi) => kpi.id === "aum")?.currency ??
      "AED";

    const availableFunds =
      portfolio?.available_amount ??
      investor.available_funds ??
      INVESTOR_PORTFOLIO_FALLBACK.reduce(
        (acc, item) => acc + (item.lastPayoutAmount ?? 0),
        0,
      );

    return {
      investor: {
        id: investor.id,
        code: investor.investor_code,
        name: investor.display_name,
        aum: kpis.find((kpi) => kpi.id === "aum")?.value ?? 0,
        currency,
        yieldYtd: kpis.find((kpi) => kpi.id === "yield_ytd")?.value ?? 0,
        overdueRatio: kpis.find((kpi) => kpi.id === "overdue_ratio")?.value ?? 0,
        availableFunds: availableFunds ?? 0,
      },
      kpis,
      payoutSeries: buildPayoutSeries(payoutRows as Array<Record<string, unknown>>),
      statusSummary: buildStatusSummary(performanceMetrics, assetsForStatus),
      activity: buildActivity(activityRows as Array<Record<string, unknown>>),
    };
  } catch (error) {
    console.error("[investor] unexpected dashboard failure", error);
    return fallbackDashboard();
  }
}

async function loadPortfolioAssetsForStatus(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  portfolioId: string | null,
): Promise<InvestorPortfolioAssetRecord[] | null> {
  if (!portfolioId) {
    return null;
  }

  const { data, error } = await supabase
    .from("portfolio_assets")
    .select(
      "id, asset_code, vin, vehicle_make, vehicle_model, status, irr_percent, last_payout_amount, last_payout_currency, last_payout_date, metadata",
    )
    .eq("portfolio_id", portfolioId)
    .order("vehicle_make", { ascending: true });

  if (error) {
    console.error("[investor] failed to load portfolio assets", error);
    return null;
  }

  return (data ?? []).map((row) => ({
    id: toString(row.id) ?? randomUUID(),
    assetCode: toString(row.asset_code) ?? "—",
    vin: toString(row.vin) ?? "—",
    vehicleMake: toString(row.vehicle_make) ?? "—",
    vehicleModel: toString(row.vehicle_model) ?? "—",
    status: (row.status as InvestorPortfolioAssetRecord["status"]) ?? "in_operation",
    irrPercent: toNumber(row.irr_percent) ?? 0,
    lastPayoutAmount: toNumber(row.last_payout_amount) ?? 0,
    lastPayoutCurrency: toString(row.last_payout_currency) ?? "AED",
    lastPayoutDate: toString(row.last_payout_date),
    href: (() => {
      const metadata = toRecord(row.metadata);
      return toString(metadata.link);
    })() ?? null,
  }));
}

export type InvestorPortfolioSnapshot = {
  investor: InvestorDashboardSnapshot["investor"];
  assets: InvestorPortfolioAssetRecord[];
  statusSummary: InvestorStatusSummary[];
};

export async function getInvestorPortfolio(
  userId: string,
): Promise<InvestorPortfolioSnapshot> {
  try {
    const supabase = await createSupabaseServerClient();
    const context = await loadInvestorContext(supabase, userId);

    if (!context) {
      return fallbackPortfolio();
    }

    const { investor, portfolio } = context;
    const performanceMetrics = toRecord(portfolio?.performance_metrics);

    const assets =
      (await loadPortfolioAssetsForStatus(supabase, portfolio?.id ?? null)) ??
      INVESTOR_PORTFOLIO_FALLBACK;

    const statusSummary = buildStatusSummary(performanceMetrics, assets);
    const kpis = buildKpis(investor, portfolio, performanceMetrics);
    const currency =
      kpis.find((kpi) => kpi.id === "aum")?.currency ??
      INVESTOR_DASHBOARD_FALLBACK.kpis.find((kpi) => kpi.id === "aum")?.currency ??
      "AED";

    return {
      investor: {
        id: investor.id,
        code: investor.investor_code,
        name: investor.display_name,
        aum: kpis.find((kpi) => kpi.id === "aum")?.value ?? 0,
        currency,
        yieldYtd: kpis.find((kpi) => kpi.id === "yield_ytd")?.value ?? 0,
        overdueRatio: kpis.find((kpi) => kpi.id === "overdue_ratio")?.value ?? 0,
        availableFunds: portfolio?.available_amount ?? investor.available_funds ?? 0,
      },
      assets,
      statusSummary,
    };
  } catch (error) {
    console.error("[investor] unexpected portfolio failure", error);
    return fallbackPortfolio();
  }
}

export type InvestorReportListItem = {
  id: string;
  reportCode: string;
  reportType: InvestorReportRecord["reportType"];
  periodStart: string | null;
  periodEnd: string | null;
  format: InvestorReportRecord["format"];
  status: InvestorReportRecord["status"];
  storagePath: string | null;
  downloadUrl: string | null;
  createdAt: string;
  generatedAt: string | null;
};

export type InvestorReportsSnapshot = {
  reports: InvestorReportListItem[];
  lastReadyAt: string | null;
};

export async function getInvestorReports(
  userId: string,
): Promise<InvestorReportsSnapshot> {
  try {
    const supabase = await createSupabaseServerClient();
    const context = await loadInvestorContext(supabase, userId);

    if (!context?.portfolio) {
      return fallbackReports();
    }

    const { portfolio } = context;

    const { data, error } = await supabase
      .from("investor_reports")
      .select(
        "id, report_code, report_type, period_start, period_end, format, status, storage_path, created_at, generated_at",
      )
      .eq("portfolio_id", portfolio.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[investor] failed to load reports", error);
      return fallbackReports();
    }

    const reports = await Promise.all(
      (data ?? []).map(async (row) => {
        const storagePath = toString(row.storage_path);
        const status = row.status as InvestorReportRecord["status"];
        let downloadUrl: string | null = null;

        if (storagePath && status === "ready") {
          downloadUrl = await createSignedStorageUrl({
            bucket: INVESTOR_REPORTS_BUCKET,
            path: storagePath,
            expiresIn: 60 * 15,
          });
        }

        return {
          id: toString(row.id) ?? crypto.randomUUID(),
          reportCode: toString(row.report_code) ?? "—",
          reportType: (row.report_type as InvestorReportRecord["reportType"]) ?? "cash_flow",
          periodStart: toString(row.period_start),
          periodEnd: toString(row.period_end),
          format: (row.format as InvestorReportRecord["format"]) ?? "pdf",
          status,
          storagePath,
          downloadUrl,
          createdAt: toString(row.created_at) ?? new Date().toISOString(),
          generatedAt: toString(row.generated_at),
        };
      }),
    );

    const lastReadyReport = reports.find((report) => report.status === "ready");

    return {
      reports,
      lastReadyAt: lastReadyReport?.generatedAt ?? null,
    };
  } catch (error) {
    console.error("[investor] unexpected reports failure", error);
    return fallbackReports();
  }
}
