"use client";

import { useMemo } from "react";
import type { ChartOptions } from "chart.js";
import { TrendingUp } from "lucide-react";

import type { InvestorDashboardSnapshot } from "@/lib/supabase/queries/investor";
import { cn } from "@/lib/utils";
import { ChartCanvas } from "@/components/system/chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const KPI_TONE_TO_BADGE: Record<
  NonNullable<InvestorDashboardSnapshot["kpis"][number]["tone"]>,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  positive: "success",
  warning: "warning",
  critical: "danger",
  muted: "secondary",
};

const STATUS_TONE_TO_CLASS: Record<string, string> = {
  emerald: "bg-emerald-500",
  indigo: "bg-indigo-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

const ACTIVITY_DIRECTION_TO_CLASS: Record<string, string> = {
  credit: "text-emerald-500",
  debit: "text-rose-500",
  neutral: "text-muted-foreground",
};

function formatCurrency(value: number, currency: string = "AED") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatKpiValue(metric: InvestorDashboardSnapshot["kpis"][number]) {
  if (metric.format === "currency") {
    return formatCurrency(metric.value, metric.currency);
  }
  return formatPercent(metric.value);
}

function formatActivityAmount(
  amount: number | null,
  currency: string | undefined,
  direction: "credit" | "debit" | "neutral",
) {
  if (amount == null) {
    return "—";
  }

  const formatted = formatCurrency(Math.abs(amount), currency);
  if (direction === "neutral") {
    return formatted;
  }

  return `${direction === "credit" ? "+" : "-"}${formatted}`;
}

function formatRelative(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return "Recently";
  }

  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return target.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

const chartBaseOptions: ChartOptions = {
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        font: {
          size: 12,
        },
        color: "rgba(100, 116, 139, 1)",
      },
    },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderColor: "rgba(148, 163, 184, 0.2)",
      borderWidth: 1,
      padding: 12,
    },
  },
  responsive: true,
  maintainAspectRatio: false,
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
        color: "rgba(226, 232, 240, 0.35)",
      },
      ticks: {
        color: "rgba(100, 116, 139, 1)",
      },
    },
  },
};

type InvestorDashboardScreenProps = {
  snapshot: InvestorDashboardSnapshot;
};

export function InvestorDashboardScreen({ snapshot }: InvestorDashboardScreenProps) {
  const chartData = useMemo(
    () => ({
      labels: snapshot.payoutSeries.map((point) => point.label),
      datasets: [
        {
          label: "Accrued payments",
          data: snapshot.payoutSeries.map((point) => point.accrued),
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          borderRadius: 16,
          barThickness: 32,
        },
        {
          label: "Actual payments",
          data: snapshot.payoutSeries.map((point) => point.actual),
          backgroundColor: "rgba(148, 163, 184, 0.4)",
          borderRadius: 16,
          barThickness: 32,
        },
      ],
    }),
    [snapshot.payoutSeries],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.kpis.map((metric) => (
          <Card key={metric.id} className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="px-6 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {formatKpiValue(metric)}
              </p>
              <Badge
                variant={metric.tone ? KPI_TONE_TO_BADGE[metric.tone] ?? "secondary" : "secondary"}
                className="mt-3 rounded-lg"
              >
                {metric.helper}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardDescription>Portfolio yield</CardDescription>
              <CardTitle className="flex items-center gap-2">
                Payouts trend
                <Badge variant="outline" className="rounded-lg text-xs">
                  Last 6 months
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ChartCanvas
              type="bar"
              data={chartData}
              options={chartBaseOptions}
              className="h-full w-full"
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center gap-3">
            <div>
              <CardDescription>Vehicle statuses</CardDescription>
              <CardTitle>Funnel</CardTitle>
            </div>
            <Badge variant="outline" className="ml-auto rounded-lg text-[11px] font-medium">
              Updated hourly
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.statusSummary.map((status) => (
              <div
                key={status.id}
                className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      STATUS_TONE_TO_CLASS[status.tone] ?? "bg-brand-500",
                    )}
                  />
                  <span className="text-sm text-muted-foreground">{status.label}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{status.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center gap-3">
            <div>
              <CardDescription>Events</CardDescription>
              <CardTitle>Recent activity</CardTitle>
            </div>
            <Badge variant="secondary" className="ml-auto gap-1 rounded-lg text-xs">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              Auto-sync
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.activity.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/70 px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{event.description}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {formatRelative(event.occurredAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    ACTIVITY_DIRECTION_TO_CLASS[event.direction],
                  )}
                >
                  {formatActivityAmount(event.amount, event.currency, event.direction)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardDescription>Profile</CardDescription>
            <CardTitle>{snapshot.investor.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                AUM
              </span>
              <span className="text-base font-semibold text-foreground">
                {formatCurrency(snapshot.investor.aum, snapshot.investor.currency)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Available funds
              </span>
              <span className="text-base font-semibold text-foreground">
                {formatCurrency(snapshot.investor.availableFunds, snapshot.investor.currency)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Yield YTD
              </span>
              <span className="text-base font-semibold text-foreground">
                {formatPercent(snapshot.investor.yieldYtd)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Overdue exposure
              </span>
              <span className="text-base font-semibold text-foreground">
                {formatPercent(snapshot.investor.overdueRatio)}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
