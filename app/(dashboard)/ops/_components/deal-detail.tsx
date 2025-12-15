"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown } from "lucide-react";
import type { WorkspaceTask } from "@/lib/supabase/queries/tasks";
import type { OpsDealDetail } from "@/lib/supabase/queries/operations";
import { WORKFLOW_ROLE_LABELS, getDealDocumentLabel } from "@/lib/supabase/queries/operations";
import { DealStageTasks } from "@/app/(dashboard)/ops/_components/deal-stage-tasks";
import { DealEditDialog } from "@/app/(dashboard)/ops/_components/deal-edit-dialog";
import { VehicleGallery } from "./vehicle-gallery";
import { CommercialOfferForm } from "./commercial-offer-form";
import { WorkflowDocuments } from "./workflow-documents";
import { isOptionalGuardDocument } from "@/lib/workflow/documents-checklist";
import { buildSlugWithId } from "@/lib/utils/slugs";
import { getDealStatusBadgeMeta } from "@/app/(dashboard)/ops/_components/deal-status-badge-meta";

type DealDetailProps = {
  detail: OpsDealDetail;
};

function normalizeDocumentTypeValue(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function pickStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

const EXCLUDED_FIELD_LABELS = new Set([
  "id сделки",
  "текущий этап",
  "номер сделки",
  "этап workflow",
  "статус сделки",
  "сделка",
  "deal",
  "deal id",
]);

type TaskSchemaEntry =
  | { kind: "document"; id: string; label: string; documentType: string }
  | { kind: "parameter"; id: string; label: string; value: string };

function isDocumentSchemaEntry(entry: TaskSchemaEntry): entry is Extract<TaskSchemaEntry, { kind: "document" }> {
  return entry.kind === "document";
}

function isParameterSchemaEntry(entry: TaskSchemaEntry): entry is Extract<TaskSchemaEntry, { kind: "parameter" }> {
  return entry.kind === "parameter";
}

function stripFileSuffix(label?: string | null): string {
  if (!label) return "";
  return label.replace(/\s*\(файл\)/gi, "").trim();
}

function extractDocumentDefinitionsFromPayload(payload: Record<string, unknown> | null): Array<{ documentType: string; label: string }> {
  const schemaBranch =
    payload && typeof payload.schema === "object" && !Array.isArray(payload.schema)
      ? (payload.schema as Record<string, unknown>)
      : null;
  const fieldsRaw = Array.isArray(schemaBranch?.fields) ? schemaBranch.fields : [];
  const definitions: Array<{ documentType: string; label: string }> = [];

  fieldsRaw.forEach((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const branch = raw as Record<string, unknown>;
    const docType =
      typeof branch.document_type === "string"
        ? (branch.document_type as string)
        : typeof branch.documentType === "string"
          ? (branch.documentType as string)
          : null;
    if (!docType) return;
    const labelRaw = typeof branch.label === "string" ? (branch.label as string) : docType;
    const label = stripFileSuffix(labelRaw);
    definitions.push({ documentType: docType, label: label.length > 0 ? label : docType });
  });

  return definitions;
}

type TaskFieldDefinition = {
  id: string;
  type?: string;
  label?: string;
  document_type?: string;
  documentType?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

function extractFieldDefinitionsFromPayload(payload: Record<string, unknown> | null): TaskFieldDefinition[] {
  const schemaBranch =
    payload && typeof payload.schema === "object" && !Array.isArray(payload.schema)
      ? (payload.schema as Record<string, unknown>)
      : null;
  const fieldsRaw = Array.isArray(schemaBranch?.fields) ? schemaBranch.fields : [];

  const definitions: TaskFieldDefinition[] = [];

  fieldsRaw.forEach((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const field = raw as Record<string, unknown>;
    const id = typeof field.id === "string" ? field.id : null;
    if (!id) return;
    const type = typeof field.type === "string" ? field.type.toLowerCase() : "";
    const hasDocumentType =
      typeof field.document_type === "string" ||
      typeof (field as { documentType?: unknown }).documentType === "string";
    if (type === "file" || hasDocumentType) return;
    const label = typeof field.label === "string" ? field.label : id;
    const normalizedLabel = (label ?? "").trim().toLowerCase();
    if (EXCLUDED_FIELD_LABELS.has(normalizedLabel)) {
      return;
    }
    definitions.push({
      id,
      type: type || undefined,
      label: label.trim().length > 0 ? label : id,
    });
  });

  return definitions;
}

function resolveTaskFieldValue(fieldId: string, payload: Record<string, unknown> | null): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const fieldsBranch =
    payload.fields && typeof payload.fields === "object" && !Array.isArray(payload.fields)
      ? (payload.fields as Record<string, unknown>)
      : {};
  const defaultsBranch =
    payload.defaults && typeof payload.defaults === "object" && !Array.isArray(payload.defaults)
      ? (payload.defaults as Record<string, unknown>)
      : {};

  if (fieldId in fieldsBranch) return fieldsBranch[fieldId];
  if (fieldId in defaultsBranch) return defaultsBranch[fieldId];
  return null;
}

function formatTaskFieldValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString("ru-RU") : "—";
  }
  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => formatTaskFieldValue(entry))
      .filter((entry) => entry && entry !== "—");
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "—" : value.toLocaleDateString("ru-RU");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }
  return String(value);
}

function extractOrderedSchemaEntriesFromPayload(payload: Record<string, unknown> | null): TaskSchemaEntry[] {
  const schemaBranch =
    payload && typeof payload.schema === "object" && !Array.isArray(payload.schema)
      ? (payload.schema as Record<string, unknown>)
      : null;
  const fieldsRaw = Array.isArray(schemaBranch?.fields) ? schemaBranch.fields : [];
  const entries: TaskSchemaEntry[] = [];

  fieldsRaw.forEach((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const branch = raw as Record<string, unknown>;
    const id = typeof branch.id === "string" ? branch.id : null;
    if (!id) return;
    const labelRaw = typeof branch.label === "string" ? (branch.label as string) : id;
    const normalizedLabel = labelRaw.trim().toLowerCase();
    const fieldType = typeof branch.type === "string" ? branch.type.toLowerCase() : "";
    const documentType =
      typeof branch.document_type === "string"
        ? (branch.document_type as string)
        : typeof (branch as { documentType?: unknown }).documentType === "string"
          ? ((branch as { documentType?: string }).documentType as string)
          : null;
    const hasDocumentType = Boolean(documentType);

    if (fieldType === "file" || hasDocumentType) {
      if (!documentType) return;
      const docLabel = stripFileSuffix(labelRaw);
      entries.push({
        kind: "document",
        id,
        documentType,
        label: docLabel.length > 0 ? docLabel : documentType,
      });
      return;
    }

    if (EXCLUDED_FIELD_LABELS.has(normalizedLabel)) return;

    entries.push({
      kind: "parameter",
      id,
      label: labelRaw.trim().length > 0 ? labelRaw : id,
      value: formatTaskFieldValue(resolveTaskFieldValue(id, payload)),
    });
  });

  return entries;
}

function resolveDocumentLabelFromType(documentType: string | null, fallbackLabel?: string | null): string {
  const candidates = [fallbackLabel, documentType ? getDealDocumentLabel(documentType) : null, documentType];
  const match = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  return match ? match.trim() : "Документ";
}

function formatDateValue(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ru-RU");
}

function slugifyRouteSegment(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function parseCurrencyValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

type TimelineTone = "default" | "legal" | "status" | "task";

function resolveTimelineTone(text: string): TimelineTone {
  const normalized = text.toLowerCase();
  if (normalized.includes("договор") || normalized.includes("signature") || normalized.includes("подпис")) {
    return "legal";
  }
  if (normalized.includes("статус")) {
    return "status";
  }
  if (normalized.includes("задача") || normalized.includes("task")) {
    return "task";
  }
  return "default";
}

const COLLAPSE_TOGGLE_COOLDOWN_MS = 250;

const TASK_STATUS_META: Record<
  string,
  {
    label: string;
    variant: "success" | "warning" | "secondary" | "danger" | "outline";
  }
> = {
  DONE: { label: "Завершена", variant: "success" },
  IN_PROGRESS: { label: "В работе", variant: "secondary" },
  BLOCKED: { label: "Заблокирована", variant: "danger" },
  CANCELLED: { label: "Отменена", variant: "outline" },
  OPEN: { label: "Открыта", variant: "warning" },
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

type DealTasksListProps = {
  tasks: WorkspaceTask[];
};

function DealTasksList({ tasks }: DealTasksListProps) {
  if (!tasks.length) {
    return <p className="text-sm text-muted-foreground">Для сделки пока нет задач.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Задача</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Переоткрыть</TableHead>
            <TableHead>Выполнено</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const statusMeta = TASK_STATUS_META[task.status] ?? TASK_STATUS_META.OPEN;
            return (
              <TableRow key={task.id} className="align-top">
                <TableCell className="max-w-[240px]">
                  <div className="space-y-1">
                    <Link
                      href={`/ops/tasks/${task.id}`}
                      className="font-semibold text-foreground transition hover:text-brand-600"
                    >
                      {task.title}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusMeta.variant} className="rounded-lg">
                    {statusMeta.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg px-2 text-xs font-medium"
                  >
                    <Link href={`/ops/tasks/${task.id}#reopen-task`}>Переоткрыть</Link>
                  </Button>
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {formatDateTime(task.completedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function DealDetailView({ detail }: DealDetailProps) {
  const [isDocsCollapsed, setIsDocsCollapsed] = useState(true);
  const [isAllTasksCollapsed, setIsAllTasksCollapsed] = useState(true);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(true);
  const docsToggleLockRef = useRef(0);
  const allTasksToggleLockRef = useRef(0);
  const timelineToggleLockRef = useRef(0);
  const {
    profile,
  company,
  client,
    seller,
    documents,
  clientDocuments,
  keyInformation,
  overview = [],
  invoices,
  timeline,
  workflowTasks,
  guardStatuses,
  tasks,
  slug,
  commercialOffer,
  financials,
  editDefaults,
} = detail;

  const toggleWithCooldown = (setState: Dispatch<SetStateAction<boolean>>, lockRef: MutableRefObject<number>) => {
    const now = Date.now();
    if (now - lockRef.current < COLLAPSE_TOGGLE_COOLDOWN_MS) return;
    lockRef.current = now;
    setState((prev) => !prev);
  };

  const financedAmount = useMemo(() => {
    const principalFromDeal =
      typeof editDefaults?.principalAmount === "number" && Number.isFinite(editDefaults.principalAmount)
        ? editDefaults.principalAmount
        : null;
    if (principalFromDeal != null) return Math.max(0, principalFromDeal);

    const price =
      typeof commercialOffer?.priceVat === "number"
        ? commercialOffer.priceVat
        : parseCurrencyValue(
            commercialOffer?.priceVat != null ? String(commercialOffer.priceVat) : null,
          );
    const downPaymentAmount =
      typeof commercialOffer?.downPaymentAmount === "number"
        ? commercialOffer.downPaymentAmount
        : parseCurrencyValue(
            commercialOffer?.downPaymentAmount != null
              ? String(commercialOffer.downPaymentAmount)
              : null,
          );
    const downPaymentPercent =
      typeof commercialOffer?.downPaymentPercent === "number"
        ? commercialOffer.downPaymentPercent
        : parseCurrencyValue(
            commercialOffer?.downPaymentPercent != null
              ? String(commercialOffer.downPaymentPercent)
              : null,
          );

    if (price != null && Number.isFinite(price)) {
      const resolvedDownPayment =
        downPaymentAmount != null && Number.isFinite(downPaymentAmount)
          ? downPaymentAmount
          : downPaymentPercent != null && Number.isFinite(downPaymentPercent)
            ? (price * downPaymentPercent) / 100
            : null;
      if (resolvedDownPayment != null) {
        const principal = price - resolvedDownPayment;
        return Number.isFinite(principal) ? Math.max(0, principal) : null;
      }
    }

    const financialsPrincipal =
      financials
        .map((entry) => ({
          label: entry.label.toLowerCase(),
          value: parseCurrencyValue(entry.value),
        }))
        .find(
          (entry) =>
            entry.value != null &&
            (entry.label.includes("principal") || entry.label.includes("финансируем")),
        )?.value ?? null;

    return financialsPrincipal != null && Number.isFinite(financialsPrincipal)
      ? Math.max(0, financialsPrincipal)
      : null;
  }, [commercialOffer, editDefaults, financials]);

  const handleDocsToggle = () => toggleWithCooldown(setIsDocsCollapsed, docsToggleLockRef);
  const handleAllTasksToggle = () => toggleWithCooldown(setIsAllTasksCollapsed, allTasksToggleLockRef);
  const handleTimelineToggle = () => toggleWithCooldown(setIsTimelineCollapsed, timelineToggleLockRef);

  const hasPendingTasks = workflowTasks.some((task) => !task.fulfilled);
  const dealTitle = slug.startsWith("deal-")
    ? `Deal-${slug.slice("deal-".length)}`
    : profile.dealId ?? slug;
  const computedClientSlug = client.userId
    ? buildSlugWithId(client.name ?? null, client.userId) || client.userId
    : null;
  const clientHref = client.detailHref
    ? client.detailHref
    : computedClientSlug
      ? `/ops/clients/${computedClientSlug}`
      : client.userId
        ? `/ops/clients/${client.userId}`
        : client.name
          ? `/ops/clients/${slugifyRouteSegment(client.name)}`
          : "/ops/clients";
  const computedSellerSlug = seller?.userId
    ? buildSlugWithId(seller.name ?? null, seller.userId) || seller.userId
    : null;
  const sellerHref = seller?.detailHref
    ? seller.detailHref
    : computedSellerSlug
      ? `/ops/sellers/${computedSellerSlug}`
      : seller?.userId
        ? `/ops/sellers/${seller.userId}`
        : seller?.name
          ? `/ops/sellers/${slugifyRouteSegment(seller.name)}`
          : "/ops/sellers";
  const sellerLine = seller?.name ?? "—";
  const computedVehicleSlug = profile.vehicleId
    ? buildSlugWithId(profile.vehicleName ?? null, profile.vehicleId) || profile.vehicleId
    : null;
  const vehicleHref = profile.vehicleHref
    ? profile.vehicleHref
    : computedVehicleSlug
      ? `/ops/cars/${computedVehicleSlug}`
      : profile.vehicleName
        ? `/ops/cars/${slugifyRouteSegment(profile.vehicleName)}`
        : "/ops/cars";
  const createdAtEntry = overview.find((item) => item.label.toLowerCase() === "created at");
  const vehicleYearEntry = keyInformation.find((item) => {
    const normalized = item.label.toLowerCase();
    return normalized.includes("год") || normalized.includes("year");
  });
  const vehicleYear = vehicleYearEntry?.value && vehicleYearEntry.value !== "—" ? vehicleYearEntry.value : null;
  const overdueInvoices = invoices.filter((invoice) =>
    invoice.status.toLowerCase().includes("overdue"),
  );
  const VEHICLE_PLACEHOLDER_PATH = "/assets/vehicle-placeholder.svg";
  const galleryPreview = useMemo(() => (profile.gallery ?? []).slice(0, 4), [profile.gallery]);
  const galleryFallbackImage =
    profile.image && profile.image !== VEHICLE_PLACEHOLDER_PATH ? profile.image : null;
  const hasMoreGalleryImages = (profile.gallery?.length ?? 0) > galleryPreview.length;
  const orderedTimeline = [...timeline].sort((a, b) => {
    const parse = (value: string): number => {
      const match = value.match(
        /\b(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/,
      );
      if (!match) {
        return Number.MIN_SAFE_INTEGER;
      }
      const [, day, month, year, hour = "0", minute = "0"] = match;
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
      );
      return Number.isNaN(date.getTime()) ? Number.MIN_SAFE_INTEGER : date.getTime();
    };

    return parse(b.timestamp) - parse(a.timestamp);
  });
  const timelineWithTone = useMemo(
    () =>
      orderedTimeline.map((event) => ({
        ...event,
        tone: resolveTimelineTone(event.text),
      })),
    [orderedTimeline],
  );
  const dueAmountValue = parseCurrencyValue(profile.dueAmount);
  const hasDebt = (dueAmountValue ?? 0) > 0 || overdueInvoices.length > 0;
  const statusBadgeMeta = getDealStatusBadgeMeta(detail.statusKey);
  const dealTasksOrdered = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return Number.isNaN(bTime) || Number.isNaN(aTime) ? 0 : bTime - aTime;
    });
  }, [tasks]);
  const { workflowDocumentGroups, workflowAdditionalDocuments } = useMemo(() => {
    const taskSnapshots = tasks.map((task) => {
      const payload =
        task.payload && typeof task.payload === "object" && !Array.isArray(task.payload)
          ? (task.payload as Record<string, unknown>)
          : null;
      const guardNote = pickStringValue((payload as { guard_note?: unknown } | null)?.guard_note);
      const schemaEntriesBase = extractOrderedSchemaEntriesFromPayload(payload);
      const schemaEntries =
        guardNote && !schemaEntriesBase.some((entry) => isParameterSchemaEntry(entry) && entry.id === "guard_note")
          ? [
              ...schemaEntriesBase,
              {
                kind: "parameter" as const,
                id: "guard_note",
                label: "Комментарий",
                value: guardNote,
              },
            ]
          : schemaEntriesBase;
      const parameters = schemaEntries
        .filter(isParameterSchemaEntry)
        .map((entry) => ({
          id: entry.id,
          label: entry.label,
          value: entry.value,
        }));
      const documents = schemaEntries
        .filter(isDocumentSchemaEntry)
        .map((entry) => ({
          documentType: entry.documentType,
          label: entry.label,
        }));
      const parametersFallback =
        parameters.length > 0
          ? parameters
          : extractFieldDefinitionsFromPayload(payload).map((field) => ({
              id: field.id,
              label: field.label ?? field.id,
              value: formatTaskFieldValue(resolveTaskFieldValue(field.id, payload)),
            }));
      const documentsFallback =
        documents.length > 0 ? documents : extractDocumentDefinitionsFromPayload(payload);
      return {
        id: task.id,
        title: task.title?.trim().length ? task.title : "Задача",
        guardKey:
          payload && typeof payload.guard_key === "string"
            ? (payload.guard_key as string)
            : typeof payload?.guardKey === "string"
              ? (payload.guardKey as string)
              : null,
        stageKey: task.workflowStageKey ?? "deal",
        stageTitle: task.workflowStageTitle ?? task.workflowStageKey ?? "Сделка",
        schemaEntries,
        parameters: parametersFallback,
        documents: documentsFallback,
      };
    });

    const groups: Array<{
      id: string;
      stageKey: string;
      stageTitle: string;
      taskTitle: string;
      taskTemplateId: string;
      documents: Array<{ label: string; value: string; status?: string | null; url?: string | null; type?: string | null; kind?: "document" | "parameter" }>;
    }> = [];
    const groupDocTypeMap = new Map<
      string,
      Map<string, { label: string; value: string; status?: string | null; url?: string | null }>
    >();
    const taskByGuard = new Map<string | null, (typeof taskSnapshots)[number]>();
    taskSnapshots.forEach((task) => {
      const guardKey = task.guardKey ?? null;
      if (!taskByGuard.has(guardKey)) {
        taskByGuard.set(guardKey, task);
      }
    });
    const defaultGuardlessTask = taskSnapshots.find((t) => !t.guardKey) ?? taskSnapshots[0] ?? null;

    taskSnapshots.forEach((task) => {
      const orderedEntries: TaskSchemaEntry[] =
        task.schemaEntries.length > 0
          ? task.schemaEntries
          : [
              ...task.documents.map((def) => ({
                kind: "document" as const,
                id: def.documentType,
                label: def.label,
                documentType: def.documentType,
              })),
              ...task.parameters.map((param) => ({
                kind: "parameter" as const,
                id: param.id,
                label: param.label,
                value: param.value,
              })),
            ];
      const groupDocs: Array<{
        label: string;
        value: string;
        status?: string | null;
        url?: string | null;
        kind?: "document" | "parameter";
        type?: string | null;
      }> = [];
      const docMap = new Map<string, { label: string; value: string; status?: string | null; url?: string | null }>();

      orderedEntries.forEach((entry) => {
        if (isDocumentSchemaEntry(entry)) {
          const normalizedType = normalizeDocumentTypeValue(entry.documentType);
          const docEntry = {
            label: resolveDocumentLabelFromType(entry.documentType, entry.label),
            value: "—",
            status: null,
            url: null,
            kind: "document" as const,
            type: normalizedType,
          };
          groupDocs.push(docEntry);
          if (normalizedType) {
            docMap.set(normalizedType, docEntry);
          }
        } else if (isParameterSchemaEntry(entry)) {
          groupDocs.push({
            label: entry.label ?? entry.id,
            value: entry.value ?? "—",
            status: null,
            url: null,
            kind: "parameter",
          });
        }
      });
      groups.push({
        id: task.id,
        stageKey: task.stageKey ?? "deal",
        stageTitle: task.stageTitle ?? "Сделка",
        taskTitle: task.title,
        taskTemplateId: task.id,
        documents: groupDocs,
      });
      groupDocTypeMap.set(task.id, docMap);
    });

    const optionalDocs = documents.filter((doc) => isOptionalGuardDocument(doc.metadata));
    const requiredDocs = documents.filter((doc) => !isOptionalGuardDocument(doc.metadata));

    requiredDocs.forEach((doc) => {
      const metadata =
        doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
          ? (doc.metadata as Record<string, unknown>)
          : null;
      const docGuard = metadata && typeof metadata.guard_key === "string" ? (metadata.guard_key as string) : null;
      const targetTask = (docGuard ? taskByGuard.get(docGuard) : null) ?? defaultGuardlessTask;
      const groupKey = targetTask ? targetTask.id : "deal-documents";
      if (!groupDocTypeMap.has(groupKey)) {
        groupDocTypeMap.set(groupKey, new Map());
        groups.push({
          id: groupKey,
          stageKey: targetTask?.stageKey ?? "deal",
          stageTitle: targetTask?.stageTitle ?? "Сделка",
          taskTitle: targetTask?.title ?? "Документы",
          taskTemplateId: groupKey,
          documents: [],
        });
      }

      const entryMap = groupDocTypeMap.get(groupKey) ?? new Map();
      const normalizedType = normalizeDocumentTypeValue(doc.documentType);
      const existing = normalizedType ? entryMap.get(normalizedType) : null;

      const label = resolveDocumentLabelFromType(doc.documentType ?? null, doc.title ?? null);
      const valueDate = formatDateValue(doc.uploadedAt ?? null);
      const value = valueDate !== "—" ? valueDate : doc.status ?? "—";
      const entry = existing ?? { label, value, status: doc.status ?? null, url: doc.url ?? null };
      entry.label = label;
      entry.value = value;
      entry.status = doc.status ?? null;
      entry.url = doc.url ?? null;

      if (!existing) {
        entryMap.set(normalizedType ?? `${doc.id}`, entry);
        const group = groups.find((g) => g.id === groupKey);
        if (group) {
          group.documents.push({ ...entry, type: normalizedType });
        }
      }

      groupDocTypeMap.set(groupKey, entryMap);
    });

    const additionalDocs = optionalDocs.map((doc) => {
      const metadata =
        doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
          ? (doc.metadata as Record<string, unknown>)
          : null;
      const guardLabel =
        metadata && typeof metadata.guard_label === "string" && metadata.guard_label.trim().length > 0
          ? (metadata.guard_label as string)
          : null;
      const label = resolveDocumentLabelFromType(doc.documentType ?? null, guardLabel ?? doc.title ?? null);
      const valueDate = formatDateValue(doc.uploadedAt ?? null);
      const value = valueDate !== "—" ? valueDate : doc.status ?? "—";
      return { label, value, status: doc.status ?? null, url: doc.url ?? null };
    });

    return {
      workflowDocumentGroups: groups,
      workflowAdditionalDocuments: additionalDocs,
    };
  }, [documents, tasks]);
  const dealCostEntry = keyInformation.find((item) => item.label.toLowerCase().includes("стоим"));
  const normalizedClientName = client.name?.trim() ?? "";
  const clientDisplayName = normalizedClientName.length > 0 ? normalizedClientName : null;
  const normalizedVehicleName = profile.vehicleName?.trim() ?? "";
  const vehicleNameDisplay = normalizedVehicleName.length > 0 ? normalizedVehicleName : null;
  const vehicleDescriptorParts = [vehicleNameDisplay, vehicleYear].filter(Boolean) as string[];
  const vehicleDescriptor = vehicleDescriptorParts.length > 0 ? vehicleDescriptorParts.join(", ") : null;
  const clientVehicleLine =
    clientDisplayName && vehicleDescriptor
      ? `${clientDisplayName} * ${vehicleDescriptor}`
      : clientDisplayName ?? vehicleDescriptor ?? "—";
  const buyerLine = clientDisplayName ?? "—";
  const vehicleLine = vehicleDescriptor ?? vehicleNameDisplay ?? "—";
  const nextPaymentDisplay = profile.nextPayment?.trim() ?? "";
  const summaryCards: Array<{
    id: string;
    label: string;
    value: string;
    tone?: "danger" | "success";
  }> = [];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
          <Link href="/ops/deals">← Назад к сделкам</Link>
        </Button>
        <DealEditDialog detail={detail} triggerVariant="outline" triggerSize="sm" triggerClassName="rounded-xl" />
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="gap-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(320px,1.2fr),minmax(240px,0.8fr)] lg:items-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {hasDebt ? (
                  <Badge variant="danger" className="rounded-lg">
                    Долг {profile.dueAmount}
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">{dealTitle}</CardTitle>
                  <Badge
                    variant={statusBadgeMeta.variant}
                    className="ml-auto rounded-lg px-3 py-1.5 text-[0.75rem] uppercase tracking-wide"
                  >
                    {statusBadgeMeta.label}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-1 text-sm text-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Авто</span>
                  {vehicleHref ? (
                    <Link href={vehicleHref} className="font-semibold text-brand-600 underline underline-offset-2">
                      {vehicleLine}
                    </Link>
                  ) : (
                    <span className="font-semibold">{vehicleLine}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Покупатель</span>
                  {clientHref ? (
                    <Link href={clientHref} className="font-semibold text-brand-600 underline underline-offset-2">
                      {buyerLine}
                    </Link>
                  ) : (
                    <span className="font-semibold">{buyerLine}</span>
                  )}
                  {client.type ? (
                    <span className="text-xs text-muted-foreground">
                      ({client.type === "company" ? "Юр. лицо" : client.type === "personal" ? "Физ. лицо" : client.type})
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Продавец</span>
                  {sellerHref ? (
                    <Link href={sellerHref} className="font-semibold text-brand-600 underline underline-offset-2">
                      {sellerLine}
                    </Link>
                  ) : (
                    <span className="font-semibold">{sellerLine}</span>
                  )}
                  {seller?.type ? (
                    <span className="text-xs text-muted-foreground">
                      ({seller.type === "company" ? "Юр. лицо" : seller.type === "personal" ? "Физ. лицо" : seller.type})
                    </span>
                  ) : null}
                </div>
              </div>
              {summaryCards.length ? (
                <dl className="grid gap-3 sm:grid-cols-3">
                  {summaryCards.map((item) => {
                    const toneClass =
                      item.tone === "danger"
                        ? "text-rose-600"
                        : item.tone === "success"
                          ? "text-emerald-600"
                          : "text-foreground";
                    return (
                      <div key={item.id} className="space-y-1">
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</dt>
                        <dd className={`text-sm font-semibold ${toneClass}`}>{item.value}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : null}
            </div>
            <div className="space-y-2">
              <VehicleGallery
                images={galleryPreview}
                fallbackImageSrc={galleryFallbackImage ?? undefined}
                emptyMessage="Фото автомобиля отсутствуют"
                className="rounded-xl border border-border/60 bg-background/60 p-2"
                gridClassName="grid gap-2 sm:grid-cols-2"
                showLabels={false}
              />
              {hasMoreGalleryImages ? (
                <p className="text-xs text-muted-foreground">
                  Показаны первые фотографии. Полную галерею смотрите в карточке автомобиля.
                </p>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card
            className={`backdrop-blur transition-shadow ${
              hasPendingTasks
                ? "border-2 border-amber-400/60 bg-amber-100/70 shadow-[0_20px_45px_-25px_rgba(245,158,11,0.6)] dark:bg-amber-500/10"
                : "border-2 border-emerald-400/40 bg-emerald-50/70 shadow-[0_20px_40px_-28px_rgba(16,185,129,0.45)] dark:bg-emerald-500/10"
            }`}
            id="tasks"
          >
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Оперативные задачи</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DealStageTasks tasks={workflowTasks} />
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur" id="commercial-offer">
            <CardHeader className="space-y-1">
              <CardTitle>Коммерческое предложение</CardTitle>
            </CardHeader>
            <CardContent>
              <CommercialOfferForm
                dealId={detail.dealUuid}
                slug={slug}
                dealNumber={profile.dealId ?? null}
                clientName={client.name ?? null}
                vehicleName={profile.vehicleName ?? null}
                companyName={company?.name ?? "Fast Lease"}
                offer={commercialOffer}
              />
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="space-y-0">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                onClick={handleDocsToggle}
                aria-expanded={!isDocsCollapsed}
              >
                <CardTitle className="text-left">Документы сделки</CardTitle>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${isDocsCollapsed ? "" : "rotate-180"}`}
                  aria-hidden
                >
                  <ChevronDown className="h-4 w-4" />
                </span>
              </button>
            </CardHeader>
            {!isDocsCollapsed ? (
              <CardContent>
                <WorkflowDocuments
                  groups={workflowDocumentGroups}
                  additional={workflowAdditionalDocuments}
                  financedAmount={financedAmount}
                />
              </CardContent>
            ) : null}
          </Card>

        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="space-y-0">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                onClick={handleAllTasksToggle}
                aria-expanded={!isAllTasksCollapsed}
              >
                <div className="flex items-center gap-2">
                  <CardTitle className="text-left">Все задачи сделки</CardTitle>
                  <Badge variant="outline" className="rounded-lg">
                    {dealTasksOrdered.length}
                  </Badge>
                </div>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${isAllTasksCollapsed ? "" : "rotate-180"}`}
                  aria-hidden
                >
                  <ChevronDown className="h-4 w-4" />
                </span>
              </button>
            </CardHeader>
            {!isAllTasksCollapsed ? (
              <CardContent>
                <DealTasksList tasks={dealTasksOrdered} />
              </CardContent>
            ) : null}
          </Card>

          <Card className="bg-card/60 backdrop-blur" id="timeline">
            <CardHeader className="space-y-0">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                onClick={handleTimelineToggle}
                aria-expanded={!isTimelineCollapsed}
              >
                <CardTitle className="text-left">История действий</CardTitle>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${isTimelineCollapsed ? "" : "rotate-180"}`}
                  aria-hidden
                >
                  <ChevronDown className="h-4 w-4" />
                </span>
              </button>
            </CardHeader>
            {!isTimelineCollapsed ? (
              <CardContent>
                {timelineWithTone.length > 0 ? (
                  <ul className="space-y-2 text-sm text-foreground">
                    {timelineWithTone.map((event) => {
                      const toneClass =
                        event.tone === "legal"
                          ? "border-indigo-200 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                          : event.tone === "status"
                            ? "border-brand-200 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                            : event.tone === "task"
                              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                              : "border-border/60 bg-card/70";
                      return (
                        <li key={event.id} className={`space-y-1 rounded-lg border px-3 py-2 ${toneClass}`}>
                          <p className="font-medium">{event.text}</p>
                          <p className="text-xs text-muted-foreground">{event.timestamp}</p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    История действий по сделке пока отсутствует.
                  </p>
                )}
              </CardContent>
            ) : null}
          </Card>

        </aside>
      </div>
    </div>
  );
}
