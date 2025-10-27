"use client";

import { useMemo, useState } from "react";

import { formatDate } from "@/app/(dashboard)/client/_components";
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

const INITIAL_INSPECTIONS = [
  {
    vin: "5YJ3E1EA7LF7801",
    deal: "DEAL-7801",
    hub: "Dubai South",
    scheduled: "2024-07-04T09:00:00Z",
    status: "awaiting_photos",
    engineer: "Layla",
  },
  {
    vin: "WAUZZZF40MN005122",
    deal: "DEAL-7798",
    hub: "Deira",
    scheduled: "2024-07-04T12:00:00Z",
    status: "in_progress",
    engineer: "Mahmoud",
  },
  {
    vin: "WDD2130431A987654",
    deal: "DEAL-7791",
    hub: "Abu Dhabi",
    scheduled: "2024-07-03T15:00:00Z",
    status: "completed",
    engineer: "Noura",
  },
];

const statusMap: Record<string, { label: string; variant: "warning" | "info" | "success" }> = {
  awaiting_photos: { label: "Ждём фото", variant: "warning" },
  in_progress: { label: "В работе", variant: "info" },
  completed: { label: "Завершено", variant: "success" },
};

export default function TechInspectionsPage() {
  const [rows, setRows] = useState(INITIAL_INSPECTIONS);
  const [hubFilter, setHubFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const hubs = Array.from(new Set(INITIAL_INSPECTIONS.map((row) => row.hub)));

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      return (hubFilter === "all" || row.hub === hubFilter) && (statusFilter === "all" || row.status === statusFilter);
    });
  }, [rows, hubFilter, statusFilter]);

  function handleAssign(deal: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.deal === deal ? { ...row, engineer: "You" } : row,
      ),
    );
  }

  function handleComplete(deal: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.deal === deal ? { ...row, status: "completed" } : row,
      ),
    );
  }

  return (
    <Card className="border border-border bg-card/70">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Inspections</p>
          <CardTitle className="text-2xl">Очередь проверок</CardTitle>
          <div className="flex gap-2 text-sm">
            <select
              value={hubFilter}
              onChange={(event) => setHubFilter(event.currentTarget.value)}
              className="rounded-xl border border-border bg-background px-3 py-1"
            >
              <option value="all">Все хабы</option>
              {hubs.map((hub) => (
                <option key={hub} value={hub}>
                  {hub}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.currentTarget.value)}
              className="rounded-xl border border-border bg-background px-3 py-1"
            >
              <option value="all">Все статусы</option>
              <option value="awaiting_photos">Awaiting photos</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>VIN</TableHead>
              <TableHead>Deal</TableHead>
              <TableHead>Hub</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Engineer</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((inspection) => {
              const status = statusMap[inspection.status];
              return (
                <TableRow key={inspection.deal}>
                  <TableCell className="font-mono text-xs">{inspection.vin}</TableCell>
                  <TableCell className="font-medium">{inspection.deal}</TableCell>
                  <TableCell>{inspection.hub}</TableCell>
                  <TableCell>{formatDate(inspection.scheduled, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>
                    <Badge variant={status?.variant ?? "info"}>{status?.label ?? inspection.status}</Badge>
                  </TableCell>
                  <TableCell>{inspection.engineer}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleAssign(inspection.deal)}>
                        Assign
                      </Button>
                      <Button variant="brand" size="sm" onClick={() => handleComplete(inspection.deal)}>
                        Mark done
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
