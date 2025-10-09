"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Car, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResidencyStatus } from "@/lib/data/application";
import { getAllCars } from "@/lib/data/cars";
import { pricingPlans } from "@/lib/data/pricing";
import { cn } from "@/lib/utils";

import {
  useApplicationForm,
} from "../_components/application-form-context";
import { ensureApplicationDraftAction } from "../actions";

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

export default function ApplicationStartPage() {
  const router = useRouter();
  const { draft, updateDraft, setResidencyStatus, isHydrated } =
    useApplicationForm();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const selectedPlan = useMemo(
    () => pricingPlans.find((plan) => plan.id === draft.planId),
    [draft.planId],
  );

  const selectedCar = useMemo(
    () => cars.find((car) => car.id === draft.selectedCarId),
    [draft.selectedCarId],
  );

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
    if (!draft.consents.creditCheck || !draft.consents.terms) {
      setError("Необходимо согласиться с условиями и проверкой кредитной истории.");
      return;
    }
    setError(null);

    startSaving(async () => {
      try {
        const result = await ensureApplicationDraftAction({
          applicationId: draft.applicationId,
          residencyStatus: draft.residencyStatus,
          selectedCarId: draft.selectedCarId,
          planId: draft.planId,
          preferences: draft.preferences,
          personal: draft.personal,
        });

        updateDraft((prev) => ({
          ...prev,
          applicationId: result.applicationId,
          applicationNumber: result.applicationNumber,
        }));

        router.push("/apply/profile");
      } catch (actionError) {
        const message =
          actionError instanceof Error
            ? actionError.message
            : "Не удалось сохранить черновик заявки.";
        setError(message);
      }
    });
  };

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-linear lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Шаг 1 · Предпочтения
            </span>
            <h2 className="text-2xl font-semibold text-foreground">
              Выберите автомобиль и условия
            </h2>
            <p className="text-sm text-muted-foreground">
              Мы подготовим предложение под выбранный автомобиль, тариф и ваши
              условия использования. Вы сможете изменить выбор на следующих
              шагах.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
            <Sparkles className="mr-2 inline h-4 w-4 align-middle text-brand-600" />
            Вы можете продолжить заполнение позже — черновик сохранится в этом
            браузере.
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[min(360px,100%)_auto]">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Выбор резидентства
            </h3>
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
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Автомобиль из каталога
              </h3>
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
                          <span className="font-semibold text-foreground">
                            {car.name}
                          </span>
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
              <h3 className="text-sm font-semibold text-foreground">
                Тарифная программа
              </h3>
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
                        {plan.termMonths} мес · {plan.downPaymentPercent}% аванс
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
          <h3 className="text-sm font-semibold text-foreground">
            Финансовые предпочтения
          </h3>
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
            <div className="grid gap-2">
              {usageOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
                >
                  <input
                    type="radio"
                    name="usage"
                    value={option.value}
                    checked={draft.preferences.usagePurpose === option.value}
                    onChange={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          usagePurpose: option.value as typeof prev.preferences.usagePurpose,
                        },
                      }))
                    }
                    className="h-4 w-4 border-border text-slate-900 focus:ring-brand-500"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">Планируемый пробег</Label>
            <select
              id="mileage"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              value={draft.preferences.mileage}
              onChange={(event) =>
                updateDraft((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    mileage: event.target.value,
                  },
                }))
              }
            >
              {mileageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Дополнительные комментарии</Label>
            <textarea
              id="notes"
              rows={5}
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
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>

          <div className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-linear">
            <h3 className="text-sm font-semibold text-foreground">
              Согласия
            </h3>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border text-slate-900 focus:ring-brand-500"
                checked={draft.consents.creditCheck}
                onChange={(event) =>
                  updateDraft((prev) => ({
                    ...prev,
                    consents: {
                      ...prev.consents,
                      creditCheck: event.target.checked,
                    },
                  }))
                }
              />
              <span>
                Согласен на проверку кредитной истории и запрос данных в
                финансовых учреждениях.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border text-slate-900 focus:ring-brand-500"
                checked={draft.consents.terms}
                onChange={(event) =>
                  updateDraft((prev) => ({
                    ...prev,
                    consents: {
                      ...prev.consents,
                      terms: event.target.checked,
                    },
                  }))
                }
              />
              <span>
                Принимаю <a href="/legal" className="underline">условия оферты</a> и политику
                конфиденциальности.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border text-slate-900 focus:ring-brand-500"
                checked={draft.consents.marketing}
                onChange={(event) =>
                  updateDraft((prev) => ({
                    ...prev,
                    consents: {
                      ...prev.consents,
                      marketing: event.target.checked,
                    },
                  }))
                }
              />
              <span>Получать новости и специальные предложения на email.</span>
            </label>
          </div>

          {error ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-border"
              onClick={() => router.push("/")}
            >
              Назад к каталогу
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={handleNext}
              disabled={isSaving}
            >
              Перейти к данным
            </Button>
          </div>
        </div>
      </section>

      {selectedCar ? (
        <section className="rounded-3xl border border-dashed border-border bg-surface-subtle px-6 py-5 shadow-linear">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Выбранный автомобиль
            </span>
            <span className="font-semibold text-foreground">
              {selectedCar.name}
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Тариф
            </span>
            <span className="font-semibold text-foreground">
              {selectedPlan?.name ?? "-"}
            </span>
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
