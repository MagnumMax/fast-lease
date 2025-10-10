"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import Sortable, { type SortableEvent } from "sortablejs";
import { LayoutGrid, Table as TableIcon, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OpsDealSummary } from "@/lib/data/operations/deals";

type OpsDealsBoardProps = {
  initialDeals: OpsDealSummary[];
};

type OpsDealStatusKey = OpsDealSummary["statusKey"];

const STATUS_LABELS: Record<OpsDealStatusKey, string> = {
  applications: "Applications",
  documents: "Underwriting",
  handover: "Vehicle Delivery",
  active: "Active",
};

const STATUS_BADGES: Record<OpsDealStatusKey, ComponentProps<typeof Badge>["variant"]> = {
  applications: "info",
  documents: "outline",
  handover: "warning",
  active: "success",
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const STATUS_ORDER: OpsDealStatusKey[] = ["applications", "documents", "handover", "active"];

type SortableInstance = Sortable | null;

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function OpsDealsBoard({ initialDeals }: OpsDealsBoardProps) {
  const [deals, setDeals] = useState<OpsDealSummary[]>(() => initialDeals);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OpsDealStatusKey | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formState, setFormState] = useState({
    id: "",
    client: "",
    vehicle: "",
    stage: "",
    statusKey: "applications" as OpsDealStatusKey,
  });

  const columnRefs = useRef<Record<OpsDealStatusKey, HTMLDivElement | null>>({
    applications: null,
    documents: null,
    handover: null,
    active: null,
  });

  const sortableInstances = useRef<Record<OpsDealStatusKey, SortableInstance>>({
    applications: null,
    documents: null,
    handover: null,
    active: null,
  });

  const filteredDeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return deals.filter((deal) => {
      const matchesQuery =
        !query ||
        `${deal.dealId} ${deal.client} ${deal.vehicle}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || deal.statusKey === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [deals, searchQuery, statusFilter]);

  const groupedDeals = useMemo(() => {
    return filteredDeals.reduce(
      (acc, deal) => {
        const list = acc[deal.statusKey] ?? [];
        list.push(deal);
        acc[deal.statusKey] = list;
        return acc;
      },
      {
        applications: [] as OpsDealSummary[],
        documents: [] as OpsDealSummary[],
        handover: [] as OpsDealSummary[],
        active: [] as OpsDealSummary[],
      },
    );
  }, [filteredDeals]);

  useEffect(() => {
    STATUS_ORDER.forEach((status) => {
      const element = columnRefs.current[status];
      if (!element) {
        if (sortableInstances.current[status]) {
          sortableInstances.current[status]?.destroy();
          sortableInstances.current[status] = null;
        }
        return;
      }
      if (sortableInstances.current[status]) {
        sortableInstances.current[status]?.destroy();
        sortableInstances.current[status] = null;
      }
      sortableInstances.current[status] = Sortable.create(element, {
        group: "ops-deals",
        animation: 150,
        handle: "[data-deal-card]",
        onEnd: (event: SortableEvent) => {
          const dealId = event.item.getAttribute("data-deal-id");
          const newStatus = event.to.getAttribute("data-status") as OpsDealStatusKey | null;
          if (!dealId || !newStatus || !STATUS_ORDER.includes(newStatus)) {
            return;
          }
          setDeals((prev) =>
            prev.map((deal) =>
              deal.id === dealId
                ? {
                    ...deal,
                    statusKey: newStatus,
                  }
                : deal,
            ),
          );
        },
      });
    });
    return () => {
      Object.values(sortableInstances.current).forEach((instance) => instance?.destroy());
    };
  }, [groupedDeals.applications.length, groupedDeals.documents.length, groupedDeals.handover.length, groupedDeals.active.length]);

  function handleCreateDeal() {
    if (!formState.id.trim() || !formState.client.trim()) {
      return;
    }
    const newDeal: OpsDealSummary = {
      id: `${Date.now()}`,
      dealId: formState.id.trim(),
      client: formState.client.trim(),
      vehicle: formState.vehicle.trim() || "Vehicle",
      updatedAt: new Date().toISOString(),
      stage: formState.stage.trim() || "New application",
      statusKey: formState.statusKey,
    };
    setDeals((prev) => [newDeal, ...prev]);
    setFormState({
      id: "",
      client: "",
      vehicle: "",
      stage: "",
      statusKey: "applications",
    });
    setIsCreateOpen(false);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardDescription>Operations</CardDescription>
            <CardTitle>Deals</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search: client, vehicle, ID"
                className="h-10 w-64 rounded-xl pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as OpsDealStatusKey | "all")}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Create deal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Create deal</DialogTitle>
                  <DialogDescription>Push a new deal into the operational funnel.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="deal-id" className="text-sm font-medium text-foreground/80">
                      Deal ID
                    </label>
                    <Input
                      id="deal-id"
                      value={formState.id}
                      onChange={(event) => setFormState((prev) => ({ ...prev, id: event.target.value }))}
                      placeholder="APP-2301"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="deal-status" className="text-sm font-medium text-foreground/80">
                        Status
                      </label>
                      <select
                        id="deal-status"
                        value={formState.statusKey}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            statusKey: event.target.value as OpsDealStatusKey,
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        {STATUS_ORDER.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="deal-stage" className="text-sm font-medium text-foreground/80">
                        Stage
                      </label>
                      <Input
                        id="deal-stage"
                        value={formState.stage}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, stage: event.target.value }))
                        }
                        placeholder="Document verification"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="deal-client" className="text-sm font-medium text-foreground/80">
                      Client
                    </label>
                    <Input
                      id="deal-client"
                      value={formState.client}
                      onChange={(event) => setFormState((prev) => ({ ...prev, client: event.target.value }))}
                      placeholder="Client Name"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="deal-vehicle" className="text-sm font-medium text-foreground/80">
                      Vehicle
                    </label>
                    <Input
                      id="deal-vehicle"
                      value={formState.vehicle}
                      onChange={(event) => setFormState((prev) => ({ ...prev, vehicle: event.target.value }))}
                      placeholder="Vehicle Model"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDeal} className="rounded-xl">
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="flex overflow-hidden rounded-full border border-border bg-surface-subtle">
              <button
                type="button"
                onClick={() => setView("kanban")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm transition data-[active=true]:bg-background data-[active=true]:text-foreground"
                data-active={view === "kanban"}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm transition data-[active=true]:bg-background data-[active=true]:text-foreground"
                data-active={view === "table"}
              >
                <TableIcon className="h-4 w-4" />
                Table
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {view === "kanban" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_ORDER.map((status) => {
            const columnDeals = groupedDeals[status];
            return (
              <div
                key={status}
                className="flex flex-col rounded-2xl border border-border bg-card/50 p-4 shadow-outline"
              >
                <header className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {STATUS_LABELS[status]}
                    </p>
                    <p className="text-xs text-muted-foreground">{columnDeals.length} items</p>
                  </div>
                  <Badge variant={STATUS_BADGES[status]}>{STATUS_LABELS[status]}</Badge>
                </header>
                <div
                  ref={(element) => {
                    columnRefs.current[status] = element;
                  }}
                  data-status={status}
                  className="flex flex-1 flex-col gap-3"
                >
                  {columnDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/ops/deals/${toSlug(deal.dealId)}`}
                      data-deal-card
                      data-deal-id={deal.id}
                      className="flex flex-col gap-2 rounded-xl border border-border bg-background/80 p-4 text-sm shadow-sm transition hover:border-foreground/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{deal.dealId}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateLabel(deal.updatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {deal.client} · {deal.vehicle}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Badge variant="outline" className="rounded-lg">
                            {deal.stage}
                          </Badge>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/ops/deals/${toSlug(deal.dealId)}`}
                        className="text-foreground underline-offset-2 hover:underline"
                      >
                        {deal.dealId}
                      </Link>
                    </TableCell>
                    <TableCell>{deal.client}</TableCell>
                    <TableCell>{deal.vehicle}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGES[deal.statusKey]} className="rounded-lg">
                        {STATUS_LABELS[deal.statusKey]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateLabel(deal.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link className="hover:text-foreground" href="/ops/clients">
                          Client
                        </Link>
                        <span>·</span>
                        <Link className="hover:text-foreground" href="/ops/cars">
                          Vehicle
                        </Link>
                        <span>·</span>
                        <Link className="hover:text-foreground" href="/client/invoices">
                          Invoices
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
