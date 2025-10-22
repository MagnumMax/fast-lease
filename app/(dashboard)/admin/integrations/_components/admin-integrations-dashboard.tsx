"use client";

import { useState } from "react";
import { Activity, AlertCircle, AlertTriangle, PlugZap, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminIntegrationLogEntry,
  AdminIntegrationRecord,
  IntegrationHealthStatus,
} from "@/lib/data/admin/integrations";

type AdminIntegrationsDashboardProps = {
  initialIntegrations: AdminIntegrationRecord[];
  initialLogs: AdminIntegrationLogEntry[];
};

const STATUS_META: Record<
  IntegrationHealthStatus,
  { label: string; badgeVariant: "success" | "warning" | "danger"; description: string }
> = {
  healthy: {
    label: "Active",
    badgeVariant: "success",
    description: "Integration responding within SLA.",
  },
  warning: {
    label: "Warning",
    badgeVariant: "warning",
    description: "Degraded performance. Monitor closely.",
  },
  error: {
    label: "Error",
    badgeVariant: "danger",
    description: "Integration unavailable. Incident required.",
  },
};

function formatLatency(latencyMs: number): string {
  if (latencyMs >= 1000) {
    return `${(latencyMs / 1000).toFixed(1)} s`;
  }
  return `${latencyMs} ms`;
}

function formatTimestamp(value: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function generateClientId(prefix: string) {
  try {
    if (
      typeof globalThis !== "undefined" &&
      globalThis.crypto &&
      typeof globalThis.crypto.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Ignore and fallback
  }

  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${random}${timestamp}`;
}

export function AdminIntegrationsDashboard({
  initialIntegrations,
  initialLogs,
}: AdminIntegrationsDashboardProps) {
  const [integrations, setIntegrations] =
    useState<AdminIntegrationRecord[]>(initialIntegrations);
  const [logs, setLogs] = useState<AdminIntegrationLogEntry[]>(initialLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  function getHealthStatus(integrationStatus: AdminIntegrationRecord["status"]): IntegrationHealthStatus {
    switch (integrationStatus) {
      case "active":
        return "healthy";
      case "inactive":
        return "warning";
      case "error":
        return "error";
      default:
        return "healthy";
    }
  }

  function handleRefresh() {
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setIntegrations((prev) =>
        prev.map((integration) => ({
          ...integration,
          lastSyncAt: now.toISOString(),
          latencyMs:
            integration.status === "error"
              ? integration.latencyMs
              : Math.max(180, Math.round(integration.latencyMs * 0.9)),
        })),
      );
      setLogs((prev) => [
        {
          id: generateClientId("log"),
          integrationId: "system",
          system: "Health Monitor",
          action: "REFRESH",
          status: "success",
          message: "Manual refresh completed",
          timestamp: now.toISOString(),
          occurredAt: now.toISOString(),
          details: "System health check completed successfully",
        },
        ...prev,
      ]);
      setIsRefreshing(false);
    }, 900);
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/80 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Integrations
            </p>
            <CardTitle className="text-2xl">
              API status monitoring
            </CardTitle>
            <CardDescription>
              Mirroring /beta/admin/integrations — track banking, telematics, and ERP connectivity.
            </CardDescription>
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-amber-400 bg-amber-50/60 px-3 py-2 text-xs text-amber-600 dark:border-amber-300 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              Метрики отображаются из демо-источника; реальные webhooks и health-check пока не подключены.
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                  <path d="M22 12a10 10 0 0 1-10 10" />
                </svg>
                Updating…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh now
              </span>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {integrations.map((integration) => {
              const meta = STATUS_META[getHealthStatus(integration.status)];
              return (
                <div
                  key={integration.id}
                  className="rounded-3xl border border-border bg-background/60 p-6 shadow-sm transition hover:border-brand-400"
                >
                  <header className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {integration.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{integration.region}</p>
                    </div>
                    <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                  </header>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                  <dl className="mt-5 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Latency</dt>
                      <dd className="font-medium text-foreground">
                        {formatLatency(integration.latencyMs)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Last sync</dt>
                      <dd className="font-medium text-foreground">
                        {formatTimestamp(integration.lastSyncAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Endpoint</dt>
                      <dd className="truncate font-medium text-foreground">
                        {integration.endpoint}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-brand-500" />
                    {meta.description}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PlugZap className="h-4 w-4 text-brand-500" />
            API logs
          </CardTitle>
          <CardDescription>
            Stream of recent integration events with health indicators, matching the /beta flows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log ID</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const isWarning = log.status.includes("429") || log.status.includes("504");
                const displayBadge: "success" | "warning" | "danger" = log.status.startsWith("2")
                  ? "success"
                  : isWarning
                    ? "warning"
                    : "danger";
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.id}</TableCell>
                    <TableCell>{log.system}</TableCell>
                    <TableCell>
                      <Badge variant={displayBadge}>{log.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {log.message}
                    </TableCell>
                    <TableCell>{formatTimestamp(log.occurredAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            BKI throttling events trigger on-call escalation when latency exceeds 1.5 seconds.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
