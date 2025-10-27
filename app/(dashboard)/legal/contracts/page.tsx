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

const INITIAL_CONTRACTS = [
  {
    id: "CT-9042",
    client: "Omar Al Zaabi",
    type: "Lease",
    status: "awaiting_sign",
    updatedAt: "2024-07-03T20:00:00Z",
  },
  {
    id: "CT-9040",
    client: "Green Mobility",
    type: "Addendum",
    status: "in_review",
    updatedAt: "2024-07-03T15:30:00Z",
  },
  {
    id: "CT-9034",
    client: "Sara P.",
    type: "Lease",
    status: "signed",
    updatedAt: "2024-07-02T10:00:00Z",
  },
];

const contractStatus: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  awaiting_sign: { label: "Awaiting e-sign", variant: "warning" },
  in_review: { label: "Legal review", variant: "info" },
  signed: { label: "Signed", variant: "success" },
};

export default function LegalContractsPage() {
  const [rows, setRows] = useState(INITIAL_CONTRACTS);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRows = useMemo(() => {
    return rows.filter((row) => (statusFilter === "all" ? true : row.status === statusFilter));
  }, [rows, statusFilter]);

  function handleAssign(id: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, client: `${row.client} · assigned` } : row,
      ),
    );
  }

  function handleApprove(id: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, status: "signed", updatedAt: new Date().toISOString() } : row,
      ),
    );
  }

  return (
    <Card className="border border-border bg-card/70">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Contracts</p>
          <CardTitle className="text-2xl">Поток документов</CardTitle>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.currentTarget.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Все статусы</option>
            <option value="awaiting_sign">Awaiting sign</option>
            <option value="in_review">In review</option>
            <option value="signed">Signed</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">{contract.id}</TableCell>
                <TableCell>{contract.client}</TableCell>
                <TableCell>{contract.type}</TableCell>
                <TableCell>
                  <Badge variant={contractStatus[contract.status]?.variant ?? "info"}>
                    {contractStatus[contract.status]?.label ?? contract.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(contract.updatedAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleAssign(contract.id)}>
                      Assign
                    </Button>
                    <Button variant="brand" size="sm" onClick={() => handleApprove(contract.id)}>
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
  );
}
