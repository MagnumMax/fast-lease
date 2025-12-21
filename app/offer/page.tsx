"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { AlertTriangle, Car, Link2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ResidencyStatus } from "@/lib/data/application";
import { getAllCars, getCarById } from "@/lib/data/cars";
import { pricingPlans } from "@/lib/data/pricing";
import { cn } from "@/lib/utils";

import { useApplicationForm } from "@/app/(public)/apply/_components/application-form-context";

const cars = getAllCars();

const mileageOptions = [
  "До 10 000 км в год",
  "До 20 000 км в год",
  "До 30 000 км в год",
  "Более 30 000 км в год",
];

const usageOptions = [
  { value: "personal", label: "Личные поездки" },
  { value: "business", label: "Бизнес / служебный" },
  { value: "mixed", label: "Смешанный" },
];

function OfferConfigurationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, updateDraft, setResidencyStatus, isHydrated } =
    useApplicationForm();
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => pricingPlans.find((plan) => plan.id === draft.planId),
    [draft.planId],
  );

  const selectedCar = useMemo(
    () => (draft.selectedCarId ? getCarById(draft.selectedCarId) : undefined),
    [draft.selectedCarId],
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (!searchParams) return;

    const vehicleCode = searchParams.get("auto") ?? undefined;
    const referralCode = searchParams.get("ref") ?? undefined;
    const planCode = searchParams.get("plan") ?? undefined;

    if (!vehicleCode && !referralCode && !planCode) return;

    updateDraft((prev) => {
      const next = { ...prev };
      if (vehicleCode) {
        next.source = {
          ...next.source,
          vehicleCode,
        };
        if (getCarById(vehicleCode)) {
          next.selectedCarId = vehicleCode;
        }
      }
      if (referralCode) {
        next.source = {
          ...next.source,
          referralCode,
        };
      }
      if (planCode && pricingPlans.some((plan) => plan.id === planCode)) {
        next.planId = planCode;
      }
      return next;
    });
  }, [isHydrated, searchParams, updateDraft]);

  if (!isHydrated) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-linear">
        <div className="h-10 animate-pulse rounded-xl bg-surface-subtle" />
      </div>
    );
  }

  const handleNext = () => {
    if (!draft.selectedCarId) {
      setError("Выберите автомобиль для продолжения.");
      return;
    }
    if (!draft.planId) {
      setError("Выберите тарифную программу.");
      return;
    }

    const params = new URLSearchParams();
    if (draft.selectedCarId) params.set("auto", draft.selectedCarId);
    if (draft.planId) params.set("plan", draft.planId);
    if (draft.source.referralCode) params.set("ref", draft.source.referralCode);

    const target = `/apply/start${params.size ? `?${params.toString()}` : ""}`;
    router.push(target);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 py-10">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-linear lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Подготовка предложения
            </span>
            <h1 className="text-2xl font-semibold text-foreground">
              Выберите автомобиль и условия лизинга
            </h1>
            <p className="text-sm text-muted-foreground">
              После подтверждения мы перенаправим вас на форму заявки. В полученном
              письме или ссылке параметры `auto` и `ref` автоматически сохранятся.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
            <Sparkles className="mr-2 inline h-4 w-4 align-middle text-brand-600" />
            Избранные настройки сохраняются на этом устройстве и подставятся в заявке.
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[min(360px,100%)_auto]">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Выбор резидентства</h3>
            <div className="grid gap-3">
              {(
                [
                  { value: "resident", label: "Я резидент ОАЭ" },
                  { value: "nonresident", label: "Я нерезидент / в процессе" },
                ] as Array<{ value: ResidencyStatus; label: string }>
              ).map((option) => {
                const active = draft.residencyStatus === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setResidencyStatus(option.value)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-linear"
                        : "border-border bg-card text-muted-foreground hover:border-brand-500",
                    )}
                  >
                    <span>{option.label}</span>
                    {active ? (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                        Выбрано
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <Label htmlFor="referral-code">Партнёрский код (опционально)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <Input
                  id="referral-code"
                  placeholder="Например, AFF-4832"
                  value={draft.source.referralCode ?? ""}
                  onChange={(event) =>
                    updateDraft((prev) => ({
                      ...prev,
                      source: {
                        ...prev.source,
                        referralCode: event.target.value || undefined,
                      },
                    }))
                  }
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Этот код появится в ссылке `/apply/start?ref=...` для трекинга партнёров.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Автомобиль</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {cars.map((car) => {
                  const active = draft.selectedCarId === car.id;
                  return (
                    <button
                      type="button"
                      key={car.id}
                      onClick={() =>
                        updateDraft((prev) => ({
                          ...prev,
                          selectedCarId: car.id,
                          source: {
                            ...prev.source,
                            vehicleCode: car.id,
                          },
                        }))
                      }
                      className={cn(
                        "group overflow-hidden rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                        active
                          ? "border-slate-900 shadow-linear"
                          : "border-border hover:border-brand-500",
                      )}
                    >
                      <div className="relative h-40 w-full">
                        <Image
                          src={car.heroImage}
                          alt={car.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute left-3 top-3 flex gap-2">
                          {car.badges.slice(0, 2).map((badge) => (
                            <span
                              key={badge}
                              className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-slate-700"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 text-sm">
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-foreground">{car.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {car.metrics.range} · {car.metrics.acceleration}
                          </span>
                        </div>
                        <Car className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Тарифная программа</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {pricingPlans.map((plan) => {
                  const active = draft.planId === plan.id;
                  return (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() =>
                        updateDraft((prev) => ({
                          ...prev,
                          planId: plan.id,
                        }))
                      }
                      className={cn(
                        "flex flex-col gap-2 rounded-2xl border px-4 py-3 text-left text-sm transition",
                        active
                          ? "border-slate-900 bg-slate-900 text-white shadow-linear"
                          : "border-border bg-card text-muted-foreground hover:border-brand-500",
                      )}
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {plan.name}
                      </span>
                      <span className="text-xs uppercase tracking-[0.3em]">
                        {plan.termMonths} мес · {plan.firstPaymentPercent}% первый взнос
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(plan.priceAED)} / мес
                      </span>
                      <span className="text-xs leading-snug text-muted-foreground">
                        {plan.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[min(360px,100%)_auto]">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Финансовые предпочтения</h3>
          <div className="space-y-2">
            <Label htmlFor="monthly-budget">Желаемый ежемесячный платеж</Label>
            <Input
              id="monthly-budget"
              type="range"
              min={1500}
              max={7000}
              step={250}
              value={draft.preferences.monthlyBudget}
              onChange={(event) =>
                updateDraft((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    monthlyBudget: Number(event.target.value),
                  },
                }))
              }
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>AED 1 500</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(draft.preferences.monthlyBudget)}
              </span>
              <span>AED 7 000</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Цель использования</Label>
            <RadioGroup
              value={draft.preferences.usagePurpose}
              onValueChange={(value) =>
                updateDraft((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    usagePurpose: value as typeof prev.preferences.usagePurpose,
                  },
                }))
              }
              className="grid gap-2"
            >
              {usageOptions.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`usage-${option.value}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground",
                    draft.preferences.usagePurpose === option.value && "border-brand-500 bg-surface-subtle text-foreground",
                  )}
                >
                  <RadioGroupItem id={`usage-${option.value}`} value={option.value} className="sr-only" />
                  <span>{option.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">Планируемый пробег</Label>
            <Select
              value={draft.preferences.mileage}
              onValueChange={(value) =>
                updateDraft((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    mileage: value,
                  },
                }))
              }
            >
              <SelectTrigger id="mileage" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mileageOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Дополнительные комментарии</Label>
            <Textarea
              id="notes"
              placeholder="Например, предпочитаемый цвет, требования к салону, гибкие условия..."
              value={draft.preferences.notes}
              onChange={(event) =>
                updateDraft((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    notes: event.target.value,
                  },
                }))
              }
              className="min-h-[120px] rounded-xl"
            />
          </div>

          {error ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" className="rounded-xl border-border" onClick={() => router.push("/")}>
              В каталог
            </Button>
            <Button type="button" className="rounded-xl" onClick={handleNext}>
              Перейти к заявке
            </Button>
          </div>
        </div>
      </section>

      {selectedCar || selectedPlan ? (
        <section className="rounded-3xl border border-dashed border-border bg-surface-subtle px-6 py-5 shadow-linear">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Выбор сохранён</span>
            {selectedCar ? (
              <span className="font-semibold text-foreground">{selectedCar.name}</span>
            ) : (
              <span>Автомобиль не выбран</span>
            )}
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Тариф</span>
            <span className="font-semibold text-foreground">{selectedPlan?.name ?? "—"}</span>
            {draft.source.referralCode ? (
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Реферал · {draft.source.referralCode}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function OfferPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 py-10">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-linear">
          <div className="h-10 animate-pulse rounded-xl bg-surface-subtle" />
        </div>
      </div>
    }>
      <OfferConfigurationPage />
    </Suspense>
  );
}
