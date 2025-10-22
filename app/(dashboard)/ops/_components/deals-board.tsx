"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import Sortable, { type SortableEvent } from "sortablejs";
import {
  AlertTriangle,
  Check,
  Clock,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Table as TableIcon,
  UserCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { createOperationsDeal } from "@/app/(dashboard)/ops/deals/actions";
import {
  OPS_DEAL_STATUS_LABELS,
  OPS_DEAL_STATUS_ORDER,
  OPS_WORKFLOW_STATUS_EXIT_ROLE,
  OPS_WORKFLOW_STATUS_MAP,
  WORKFLOW_ROLE_LABELS,
  type OpsDealStatusKey,
  type OpsDealGuardStatus,
  type OpsDealSummary,
  type WorkflowRole,
  type WorkflowStatusItem,
} from "@/lib/supabase/queries/operations";

import { type OpsCarRecord, type OpsClientRecord } from "@/lib/supabase/queries/operations";
import { cn } from "@/lib/utils";
import type { DealRow } from "@/lib/workflow/http/create-deal";

// Обновляем тип для включения deal_number
type DealRowWithDealNumber = DealRow & {
  deal_number: string | null;
};

type OpsDealsBoardProps = {
  initialDeals: OpsDealSummary[];
  clientDirectory: OpsClientRecord[];
  vehicleDirectory: OpsCarRecord[];
};

type SortableInstance = Sortable | null;

type Feedback =
  | { type: "role"; message: string }
  | { type: "guard"; message: string }
  | { type: "order"; message: string }
  | { type: "error"; message: string };

const STATUS_ORDER = OPS_DEAL_STATUS_ORDER;
const STATUS_LABELS = OPS_DEAL_STATUS_LABELS;

const STATUS_BADGES: Record<OpsDealStatusKey, ComponentProps<typeof Badge>["variant"]> = {
  NEW: "info",
  OFFER_PREP: "info",
  VEHICLE_CHECK: "warning",
  DOCS_COLLECT: "warning",
  RISK_REVIEW: "danger",
  FINANCE_REVIEW: "warning",
  INVESTOR_PENDING: "secondary",
  CONTRACT_PREP: "outline",
  SIGNING_FUNDING: "info",
  VEHICLE_DELIVERY: "warning",
  ACTIVE: "success",
  CANCELLED: "danger",
};

const CURRENT_USER_ROLE: WorkflowRole = "OP_MANAGER";

const FALLBACK_VEHICLE = "Vehicle TBD";
const FALLBACK_SOURCE = "Website";
const BASE_SOURCE_OPTIONS = ["Supabase import", "Broker", "Dubizzle"];

function extractSourceOptions(deals: OpsDealSummary[]) {
  const sources = Array.from(new Set(deals.map((deal) => deal.source))).filter(Boolean);

  if (sources.length === 0) sources.push(FALLBACK_SOURCE);

  return sources;
}

function createColumnSeed(): Record<OpsDealStatusKey, HTMLDivElement | null> {
  return STATUS_ORDER.reduce((acc, status) => {
    acc[status] = null;
    return acc;
  }, {} as Record<OpsDealStatusKey, HTMLDivElement | null>);
}

function createSortableSeed(): Record<OpsDealStatusKey, SortableInstance> {
  return STATUS_ORDER.reduce((acc, status) => {
    acc[status] = null;
    return acc;
  }, {} as Record<OpsDealStatusKey, SortableInstance>);
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function formatSlaCountdown(slaDueAt: string | null | undefined): string | null {
  if (!slaDueAt) {
    return null;
  }
  const dueDate = new Date(slaDueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }
  const diffMs = dueDate.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours > 0) {
    return `Осталось ${diffHours} ч`;
  }
  if (diffHours < 0) {
    return `Просрочка ${Math.abs(diffHours)} ч`;
  }
  return "Срок истекает";
}

function formatSlaLabel(deal: OpsDealSummary | undefined, meta: WorkflowStatusItem) {
  const countdown = formatSlaCountdown(deal?.slaDueAt ?? null);

  if (deal?.slaLabel) {
    return countdown ? `${countdown}` : deal.slaLabel;
  }

  if (countdown) {
    return countdown;
  }

  return meta.slaLabel ?? "SLA —";
}

type DealFormState = {
  reference: string;
  clientId: string;
  vehicleVin: string;
  source: string;
};

function cloneDealsState(list: OpsDealSummary[]): OpsDealSummary[] {
  return list.map((deal) => ({
    ...deal,
    guardStatuses: deal.guardStatuses.map((guard) => ({ ...guard })),
  }));
}

function getPayloadValue(
  payload: Record<string, unknown> | null,
  key: string,
): unknown {
  if (!payload) return undefined;

  return key.split(".").reduce<unknown>((acc, segment) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    if (typeof acc !== "object" || Array.isArray(acc)) {
      return undefined;
    }
    return (acc as Record<string, unknown>)[segment];
  }, payload);
}

function createGuardStatusesFromMeta(
  statusKey: OpsDealStatusKey,
  payload: Record<string, unknown> | null = null,
): OpsDealGuardStatus[] {
  const meta = OPS_WORKFLOW_STATUS_MAP[statusKey];
  return meta.exitGuards.map((guard: { key: string; label: string; hint?: string }) => ({
    key: guard.key,
    label: guard.label,
    hint: guard.hint || null,
    fulfilled: Boolean(getPayloadValue(payload, guard.key)),
  }));
}

function buildGuardContextFromStatuses(
  statuses: OpsDealGuardStatus[],
): Record<string, unknown> {
  const context: Record<string, unknown> = {};

  for (const guard of statuses) {
    const segments = guard.key.split(".");
    let cursor: Record<string, unknown> = context;

    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        cursor[segment] = guard.fulfilled;
        return;
      }

      const next = cursor[segment];
      if (
        !next ||
        typeof next !== "object" ||
        Array.isArray(next)
      ) {
        cursor[segment] = {};
      }

      cursor = cursor[segment] as Record<string, unknown>;
    });
  }

  return context;
}

function mapDealRowToSummary(
   row: DealRowWithDealNumber,
   {
     reference,
     clientName,
     vehicleLabel,
     source,
   }: {
     reference?: string;
     clientName?: string;
     vehicleLabel?: string;
     source?: string;
   } = {},
 ): OpsDealSummary {
  const statusKey = (row.status as OpsDealStatusKey) ?? "NEW";
  const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];
  const guardStatuses = createGuardStatusesFromMeta(statusKey, row.payload);

  // Используем deal_number из базы данных, если он есть, иначе формируем fallback
  const fallbackId = row.id ? `FL-${row.id.slice(-6).toUpperCase()}` : `deal-${Date.now()}`;
  const dealIdentifier = (row.deal_number?.trim()) || reference?.trim() || fallbackId;

  console.log(`[DEBUG] mapDealRowToSummary:`, {
    rowId: row.id,
    dealNumber: row.deal_number,
    reference,
    fallbackId,
    finalDealIdentifier: dealIdentifier
  });
  const updatedAt = row.updated_at ?? new Date().toISOString();
  const updatedAtDate = new Date(updatedAt);
  let slaDueAt: string | null = null;

  if (statusMeta.slaLabel) {
    const match = statusMeta.slaLabel.match(/(\d+)\s*h/i);
    if (match) {
      const hours = Number(match[1]);
      if (!Number.isNaN(hours)) {
        const due = new Date(updatedAtDate.getTime() + hours * 60 * 60 * 1000);
        slaDueAt = due.toISOString();
      }
    }
  }

  return {
    id: row.id,
    dealId: dealIdentifier,
    clientId: row.customer_id,
    client: clientName ?? `Client ${row.customer_id?.slice(-4) ?? "0000"}`,
    vehicleId: row.asset_id,
    vehicle: vehicleLabel ?? FALLBACK_VEHICLE,
    updatedAt,
    stage: statusMeta.description,
    statusKey,
    ownerRole: statusMeta.ownerRole,
    source: source ?? row.source ?? FALLBACK_SOURCE,
    nextAction: statusMeta.entryActions[0] ?? "Проверить текущий этап",
    slaDueAt,
    guardStatuses,
  };
}

export function OpsDealsBoard({
  initialDeals,
  clientDirectory,
  vehicleDirectory,
}: OpsDealsBoardProps) {
  const router = useRouter();

  console.log("[DEBUG] OpsDealsBoard received:", {
    initialDealsCount: initialDeals.length,
    clientDirectoryCount: clientDirectory.length,
    vehicleDirectoryCount: vehicleDirectory.length,
    firstDeal: initialDeals[0],
    firstClient: clientDirectory[0],
    firstVehicle: vehicleDirectory[0],
  });

  const [deals, setDeals] = useState<OpsDealSummary[]>(() => initialDeals);
  const dealsRef = useRef<OpsDealSummary[]>(initialDeals);
  useEffect(() => {
    dealsRef.current = deals;
  }, [deals]);

  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OpsDealStatusKey | "all">("all");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTransitionId, setPendingTransitionId] = useState<string | null>(null);

  const sourceOptions = useMemo(() => {
    const merged = new Set<string>(BASE_SOURCE_OPTIONS);
    extractSourceOptions(deals).forEach((option) => merged.add(option));
    return Array.from(merged);
  }, [deals]);
  const defaultSource = sourceOptions[0] ?? FALLBACK_SOURCE;
  const clientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    clientDirectory.forEach((client) => {
      map.set(client.id, client.name);
      map.set(client.id.toLowerCase(), client.name);
      const suffix = client.id.slice(-4).toLowerCase();
      if (suffix) {
        map.set(suffix, client.name);
      }
    });
    return map;
  }, [clientDirectory]);
  const vehicleNameMap = useMemo(() => {
    const map = new Map<string, string>();
    vehicleDirectory.forEach((vehicle) => {
      map.set(vehicle.vin, vehicle.name);
      map.set(vehicle.vin.toLowerCase(), vehicle.name);
      if (vehicle.name) {
        map.set(vehicle.name.toLowerCase(), vehicle.name);
      }
      if (vehicle.detailHref) {
        map.set(vehicle.detailHref.toLowerCase(), vehicle.name);
      }
    });
    return map;
  }, [vehicleDirectory]);
  const [formState, setFormState] = useState<DealFormState>(() => ({
    reference: "",
    clientId: clientDirectory[0]?.id ?? "",
    vehicleVin: vehicleDirectory[0]?.vin ?? "",
    source: defaultSource,
  }));
  const [showCustomSource, setShowCustomSource] = useState(false);

  useEffect(() => {
    if (formState.clientId && clientDirectory.some((client) => client.id === formState.clientId)) {
      return;
    }

    if (clientDirectory.length === 0 && !formState.clientId) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      clientId: clientDirectory[0]?.id ?? "",
    }));
  }, [clientDirectory, formState.clientId]);

  useEffect(() => {
    if (formState.vehicleVin && vehicleDirectory.some((vehicle) => vehicle.vin === formState.vehicleVin)) {
      return;
    }

    if (vehicleDirectory.length === 0 && !formState.vehicleVin) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      vehicleVin: vehicleDirectory[0]?.vin ?? "",
    }));
  }, [vehicleDirectory, formState.vehicleVin]);

  useEffect(() => {
    if (formState.source) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      source: defaultSource,
    }));
  }, [defaultSource, formState.source]);

  const selectedClient = useMemo(
    () => clientDirectory.find((client) => client.id === formState.clientId),
    [clientDirectory, formState.clientId],
  );

  const selectedVehicle = useMemo(
    () => vehicleDirectory.find((vehicle) => vehicle.vin === formState.vehicleVin),
    [vehicleDirectory, formState.vehicleVin],
  );

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const columnRefs = useRef<Record<OpsDealStatusKey, HTMLDivElement | null>>(createColumnSeed());
  const sortableInstances = useRef<Record<OpsDealStatusKey, SortableInstance>>(createSortableSeed());

  const filteredDeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return deals.filter((deal) => {
      const matchesQuery =
        !query ||
        `${deal.dealId} ${deal.client} ${deal.vehicle} ${deal.source}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === "all" || deal.statusKey === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [deals, searchQuery, statusFilter]);

  const groupedDeals = useMemo(() => {
    const seed = STATUS_ORDER.reduce((acc, status) => {
      acc[status] = [] as OpsDealSummary[];
      return acc;
    }, {} as Record<OpsDealStatusKey, OpsDealSummary[]>);

    filteredDeals.forEach((deal) => {
      if (!seed[deal.statusKey]) {
        seed[deal.statusKey] = [];
      }
      seed[deal.statusKey].push(deal);
    });

    return seed;
  }, [filteredDeals]);

  const columnSignature = useMemo(
    () => STATUS_ORDER.map((status) => groupedDeals[status]?.length ?? 0).join("-"),
    [groupedDeals],
  );

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
        onEnd: async (event: SortableEvent) => {
          const dealId = event.item.getAttribute("data-deal-id");
          const originalStatus = event.item.getAttribute("data-origin-status") as OpsDealStatusKey | null;
          const newStatus = event.to.getAttribute("data-status") as OpsDealStatusKey | null;

          if (!dealId || !originalStatus || !newStatus || originalStatus === newStatus) {
            return;
          }

          const fromIndex = STATUS_ORDER.indexOf(originalStatus);
          const toIndex = STATUS_ORDER.indexOf(newStatus);
          if (toIndex !== fromIndex + 1) {
            setFeedback({
              type: "order",
              message: "Можно перейти только на следующий этап по регламенту.",
            });
            setDeals(cloneDealsState(dealsRef.current));
            return;
          }

          const requiredRole = OPS_WORKFLOW_STATUS_EXIT_ROLE[originalStatus];
          if (requiredRole && requiredRole !== CURRENT_USER_ROLE) {
            setFeedback({
              type: "role",
              message: `Переход должен инициировать ${WORKFLOW_ROLE_LABELS[requiredRole]}.`,
            });
            setDeals(cloneDealsState(dealsRef.current));
            return;
          }

          const currentDeals = dealsRef.current;
          const targetDeal = currentDeals.find((deal) => deal.id === dealId);
          if (!targetDeal) {
            return;
          }

          const unmetGuard = targetDeal.guardStatuses.find((guard) => !guard.fulfilled);
          if (unmetGuard) {
            setFeedback({
              type: "guard",
              message: `Нужно выполнить условие: ${unmetGuard.label}.`,
            });
            setDeals(cloneDealsState(dealsRef.current));
            return;
          }

          const previousState = cloneDealsState(dealsRef.current);
          setPendingTransitionId(dealId);

          try {
            const response = await fetch(`/api/deals/${dealId}/transition`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to_status: newStatus,
                actor_role: requiredRole ?? CURRENT_USER_ROLE,
                guard_context: buildGuardContextFromStatuses(targetDeal.guardStatuses),
              }),
            });

      const json = (await response.json().catch(() => null)) as
        | DealRow
              | { error?: string; reason?: string }
              | null;

            if (
              !response.ok ||
              !json ||
              typeof json !== "object" ||
              !("id" in json)
            ) {
              const message =
                (json as { error?: string; reason?: string } | null)?.error ??
                (json as { error?: string; reason?: string } | null)?.reason ??
                "Не удалось выполнить переход.";
              setFeedback({ type: "error", message });
              setDeals(previousState);
              return;
            }

            const updatedRow = json as DealRowWithDealNumber;
            const nextMeta = OPS_WORKFLOW_STATUS_MAP[newStatus];
            setDeals((prev) =>
              prev.map((deal) =>
                deal.id === dealId
                  ? {
                      ...deal,
                      statusKey: newStatus,
                      stage: nextMeta.description,
                      ownerRole: nextMeta.ownerRole,
                      nextAction: nextMeta.entryActions[0] ?? deal.nextAction,
                      guardStatuses: createGuardStatusesFromMeta(
                        newStatus,
                        updatedRow.payload,
                      ),
                      updatedAt: updatedRow.updated_at ?? new Date().toISOString(),
                    }
                  : deal,
              ),
            );
            router.refresh();
          } catch (error) {
            console.error("[workflow] transition failed", error);
            setFeedback({
              type: "error",
              message: "Не удалось выполнить переход. Попробуйте позже.",
            });
            setDeals(previousState);
          } finally {
            setPendingTransitionId(null);
          }
        },
      });
    });

    return () => {
      Object.values(sortableInstances.current).forEach((instance) => instance?.destroy());
      sortableInstances.current = createSortableSeed();
    };
  }, [columnSignature, columnRefs, sortableInstances, router]);

  async function handleCreateDeal() {
    if (isSubmitting) {
      return;
    }

    if (!selectedClient) {
      setFeedback({
        type: "error",
        message: "Выберите клиента из справочника.",
      });
      return;
    }

    if (!selectedVehicle) {
      setFeedback({
        type: "error",
        message: "Выберите автомобиль из каталога.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const reference = formState.reference.trim();
    const normalizedSource = formState.source?.trim() || FALLBACK_SOURCE;
    const resetSource = sourceOptions[0] ?? FALLBACK_SOURCE;
    const vehicleNameParts = selectedVehicle.name.trim().split(/\s+/);
    const vehicleMake = vehicleNameParts[0] ?? selectedVehicle.name;
    const vehicleModel =
      vehicleNameParts.length > 1 ? vehicleNameParts.slice(1).join(" ") : selectedVehicle.name;

    try {
      console.log(`[DEBUG] calling createOperationsDeal with:`, {
        source: normalizedSource,
        reference,
        customer: {
          full_name: selectedClient.name,
          email: selectedClient.email || undefined,
          phone: selectedClient.phone || undefined,
        },
        asset: {
          type: "VEHICLE",
          make: vehicleMake,
          model: vehicleModel,
        },
      });

      const result = await createOperationsDeal({
        source: normalizedSource,
        reference,
        customer: {
          full_name: selectedClient.name,
          email: selectedClient.email || undefined,
          phone: selectedClient.phone || undefined,
        },
        asset: {
          type: "VEHICLE",
          make: vehicleMake,
          model: vehicleModel,
        },
      });

      console.log(`[DEBUG] createOperationsDeal result:`, result);

      if (result.error || !result.data) {
        setFeedback({
          type: "error",
          message: result.error ?? "Не удалось создать сделку.",
        });
        return;
      }

      const createdDeal = result.data as DealRowWithDealNumber;
      console.log(`[DEBUG] created deal data:`, createdDeal);
      const vehicleLabel = selectedVehicle.name || `${vehicleMake} ${vehicleModel}`.trim();

      const summary = mapDealRowToSummary(createdDeal, {
        reference,
        clientName: selectedClient.name,
        vehicleLabel: vehicleLabel || `${vehicleMake} ${vehicleModel}`,
        source: normalizedSource,
      });

      console.log(`[DEBUG] mapped deal summary:`, summary);

      setDeals((prev) => {
        const filtered = prev.filter((deal) => deal.id !== summary.id);
        return [summary, ...filtered];
      });

      setFormState({
        reference: "",
        clientId: clientDirectory[0]?.id ?? "",
        vehicleVin: vehicleDirectory[0]?.vin ?? "",
        source: resetSource,
      });
      setIsCreateOpen(false);
      router.refresh();
    } catch (error) {
      console.error("[workflow] create deal failed", error);
      setFeedback({
        type: "error",
        message:
          "Во время создания сделки произошла ошибка. Попробуйте позже.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Deals</CardTitle>
            {feedback ? (
              <p
                className={cn(
                  "text-sm",
                  feedback.type === "error"
                    ? "text-rose-600"
                    : "text-amber-600 dark:text-amber-400",
                )}
              >
                {feedback.message}
              </p>
            ) : null}
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
              <DialogContent className="max-w-xl rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Create deal</DialogTitle>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleCreateDeal();
                  }}
                >
                  <div className="space-y-2">
                    <label htmlFor="deal-reference" className="text-sm font-medium text-foreground/80">
                      Reference (опционально)
                    </label>
                    <Input
                      id="deal-reference"
                      value={formState.reference}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, reference: event.target.value }))
                      }
                      placeholder="FL-3301"
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      Укажите внутренний номер, если нужно синхронизировать с внешней системой.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="deal-client" className="text-sm font-medium text-foreground/80">
                      Клиент
                    </label>
                    <select
                      id="deal-client"
                      value={formState.clientId}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, clientId: event.target.value }))
                      }
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
                      disabled={clientDirectory.length === 0}
                    >
                      {clientDirectory.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    {selectedClient ? (
                      <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                        <p>{selectedClient.email || "—"}</p>
                        <p>{selectedClient.phone}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Нет доступных клиентов. Добавьте запись в разделе Clients.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="deal-vehicle" className="text-sm font-medium text-foreground/80">
                      Автомобиль
                    </label>
                    <select
                      id="deal-vehicle"
                      value={formState.vehicleVin}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, vehicleVin: event.target.value }))
                      }
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
                      disabled={vehicleDirectory.length === 0}
                    >
                      {vehicleDirectory.map((vehicle) => (
                        <option key={vehicle.vin} value={vehicle.vin}>
                          {vehicle.name}
                        </option>
                      ))}
                    </select>
                    {selectedVehicle ? (
                      <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground/70">{selectedVehicle.name}</p>
                        <p>VIN: {selectedVehicle.vin}</p>
                        <p>
                          {selectedVehicle.year} · {selectedVehicle.type}
                        </p>
                        <p>{selectedVehicle.price}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Нет доступных автомобилей. Обновите каталог в разделе Cars.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="deal-source" className="text-sm font-medium text-foreground/80">
                      Источник сделки
                    </label>
                    <select
                      id="deal-source"
                      value={showCustomSource ? "__custom" : formState.source}
                      onChange={(event) => {
                        const selected = event.target.value;
                        if (selected === "__custom") {
                          setShowCustomSource(true);
                          setFormState((prev) => ({ ...prev, source: "" }));
                        } else {
                          setShowCustomSource(false);
                          setFormState((prev) => ({ ...prev, source: selected }));
                        }
                      }}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      {sourceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                      <option value="__custom">Другое...</option>
                    </select>
                    {showCustomSource ? (
                      <Input
                        id="deal-source-custom"
                        value={formState.source}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, source: event.target.value }))
                        }
                        placeholder="Укажите источник"
                        className="rounded-xl"
                      />
                    ) : null}
                  </div>

                  {feedback?.type === "error" ? (
                    <p className="text-sm text-rose-600">{feedback.message}</p>
                  ) : null}

                  <DialogFooter>
                    <Button type="submit" className="rounded-xl" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Создание...
                        </>
                      ) : (
                        "Add to workflow"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <div className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background p-1 text-sm shadow-sm">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center rounded-lg px-2 py-1 transition",
                  view === "kanban" ? "bg-brand-500 text-white shadow" : "text-muted-foreground",
                )}
                onClick={() => setView("kanban")}
                aria-label="Show Kanban view"
                aria-pressed={view === "kanban"}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Kanban</span>
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center rounded-lg px-2 py-1 transition",
                  view === "table" ? "bg-brand-500 text-white shadow" : "text-muted-foreground",
                )}
                onClick={() => setView("table")}
                aria-label="Show Table view"
                aria-pressed={view === "table"}
              >
                <TableIcon className="h-4 w-4" />
                <span className="sr-only">Table</span>
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {view === "kanban" ? (
        <section className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {STATUS_ORDER.map((status) => {
              const columnDeals = groupedDeals[status] ?? [];
              const meta = OPS_WORKFLOW_STATUS_MAP[status];
              const exitRole = OPS_WORKFLOW_STATUS_EXIT_ROLE[status];
              const isAllowedForRole = !exitRole || exitRole === CURRENT_USER_ROLE;

              return (
                <div
                  key={status}
                  className={cn(
                    "flex w-[20rem] min-w-[18rem] flex-col rounded-2xl border bg-card/50 p-4 shadow-outline transition",
                    isAllowedForRole ? "border-brand-200 dark:border-brand-500/50" : "border-border/80",
                  )}
                >
                  <header className="mb-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {STATUS_LABELS[status]}
                      </p>
                      <Badge variant={STATUS_BADGES[status]}>{columnDeals.length}</Badge>
                    </div>
                      {/* Transition meta */}
                  </header>
                  <div
                    ref={(element) => {
                      columnRefs.current[status] = element;
                    }}
                    data-status={status}
                    className="flex flex-1 flex-col gap-3"
                  >
                    {columnDeals.map((deal) => {
                      const isTransitioning = pendingTransitionId === deal.id;

                      const dealHref = `/ops/deals/${toSlug(deal.dealId)}`;
                      const ownerRoleLabel =
                        deal.ownerRoleLabel ??
                        WORKFLOW_ROLE_LABELS[deal.ownerRole] ??
                        deal.ownerRole;
                      const ownerDisplay = deal.ownerName ?? ownerRoleLabel;
                      const slaCountdown = formatSlaCountdown(deal.slaDueAt ?? null);
                      const slaDisplay = slaCountdown ?? formatSlaLabel(deal, meta);
                      const clientIdValue = deal.clientId ?? null;
                      const clientSuffix =
                        deal.client && /^Client\s/i.test(deal.client)
                          ? deal.client.split(" ").pop()?.toLowerCase() ?? null
                          : null;
                      const clientFromDirectory =
                        (clientIdValue &&
                          (clientNameMap.get(clientIdValue) ||
                            clientNameMap.get(clientIdValue.toLowerCase()) ||
                            clientNameMap.get(clientIdValue.slice(-4).toLowerCase()))) ??
                        (clientSuffix ? clientNameMap.get(clientSuffix) : null);
                      const clientLabel =
                        deal.client && !/^Client\s/i.test(deal.client)
                          ? deal.client
                          : clientFromDirectory ?? deal.client;
                      const vehicleIdValue = deal.vehicleId ?? null;
                      const vehicleFromDirectory =
                        (vehicleIdValue &&
                          (vehicleNameMap.get(vehicleIdValue) ||
                            vehicleNameMap.get(vehicleIdValue.toLowerCase()))) ??
                        (deal.vehicle
                          ? vehicleNameMap.get(deal.vehicle.toLowerCase())
                          : null);
                      const vehicleLabel =
                        deal.vehicle && deal.vehicle !== FALLBACK_VEHICLE
                          ? deal.vehicle
                          : vehicleFromDirectory ?? "";

                      const handleNavigate = () => {
                        if (isTransitioning) return;
                        router.push(dealHref);
                      };

                      const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
                        if (isTransitioning) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(dealHref);
                        }
                      };

                      return (
                        <div
                          key={deal.id}
                          data-deal-card
                          data-deal-id={deal.id}
                          data-origin-status={deal.statusKey}
                          className={cn(
                            "relative flex flex-col gap-3 rounded-xl border border-border bg-background/90 p-4 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            "cursor-pointer",
                            isTransitioning
                              ? "pointer-events-none opacity-60"
                              : "hover:border-brand-500/70 hover:shadow-lg",
                          )}
                          role="button"
                          tabIndex={isTransitioning ? -1 : 0}
                          aria-disabled={isTransitioning}
                          aria-label={`Открыть заявку ${deal.dealId}`}
                          onClick={handleNavigate}
                          onKeyDown={handleKeyDown}
                        >
                          {isTransitioning ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                            </div>
                          ) : null}

                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{deal.dealId}</p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{clientLabel}</span>
                                {vehicleLabel ? ` · ${vehicleLabel}` : null}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDateLabel(deal.updatedAt)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <UserCircle2 className="h-3.5 w-3.5" />
                              {ownerDisplay}
                            </span>
                            {slaDisplay ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 font-medium text-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {slaDisplay}
                              </span>
                            ) : null}
                          </div>

                          {deal.guardStatuses.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                Задача
                              </p>
                              <div className="space-y-1 text-xs">
                                {deal.guardStatuses.map((guard) => (
                                  <div
                                    key={guard.key}
                                    className={cn(
                                      "flex w-full items-center justify-between rounded-lg border px-3 py-2",
                                      guard.fulfilled
                                        ? "border-emerald-500/60 bg-emerald-50 text-emerald-700"
                                        : "border-amber-500/50 bg-amber-50 text-amber-700",
                                    )}
                                    title={guard.hint || undefined}
                                  >
                                    <span className="flex items-center gap-2">
                                      {guard.fulfilled ? (
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                      ) : (
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                      )}
                                      {guard.label}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.2em]">
                                      {guard.fulfilled ? (
                                        <>
                                          Done <Check className="h-3 w-3" />
                                        </>
                                      ) : (
                                        "Awaiting"
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
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
                  <TableHead>Owner</TableHead>
                  <TableHead>Next action</TableHead>
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{deal.vehicle}</span>
                          <span className="text-xs text-muted-foreground">{deal.source}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGES[deal.statusKey]} className="rounded-lg">
                          {STATUS_LABELS[deal.statusKey]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {deal.ownerName ??
                          deal.ownerRoleLabel ??
                          WORKFLOW_ROLE_LABELS[deal.ownerRole] ??
                          deal.ownerRole}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{deal.nextAction}</TableCell>
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
