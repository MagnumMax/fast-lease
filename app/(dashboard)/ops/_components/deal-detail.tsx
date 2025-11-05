"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gauge,
  Hash,
  Mail,
  MessageCircle,
  Send,
  Phone,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OpsDealDetail } from "@/lib/supabase/queries/operations";
import { DealStageTasks } from "@/app/(dashboard)/ops/_components/deal-stage-tasks";
import { DealEditDialog } from "@/app/(dashboard)/ops/_components/deal-edit-dialog";
import { DocumentList } from "./document-list";
import { buildSlugWithId } from "@/lib/utils/slugs";

type DealDetailProps = {
  detail: OpsDealDetail;
};

function slugifyRouteSegment(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

type InvoiceStatusVariant = "danger" | "warning" | "success";

function getInvoiceStatusMeta(status: string): { icon: LucideIcon; variant: InvoiceStatusVariant } {
  const normalized = status.toLowerCase();

  if (normalized.includes("overdue") || normalized.includes("просроч")) {
    return { icon: AlertTriangle, variant: "danger" };
  }

  if (normalized.includes("pending") || normalized.includes("ожида")) {
    return { icon: Clock3, variant: "warning" };
  }

  return { icon: CheckCircle2, variant: "success" };
}

function getVehicleInfoIcon(label: string): LucideIcon {
  const normalized = label.toLowerCase();

  if (normalized.includes("vin")) {
    return Hash;
  }

  if (normalized.includes("program") || normalized.includes("term")) {
    return CalendarRange;
  }

  if (normalized.includes("issue") || normalized.includes("дата")) {
    return CalendarDays;
  }

  if (normalized.includes("mileage") || normalized.includes("пробег")) {
    return Gauge;
  }

  if (normalized.includes("service") || normalized.includes("сервис")) {
    return Wrench;
  }

  return FileText;
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

export function DealDetailView({ detail }: DealDetailProps) {
  const {
    profile,
    client,
    clientDocuments,
    keyInformation,
    overview = [],
    financials = [],
    contract = [],
    paymentSchedule = [],
    documents,
    invoices,
    timeline,
    workflowTasks,
    guardStatuses,
    slug,
  } = detail;

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
  const normalizedPhone = client.phone?.replace(/[^+\d]/g, "") ?? "";
  const telHref = normalizedPhone ? `tel:${normalizedPhone}` : null;
  const whatsappHref = normalizedPhone ? `https://wa.me/${normalizedPhone.replace(/^\+/, "")}` : null;
  const createdAtEntry = overview.find((item) => item.label.toLowerCase() === "created at");
  const clientSourceDisplay =
    client.source && client.source.trim().length > 0 ? client.source.trim() : "—";
  const vehicleYearEntry = keyInformation.find((item) => {
    const normalized = item.label.toLowerCase();
    return normalized.includes("год") || normalized.includes("year");
  });
  const vehicleYear = vehicleYearEntry?.value && vehicleYearEntry.value !== "—" ? vehicleYearEntry.value : null;
  const filteredKeyInformation = keyInformation.filter(
    (item) => item.label.toLowerCase() !== "odoo card",
  );
  const statementHref = `/ops/deals/${slug}/statement`;
  const briefHref = `/ops/deals/${slug}/brief.pdf`;
  const overdueInvoices = invoices.filter((invoice) =>
    invoice.status.toLowerCase().includes("overdue"),
  );
  const pendingInvoices = invoices.filter((invoice) =>
    !invoice.status.toLowerCase().includes("overdue") &&
    invoice.status.toLowerCase().includes("pending"),
  );
  const vehicleImageSrc = profile.image?.trim();
  const hasVehicleImage = Boolean(vehicleImageSrc && vehicleImageSrc.length > 0);
  const vehicleImageAlt = profile.vehicleName || "Изображение автомобиля";
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "overdue" | "pending" | "paid">("all");
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
  const nextTask = useMemo(
    () => workflowTasks.find((task) => !task.fulfilled),
    [workflowTasks],
  );
  const dueAmountValue = parseCurrencyValue(profile.dueAmount);
  const hasDebt = (dueAmountValue ?? 0) > 0 || overdueInvoices.length > 0;
  const paidInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        /paid|оплач/i.test(invoice.status),
      ),
    [invoices],
  );
  const lastPaidInvoice = paidInvoices.length > 0 ? paidInvoices[0] : null;
  const filteredInvoices = useMemo(() => {
    switch (invoiceFilter) {
      case "overdue":
        return overdueInvoices;
      case "pending":
        return pendingInvoices;
      case "paid":
        return paidInvoices;
      default:
        return invoices;
    }
  }, [invoiceFilter, invoices, overdueInvoices, pendingInvoices, paidInvoices]);
  const invoiceFilterCounts = useMemo(
    () => ({
      all: invoices.length,
      overdue: overdueInvoices.length,
      pending: pendingInvoices.length,
      paid: paidInvoices.length,
    }),
    [invoices.length, overdueInvoices.length, pendingInvoices.length, paidInvoices.length],
  );
  const warnings = useMemo(() => {
    const list: Array<{ id: string; text: string; href?: string }> = [];
    if (hasDebt) {
      list.push({
        id: "debt",
        text: `Есть задолженность по сделке на сумму ${profile.dueAmount}`,
      });
    }
    overdueInvoices.slice(0, 3).forEach((invoice) => {
      list.push({
        id: `invoice-${invoice.id}`,
        text: `Просрочен платёж ${invoice.invoiceNumber}`,
      });
    });
    workflowTasks
      .filter((task) => task.requiresDocument && !task.attachmentUrl)
      .forEach((task) => {
        list.push({
          id: `doc-${task.id}`,
          text: `Нет документа: ${task.guardLabel ?? task.title}`,
          href: `/ops/tasks/${task.id}?focus=document`,
        });
      });
    const blockedTask = workflowTasks.find((task) => task.status.toUpperCase() === "BLOCKED");
    if (blockedTask) {
      list.push({
        id: `blocked-${blockedTask.id}`,
        text: `Задача заблокирована: ${blockedTask.guardLabel ?? blockedTask.title}`,
        href: `/ops/tasks/${blockedTask.id}`,
      });
    }
    return list;
  }, [hasDebt, profile.dueAmount, overdueInvoices, workflowTasks]);
  const companyDocuments = useMemo(
    () => clientDocuments.filter((doc) => doc.context === "company"),
    [clientDocuments],
  );
  const dealDocumentsPreview = useMemo(() => documents.slice(0, 5), [documents]);
  const companyDocumentItems = useMemo(
    () =>
      companyDocuments.map((doc) => ({
        id: doc.id,
        title: doc.name,
        uploadedAt: doc.uploadedAt,
        url: doc.url ?? null,
      })),
    [companyDocuments],
  );
  const dealDocumentItems = useMemo(
    () =>
      dealDocumentsPreview.map((doc) => ({
        id: doc.id,
        title: doc.title,
        uploadedAt: doc.uploadedAt,
        url: doc.url ?? null,
      })),
    [dealDocumentsPreview],
  );
  const vehicleChecklist = useMemo(
    () =>
      guardStatuses
        .filter((guard) => /vehicle|delivery|inspection/i.test(guard.key))
        .map((guard) => ({
          id: guard.key,
          label: guard.label,
          fulfilled: guard.fulfilled,
        })),
    [guardStatuses],
  );
  const dealCostEntry = keyInformation.find((item) => item.label.toLowerCase().includes("стоим"));
  const dealCostValue = parseCurrencyValue(dealCostEntry?.value ?? null);
  const termEntry = keyInformation.find((item) => item.label.toLowerCase().includes("срок"));
  const termMonths = termEntry?.value ? Number(termEntry.value.replace(/[^\d]/g, "")) || null : null;
  const monthlyPaymentValue = parseCurrencyValue(profile.monthlyPayment);
  const investorRoi =
    termMonths && monthlyPaymentValue && dealCostValue
      ? ((monthlyPaymentValue * termMonths) / dealCostValue - 1) * 100
      : null;
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
  const nextActionLabel = nextTask ? nextTask.guardLabel ?? nextTask.title : "Нет активных задач";
  const summaryCards: Array<{
    id: string;
    label: string;
    value: string;
    tone?: "danger" | "success";
  }> = [
    {
      id: "amount",
      label: "Сумма сделки",
      value: dealCostEntry?.value ?? "—",
    },
    {
      id: "roi",
      label: "ROI (оценка)",
      value: investorRoi != null ? `${investorRoi.toFixed(1)}%` : "—",
    },
    {
      id: "term",
      label: "Срок",
      value: termMonths ? `${termMonths} мес.` : "—",
    },
    {
      id: "debt",
      label: "Задолженность",
      value: profile.dueAmount || "—",
      tone: hasDebt ? "danger" : "success",
    },
    {
      id: "created",
      label: "Создана",
      value: createdAtEntry?.value ?? "—",
    },
  ];

  useEffect(() => {
    if (!actionMessage && !actionError) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setActionMessage(null);
      setActionError(null);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [actionMessage, actionError]);

  async function handleTemplateAction(kind: "reminder" | "requestDocs") {
    const templates: Record<typeof kind, string> = {
      reminder: `Добрый день! Напоминаем, что по сделке ${dealTitle} ожидается действие: ${nextActionLabel}. Дайте знать, если нужна помощь.`,
      requestDocs: `Здравствуйте! Чтобы продолжить сделку ${dealTitle}, загрузите, пожалуйста, недостающие документы в портале или отправьте нам ответным письмом. Список документов: ${workflowTasks
        .filter((task) => task.requiresDocument && !task.attachmentUrl)
        .map((task) => task.guardLabel ?? task.title)
        .join(", ") || "пакет документов"}.\nСпасибо!`,
    };
    const message = templates[kind];
    try {
      await navigator.clipboard.writeText(message);
      setActionMessage("Текст шаблона скопирован в буфер обмена.");
    } catch (error) {
      console.error(error);
      setActionError("Не удалось скопировать шаблон. Скопируйте вручную.");
    }
  }

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
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Номер сделки</p>
                <CardTitle className="text-2xl">{dealTitle}</CardTitle>
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                {clientVehicleLine}
              </CardDescription>
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
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" asChild className="rounded-lg">
                  <Link href={briefHref}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Скачать brief (PDF)
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-border/60 bg-muted sm:h-56">
              <Image
                src={
                  hasVehicleImage && !imageError ? (vehicleImageSrc as string) : "/assets/vehicle-placeholder.svg"
                }
                alt={vehicleImageAlt}
                fill
                className={`object-cover ${hasVehicleImage && !imageError ? "" : "opacity-60"}`}
                sizes="(min-width: 1280px) 22rem, (min-width: 1024px) 18rem, 100vw"
                priority
                onError={() => setImageError(true)}
                onLoad={() => setImageLoading(false)}
              />
              {imageLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          {warnings.length ? (
            <Card className="border border-amber-300/60 bg-amber-50/80 backdrop-blur dark:bg-amber-500/10">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-amber-500" />
                  <CardTitle>Предупреждения</CardTitle>
                </div>
                <Badge variant="warning" className="rounded-lg">
                  {warnings.length}
                </Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {warnings.map((warning) => (
                    <li
                      key={warning.id}
                      className="flex flex-col gap-2 rounded-lg border border-amber-200/60 bg-white/70 px-3 py-2 shadow-sm dark:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-foreground">{warning.text}</span>
                      {warning.href ? (
                        <Button asChild size="sm" variant="outline" className="rounded-lg">
                          <Link href={warning.href}>Открыть</Link>
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

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
                {hasPendingTasks ? (
                  <Badge variant="warning" className="rounded-lg">
                    Требуют внимания
                  </Badge>
                ) : (
                  <Badge variant="success" className="rounded-lg">
                    Всё готово
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DealStageTasks tasks={workflowTasks} />
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="space-y-3 sm:flex sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <CardTitle className="text-left">Автомобиль</CardTitle>
              <Button variant="outline" size="sm" asChild className="rounded-lg">
                <Link href={vehicleHref}>Открыть карточку</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                {filteredKeyInformation.map((item) => {
                  const InfoIcon = getVehicleInfoIcon(item.label);
                  return (
                    <div key={item.label}>
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                        <InfoIcon className="h-4 w-4 text-muted-foreground" /> {item.value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {vehicleChecklist.length ? (
                <div className="rounded-lg border border-border/60 bg-surface-subtle p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Чек-лист инспекций</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {vehicleChecklist.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <Badge variant={item.fulfilled ? "success" : "outline"} className="rounded-lg">
                          {item.fulfilled ? "Готово" : "В работе"}
                        </Badge>
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="space-y-3 sm:flex sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <CardTitle>Финансы</CardTitle>
              <Button variant="outline" size="sm" asChild className="rounded-lg">
                <Link href={statementHref}>Открыть карточку</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-card/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Задолженность</p>
                  <p className={`mt-2 text-2xl font-semibold ${hasDebt ? "text-rose-600" : "text-emerald-600"}`}>
                    {profile.dueAmount}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Следующий платёж</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" /> {profile.nextPayment}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Последний платёж</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {lastPaidInvoice ? `${lastPaidInvoice.totalAmount} · ${lastPaidInvoice.dueDate}` : "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["all", "overdue", "pending", "paid"] as const).map((filterKey) => (
                  <Button
                    key={filterKey}
                    size="sm"
                    variant={invoiceFilter === filterKey ? "default" : "outline"}
                    className="rounded-lg"
                    onClick={() => setInvoiceFilter(filterKey)}
                  >
                    {filterKey === "all"
                      ? "Все"
                      : filterKey === "overdue"
                        ? "Просрочено"
                        : filterKey === "pending"
                          ? "Ожидает"
                          : "Оплачено"}
                    <Badge variant="outline" className="ml-2 rounded-md">
                      {invoiceFilterCounts[filterKey]}
                    </Badge>
                  </Button>
                ))}
              </div>

              {filteredInvoices.length ? (
                <div className="space-y-2">
                  {filteredInvoices.map((invoice) => {
                    const { icon: InvoiceStatusIcon, variant } = getInvoiceStatusMeta(invoice.status);
                    return (
                      <div
                        key={invoice.id}
                        className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.type} · {invoice.dueDate}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{invoice.totalAmount}</span>
                          <Badge variant={variant} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1">
                            <InvoiceStatusIcon className="h-3.5 w-3.5" />
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Инвойсы по выбранному фильтру отсутствуют.</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" asChild className="rounded-lg">
                  <Link href={statementHref}>Скачать Statement of Account</Link>
                </Button>
              </div>
              {paymentSchedule.length ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">График платежей</p>
                  <ul className="space-y-2 text-sm">
                    {paymentSchedule.map((entry, index) => (
                      <li
                        key={`${entry.label}-${index}`}
                        className="rounded-lg border border-border/60 bg-card/60 px-3 py-2"
                      >
                        <p className="font-medium text-foreground">{entry.label}</p>
                        <p className="text-xs text-muted-foreground">{entry.value}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {financials.length ? (
            <Card className="bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle>Финансовые параметры</CardTitle>
                <CardDescription>Полный набор сумм и ставок по сделке</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 md:grid-cols-2">
                  {financials.map((entry, index) => (
                    <div key={`${entry.label}-${index}`}>
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{entry.label}</dt>
                      <dd className="mt-1 text-sm text-foreground">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {contract.length ? (
            <Card className="bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle>Договор</CardTitle>
                <CardDescription>Сроки, даты и статус исполнения</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 md:grid-cols-2">
                  {contract.map((entry, index) => (
                    <div key={`${entry.label}-${index}`}>
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{entry.label}</dt>
                      <dd className="mt-1 text-sm text-foreground">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}

        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="space-y-3 sm:flex sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Клиент</CardTitle>
              </div>
              <Button variant="outline" size="sm" asChild className="rounded-lg">
                <Link href={clientHref}>Открыть карточку</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <dl className="grid gap-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Имя и фамилия</dt>
                  <dd className="mt-1 text-foreground">{client.name}</dd>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Телефон</dt>
                    <dd className="mt-1 flex items-center gap-2 text-foreground">
                      <Phone className="h-4 w-4 text-muted-foreground" /> {client.phone}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</dt>
                    <dd className="mt-1 flex items-center gap-2 text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" /> {client.email || "—"}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Источник</dt>
                  <dd className="mt-1 text-foreground">{clientSourceDisplay}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Скоринг</dt>
                  <dd className="mt-1">
                    <Badge variant="success" className="rounded-lg">
                      {client.scoring}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2">
                {telHref ? (
                  <Button asChild size="sm" className="rounded-lg">
                    <a href={telHref}>Позвонить</a>
                  </Button>
                ) : null}
                {whatsappHref ? (
                  <Button variant="outline" size="sm" asChild className="rounded-lg">
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                      Написать в WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="space-y-3 border-t border-border/50 pt-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Документы компании
                </p>
                <DocumentList
                  documents={companyDocumentItems}
                  emptyMessage="Корпоративные документы ещё не загружены."
                />
              </div>
            </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="space-y-3 sm:flex sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>Документы сделки</CardTitle>
              <CardDescription>Быстрый доступ к последним файлам</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link href={`/ops/deals/${slug}/documents`}>Все документы</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <DocumentList
              documents={dealDocumentItems}
              emptyMessage="Документы сделки ещё не загружены."
            />
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle>Шаблоны коммуникаций</CardTitle>
            <CardDescription>Скопируйте текст и отправьте клиенту</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
              {actionMessage ? (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200">
                  {actionMessage}
                </div>
              ) : null}
              {actionError ? (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-900 dark:text-rose-200">
                  {actionError}
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 rounded-lg"
                onClick={() => handleTemplateAction("reminder")}
              >
                <Send className="h-4 w-4" />
                Отправить напоминание
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 rounded-lg"
                onClick={() => handleTemplateAction("requestDocs")}
              >
                <MessageCircle className="h-4 w-4" />
                Запросить документы
              </Button>
              <p className="text-xs text-muted-foreground">
                Шаблон копируется в буфер обмена. Вставьте его в письмо, чат или CRM.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur" id="timeline">
            <CardHeader>
              <CardTitle>Хронология</CardTitle>
            </CardHeader>
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
          </Card>

        </aside>
      </div>
    </div>
  );
}
