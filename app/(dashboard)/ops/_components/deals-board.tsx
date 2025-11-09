"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  AlertTriangle,
  Check,
  ChevronsUpDown,
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
import { Card, CardContent } from "@/components/ui/card";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { formatFallbackDealNumber } from "@/lib/deals/deal-number";

import { type OpsCarRecord, type OpsClientRecord } from "@/lib/supabase/queries/operations";
import { cn } from "@/lib/utils";
import { buildSlugWithId } from "@/lib/utils/slugs";
import type { DealRow } from "@/lib/workflow/http/create-deal";
import { WorkspaceListHeader } from "@/components/workspace/list-page-header";

// Обновляем тип для включения deal_number
type DealRowWithDealNumber = DealRow & {
  deal_number: string | null;
};

type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type ComboboxFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  disabled?: boolean;
};

function ComboboxField({ label, placeholder, value, onChange, options, disabled }: ComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const isDisabled = disabled || options.length === 0;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground/80">{label}</label>
      <Popover open={open} onOpenChange={(nextOpen) => !isDisabled && setOpen(nextOpen)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isDisabled}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm"
          >
            <span className="truncate text-left">
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Поиск..." />
            <CommandEmpty>Ничего не найдено</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected?.value === option.value;
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      className="flex flex-col items-start gap-0.5 text-left"
                      onSelect={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <div className="flex w-full items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">{option.label}</span>
                          {option.description ? (
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          ) : null}
                        </div>
                        {isSelected ? <Check className="ml-auto h-4 w-4 text-brand-500" aria-hidden="true" /> : null}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type OpsDealsBoardProps = {
  initialDeals: OpsDealSummary[];
  clientDirectory: OpsClientRecord[];
  vehicleDirectory: OpsCarRecord[];
};

type VehicleOption = OpsCarRecord & { optionValue: string };

type Feedback = { type: "error"; message: string };

type SortField = "dealId" | "vehicle" | "client" | "status" | "nextAction" | "contractStartDate";
type SortDirection = "asc" | "desc";
type SortState = { field: SortField; direction: SortDirection };
const DEFAULT_SORT: SortState = { field: "contractStartDate", direction: "desc" };

const STATUS_ORDER = OPS_DEAL_STATUS_ORDER;
const STATUS_LABELS = OPS_DEAL_STATUS_LABELS;
const STATUS_POSITION = STATUS_ORDER.reduce<Record<OpsDealStatusKey, number>>((acc, status, index) => {
  acc[status] = index;
  return acc;
}, {} as Record<OpsDealStatusKey, number>);

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

function buildPaddedOptionLabel(primary: string, secondary: string | null, padLength: number) {
  const trimmedPrimary = primary.trim();
  const trimmedSecondary = secondary?.trim();
  const safePrimary = trimmedPrimary.length > 0 ? trimmedPrimary : "—";
  const safeSecondary = trimmedSecondary && trimmedSecondary.length > 0 ? trimmedSecondary : "—";
  const effectivePad = Math.max(padLength, safePrimary.length + 2);

  return `${safePrimary.padEnd(effectivePad, " ")}${safeSecondary}`;
}

function resolveVehicleSecondaryLabel(vehicle: VehicleOption) {
  if (vehicle.vin && vehicle.vin.trim() && vehicle.vin !== "—") {
    return vehicle.vin.trim();
  }
  if (vehicle.detailHref && vehicle.detailHref.trim()) {
    return vehicle.detailHref.trim();
  }
  if (vehicle.optionValue && vehicle.optionValue.trim()) {
    return vehicle.optionValue.trim();
  }
  return "—";
}

function extractSourceOptions(deals: OpsDealSummary[]) {
  const sources = Array.from(new Set(deals.map((deal) => deal.source))).filter(Boolean);

  if (sources.length === 0) sources.push(FALLBACK_SOURCE);

  return sources;
}

function resolveVehicleOptionValue(vehicle: OpsCarRecord, index: number): string {
  if (vehicle.vin && vehicle.vin.trim() && vehicle.vin !== "—") {
    return vehicle.vin;
  }
  if (vehicle.detailHref && vehicle.detailHref.trim()) {
    return vehicle.detailHref;
  }
  return `vehicle-${index}`;
}

function parseNumericString(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  if (!cleaned) return undefined;
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

  const fallbackId = formatFallbackDealNumber({ id: row.id ?? null, createdAt: row.created_at ?? null });
  const dealIdentifier = row.deal_number?.trim() || reference?.trim() || fallbackId;

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
    customerId: row.customer_id ?? null,
    client: clientName ?? `Client ${row.customer_id?.slice(-4) ?? "0000"}`,
    vehicleId: row.asset_id,
    vehicle: vehicleLabel ?? FALLBACK_VEHICLE,
    updatedAt,
    stage: statusMeta.description,
    statusKey,
    ownerRole: statusMeta.ownerRole,
    ownerRoleLabel: WORKFLOW_ROLE_LABELS[statusMeta.ownerRole] ?? statusMeta.ownerRole,
    ownerName: null,
    ownerUserId: null,
    source: source ?? row.source ?? FALLBACK_SOURCE,
    nextAction: statusMeta.entryActions[0] ?? "Проверить текущий этап",
    slaDueAt,
    guardStatuses,
    contractStartDate: null,
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

  const [view, setView] = useState<"kanban" | "table">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OpsDealStatusKey | "all">("all");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT);

  const summary = useMemo(() => {
    const total = deals.length;
    const active = deals.filter((deal) => deal.statusKey === "ACTIVE").length;
    const cancelled = deals.filter((deal) => deal.statusKey === "CANCELLED").length;
    const inPipeline = Math.max(0, total - active - cancelled);

    return {
      total,
      active,
      cancelled,
      inPipeline,
    };
  }, [deals]);

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
      if (client.userId) {
        map.set(client.userId, client.name);
        map.set(client.userId.toLowerCase(), client.name);
        const userIdSuffix = client.userId.slice(-4).toLowerCase();
        if (userIdSuffix) {
          map.set(userIdSuffix, client.name);
        }
      }
      const suffix = client.id.slice(-4).toLowerCase();
      if (suffix) {
        map.set(suffix, client.name);
      }
    });
    deals.forEach((deal) => {
      if (deal.client && !/^Client\s/i.test(deal.client)) {
        const identifiers = [deal.clientId, deal.customerId].filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        );
        identifiers.forEach((identifier) => {
          map.set(identifier, deal.client);
          map.set(identifier.toLowerCase(), deal.client);
          const suffix = identifier.slice(-4).toLowerCase();
          if (suffix) {
            map.set(suffix, deal.client);
          }
        });
      }
    });
    return map;
  }, [clientDirectory, deals]);
  const vehicleOptions = useMemo<VehicleOption[]>(() => {
    return vehicleDirectory.map((vehicle, index) => ({
      ...vehicle,
      optionValue: resolveVehicleOptionValue(vehicle, index),
    }));
  }, [vehicleDirectory]);
  const clientDropdownOptions = useMemo(() => {
    if (clientDirectory.length === 0) {
      return [] as Array<{ id: string; optionLabel: string; titleLabel: string }>;
    }

    const normalized = clientDirectory.map((client) => ({
      id: client.id,
      name: (client.name ?? "").trim(),
      phone: client.phone?.trim() ?? "",
    }));
    const padLength = normalized.reduce((max, item) => Math.max(max, item.name.length), 0) + 3;

    return normalized.map((item) => {
      const phoneLabel = item.phone.length > 0 ? item.phone : "—";
      const baseTitle = item.name.length > 0 ? item.name : "—";
      return {
        id: item.id,
        optionLabel: buildPaddedOptionLabel(item.name, phoneLabel, padLength),
        titleLabel: item.phone.length > 0 ? `${baseTitle} · ${item.phone}` : baseTitle,
      };
    });
  }, [clientDirectory]);
  const clientComboboxOptions = useMemo(
    () =>
      clientDropdownOptions.map((option) => ({
        value: option.id,
        label: option.optionLabel,
        description: option.titleLabel,
      })),
    [clientDropdownOptions],
  );
  const vehicleDropdownOptions = useMemo(() => {
    if (vehicleOptions.length === 0) {
      return [] as Array<{ optionValue: string; optionLabel: string; titleLabel: string }>;
    }

    const normalized = vehicleOptions.map((vehicle) => ({
      optionValue: vehicle.optionValue,
      name: (vehicle.name ?? FALLBACK_VEHICLE).trim() || FALLBACK_VEHICLE,
      secondary: resolveVehicleSecondaryLabel(vehicle),
    }));
    const padLength = normalized.reduce((max, item) => Math.max(max, item.name.length), 0) + 3;

    return normalized.map((item) => ({
      optionValue: item.optionValue,
      optionLabel: buildPaddedOptionLabel(item.name, item.secondary, padLength),
      titleLabel: `${item.name} · ${item.secondary}`,
    }));
  }, [vehicleOptions]);
  const vehicleComboboxOptions = useMemo(
    () =>
      vehicleDropdownOptions.map((option) => ({
        value: option.optionValue,
        label: option.optionLabel,
        description: option.titleLabel,
      })),
    [vehicleDropdownOptions],
  );
  const vehicleNameMap = useMemo(() => {
    const map = new Map<string, string>();
    vehicleOptions.forEach((vehicle) => {
      if (vehicle.vin && vehicle.vin !== "—") {
        map.set(vehicle.vin, vehicle.name);
        map.set(vehicle.vin.toLowerCase(), vehicle.name);
      }
      if (vehicle.name) {
        map.set(vehicle.name.toLowerCase(), vehicle.name);
      }
      if (vehicle.detailHref) {
        map.set(vehicle.detailHref.toLowerCase(), vehicle.name);
      }
    });
    return map;
  }, [vehicleOptions]);
  const [formState, setFormState] = useState<DealFormState>(() => ({
    reference: "",
    clientId: clientDirectory[0]?.id ?? "",
    vehicleVin: vehicleOptions[0]?.optionValue ?? "",
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
    if (
      formState.vehicleVin &&
      vehicleOptions.some((vehicle) => vehicle.optionValue === formState.vehicleVin)
    ) {
      return;
    }

    if (vehicleOptions.length === 0 && !formState.vehicleVin) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      vehicleVin: vehicleOptions[0]?.optionValue ?? "",
    }));
  }, [vehicleOptions, formState.vehicleVin]);

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
    () => vehicleOptions.find((vehicle) => vehicle.optionValue === formState.vehicleVin),
    [vehicleOptions, formState.vehicleVin],
  );

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const filteredDeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return deals.filter((deal) => {
      const matchesQuery =
        !query ||
        `${deal.dealId} ${deal.client} ${deal.vehicle} ${deal.source} ${deal.contractStartDate ?? ""}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === "all" || deal.statusKey === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [deals, searchQuery, statusFilter]);

  const sortedDeals = useMemo(() => {
    const { field, direction } = sortState;
    const directionMultiplier = direction === "asc" ? 1 : -1;

    return [...filteredDeals].sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case "dealId":
          comparison = (a.dealId ?? "").localeCompare(b.dealId ?? "", undefined, {
            sensitivity: "base",
          });
          break;
        case "vehicle": {
          comparison = (a.vehicle ?? "").localeCompare(b.vehicle ?? "", undefined, {
            sensitivity: "base",
          });
          if (comparison === 0) {
            comparison = (a.source ?? "").localeCompare(b.source ?? "", undefined, {
              sensitivity: "base",
            });
          }
          break;
        }
        case "client":
          comparison = (a.client ?? "").localeCompare(b.client ?? "", undefined, {
            sensitivity: "base",
          });
          break;
        case "status":
          comparison =
            (STATUS_POSITION[a.statusKey] ?? Number.MAX_SAFE_INTEGER) -
            (STATUS_POSITION[b.statusKey] ?? Number.MAX_SAFE_INTEGER);
          break;
        case "nextAction":
          comparison = (a.nextAction ?? "").localeCompare(b.nextAction ?? "", undefined, {
            sensitivity: "base",
          });
          break;
        case "contractStartDate": {
          const aTime = new Date(a.contractStartDate ?? "").getTime();
          const bTime = new Date(b.contractStartDate ?? "").getTime();
          const safeATime = Number.isNaN(aTime) ? 0 : aTime;
          const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
          comparison = safeATime - safeBTime;
          break;
        }
        default:
          comparison = 0;
      }

      if (comparison === 0) {
        return 0;
      }
      return comparison * directionMultiplier;
    });
  }, [filteredDeals, sortState]);

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

  const handleSort = (field: SortField) => {
    setSortState((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return { field, direction: "asc" };
    });
  };

  const getAriaSort = (field: SortField): "none" | "ascending" | "descending" => {
    if (sortState.field !== field) {
      return "none";
    }

    return sortState.direction === "asc" ? "ascending" : "descending";
  };

  const renderSortButton = (field: SortField, label: string) => {
    const isActive = sortState.field === field;
    const SortIcon = isActive
      ? sortState.direction === "asc"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;

    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={cn(
          "inline-flex w-full items-center gap-1 rounded-md text-left text-sm font-medium transition",
          "hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span>{label}</span>
        <SortIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
    );
  };

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
    const vehicleMileage = parseNumericString(selectedVehicle.mileage);

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
          vin: selectedVehicle.vin !== "—" ? selectedVehicle.vin : undefined,
          year: selectedVehicle.year ?? undefined,
          price: null,
          mileage: vehicleMileage,
          meta: {
            mileage_label: selectedVehicle.mileage,
            mileage_value: vehicleMileage,
            detail_href: selectedVehicle.detailHref,
            type_label: selectedVehicle.type,
          },
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
          vin: selectedVehicle.vin !== "—" ? selectedVehicle.vin : undefined,
          year: selectedVehicle.year ?? undefined,
          price: null,
          mileage: vehicleMileage,
          meta: {
            mileage_label: selectedVehicle.mileage,
            detail_href: selectedVehicle.detailHref,
            type_label: selectedVehicle.type,
          },
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
        vehicleVin: vehicleOptions[0]?.optionValue ?? "",
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

  const createDealDialog = (
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Добавить сделку
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
              placeholder="LTR-081125-3782"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <ComboboxField
              label="Клиент"
              placeholder="Выберите клиента"
              value={formState.clientId}
              onChange={(value) =>
                setFormState((prev) => ({ ...prev, clientId: value }))
              }
              options={clientComboboxOptions}
              disabled={clientDirectory.length === 0}
            />
            {selectedClient ? (
              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>{selectedClient.email || "—"}</p>
                <p>{selectedClient.phone}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <ComboboxField
              label="Автомобиль"
              placeholder="Выберите автомобиль"
              value={formState.vehicleVin}
              onChange={(value) =>
                setFormState((prev) => ({ ...prev, vehicleVin: value }))
              }
              options={vehicleComboboxOptions}
              disabled={vehicleOptions.length === 0}
            />
            {selectedVehicle ? (
              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground/70">{selectedVehicle.name}</p>
                <p>VIN: {selectedVehicle.vin}</p>
                <p>
                  {selectedVehicle.year} · {selectedVehicle.type}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="deal-source" className="text-sm font-medium text-foreground/80">
              Источник сделки
            </label>
            <Select
              value={showCustomSource ? "__custom" : formState.source}
              onValueChange={(selected) => {
                if (selected === "__custom") {
                  setShowCustomSource(true);
                  setFormState((prev) => ({ ...prev, source: "" }));
                } else {
                  setShowCustomSource(false);
                  setFormState((prev) => ({ ...prev, source: selected }));
                }
              }}
            >
              <SelectTrigger
                id="deal-source"
                className="h-11 w-full rounded-xl border border-border bg-background text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <SelectValue placeholder="Выберите источник" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
                <SelectItem value="__custom">Другое...</SelectItem>
              </SelectContent>
            </Select>
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
  );

  const headerHelperText = feedback ? feedback.message : undefined;
  const headerHelperTone = feedback ? "danger" : "muted";

  return (
    <div className="space-y-6">
      <WorkspaceListHeader
        title="Сделки"
        stats={[
          { label: "Всего", value: summary.total },
          { label: "В воронке", value: summary.inPipeline },
          { label: "Активные", value: summary.active },
          { label: "Отменены", value: summary.cancelled },
        ]}
        helperText={headerHelperText}
        helperTone={headerHelperTone}
        action={createDealDialog}
      />

      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск (клиент, авто, ID)"
                className="h-10 w-full rounded-xl pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as OpsDealStatusKey | "all")}
            >
              <SelectTrigger className="h-10 rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {STATUS_ORDER.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(value) => value && setView(value as "kanban" | "table")}
            >
              <ToggleGroupItem value="kanban" aria-label="Kanban view" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="text-xs font-medium">Kanban</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view" className="gap-2">
                <TableIcon className="h-4 w-4" />
                <span className="text-xs font-medium">Table</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
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
                  </header>
                  <div className="flex flex-1 flex-col gap-3">
                    {columnDeals.map((deal) => {
                      const dealSlug = buildSlugWithId(deal.dealId, deal.id) || deal.id;
                      const dealHref = `/ops/deals/${dealSlug}`;
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
                        router.push(dealHref);
                      };

                      const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(dealHref);
                        }
                      };

                      return (
                        <div
                          key={deal.id}
                          className={cn(
                            "relative flex flex-col gap-3 rounded-xl border border-border bg-background/90 p-4 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            "cursor-pointer",
                            "hover:border-brand-500/70 hover:shadow-lg",
                          )}
                          role="button"
                          tabIndex={0}
                          aria-label={`Открыть заявку ${deal.dealId}`}
                          onClick={handleNavigate}
                          onKeyDown={handleKeyDown}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{deal.dealId}</p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{clientLabel}</span>
                                {vehicleLabel ? ` · ${vehicleLabel}` : null}
                              </p>
                            </div>
                            {slaDisplay ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {slaDisplay}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <UserCircle2 className="h-3.5 w-3.5" />
                              <span>{ownerDisplay}</span>
                            </span>
                          </div>

                          {deal.guardStatuses.length > 0 ? (
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
                                </div>
                              ))}
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
                  <TableHead aria-sort={getAriaSort("dealId")}>
                    {renderSortButton("dealId", "Deal ID")}
                  </TableHead>
                  <TableHead aria-sort={getAriaSort("vehicle")}>
                    {renderSortButton("vehicle", "Vehicle")}
                  </TableHead>
                  <TableHead aria-sort={getAriaSort("client")}>
                    {renderSortButton("client", "Client")}
                  </TableHead>
                  <TableHead aria-sort={getAriaSort("status")}>
                    {renderSortButton("status", "Status")}
                  </TableHead>
                  <TableHead aria-sort={getAriaSort("nextAction")}>
                    {renderSortButton("nextAction", "Next action")}
                  </TableHead>
                  <TableHead aria-sort={getAriaSort("contractStartDate")}>
                    {renderSortButton("contractStartDate", "Contract start")}
                  </TableHead>
                  <TableHead>Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDeals.map((deal) => {
                  const dealSlug = buildSlugWithId(deal.dealId, deal.id) || deal.id;
                  return (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">
                        <Link
                          className="text-foreground underline-offset-2 hover:underline"
                          href={`/ops/deals/${dealSlug}`}
                        >
                          {deal.dealId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{deal.vehicle}</span>
                          <span className="text-xs text-muted-foreground">{deal.source}</span>
                        </div>
                      </TableCell>
                      <TableCell>{deal.client}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGES[deal.statusKey]} className="rounded-lg">
                          {STATUS_LABELS[deal.statusKey]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{deal.nextAction}</TableCell>
                      <TableCell>{formatDateLabel(deal.contractStartDate ?? "")}</TableCell>
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
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
