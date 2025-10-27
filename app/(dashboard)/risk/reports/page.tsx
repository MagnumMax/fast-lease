"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const KPI_VARIANTS = {
  week: [
    { label: "Approval rate", value: "61%", delta: "+4pp WoW" },
    { label: "Average SLA", value: "3.4h", delta: "−18 мин" },
    { label: "High-risk exposure", value: "AED 2.8M", delta: "+0.3M" },
  ],
  month: [
    { label: "Approval rate", value: "58%", delta: "−2pp MoM" },
    { label: "Average SLA", value: "3.8h", delta: "−6 мин" },
    { label: "High-risk exposure", value: "AED 2.6M", delta: "−0.2M" },
  ],
} as const;

const SECTOR_CONCENTRATION = [
  { sector: "Logistics", share: 24, change: 3, limit: 30 },
  { sector: "Retail", share: 18, change: -1, limit: 25 },
  { sector: "Hospitality", share: 12, change: 0, limit: 20 },
  { sector: "Mobility", share: 10, change: 2, limit: 20 },
];

export default function RiskReportsPage() {
  const [timeframe, setTimeframe] = useState<"week" | "month">("week");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedSectors = useMemo(() => {
    return [...SECTOR_CONCENTRATION].sort((a, b) =>
      sortDir === "asc" ? a.share - b.share : b.share - a.share,
    );
  }, [sortDir]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-sm">
          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.currentTarget.value as "week" | "month")}
            className="rounded-xl border border-border bg-background px-3 py-2"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Month to date</option>
          </select>
          <select
            value={sortDir}
            onChange={(event) => setSortDir(event.currentTarget.value as "asc" | "desc")}
            className="rounded-xl border border-border bg-background px-3 py-2"
          >
            <option value="desc">Share ↓</option>
            <option value="asc">Share ↑</option>
          </select>
        </div>
        <Button variant="outline" size="sm">Export CSV</Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {KPI_VARIANTS[timeframe].map((kpi) => (
          <Card key={kpi.label} className="bg-card/70">
            <CardHeader className="pb-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{kpi.label}</p>
              <CardTitle className="text-3xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{kpi.delta}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border border-border bg-card/70">
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Sector concentration</p>
            <CardTitle className="text-2xl">Портфель по отраслям</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sector</TableHead>
                <TableHead>Current share</TableHead>
                <TableHead>Δ 7d</TableHead>
                <TableHead>Limit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSectors.map((row) => (
                <TableRow key={row.sector}>
                  <TableCell className="font-medium">{row.sector}</TableCell>
                  <TableCell>{row.share}%</TableCell>
                  <TableCell>{row.change >= 0 ? `+${row.change}pp` : `${row.change}pp`}</TableCell>
                  <TableCell>{row.limit}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
