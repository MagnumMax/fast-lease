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

const INITIAL_SERVICE_ORDERS = [
  {
    id: "SR-2109",
    partner: "AutoPro DXB",
    vin: "5YJ3E1EA7LF7801",
    estimate: 3200,
    status: "awaiting_approval",
    createdAt: "2024-07-03T11:00:00Z",
  },
  {
    id: "SR-2104",
    partner: "Tesla Service",
    vin: "5YJCC0A26KF123456",
    estimate: 1450,
    status: "in_service",
    createdAt: "2024-07-02T08:30:00Z",
  },
  {
    id: "SR-2097",
    partner: "Al Futtaim",
    vin: "JTMHY7AJ7M1234567",
    estimate: 870,
    status: "completed",
    createdAt: "2024-07-01T15:20:00Z",
  },
];

const orderStatus: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  awaiting_approval: { label: "Ждёт апрува", variant: "warning" },
  in_service: { label: "В сервисе", variant: "info" },
  completed: { label: "Готово", variant: "success" },
};

export default function TechServiceOrdersPage() {
  const [orders, setOrders] = useState(INITIAL_SERVICE_ORDERS);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const visibleOrders = useMemo(() => {
    return [...orders]
      .filter((order) => (statusFilter === "all" ? true : order.status === statusFilter))
      .sort((a, b) => (sortDir === "asc" ? a.estimate - b.estimate : b.estimate - a.estimate));
  }, [orders, statusFilter, sortDir]);

  function handleApprove(id: string) {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== id) return order;
        if (order.status === "awaiting_approval") {
          return { ...order, status: "in_service" };
        }
        return { ...order, status: "completed" };
      }),
    );
  }

  function handleAssign(id: string) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, partner: `${order.partner} · priority` } : order,
      ),
    );
  }

  return (
    <Card className="border border-border bg-card/70">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Service orders</p>
          <CardTitle className="text-2xl">Журнал работ</CardTitle>
          <div className="flex gap-2 text-sm">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.currentTarget.value)}
              className="rounded-xl border border-border bg-background px-3 py-1"
            >
              <option value="all">Все статусы</option>
              <option value="awaiting_approval">Awaiting approval</option>
              <option value="in_service">In service</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={sortDir}
              onChange={(event) => setSortDir(event.currentTarget.value as "asc" | "desc")}
              className="rounded-xl border border-border bg-background px-3 py-1"
            >
              <option value="desc">Смета ↓</option>
              <option value="asc">Смета ↑</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>VIN</TableHead>
              <TableHead>Estimate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.partner}</TableCell>
                <TableCell className="font-mono text-xs">{order.vin}</TableCell>
                <TableCell>{formatCurrency(order.estimate)}</TableCell>
                <TableCell>
                  <Badge variant={orderStatus[order.status]?.variant ?? "info"}>
                    {orderStatus[order.status]?.label ?? order.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(order.createdAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleAssign(order.id)}>
                      Prioritize
                    </Button>
                    <Button variant="brand" size="sm" onClick={() => handleApprove(order.id)}>
                      {order.status === "awaiting_approval" ? "Approve" : "Complete"}
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
