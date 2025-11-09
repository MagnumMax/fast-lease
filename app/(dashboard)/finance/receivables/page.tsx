"use client";

import { useMemo, useState } from "react";

import { formatCurrency, formatDate } from "@/app/(dashboard)/client/_components";
import { Badge } from "@/components/ui/badge";
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

const RECEIVABLES = [
  {
    invoice: "INV-90321",
    client: "Omar Al Zaabi",
    dueDate: "2024-07-04",
    amount: 18350,
    bucket: "overdue",
    collector: "Aisha",
  },
  {
    invoice: "INV-90322",
    client: "Hitech Logistics",
    dueDate: "2024-07-10",
    amount: 22100,
    bucket: "pending",
    collector: "Karim",
  },
  {
    invoice: "INV-90315",
    client: "Sara P.",
    dueDate: "2024-06-28",
    amount: 12400,
    bucket: "promise",
    collector: "Omar",
  },
  {
    invoice: "INV-90305",
    client: "Fleet Masters",
    dueDate: "2024-06-20",
    amount: 44200,
    bucket: "legal",
    collector: "Aisha",
  },
];

const bucketDescriptors: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" }> = {
  pending: { label: "К оплате", tone: "info" },
  overdue: { label: "> 7 дн", tone: "warning" },
  promise: { label: "Обещан платеж", tone: "success" },
  legal: { label: "Эскалация", tone: "danger" },
};

export default function FinanceReceivablesPage() {
  const [rows, setRows] = useState(RECEIVABLES);
  const [bucketFilter, setBucketFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filteredRows = useMemo(() => {
    return [...rows]
      .filter((row) => (bucketFilter === "all" ? true : row.bucket === bucketFilter))
      .sort((a, b) => {
        const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return sortDir === "asc" ? diff : -diff;
      });
  }, [rows, bucketFilter, sortDir]);

  const totalOutstanding = rows.reduce((acc, item) => acc + item.amount, 0);
  const overdueCount = rows.filter((item) => item.bucket === "overdue").length;

  function handleAssign(invoice: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.invoice === invoice ? { ...row, collector: "You" } : row,
      ),
    );
  }

  function handleMarkCollected(invoice: string) {
    setRows((prev) => prev.filter((row) => row.invoice !== invoice));
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{formatCurrency(totalOutstanding)}</p>
            <p className="text-xs text-muted-foreground">По 4 активным инвойсам</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Overdue (&gt;7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{overdueCount}</p>
            <p className="text-xs text-muted-foreground">Нужна эскалация в поддержку</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Collectors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">3</p>
            <p className="text-xs text-muted-foreground">Активные ассигнования</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border border-border bg-card/70">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Receivables</p>
            <CardTitle className="text-2xl">Очередь сборов</CardTitle>
            <div className="flex flex-wrap gap-2 text-sm">
              <Select value={bucketFilter} onValueChange={setBucketFilter}>
                <SelectTrigger className="h-9 min-w-[150px] rounded-xl border border-border bg-background px-3">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="pending">К оплате</SelectItem>
                  <SelectItem value="overdue">Просрочка</SelectItem>
                  <SelectItem value="promise">Обещан платёж</SelectItem>
                  <SelectItem value="legal">Эскалация</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortDir} onValueChange={(value) => setSortDir(value as "asc" | "desc")}>
                <SelectTrigger className="h-9 min-w-[140px] rounded-xl border border-border bg-background px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Срок ↑</SelectItem>
                  <SelectItem value="desc">Срок ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Collector</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => {
                const descriptor = bucketDescriptors[row.bucket];
                return (
                  <TableRow key={row.invoice}>
                    <TableCell className="font-medium">{row.invoice}</TableCell>
                    <TableCell>{row.client}</TableCell>
                    <TableCell>{formatDate(row.dueDate)}</TableCell>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={descriptor?.tone ?? "info"}>{descriptor?.label ?? row.bucket}</Badge>
                    </TableCell>
                    <TableCell>{row.collector}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleAssign(row.invoice)}>
                          Назначить
                        </Button>
                        <Button variant="brand" size="sm" onClick={() => handleMarkCollected(row.invoice)}>
                          Оплачено
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
    </div>
  );
}
