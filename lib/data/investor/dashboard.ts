// Investor Dashboard Data Module
export type InvestorStatusSummary = {
  id: string;
  status: "in_operation" | "pending_delivery" | "under_review" | "attention_required";
  label: string;
  count: number;
  tone: "emerald" | "indigo" | "amber" | "rose";
  totalPortfolioValue?: number;
  monthlyIncome?: number;
  activeAssets?: number;
  averageIrr?: number;
  nextPaymentDate?: string;
  pendingReports?: number;
};

export type InvestorKpiMetric = {
  id: string;
  label: string;
  value: number;
  format: "currency" | "percent";
  currency?: string;
  helper: string;
  tone: "positive" | "warning" | "negative";
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
  currency: string;
  direction: "debit" | "credit" | "neutral";
};

// Fallback data for development
export const INVESTOR_DASHBOARD_FALLBACK = {
  kpis: [
    {
      id: "aum",
      label: "Assets under management",
      value: 2500000,
      format: "currency" as const,
      currency: "AED",
      helper: "+12% vs LY",
      tone: "positive" as const,
    },
    {
      id: "yield_ytd",
      label: "Yield YTD",
      value: 12.8,
      format: "percent" as const,
      helper: "Updated weekly",
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
  ],
  payoutSeries: [
    { label: "Jan", accrued: 75000, actual: 75000 },
    { label: "Feb", accrued: 75000, actual: 75000 },
    { label: "Mar", accrued: 75000, actual: 75000 },
  ],
  statusSummary: [
    {
      id: "status-in_operation",
      status: "in_operation" as const,
      label: "In operation",
      count: 12,
      tone: "emerald" as const,
    },
    {
      id: "status-pending_delivery",
      status: "pending_delivery" as const,
      label: "Being issued",
      count: 2,
      tone: "indigo" as const,
    },
  ],
  activity: [
    {
      id: "activity-1",
      occurredAt: new Date().toISOString(),
      description: "Monthly payout received",
      amount: 75000,
      currency: "AED",
      direction: "credit" as const,
    },
  ],
};
