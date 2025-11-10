"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  BellRing,
  CalendarDays,
  CalendarRange,
  Download,
  FileText,
  Gauge,
  Hash,
  Mail,
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
import { VehicleGallery } from "./vehicle-gallery";
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
    documents,
    sellerDocuments,
    invoices,
    timeline,
    workflowTasks,
    guardStatuses,
    slug,
    insurance,
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
  const briefHref = `/ops/deals/${slug}/brief.pdf`;
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
  const insuranceEntries = [
    { label: "Провайдер", value: insurance?.provider ?? "—" },
    { label: "Номер полиса", value: insurance?.policyNumber ?? "—" },
    { label: "Тип покрытия", value: insurance?.policyType ?? "—" },
    { label: "Премия", value: insurance?.premiumAmount ?? "—" },
    {
      label: "Частота платежей",
      value: insurance?.paymentFrequencyLabel ?? insurance?.paymentFrequency ?? "—",
    },
    { label: "Следующий платёж", value: insurance?.nextPaymentDueLabel ?? "—" },
    { label: "Период действия", value: insurance?.coveragePeriodLabel ?? "—" },
    { label: "Франшиза", value: insurance?.deductible ?? "—" },
    {
      label: "Статус последнего платежа",
      value: insurance?.lastPaymentStatusLabel ?? insurance?.lastPaymentStatus ?? "—",
    },
    { label: "Последний платёж", value: insurance?.lastPaymentDateLabel ?? "—" },
  ];
  const hasInsuranceData = insuranceEntries.some((entry) => entry.value && entry.value !== "—");
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
  const sellerDocumentsPreview = useMemo(() => sellerDocuments.slice(0, 5), [sellerDocuments]);
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
        status: doc.status,
      })),
    [dealDocumentsPreview],
  );
  const sellerDocumentItems = useMemo(
    () =>
      sellerDocumentsPreview.map((doc) => ({
        id: doc.id,
        title: doc.title,
        uploadedAt: doc.uploadedAt,
        url: doc.url ?? null,
        status: doc.status,
      })),
    [sellerDocumentsPreview],
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
  const contractTermEntry = contract.find((item) => item.label.toLowerCase().includes("term"));
  const contractStartEntry = contract.find((item) => item.label.toLowerCase().includes("contract start"));
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
  const nextPaymentDisplay = profile.nextPayment?.trim() ?? "";
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
      id: "term",
      label: "Term (months)",
      value: contractTermEntry?.value ?? "—",
    },
    {
      id: "contract-start",
      label: "Contract start",
      value: contractStartEntry?.value ?? "—",
    },
    {
      id: "next-payment",
      label: "Следующий платёж",
      value: nextPaymentDisplay.length > 0 ? nextPaymentDisplay : "—",
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
            <div className="space-y-2">
              <VehicleGallery
                images={galleryPreview}
                fallbackImageSrc={galleryFallbackImage ?? undefined}
                emptyMessage="Фото автомобиля пока недоступны."
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
          {financials.length ? (
            <Card className="bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle>Финансовые параметры</CardTitle>
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

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle>Страховка</CardTitle>
              {insurance?.policyNumber ? (
                <CardDescription>Полис {insurance.policyNumber}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {hasInsuranceData ? (
                <dl className="grid gap-3 md:grid-cols-2">
                  {insuranceEntries.map((entry) => (
                    <div key={entry.label}>
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{entry.label}</dt>
                      <dd className="mt-1 text-sm text-foreground">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Данные по страховке ещё не заполнены.</p>
              )}
            </CardContent>
          </Card>

          {contract.length ? (
            <Card className="bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle>Договор</CardTitle>
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

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="space-y-3 sm:flex sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Документы сделки</CardTitle>
              </div>
              <Button variant="outline" size="sm" asChild className="rounded-lg">
                <Link href={`/ops/deals/${slug}/documents`}>Все документы</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <DocumentList
                documents={dealDocumentItems}
                emptyMessage="Документы сделки ещё не загружены."
                showUploadOnly
              />
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle>Документы продавца автомобиля</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentList
                documents={sellerDocumentItems}
                emptyMessage="Документы продавца пока не добавлены."
              />
            </CardContent>
          </Card>

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
