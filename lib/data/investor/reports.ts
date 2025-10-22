// Investor Reports Data Module
export type InvestorReportRecord = {
  id: string;
  reportCode: string;
  reportType: "payment_schedule" | "portfolio_yield" | "cash_flow";
  periodStart: string;
  periodEnd: string;
  format: "pdf" | "xlsx" | "csv";
  status: "queued" | "processing" | "ready" | "failed";
  requestedAt: string;
  createdAt: string;
  generatedAt: string | null;
  downloadUrl?: string;
  storagePath: string | null;
};

// Fallback data for development
export const INVESTOR_REPORTS_FALLBACK: InvestorReportRecord[] = [
  {
    id: "report-1",
    reportCode: "REP-2025-001",
    reportType: "portfolio_yield",
    periodStart: "2025-01-01",
    periodEnd: "2025-01-31",
    format: "pdf",
    status: "ready",
    requestedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    storagePath: "/reports/REP-2025-001.pdf",
    downloadUrl: "/api/reports/REP-2025-001/download",
  },
];