// Admin Integrations Data Module
export type IntegrationHealthStatus = "healthy" | "warning" | "error";

export type AdminIntegrationRecord = {
  id: string;
  name: string;
  type: "api" | "webhook" | "database" | "external";
  status: "active" | "inactive" | "error";
  description: string;
  region: string;
  endpoint: string;
  lastSync: string;
  lastSyncAt: string;
  latencyMs: number;
  config: Record<string, unknown>;
};

export type AdminIntegrationLogEntry = {
  id: string;
  integrationId: string;
  system: string;
  action: string;
  status: "success" | "error" | "warning";
  message: string;
  timestamp: string;
  occurredAt: string;
  details: string;
  responseTime?: number;
};

// Fallback data for development
export const ADMIN_INTEGRATIONS_FALLBACK: AdminIntegrationRecord[] = [
  {
    id: "integration-1",
    name: "AECB API",
    type: "api",
    status: "active",
    description: "UAE Credit Bureau API integration",
    region: "UAE",
    endpoint: "https://api.aecb.ae",
    lastSync: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    latencyMs: 1250,
    config: {
      endpoint: "https://api.aecb.ae",
      apiKey: "configured",
    },
  },
  {
    id: "integration-2",
    name: "E-sign Provider",
    type: "webhook",
    status: "active",
    description: "Digital signature service",
    region: "UAE",
    endpoint: "https://webhook.esign.ae",
    lastSync: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    latencyMs: 800,
    config: {
      webhookUrl: "https://webhook.esign.ae",
    },
  },
];

export const ADMIN_INTEGRATION_LOGS_FALLBACK: AdminIntegrationLogEntry[] = [
  {
    id: "log-1",
    integrationId: "integration-1",
    system: "AECB",
    action: "CREDIT_CHECK",
    status: "success",
    message: "Credit check completed successfully",
    timestamp: new Date().toISOString(),
    occurredAt: new Date().toISOString(),
    details: "Кредитная проверка выполнена успешно",
    responseTime: 1250,
  },
];