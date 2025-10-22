"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OPS_WORKFLOW_STATUS_MAP } from "@/lib/supabase/queries/operations";
import type { OpsDealDetail } from "@/lib/supabase/queries/operations";
import { DealGuardTasks } from "@/app/(dashboard)/ops/_components/deal-guard-tasks";
import { WorkflowProgress } from "@/app/(dashboard)/ops/_components/workflow-progress";

type DealDetailProps = {
  detail: OpsDealDetail;
};

function SummaryBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
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

function parseDateFromString(value: string): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  const dotMatch = trimmed.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoMatch = trimmed.match(/\b\d{4}-\d{2}-\d{2}T?\d{0,2}:?\d{0,2}:?\d{0,2}?\b/);
  if (isoMatch) {
    const parsed = new Date(isoMatch[0]);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const textMatch = trimmed.match(/\b\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}\b/);
  if (textMatch) {
    const parsed = new Date(textMatch[0]);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function extractDocumentAddedDate(status: string): string | null {
  if (!status) return null;

  const segments = status.split("·").map((segment) => segment.trim()).reverse();

  for (const segment of segments) {
    const segmentWithoutKeywords = segment.replace(/updated|added|uploaded|version/gi, "").trim();
    const parsed = parseDateFromString(segmentWithoutKeywords);
    if (parsed) {
      return parsed.toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  const fallbackParsed = parseDateFromString(status);
  if (fallbackParsed) {
    return fallbackParsed.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return null;
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

export function DealDetailView({ detail }: DealDetailProps) {
  const {
    profile,
    client,
    keyInformation,
    overview,
    documents,
    invoices,
    timeline,
    guardStatuses,
    dealUuid,
    statusKey,
    slug,
  } = detail;

  const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey];
  const hasPendingGuards = guardStatuses.some((guard) => !guard.fulfilled);
  const dealTitle = slug.startsWith("deal-")
    ? `Deal-${slug.slice("deal-".length)}`
    : profile.dealId ?? slug;
  const clientHref = client.name ? `/ops/clients/${slugifyRouteSegment(client.name)}` : "/ops/clients";
  const vehicleHref = profile.vehicleName
    ? `/ops/cars/${slugifyRouteSegment(profile.vehicleName)}`
    : "/ops/cars";
  const normalizedPhone = client.phone?.replace(/[^+\d]/g, "") ?? "";
  const telHref = normalizedPhone ? `tel:${normalizedPhone}` : null;
  const whatsappHref = normalizedPhone ? `https://wa.me/${normalizedPhone.replace(/^\+/, "")}` : null;
  const sourceEntry = overview.find((item) => item.label.toLowerCase() === "source");
  const createdAtEntry = overview.find((item) => item.label.toLowerCase() === "created at");
  const filteredKeyInformation = keyInformation.filter(
    (item) => item.label.toLowerCase() !== "odoo card",
  );
  const statementHref = `/ops/deals/${slug}/statement`;
  const overdueInvoices = invoices.filter((invoice) =>
    invoice.status.toLowerCase().includes("overdue"),
  );
  const pendingInvoices = invoices.filter((invoice) =>
    !invoice.status.toLowerCase().includes("overdue") &&
    invoice.status.toLowerCase().includes("pending"),
  );
  const completedInvoices = invoices.length - overdueInvoices.length - pendingInvoices.length;
  const vehicleImageSrc = profile.image?.trim();
  const hasVehicleImage = Boolean(vehicleImageSrc && vehicleImageSrc.length > 0);
  const vehicleImageAlt = profile.vehicleName || "Изображение автомобиля";
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
          <Link href="/ops/deals">← Назад к сделкам</Link>
        </Button>
        <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs uppercase tracking-[0.2em]">
          {statusMeta?.title ?? "Статус не определён"}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="gap-6">
              <div className="grid gap-4 lg:grid-cols-[1fr,minmax(200px,260px)] lg:items-start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{dealTitle}</CardTitle>
                    <CardDescription className="text-base text-foreground">
                      {profile.vehicleName}
                    </CardDescription>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SummaryBlock label="Источник" value={sourceEntry?.value ?? "—"} />
                    <SummaryBlock label="Создана" value={createdAtEntry?.value ?? "—"} />
                  </div>
                </div>
                {hasVehicleImage && !imageError ? (
                  <div className="relative h-40 w-full overflow-hidden rounded-xl bg-muted sm:h-48">
                    <Image
                      src={vehicleImageSrc}
                      alt={vehicleImageAlt}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 16rem, 100vw"
                      priority
                      onError={() => setImageError(true)}
                      onLoad={() => setImageLoading(false)}
                    />
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative h-40 w-full overflow-hidden rounded-xl bg-muted sm:h-48">
                    <Image
                      src="/assets/vehicle-placeholder.svg"
                      alt="Изображение автомобиля недоступно"
                      fill
                      className="object-cover opacity-50"
                      sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 16rem, 100vw"
                      priority
                    />
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          <Card
            className={`bg-card/60 backdrop-blur ${hasPendingGuards ? "border border-amber-400/40 shadow-[0_0_30px_-20px_rgba(246,191,38,0.8)]" : ""}`}
            id="tasks"
          >
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Задачи</CardTitle>
                {hasPendingGuards ? null : (
                  <Badge variant="success" className="rounded-lg">
                    Всё готово
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DealGuardTasks
                dealId={dealUuid}
                statusKey={statusKey}
                guardStatuses={guardStatuses}
                slug={slug}
              />
            </CardContent>
          </Card>

          <WorkflowProgress currentStatus={statusKey} />

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle>Финансы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Ежемесячный платёж
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{profile.monthlyPayment}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Следующий платёж
                  </dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" /> {profile.nextPayment}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Задолженность
                  </dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className={overdueInvoices.length > 0 ? "font-semibold text-amber-600" : ""}>
                      {profile.dueAmount}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2">
                <Badge variant={overdueInvoices.length ? "danger" : "outline"} className="rounded-lg">
                  Просрочек: {overdueInvoices.length}
                </Badge>
                <Badge variant={pendingInvoices.length ? "warning" : "outline"} className="rounded-lg">
                  Ожидает оплаты: {pendingInvoices.length}
                </Badge>
                <Badge variant="success" className="rounded-lg">
                  Оплачено: {Math.max(0, completedInvoices)}
                </Badge>
              </div>

              {invoices.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Инвойс</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Срок</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => {
                        const { icon: InvoiceStatusIcon, variant } = getInvoiceStatusMeta(
                          invoice.status,
                        );

                        return (
                          <TableRow key={invoice.id}>
                            <TableCell>{invoice.invoiceNumber}</TableCell>
                            <TableCell>{invoice.type}</TableCell>
                            <TableCell>{invoice.totalAmount}</TableCell>
                            <TableCell>{invoice.dueDate}</TableCell>
                            <TableCell>
                              <Badge
                                variant={variant}
                                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
                              >
                                <InvoiceStatusIcon className="h-3.5 w-3.5" />
                                {invoice.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
              <div>
                <Button variant="outline" size="sm" asChild className="rounded-lg">
                  <Link href={statementHref}>Скачать Statement of Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur" id="documents">
            <CardHeader>
              <CardTitle>Документы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ul className="divide-y divide-border/60">
                {documents.map((doc) => {
                  const addedDate = extractDocumentAddedDate(doc.status);

                  return (
                    <li
                      key={doc.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.title}</p>
                        {addedDate ? (
                          <p className="text-xs text-muted-foreground">{addedDate}</p>
                        ) : null}
                      </div>
                      <Button type="button" variant="outline" size="sm" className="rounded-lg">
                        Открыть
                      </Button>
                    </li>
                  );
                })}
              </ul>
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
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="space-y-3 sm:flex sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Автомобиль</CardTitle>
              </div>
              <Button variant="outline" size="sm" asChild className="rounded-lg">
                <Link href={vehicleHref}>Открыть карточку</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm font-semibold text-foreground">{profile.vehicleName}</p>
              <dl className="grid gap-3">
                {filteredKeyInformation.map((item) => {
                  const InfoIcon = getVehicleInfoIcon(item.label);

                  return (
                    <div key={item.label}>
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {item.label}
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                        <InfoIcon className="h-4 w-4 text-muted-foreground" /> {item.value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur" id="timeline">
            <CardHeader>
              <CardTitle>Хронология</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
                  {timeline.map((event) => (
                    <li key={event.id} className="space-y-1">
                      <p className="font-medium">{event.text}</p>
                      <p className="text-xs text-muted-foreground">{event.timestamp}</p>
                    </li>
                  ))}
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
