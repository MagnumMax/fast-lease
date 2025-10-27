"use client";

import { useMemo, useState } from "react";

import { formatCurrency, formatDate } from "@/app/(dashboard)/client/_components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DISBURSEMENT_BATCHES = [
  {
    id: "BATCH-2701",
    channel: "Investors",
    amount: 640000,
    scheduledAt: "2024-07-04T15:00:00Z",
    status: "pending",
    bankFile: "wave27.csv",
  },
  {
    id: "BATCH-2700",
    channel: "Vendors",
    amount: 88000,
    scheduledAt: "2024-07-04T10:00:00Z",
    status: "processing",
    bankFile: "vendors_0407.xml",
  },
  {
    id: "BATCH-2699",
    channel: "Investors",
    amount: 512000,
    scheduledAt: "2024-07-03T15:00:00Z",
    status: "completed",
    bankFile: "wave26.csv",
  },
  {
    id: "BATCH-2698",
    channel: "Vendors",
    amount: 71000,
    scheduledAt: "2024-07-03T09:00:00Z",
    status: "failed",
    bankFile: "vendors_0307.xml",
  },
];

const statusVariant: Record<typeof DISBURSEMENT_BATCHES[number]["status"], "info" | "success" | "warning" | "danger"> = {
  pending: "info",
  processing: "warning",
  completed: "success",
  failed: "danger",
};

export default function FinanceDisbursementsPage() {
  const [rows, setRows] = useState(DISBURSEMENT_BATCHES);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const visibleRows = useMemo(() => {
    return [...rows]
      .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter))
      .sort((a, b) => {
        const diff = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        return sortDir === "asc" ? diff : -diff;
      });
  }, [rows, statusFilter, sortDir]);

  const totals = rows.reduce(
    (acc, batch) => {
      acc.total += batch.amount;
      if (batch.status !== "completed") {
        acc.inFlight += batch.amount;
      }
      return acc;
    },
    { total: 0, inFlight: 0 },
  );

  function handleApprove(id: string) {
    setRows((prev) =>
      prev.map((batch) =>
        batch.id === id
          ? { ...batch, status: "completed" }
          : batch,
      ),
    );
  }

  function handleRetry(id: string) {
    setRows((prev) =>
      prev.map((batch) =>
        batch.id === id
          ? { ...batch, status: "pending" }
          : batch,
      ),
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Total scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{formatCurrency(totals.total)}</p>
            <p className="text-xs text-muted-foreground">Грядущие batch-выплаты</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              In flight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{formatCurrency(totals.inFlight)}</p>
            <p className="text-xs text-muted-foreground">Пока не подтверждены банком</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Files queued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{DISBURSEMENT_BATCHES.length}</p>
            <p className="text-xs text-muted-foreground">За последние 24 часа</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border border-border bg-card/70">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Disbursement waves</p>
            <CardTitle className="text-2xl">Статусы payout</CardTitle>
            <div className="flex flex-wrap gap-2 text-sm">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.currentTarget.value)}
                className="rounded-xl border border-border bg-background px-3 py-1"
              >
                <option value="all">Все статусы</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={sortDir}
                onChange={(event) => setSortDir(event.currentTarget.value as "asc" | "desc")}
                className="rounded-xl border border-border bg-background px-3 py-1"
              >
                <option value="asc">Время ↑</option>
                <option value="desc">Время ↓</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bank file</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.id}</TableCell>
                  <TableCell>{batch.channel}</TableCell>
                  <TableCell>{formatDate(batch.scheduledAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>{formatCurrency(batch.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[batch.status]}>{batch.status}</Badge>
                  </TableCell>
                  <TableCell>{batch.bankFile}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRetry(batch.id)}>
                        Повторить
                      </Button>
                      <Button variant="brand" size="sm" onClick={() => handleApprove(batch.id)}>
                        Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
