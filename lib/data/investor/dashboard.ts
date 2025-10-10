export type InvestorKpiMetric = {
  id: string;
  label: string;
  value: number;
  helper: string;
  format: "currency" | "percent";
  currency?: string;
  tone?: "positive" | "warning" | "critical" | "muted";
};

export type InvestorStatusSummary = {
  id: string;
  status: "in_operation" | "pending_delivery" | "under_review" | "attention_required";
  label: string;
  count: number;
  tone: "emerald" | "indigo" | "amber" | "rose";
};

export type InvestorPayoutSeriesPoint = {
  label: string;
  accrued: number;
  actual: number;
};

export type InvestorActivityEvent = {
  id: string;
  occurredAt: string;
  description: string;
  amount: number | null;
  currency?: string;
  direction: "credit" | "debit" | "neutral";
};

export const INVESTOR_DASHBOARD_FALLBACK = {
  kpis: [
    {
      id: "aum",
      label: "Assets under management",
      value: 4560000,
      format: "currency" as const,
      currency: "AED",
      helper: "+12% over 12 months",
      tone: "positive" as const,
    },
    {
      id: "yield_ytd",
      label: "Yield YTD",
      value: 0.084,
      format: "percent" as const,
      helper: "Recalculation weekly",
      tone: "positive" as const,
    },
    {
      id: "overdue_ratio",
      label: "Overdue exposure",
      value: 0,
      format: "percent" as const,
      helper: "All assets in green zone",
      tone: "positive" as const,
    },
  ] satisfies InvestorKpiMetric[],
  payoutSeries: [
    { label: "Dec", accrued: 42, actual: 41 },
    { label: "Jan", accrued: 48, actual: 48 },
    { label: "Feb", accrued: 55, actual: 53 },
    { label: "Mar", accrued: 52, actual: 51 },
    { label: "Apr", accrued: 58, actual: 58 },
    { label: "May", accrued: 62, actual: 61 },
  ] satisfies InvestorPayoutSeriesPoint[],
  statusSummary: [
    { id: "status-in-operation", status: "in_operation", label: "In operation", count: 18, tone: "emerald" },
    { id: "status-pending", status: "pending_delivery", label: "Being issued", count: 4, tone: "indigo" },
    { id: "status-review", status: "under_review", label: "Under review", count: 2, tone: "amber" },
    { id: "status-attention", status: "attention_required", label: "Require attention", count: 0, tone: "rose" },
  ] satisfies InvestorStatusSummary[],
  activity: [
    {
      id: "evt-1",
      occurredAt: new Date().toISOString(),
      description: "Payment settled for asset R1T-2204 (Bentley Continental GT)",
      amount: 4400,
      currency: "AED",
      direction: "credit" as const,
    },
    {
      id: "evt-2",
      occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      description: "Rolls-Royce Cullinan contract extended by 6 months",
      amount: 1540,
      currency: "AED",
      direction: "credit" as const,
    },
    {
      id: "evt-3",
      occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Maintenance report received for Ferrari 488 Spider",
      amount: null,
      currency: "AED",
      direction: "neutral" as const,
    },
  ] satisfies InvestorActivityEvent[],
};
