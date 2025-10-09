"use client";

import { useMemo } from "react";
import type { ChartOptions } from "chart.js";
import { AlertTriangle, MonitorDot, OctagonAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartCanvas } from "@/components/system/chart";
import type {
  OpsDashboardSnapshot,
  OpsDemandCapacitySeries,
  OpsPipelineDataset,
} from "@/lib/supabase/queries/operations";

type OpsDashboardScreenProps = {
  snapshot: OpsDashboardSnapshot;
};

const toneToBadgeVariant: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  muted: "secondary",
};

function resolveToneBadge(tone?: string) {
  if (!tone) {
    return "secondary";
  }
  return toneToBadgeVariant[tone] ?? "secondary";
}

function WatchlistIndicator({ tone }: { tone: "info" | "warning" | "danger" }) {
  if (tone === "danger") {
    return <OctagonAlert className="h-4 w-4 text-rose-500" aria-hidden="true" />;
  }
  if (tone === "warning") {
    return <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />;
  }
  return <MonitorDot className="h-4 w-4 text-brand-500" aria-hidden="true" />;
}

function buildPipelineChartConfig(pipeline: OpsPipelineDataset) {
  return {
    labels: pipeline.map((entry) => entry.label),
    datasets: [
      {
        label: "Number of Deals",
        data: pipeline.map((entry) => entry.value),
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        borderRadius: 14,
        barThickness: 26,
      },
    ],
  };
}

function buildDemandCapacityChartConfig(series: OpsDemandCapacitySeries) {
  return {
    labels: series.labels,
    datasets: [
      {
        label: "Applications Submitted",
        data: series.submitted,
        borderColor: "rgba(71, 85, 105, 1)",
        backgroundColor: "rgba(71, 85, 105, 0.2)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Applications Activated",
        data: series.activated,
        borderColor: "rgba(15, 23, 42, 1)",
        backgroundColor: "rgba(15, 23, 42, 0.25)",
        fill: true,
        tension: 0.4,
      },
    ],
  };
}

const baseChartOptions: ChartOptions = {
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        font: {
          size: 12,
        },
        color: "rgba(148, 163, 184, 1)",
      },
    },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      borderColor: "rgba(148, 163, 184, 0.2)",
      borderWidth: 1,
      padding: 12,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: "rgba(100, 116, 139, 1)",
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(226, 232, 240, 0.4)",
      },
      ticks: {
        color: "rgba(100, 116, 139, 1)",
        precision: 0,
      },
    },
  },
  responsive: true,
  maintainAspectRatio: false,
};

export function OpsDashboardScreen({ snapshot }: OpsDashboardScreenProps) {
  const pipelineChartData = useMemo(
    () => buildPipelineChartConfig(snapshot.pipeline),
    [snapshot.pipeline],
  );

  const demandCapacityChart = useMemo(
    () => buildDemandCapacityChartConfig(snapshot.demandCapacity),
    [snapshot.demandCapacity],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.kpis.map((kpi) => (
          <Card key={kpi.id} className="bg-card/60 backdrop-blur">
            <CardContent className="px-6 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{kpi.label}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{kpi.value}</p>
              <Badge variant={resolveToneBadge(kpi.tone)} className="mt-3">
                {kpi.helpText}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardDescription>Funnel</CardDescription>
              <CardTitle>Deal Pipeline</CardTitle>
            </div>
            <Badge variant="outline" className="rounded-lg">
              Last 30 days
            </Badge>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ChartCanvas
              type="bar"
              data={pipelineChartData}
              options={{
                ...baseChartOptions,
                indexAxis: "y",
                plugins: {
                  ...baseChartOptions.plugins,
                  legend: { display: false },
                },
              }}
              className="h-full w-full"
            />
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader>
            <CardDescription>Alerts</CardDescription>
            <CardTitle>Exception Watchlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.exceptionWatchlist.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="flex flex-1 items-start gap-3">
                  <span className="mt-0.5">
                    <WatchlistIndicator tone={item.tone} />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Badge variant={resolveToneBadge(item.tone)} className="shrink-0">
                  Monitor
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardDescription>Seven-day view</CardDescription>
              <CardTitle>Demand vs Capacity</CardTitle>
            </div>
            <Badge variant="outline" className="rounded-lg">
              Last 7 days
            </Badge>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ChartCanvas
              type="line"
              data={demandCapacityChart}
              options={{
                ...baseChartOptions,
                plugins: {
                  ...baseChartOptions.plugins,
                  legend: {
                    ...baseChartOptions.plugins?.legend,
                    display: false,
                  },
                },
                scales: {
                  ...baseChartOptions.scales,
                  y: {
                    ...(baseChartOptions.scales?.y as object),
                    ticks: {
                      color: "rgba(100, 116, 139, 1)",
                      stepSize: 5,
                    },
                  },
                },
              }}
              className="h-full w-full"
            />
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader>
            <CardDescription>SLA</CardDescription>
            <CardTitle>Watchlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.slaWatchlist.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant={resolveToneBadge(item.tone)} className="shrink-0">
                  Action
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardDescription>Team</CardDescription>
              <CardTitle>Current Load</CardTitle>
            </div>
            <Badge variant="info" className="rounded-lg">
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Specialist</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Over SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.teamLoad.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.specialist}</TableCell>
                    <TableCell className="text-right">{member.activeCount}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={member.overdueCount > 0 ? "danger" : "success"}
                        className="min-w-[3.5rem] justify-center"
                      >
                        {member.overdueCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader>
            <CardDescription>Process</CardDescription>
            <CardTitle>Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.bottlenecks.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.stage}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.average} avg / {item.sla} SLA
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className="h-2 rounded-full bg-brand-600 transition-all"
                    style={{ width: `${item.loadPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader>
            <CardDescription>Automation</CardDescription>
            <CardTitle>Quality & Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.automationMetrics.map((metric) => (
              <div key={metric.id} className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{metric.label}</p>
                <p className="text-xl font-semibold text-foreground">{metric.primary}</p>
                <p className="text-xs text-muted-foreground">{metric.helper}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
