export type IntegrationHealthStatus = "active" | "warning" | "error";

export type AdminIntegrationRecord = {
  id: string;
  name: string;
  category: "erp" | "scoring" | "telematics" | "payments" | "notifications" | "other";
  status: IntegrationHealthStatus;
  latencyMs: number;
  lastSyncAt: string;
  region: string;
  description: string;
  endpoint: string;
};

export type AdminIntegrationLogEntry = {
  id: string;
  system: string;
  status: string;
  message: string;
  occurredAt: string;
};

export const ADMIN_INTEGRATIONS_FALLBACK: AdminIntegrationRecord[] = [
  {
    id: "fallback-integration-odoo-erp",
    name: "Odoo ERP",
    category: "erp",
    status: "active",
    latencyMs: 420,
    lastSyncAt: "2025-01-14T10:24:00+04:00",
    region: "Dubai, UAE",
    description: "Synchronises deal, invoice, and payment data with the corporate ERP.",
    endpoint: "https://odoo.fastlease.internal/api/v1",
  },
  {
    id: "fallback-integration-credit-scoring-bki",
    name: "Credit Scoring BKI",
    category: "scoring",
    status: "warning",
    latencyMs: 980,
    lastSyncAt: "2025-01-14T10:18:00+04:00",
    region: "Abu Dhabi, UAE",
    description: "External credit bureau used for client risk assessment (SLA 2 minutes).",
    endpoint: "https://api.bki.gov.ae/v2/scoring",
  },
  {
    id: "fallback-integration-aurora-telematics",
    name: "Al Thuraya GPS",
    category: "telematics",
    status: "active",
    latencyMs: 210,
    lastSyncAt: "2025-01-14T10:23:00+04:00",
    region: "Dubai, UAE",
    description: "Ingests real-time vehicle telematics data for fleet monitoring.",
    endpoint: "https://telematics.aurora.ai/webhooks/fast-lease",
  },
];

export const ADMIN_INTEGRATION_LOGS_FALLBACK: AdminIntegrationLogEntry[] = [
  {
    id: "LOG-3921",
    system: "Odoo ERP",
    status: "200 OK",
    message: "Deal status update processed",
    occurredAt: "2025-01-14T10:24:12+04:00",
  },
  {
    id: "LOG-3920",
    system: "Credit Scoring BKI",
    status: "429 Too Many Requests",
    message: "Request limit reached, retry scheduled in 30 seconds",
    occurredAt: "2025-01-14T10:23:58+04:00",
  },
  {
    id: "LOG-3919",
    system: "Al Thuraya GPS",
    status: "200 OK",
    message: "Sensor data ingestion complete",
    occurredAt: "2025-01-14T10:23:31+04:00",
  },
  {
    id: "LOG-3918",
    system: "Odoo ERP",
    status: "504 Gateway Timeout",
    message: "Retry request queued, monitoring latency",
    occurredAt: "2025-01-14T10:23:02+04:00",
  },
];
