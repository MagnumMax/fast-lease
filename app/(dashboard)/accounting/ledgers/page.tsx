"use client";

import { useMemo, useState } from "react";

import { formatCurrency, formatDate } from "@/app/(dashboard)/client/_components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LedgerEntry = {
  id: string;
  date: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
};

const INITIAL_ENTRIES: LedgerEntry[] = [
  {
    id: "GL-2201",
    date: "2024-07-03T18:10:00Z",
    account: "2100 · Accounts Payable",
    description: "Service order SR-2104",
    debit: 0,
    credit: 1450,
  },
  {
    id: "GL-2199",
    date: "2024-07-03T12:20:00Z",
    account: "1100 · Cash",
    description: "Investor payout batch-2699",
    debit: 0,
    credit: 512000,
  },
  {
    id: "GL-2195",
    date: "2024-07-02T09:00:00Z",
    account: "4100 · Revenue",
    description: "Lease invoice INV-90321",
    debit: 18350,
    credit: 0,
  },
];

export default function AccountingLedgersPage() {
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const [accountFilter, setAccountFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const accounts = Array.from(new Set(INITIAL_ENTRIES.map((entry) => entry.account.split(" · ")[0])));

  const filteredEntries = useMemo(() => {
    return [...entries]
      .filter((entry) => (accountFilter === "all" ? true : entry.account.startsWith(accountFilter)))
      .sort((a, b) =>
        sortDir === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }, [entries, accountFilter, sortDir]);

  function handleAdjust(id: string) {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, description: `${entry.description} · adjusted` } : entry,
      ),
    );
  }

  return (
    <Card className="border border-border bg-card/70">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">General ledger</p>
            <CardTitle className="text-2xl">Последние проводки</CardTitle>
          </div>
          <div className="flex gap-2 text-sm">
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="h-9 min-w-[150px] rounded-xl border border-border bg-background px-3">
                <SelectValue placeholder="Все счета" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">Все счета</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account} value={account}>
                    {account}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortDir} onValueChange={(value) => setSortDir(value as "asc" | "desc")}>
              <SelectTrigger className="h-9 rounded-xl border border-border bg-background px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Дата ↓</SelectItem>
                <SelectItem value="asc">Дата ↑</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entry</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Debit</TableHead>
              <TableHead>Credit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.id}</TableCell>
                <TableCell>{formatDate(entry.date, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</TableCell>
                <TableCell>{entry.account}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>{entry.debit ? formatCurrency(entry.debit) : "—"}</TableCell>
                <TableCell>{entry.credit ? formatCurrency(entry.credit) : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleAdjust(entry.id)}>
                    Adjust
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
