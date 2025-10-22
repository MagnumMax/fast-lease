"use client";

import { useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Calendar, Check, Download, FileDown, FileText, FileUp } from "lucide-react";

import type { InvestorReportsSnapshot } from "@/lib/supabase/queries/investor";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  requestInvestorReportAction,
  type RequestReportState,
} from "./actions";

const REPORT_TYPE_LABEL: Record<string, string> = {
  payment_schedule: "Payment Schedule",
  portfolio_yield: "Portfolio Yield",
  cash_flow: "Cash Flow",
};

const REPORT_FORMAT_LABEL: Record<string, string> = {
  pdf: "PDF",
  xlsx: "XLSX",
  csv: "CSV",
};

const STATUS_VARIANT: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  ready: "success",
  processing: "warning",
  queued: "secondary",
  failed: "danger",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
    >
      {pending ? (
        <>
          <FileUp className="h-4 w-4 animate-spin" aria-hidden="true" />
          Generating...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" aria-hidden="true" />
          Generate Report
        </>
      )}
    </Button>
  );
}

function ReportGeneratorForm({ lastReadyAt }: { lastReadyAt: string | null }) {
  const [state, formAction] = useFormState<RequestReportState, FormData>(
    requestInvestorReportAction,
    { status: "idle" },
  );

  const statusBadge =
    state.status === "success"
      ? { variant: "success" as const, message: "Report request queued" }
      : state.status === "error"
        ? { variant: "danger" as const, message: state.message }
        : null;

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardDescription>Financial Reports</CardDescription>
          <CardTitle className="text-2xl text-foreground">Generate Export</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Select period, format and report type. The system will apply the digital signature automatically.
          </p>
        </div>
        <Badge variant="outline" className="rounded-xl text-xs">
          Last report — {formatDate(lastReadyAt)}
        </Badge>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <select
                id="reportType"
                name="reportType"
                defaultValue="payment_schedule"
                className="h-10 w-full rounded-xl border border-border bg-background/80 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus-visible:ring-brand-500"
              >
                <option value="payment_schedule">Payment Schedule</option>
                <option value="portfolio_yield">Portfolio Yield</option>
                <option value="cash_flow">Cash Flow</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodFrom">From Period</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="periodFrom"
                  name="periodFrom"
                  type="date"
                  defaultValue={new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 10)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodTo">To Period</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="periodTo"
                  name="periodTo"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Report Format</Label>
            <div className="flex gap-3">
              {(["pdf", "xlsx", "csv"] as const).map((format) => (
                <label
                  key={format}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm",
                  )}
                >
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    defaultChecked={format === "pdf"}
                  />
                  {REPORT_FORMAT_LABEL[format]}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm">
            <input type="checkbox" name="sendCopy" defaultChecked />
            Send copy to accounting by email
          </label>

          <div className="flex items-center gap-3">
            <SubmitButton />
            {statusBadge ? (
              <Badge variant={statusBadge.variant} className="gap-2 rounded-lg text-xs">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {statusBadge.message}
              </Badge>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ReportsHistory({ snapshot }: { snapshot: InvestorReportsSnapshot }) {
  const reports = snapshot.reports;

  const emptyState = useMemo(
    () =>
      !reports.length ? (
        <div className="rounded-2xl border border-dashed border-border/70 px-4 py-16 text-center text-sm text-muted-foreground">
          No reports yet. Generate the first export using the form above.
        </div>
      ) : null,
    [reports.length],
  );

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Recent Exports</CardTitle>
        <CardDescription>Signed documents stored in Supabase Storage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex flex-col gap-3 rounded-2xl border border-border/70 px-4 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                {REPORT_TYPE_LABEL[report.reportType] ?? report.reportType}
              </p>
              <p className="text-xs text-muted-foreground">
                {report.reportCode} · {formatDate(report.generatedAt ?? report.createdAt)} ·{" "}
                {REPORT_FORMAT_LABEL[report.format] ?? report.format.toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={STATUS_VARIANT[report.status] ?? "secondary"}
                className="rounded-lg text-xs"
              >
                {report.status}
              </Badge>
              {report.status === "ready" && report.downloadUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-2 rounded-lg"
                  asChild
                >
                  <a href={report.downloadUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-2 rounded-lg"
                  disabled
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Preparing
                </Button>
              )}
            </div>
          </div>
        ))}
        {emptyState}
      </CardContent>
    </Card>
  );
}

type InvestorReportScreenProps = {
  snapshot: InvestorReportsSnapshot;
};

export function InvestorReportScreen({ snapshot }: InvestorReportScreenProps) {
  return (
    <div className="space-y-6">
      <ReportGeneratorForm lastReadyAt={snapshot.lastReadyAt} />
      <ReportsHistory snapshot={snapshot} />
    </div>
  );
}
