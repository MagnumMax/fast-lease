"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  OpsTone,
  OpsVehicleActiveDeal,
  OpsVehicleData,
  OpsVehicleDocument,
  OpsVehicleProfile,
  OpsVehicleServiceLogEntry,
} from "@/lib/supabase/queries/operations";
import { CarEditDialog } from "./car-edit-dialog";

type CarDetailProps = {
  slug: string;
  activeDeal: OpsVehicleActiveDeal | null;
  vehicle: OpsVehicleData;
  profile: OpsVehicleProfile;
  documents: OpsVehicleDocument[];
  serviceLog: OpsVehicleServiceLogEntry[];
};

export function CarDetailView({ slug, activeDeal, vehicle, profile, documents, serviceLog }: CarDetailProps) {
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

  const gallery = useMemo(() => profile.gallery ?? [], [profile.gallery]);
  const defaultImageId = useMemo(() => {
    return gallery.find((image) => image.isPrimary)?.id ?? gallery[0]?.id ?? null;
  }, [gallery]);

  const [activeImageId, setActiveImageId] = useState<string | null>(defaultImageId);

  const activeImageUrl = useMemo(() => {
    if (activeImageId) {
      const found = gallery.find((image) => image.id === activeImageId);
      if (found?.url) {
        return found.url;
      }
    }
    return profile.image;
  }, [activeImageId, gallery, profile.image]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
          <Link href="/ops/cars">← Назад к каталогу</Link>
        </Button>
        <CarEditDialog vehicle={vehicle} slug={slug} />
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardDescription>Автомобиль</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">{profile.heading}</CardTitle>
              <p className="text-sm text-muted-foreground">{profile.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {profile.status ? (
                <Badge
                  variant="outline"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${resolveToneClass(profile.status.tone)}`}
                >
                  {profile.status.label}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface-subtle">
                <Image
                  src={activeImageUrl || "/assets/vehicle-placeholder.svg"}
                  alt={profile.heading}
                  width={960}
                  height={540}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              {gallery.length > 1 ? (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {gallery.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setActiveImageId(image.id)}
                      className={`relative flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 ${
                        activeImageId === image.id ? "border-primary shadow" : "border-border hover:border-foreground/40"
                      }`}
                    >
                      {image.url ? (
                        <Image src={image.url} alt={image.label ?? profile.heading} width={160} height={100} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Нет изображения</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-4">
              {profile.highlights?.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.highlights.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border bg-background/80 p-4 shadow-sm"
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">{item.value}</p>
                      {item.hint ? <p className="text-xs text-muted-foreground">{item.hint}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Краткая сводка
                </p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>Последнее обновление профиля: <span className="text-foreground">{profile.specGroups.find((group) => group.title === "Учёт")?.specs.find((spec) => spec.label === "Обновлено")?.value ?? "—"}</span></li>
                  {profile.features?.length ? (
                    <li>
                      Особенности: <span className="text-foreground">{profile.features.slice(0, 2).join(", ")}{profile.features.length > 2 ? "…" : ""}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeDeal ? (
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardDescription>Текущая сделка</CardDescription>
              <CardTitle>{activeDeal.number ?? "Без номера"}</CardTitle>
            </div>
            {activeDeal.statusLabel ? (
              <Badge
                variant="outline"
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${resolveToneClass(activeDeal.statusTone ?? undefined)}`}
              >
                {activeDeal.statusLabel}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <dl className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 whitespace-nowrap text-foreground">
                <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Платёж</dt>
                <dd className="text-sm font-semibold text-foreground">
                  {activeDeal.monthlyLeaseRate ?? activeDeal.monthlyPayment ?? "—"}
                </dd>
              </div>
              {activeDeal.monthlyLeaseRate && activeDeal.monthlyPayment && activeDeal.monthlyLeaseRate !== activeDeal.monthlyPayment ? (
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <dt className="text-xs uppercase tracking-[0.2em]">Оплата</dt>
                  <dd className="text-sm font-medium text-foreground">{activeDeal.monthlyPayment}</dd>
                </div>
              ) : null}
              {activeDeal.status ? (
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <dt className="text-xs uppercase tracking-[0.2em]">Статус</dt>
                  <dd className="text-sm text-foreground">{activeDeal.status}</dd>
                </div>
              ) : null}
            </dl>
            {activeDeal.href ? (
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link href={activeDeal.href}>Открыть сделку</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {profile.specGroups.map((group) => (
          <Card key={group.title} className="bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{group.title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Подробности из Supabase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                {group.specs.map((spec) => (
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
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Особенности</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Из поля features в Supabase
              </CardDescription>
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
            <CardDescription>Документы</CardDescription>
            <CardTitle>Флит‑архив</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Из таблицы deal_documents</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Документы по автомобилю ещё не загружены.</p>
          ) : (
            documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{document.title}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {document.type ? <span>Тип: {document.type}</span> : null}
                    {document.date ? <span>{document.date}</span> : null}
                    {document.dealNumber ? <span>Сделка: {document.dealNumber}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveToneClass(document.statusTone)}`}>
                    {document.status}
                  </Badge>
                  {document.url ? (
                    <Button asChild size="sm" variant="outline" className="rounded-lg">
                      <Link href={document.url} target="_blank" rel="noopener noreferrer">
                        Скачать
                      </Link>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="rounded-lg text-muted-foreground">
                      Нет файла
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardDescription>Обслуживание</CardDescription>
              <CardTitle>История операций</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Из таблицы vehicle_services</p>
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
