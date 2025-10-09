export type InvestorReportRecord = {
  id: string;
  reportCode: string;
  reportType: "payment_schedule" | "portfolio_yield" | "cash_flow";
  periodStart: string;
  periodEnd: string;
  format: "pdf" | "xlsx" | "csv";
  status: "ready" | "queued" | "processing" | "failed";
  storagePath: string | null;
  createdAt: string;
  generatedAt: string | null;
};

export const INVESTOR_REPORTS_FALLBACK: InvestorReportRecord[] = [
  {
    id: "rep-1",
    reportCode: "REP-2025-004",
    reportType: "portfolio_yield",
    periodStart: "2024-12-01",
    periodEnd: "2025-01-31",
    format: "pdf",
    status: "ready",
    storagePath: null,
    createdAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
  },
  {
    id: "rep-2",
    reportCode: "REP-2024-099",
    reportType: "payment_schedule",
    periodStart: "2024-11-01",
    periodEnd: "2024-12-31",
    format: "xlsx",
    status: "ready",
    storagePath: null,
    createdAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
  },
  {
    id: "rep-3",
    reportCode: "REP-2024-083",
    reportType: "cash_flow",
    periodStart: "2024-10-01",
    periodEnd: "2024-11-30",
    format: "csv",
    status: "ready",
    storagePath: null,
    createdAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
  },
];
