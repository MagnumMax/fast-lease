"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, RefreshCcw, Search, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkspaceTask } from "@/lib/supabase/queries/tasks";
import { cn } from "@/lib/utils";
import { buildSlugWithId } from "@/lib/utils/slugs";

type WorkspaceTasksBoardProps = {
  initialTasks: WorkspaceTask[];
  currentUserId: string | null;
  primaryRole: string | null;
};

type FormState = {
  title: string;
  description: string;
  dealId: string;
  dueAt: string;
};

type FeedbackState = { type: "success" | "error"; message: string } | null;

type DealOption = { id: string; label: string };

type FetchParams = {
  workflowOnly?: boolean;
  assigned?: "me" | "role";
  status?: string;
  type?: string;
  dealId?: string;
};

const DEFAULT_FORM_STATE: FormState = {
  title: "",
  description: "",
  dealId: "",
  dueAt: "",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Открыта",
  IN_PROGRESS: "В работе",
  DONE: "Завершена",
  BLOCKED: "Заблокирована",
  CANCELLED: "Отменена",
};

const STATUS_BADGE_META: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  OPEN: {
    label: STATUS_LABELS["OPEN"],
    className: "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  },
  IN_PROGRESS: {
    label: STATUS_LABELS["IN_PROGRESS"],
    className: "border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200",
  },
  DONE: {
    label: STATUS_LABELS["DONE"],
    className: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  },
  BLOCKED: {
    label: STATUS_LABELS["BLOCKED"],
    className: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  },
  CANCELLED: {
    label: STATUS_LABELS["CANCELLED"],
    className: "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-200",
  },
};

function getStatusBadgeMeta(status: string) {
  const normalized = status.toUpperCase();
  const meta = STATUS_BADGE_META[normalized];
  if (meta) {
    return meta;
  }
  const fallbackLabel = STATUS_LABELS[normalized] ?? normalized;
  return {
    label: fallbackLabel,
    className: "border-border/60 bg-muted text-muted-foreground",
  };
}

const SLA_STATUS_META: Record<
  NonNullable<WorkspaceTask["slaStatus"]>,
  { label: string; className: string }
> = {
  ON_TRACK: { label: "В срок", className: "text-emerald-600 dark:text-emerald-400" },
  WARNING: { label: "Риск", className: "text-amber-600 dark:text-amber-400" },
  BREACHED: { label: "Просрочена", className: "text-rose-600 dark:text-rose-400" },
};

function getRecordString(
  record: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function resolveNestedName(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const candidate = input as Record<string, unknown>;
  for (const key of ["name", "full_name", "title"]) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function resolveAssigneeName(task: WorkspaceTask): string | null {
  const fieldName = getRecordString(task.fields, "assignee_name");
  if (fieldName) return fieldName;

  const payloadName = getRecordString(task.payload, "assignee_name");
  if (payloadName) return payloadName;

  const payloadAssignee = task.payload ? task.payload["assignee"] : null;
  const nested = resolveNestedName(payloadAssignee);
  if (nested) return nested;

  return null;
}

function resolveClientName(task: WorkspaceTask): string | null {
  if (task.dealClientName) return task.dealClientName;

  const fieldsClient = getRecordString(task.fields, "client_name");
  if (fieldsClient) return fieldsClient;

  const payloadFields = (task.payload?.["fields"] ?? null) as Record<string, unknown> | null;
  const payloadClient =
    getRecordString(payloadFields ?? undefined, "client_name") ??
    getRecordString(task.payload, "client_name");
  if (payloadClient) return payloadClient;

  const nested =
    resolveNestedName(task.fields?.["client"]) ??
    resolveNestedName(payloadFields?.["client"]) ??
    resolveNestedName(task.payload?.["client"]);
  return nested;
}

function resolveVehicleName(task: WorkspaceTask): string | null {
  if (task.dealVehicleName) return task.dealVehicleName;

  const fieldsVehicle = getRecordString(task.fields, "vehicle_name");
  if (fieldsVehicle) return fieldsVehicle;

  const payloadFields = (task.payload?.["fields"] ?? null) as Record<string, unknown> | null;
  const payloadVehicle =
    getRecordString(payloadFields ?? undefined, "vehicle_name") ??
    getRecordString(task.payload, "vehicle_name");
  if (payloadVehicle) return payloadVehicle;

  const nested =
    resolveNestedName(task.fields?.["vehicle"]) ??
    resolveNestedName(payloadFields?.["vehicle"]) ??
    resolveNestedName(task.payload?.["vehicle"]);
  return nested;
}

function formatDate(value: string | null | undefined, withTime = true) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: withTime ? "2-digit" : undefined,
      minute: withTime ? "2-digit" : undefined,
    }).format(date);
  } catch {
    return value;
  }
}

async function fetchTasks(params: FetchParams = {}): Promise<WorkspaceTask[]> {
  const searchParams = new URLSearchParams();
  if (params.workflowOnly) {
    searchParams.set("workflow_only", "true");
  }
  if (params.assigned) {
    searchParams.set("assigned", params.assigned);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.type) {
    searchParams.set("type", params.type);
  }
  if (params.dealId) {
    searchParams.set("deal_id", params.dealId);
  }

  const url = searchParams.size > 0 ? `/api/tasks?${searchParams.toString()}` : "/api/tasks";
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const errorMessage =
      typeof payload?.error === "string" ? payload.error : "Не удалось загрузить задачи";
    throw new Error(errorMessage);
  }
  const body = (await response.json()) as { items?: WorkspaceTask[] };
  return body.items ?? [];
}

async function fetchDealOptions(limit = 50): Promise<DealOption[]> {
  const response = await fetch(`/api/deals?limit=${limit}`, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const errorMessage =
      typeof payload?.error === "string" ? payload.error : "Не удалось загрузить сделки";
    throw new Error(errorMessage);
  }
  const body = (await response.json()) as { items?: Array<{ id: string; deal_number?: string | null }> };
  return (body.items ?? []).map((item) => ({
    id: item.id,
    label: item.deal_number ?? `Сделка ${item.id.slice(0, 8)}`,
  }));
}

export function OpsTasksBoard({
  initialTasks,
  currentUserId,
  primaryRole,
}: WorkspaceTasksBoardProps) {
  const enforceRoleScope = Boolean(primaryRole);
  const enforceUserScope = !primaryRole && Boolean(currentUserId);
  const [tasks, setTasks] = useState<WorkspaceTask[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dealFilter, setDealFilter] = useState<string>("all");
  const [workflowOnly, setWorkflowOnly] = useState(false);
  const [onlyMine, setOnlyMine] = useState(() => enforceUserScope);
  const [onlyByRole, setOnlyByRole] = useState(() => enforceRoleScope);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);

  const [dealOptions, setDealOptions] = useState<DealOption[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);

  const filtersInitialized = useRef(false);

  useEffect(() => {
    if (enforceUserScope) {
      setOnlyMine(true);
    }
  }, [enforceUserScope]);

  useEffect(() => {
    if (!primaryRole) {
      setOnlyByRole(false);
      return;
    }
    if (enforceRoleScope && !onlyMine) {
      setOnlyByRole(true);
    }
  }, [primaryRole, enforceRoleScope, onlyMine]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((task) => set.add(task.status));
    return Array.from(set);
  }, [tasks]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((task) => set.add(task.type));
    return Array.from(set);
  }, [tasks]);

  const dealFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((task) => {
      if (task.dealId) {
        const label = task.dealNumber ?? `Сделка ${task.dealId.slice(0, 8)}`;
        map.set(task.dealId, label);
      }
    });
    return Array.from(map.entries());
  }, [tasks]);

  const summary = useMemo(() => {
    const workflowCount = tasks.filter((task) => task.isWorkflow).length;
    const inProgress = tasks.filter((task) => task.status !== "DONE").length;
    return {
      total: tasks.length,
      workflowCount,
      inProgress,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (typeFilter !== "all" && task.type !== typeFilter) return false;
      if (workflowOnly && !task.isWorkflow) return false;
      if (dealFilter === "no-deal" && task.dealId) return false;
      if (dealFilter !== "all" && dealFilter !== "no-deal" && task.dealId !== dealFilter) {
        return false;
      }
      if (!query) return true;

      const haystack = [
        task.title,
        task.type,
        task.dealNumber,
        task.workflowStageTitle,
        ...Object.values(task.fields ?? {}).map((value) =>
          typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : JSON.stringify(value),
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [tasks, searchQuery, statusFilter, typeFilter, workflowOnly, dealFilter]);

  function buildFetchParams(): FetchParams {
    const params: FetchParams = {};
    if (workflowOnly) {
      params.workflowOnly = true;
    }
    const shouldScopeByUser = (onlyMine || enforceUserScope) && Boolean(currentUserId);
    const shouldScopeByRole =
      Boolean(primaryRole) && !shouldScopeByUser && (enforceRoleScope || onlyByRole);
    if (shouldScopeByUser) {
      params.assigned = "me";
    } else if (shouldScopeByRole) {
      params.assigned = "role";
    }
    if (statusFilter !== "all") {
      params.status = statusFilter;
    }
    if (typeFilter !== "all") {
      params.type = typeFilter;
    }
    if (dealFilter !== "all" && dealFilter !== "no-deal") {
      params.dealId = dealFilter;
    }
    return params;
  }

  async function loadTasks(successMessage?: string) {
    setIsRefreshing(true);
    try {
      const next = await fetchTasks(buildFetchParams());
      setTasks(next);
      if (successMessage) {
        setFeedback({ type: "success", message: successMessage });
      }
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось обновить список задач. Попробуйте позже.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    await loadTasks();
  }

  async function handleCreateTask() {
    if (!formState.title.trim()) {
      setFeedback({ type: "error", message: "Название задачи обязательно." });
      return;
    }

    setIsCreating(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formState.title.trim(),
          description: formState.description.trim() || undefined,
          deal_id: formState.dealId.trim() || undefined,
          due_at: formState.dueAt ? new Date(formState.dueAt).toISOString() : undefined,
          type: "MANUAL",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Не удалось создать задачу. Проверьте данные и попробуйте снова.",
        );
      }

      setFormState(DEFAULT_FORM_STATE);
      setIsCreateOpen(false);
      await loadTasks("Задача создана.");
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось создать задачу. Проверьте данные и попробуйте снова.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(
      () => setFeedback(null),
      feedback.type === "success" ? 3000 : 5000,
    );
    return () => clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (!isCreateOpen || dealOptions.length > 0 || dealsLoading) return;

    setDealsError(null);
    setDealsLoading(true);
    fetchDealOptions()
      .then((options) => setDealOptions(options))
      .catch((error) => {
        console.error(error);
        setDealsError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить список сделок.",
        );
      })
      .finally(() => setDealsLoading(false));
  }, [isCreateOpen, dealOptions.length, dealsLoading]);

  useEffect(() => {
    if (filtersInitialized.current) {
      void loadTasks();
    } else {
      filtersInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowOnly, onlyMine, onlyByRole, statusFilter, typeFilter, dealFilter]);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="gap-2 border-b border-border/60">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">Задачи</CardTitle>
            <CardDescription>
              Всего: {summary.total} • В работе: {summary.inProgress} • Workflow:{" "}
              {summary.workflowCount}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Обновить
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Новая задача
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Создать задачу</DialogTitle>
                  <DialogDescription>
                    Ручная задача попадёт в общий список и может быть привязана к сделке.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Название *</Label>
                    <Input
                      id="task-title"
                      value={formState.title}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Например, запросить банковскую гарантию"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-description">Описание</Label>
                    <textarea
                      id="task-description"
                      className="min-h-[80px] w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Детали, чек-лист, контакты"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="task-deal">Сделка</Label>
                      <Input
                        id="task-deal"
                        list="deal-options"
                        value={formState.dealId}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, dealId: event.target.value }))
                        }
                        placeholder="Выберите или введите ID"
                      />
                      <datalist id="deal-options">
                        {dealOptions.map((deal) => (
                          <option key={deal.id} value={deal.id}>
                            {deal.label}
                          </option>
                        ))}
                      </datalist>
                      <p className="text-[11px] text-muted-foreground">
                        Выберите из списка или укажите UUID вручную.
                      </p>
                      {dealsLoading ? (
                        <p className="text-xs text-muted-foreground">Загружаем сделки…</p>
                      ) : null}
                      {dealsError ? (
                        <p className="text-xs text-rose-500">{dealsError}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-due">Срок (необязательно)</Label>
                      <Input
                        id="task-due"
                        type="datetime-local"
                        value={formState.dueAt}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, dueAt: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreateTask} disabled={isCreating} className="gap-2">
                    {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, типу или статусу"
              className="pl-9"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-border bg-transparent px-3 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Все статусы</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status] ?? status}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-border bg-transparent px-3 text-sm"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">Все типы</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-border bg-transparent px-3 text-sm"
            value={dealFilter}
            onChange={(event) => setDealFilter(event.target.value)}
          >
            <option value="all">Все сделки</option>
            <option value="no-deal">Без сделки</option>
            {dealFilterOptions.map(([dealId, label]) => (
              <option key={dealId} value={dealId}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-border"
              checked={workflowOnly}
              onChange={(event) => setWorkflowOnly(event.target.checked)}
            />
            Только workflow-задачи
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-border"
              checked={enforceUserScope ? true : onlyMine}
              disabled={!currentUserId || enforceUserScope}
              onChange={(event) => {
                if (enforceUserScope) {
                  return;
                }
                const next = event.target.checked;
                setOnlyMine(next);
                if (next) {
                  setOnlyByRole(false);
                } else if (enforceRoleScope) {
                  setOnlyByRole(true);
                }
              }}
            />
            Мои задачи
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-border"
              checked={enforceRoleScope ? true : onlyByRole}
              disabled={enforceRoleScope || !primaryRole || onlyMine}
              onChange={(event) => {
                if (!enforceRoleScope) {
                  setOnlyByRole(event.target.checked);
                }
              }}
            />
            По роли {primaryRole ? `(${primaryRole})` : ""}
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback ? (
          <div
            className={cn(
              "rounded-md border px-4 py-2 text-sm",
              feedback.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                : "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200",
            )}
          >
            {feedback.message}
          </div>
        ) : null}

        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 p-10 text-center text-muted-foreground">
            <Workflow className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Нет задач по текущим фильтрам</p>
              <p className="text-sm text-muted-foreground">
                Снимите фильтры или создайте новую задачу.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Задача</TableHead>
                  <TableHead>Этап сделки</TableHead>
                  <TableHead>Сделка</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Ответственный</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const slaMeta = task.slaStatus ? SLA_STATUS_META[task.slaStatus] : null;
                  const statusMeta = getStatusBadgeMeta(task.status);
                  const assigneeName = resolveAssigneeName(task);
                  const assigneeLabel = assigneeName
                    ? assigneeName
                    : task.assigneeUserId
                      ? task.assigneeUserId.slice(0, 8)
                      : "Не назначен";
                  const roleLabel = task.assigneeRole ?? "Роль не назначена";
                  const clientName = resolveClientName(task);
                  const vehicleName = resolveVehicleName(task);
                  const dealSlug = task.dealId
                    ? buildSlugWithId(task.dealNumber ?? null, task.dealId) || task.dealId
                    : null;

                  return (
                    <TableRow key={task.id} className="align-top">
                      <TableCell className="min-w-[240px]">
                        <div className="space-y-1">
                          <Link
                            href={`/ops/tasks/${task.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {task.title}
                          </Link>
                          {clientName || vehicleName ? (
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {clientName ? <div>Клиент: {clientName}</div> : null}
                              {vehicleName ? <div>Авто: {vehicleName}</div> : null}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.workflowStageTitle ? (
                          <div className="space-y-1 text-sm">
                            <div className="font-medium text-foreground">
                              {task.workflowStageTitle}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.dealId ? (
                          <div className="flex flex-col gap-1 text-sm">
                            <Link
                              href={dealSlug ? `/ops/deals/${dealSlug}` : `/ops/deals/${task.dealId}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {task.dealNumber ?? task.dealId.slice(0, 8)}
                            </Link>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Не привязана</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="font-medium text-foreground">
                            {formatDate(task.slaDueAt ?? task.completedAt)}
                          </div>
                          {slaMeta && (
                            <div className={cn("text-xs font-medium", slaMeta.className)}>
                              {slaMeta.label}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border text-xs font-medium uppercase tracking-wide",
                            statusMeta.className,
                          )}
                        >
                          {statusMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="font-medium leading-snug">{assigneeLabel}</div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            {roleLabel}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
