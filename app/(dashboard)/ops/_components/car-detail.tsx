"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  OpsTone,
  OpsVehicleActiveDeal,
  OpsVehicleDeal,
  OpsVehicleData,
  OpsVehicleDocument,
  OpsVehicleProfile,
  OpsVehicleServiceLogEntry,
} from "@/lib/supabase/queries/operations";
import { CarEditDialog } from "./car-edit-dialog";
import { DocumentList } from "./document-list";
import { VehicleGallery } from "./vehicle-gallery";

type InfoCellProps = {
  label: string;
  children: ReactNode;
};

function InfoCell({ label, children }: InfoCellProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

type CarDetailProps = {
  slug: string;
  activeDeal: OpsVehicleActiveDeal | null;
  deals: OpsVehicleDeal[];
  vehicle: OpsVehicleData;
  profile: OpsVehicleProfile;
  documents: OpsVehicleDocument[];
  serviceLog: OpsVehicleServiceLogEntry[];
};

export function CarDetailView({ slug, deals, vehicle, profile, documents, serviceLog }: CarDetailProps) {
  const VEHICLE_PLACEHOLDER_PATH = "/assets/vehicle-placeholder.svg";
  const toneClassMap: Record<OpsTone, string> = {
    success: "border-emerald-400/80 bg-emerald-500/10 text-emerald-700",
    warning: "border-amber-400/80 bg-amber-500/10 text-amber-700",
    info: "border-sky-400/80 bg-sky-500/10 text-sky-700",
    danger: "border-rose-400/80 bg-rose-500/10 text-rose-700",
    muted: "border-border bg-background/60 text-muted-foreground",
  };

  const resolveToneClass = (tone?: OpsTone | null) => {
    if (!tone) {
      return toneClassMap.muted;
    }
    return toneClassMap[tone] ?? toneClassMap.muted;
  };

  const specGroups = profile.specGroups ?? [];
  const primaryInfoGroup = specGroups.find((group) => group.title === "Основная информация") ?? null;
  const secondarySpecGroups = specGroups.filter(
    (group) => group.title !== "Учёт" && group.title !== "Основная информация",
  );
  const excludedPrimaryLabels = new Set(["Статус", "Тип кузова"]);
  const primarySpecsRaw = primaryInfoGroup?.specs?.filter((spec) => !excludedPrimaryLabels.has(spec.label)) ?? [];
  const specOrder = [
    "Марка",
    "Модель",
    "Комплектация",
    "Год выпуска",
    "VIN",
    "Госномер",
    "Пробег",
    "Тип топлива",
    "Трансмиссия",
    "Цвет кузова",
    "Цвет салона",
    "Объём двигателя",
  ];
  const primarySpecs = [...primarySpecsRaw].sort((a, b) => {
    const indexA = specOrder.indexOf(a.label);
    const indexB = specOrder.indexOf(b.label);
    if (indexA === -1 && indexB === -1) {
      return a.label.localeCompare(b.label, "ru");
    }
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  const primarySpecLabels = new Set(primarySpecs.map((spec) => spec.label));
  const highlightItems = (profile.highlights ?? []).filter((item) => !primarySpecLabels.has(item.label));
  const hasPrimaryDetails = primarySpecs.length > 0;
  const vehicleYearLabel = vehicle.year != null ? String(vehicle.year) : null;
  const resolvedSubtitle = (() => {
    if (!profile.subtitle) {
      return "";
    }
    const rawParts = profile.subtitle.split("•").map((part) => part.trim()).filter(Boolean);
    const filtered = rawParts.filter((part) => {
      if (vehicleYearLabel && part === vehicleYearLabel) {
        return false;
      }
      if (vehicle.bodyType && part.toLowerCase() === vehicle.bodyType.toLowerCase()) {
        return false;
      }
      return true;
    });
    return filtered.join(" • ");
  })();

  const fallbackImage =
    typeof profile.image === "string" &&
    profile.image.length > 0 &&
    profile.image !== VEHICLE_PLACEHOLDER_PATH
      ? profile.image
      : null;

  const vehicleDocumentItems = useMemo(
    () =>
      documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        uploadedAt: doc.uploadedAt ?? doc.date ?? null,
        url: doc.url ?? null,
      })),
    [documents],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
          <Link href="/ops/cars">← Назад к каталогу</Link>
        </Button>
        <CarEditDialog vehicle={vehicle} slug={slug} documents={documents} gallery={profile.gallery} />
      </div>

      <Card className="border border-border/60 bg-card/70 backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
                {profile.heading}
                {vehicleYearLabel ? `, ${vehicleYearLabel}` : ""}
              </CardTitle>
              {resolvedSubtitle ? <CardDescription>{resolvedSubtitle}</CardDescription> : null}
            </div>
            {profile.status ? (
              <Badge
                variant="outline"
                className={`rounded-lg border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${resolveToneClass(profile.status.tone)}`}
              >
                {profile.status.label}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {highlightItems.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {highlightItems.map((item) => (
                <div key={item.label} className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">{item.value}</p>
                  {item.hint ? <p className="text-xs text-muted-foreground">{item.hint}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          {hasPrimaryDetails ? (
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {primarySpecs.map((spec) => (
                  <InfoCell key={`primary-${spec.label}`} label={spec.label}>
                    {spec.value}
                  </InfoCell>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle>Фото</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleGallery images={profile.gallery ?? []} fallbackImageSrc={fallbackImage} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {secondarySpecGroups.map((group) => (
          <Card key={group.title} className="bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{group.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                {group.specs
                  .filter((spec) => spec.label !== "Статус")
                  .map((spec) => (
                    <div key={`${group.title}-${spec.label}`} className="rounded-lg border border-border/60 bg-background/50 p-3">
                      <dt className="text-xs font-medium text-muted-foreground">{spec.label}</dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">{spec.value}</dd>
                    </div>
                  ))}
              </dl>
            </CardContent>
          </Card>
        ))}

        {profile.features?.length ? (
          <Card className="bg-card/60 backdrop-blur xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Особенности</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-foreground">
                {profile.features.map((feature, index) => (
                  <li key={`${feature}-${index}`} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-foreground/60" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Сделки</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Сделки не найдены.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сделка</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Платёж/мес</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Следующий платёж</TableHead>
                    <TableHead>Просрочка</TableHead>
                    <TableHead>Менеджер</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="min-w-[160px] font-medium text-foreground">
                        {deal.href ? (
                          <Link href={deal.href} className="underline-offset-2 hover:underline">
                            {deal.dealNumber}
                          </Link>
                        ) : (
                          deal.dealNumber
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {deal.contractPeriod
                            ?? (deal.termLabel ? `Срок: ${deal.termLabel}` : "—")}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        {deal.clientName ? (
                          deal.clientHref ? (
                            <Link
                              href={deal.clientHref}
                              className="text-foreground underline-offset-2 hover:underline"
                            >
                              {deal.clientName}
                            </Link>
                          ) : (
                            <span className="text-foreground">{deal.clientName}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {deal.clientPhone ? (
                          <p className="text-xs text-muted-foreground">{deal.clientPhone}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-lg border px-3 py-1 text-xs font-semibold ${resolveToneClass(deal.statusTone)}`}
                        >
                          {deal.statusLabel ?? deal.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{deal.monthlyPayment ?? "—"}</TableCell>
                      <TableCell>{deal.totalAmount ?? deal.principalAmount ?? "—"}</TableCell>
                      <TableCell>{deal.nextPaymentDue ?? deal.firstPaymentDate ?? "—"}</TableCell>
                      <TableCell>{deal.overdueAmount ?? "—"}</TableCell>
                      <TableCell>{deal.managerName ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Документы</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <DocumentList
            documents={vehicleDocumentItems}
            emptyMessage="Документы по автомобилю ещё не загружены."
          />
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>История операций</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {serviceLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Сервисных записей пока нет.</p>
          ) : (
            serviceLog.map((entry) => (
              <div
                key={entry.id}
                className="relative border-l border-border bg-background/60 pl-6 pr-4 pt-3 pb-4 text-sm text-foreground"
              >
                <span className="absolute -left-[7px] top-4 block h-3 w-3 rounded-full border border-border bg-background" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{entry.timelineDate}</span>
                  <Badge variant="outline" className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveToneClass(entry.statusTone)}`}>
                    {entry.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{entry.title}</p>
                {entry.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                ) : null}
                {entry.meta?.length ? (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {entry.meta.map((item, index) => (
                      <li key={`${entry.id}-meta-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {entry.attachments?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.attachments.map((attachment, index) => (
                      attachment.url ? (
                        <Button
                          key={`${entry.id}-attachment-${index}`}
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                        >
                          <Link href={attachment.url} target="_blank" rel="noopener noreferrer">
                            {attachment.label}
                          </Link>
                        </Button>
                      ) : (
                        <Badge
                          key={`${entry.id}-attachment-${index}`}
                          variant="outline"
                          className="rounded-lg text-muted-foreground"
                        >
                          {attachment.label}
                        </Badge>
                      )
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
