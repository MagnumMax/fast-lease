"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { AlertTriangle, Mail, Phone, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getCarById } from "@/lib/data/cars";
import { pricingPlans } from "@/lib/data/pricing";

import { useApplicationForm } from "../_components/application-form-context";
import { ensureApplicationDraftAction } from "../actions";

const cityOptions = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
];

export default function ApplicationStartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, updateDraft, isHydrated } = useApplicationForm();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const selectedCar = useMemo(
    () => (draft.selectedCarId ? getCarById(draft.selectedCarId) : undefined),
    [draft.selectedCarId],
  );

  const selectedPlan = useMemo(
    () => (draft.planId ? pricingPlans.find((plan) => plan.id === draft.planId) : undefined),
    [draft.planId],
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
    return <div className="h-40 animate-pulse rounded-3xl bg-surface-subtle" />;
  }

  const handleNext = () => {
    const { personal, consents, selectedCarId, planId } = draft;

    if (
      !personal.firstName.trim() ||
      !personal.lastName.trim() ||
      !personal.dateOfBirth ||
      !personal.email.trim() ||
      !personal.phone.trim()
    ) {
      setError("Заполните все обязательные поля профиля.");
      return;
    }

    if (!consents.creditCheck || !consents.terms) {
      setError("Подтвердите согласие на проверку и условия оферты.");
      return;
    }

    if (!selectedCarId || !planId) {
      setError("Выберите автомобиль и тариф на странице предложения перед продолжением.");
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
          vehicleCode: draft.source.vehicleCode,
          referralCode: draft.source.referralCode,
        });

        updateDraft((prev) => ({
          ...prev,
          applicationId: result.applicationId,
          applicationNumber: result.applicationNumber,
        }));

        router.push("/apply/documents");
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
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-linear">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Шаг 1 · Профиль заявителя
          </span>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Начните с контактных данных
            </h2>
            <p className="text-sm text-muted-foreground">
              Мы используем эти данные, чтобы связаться с вами и привязать заявку к
              рефералу и выбранному автомобилю. Проверьте, что ссылка содержит коды
              автомобиля и партнёра.
            </p>
          </div>
          {(draft.source.vehicleCode || draft.source.referralCode) && (
            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border bg-surface-subtle px-4 py-3 text-xs uppercase tracking-[0.3em] text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm normal-case">
                <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
                <span className="font-semibold text-foreground">Заявка привязана</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs normal-case text-muted-foreground">
                {draft.source.vehicleCode ? (
                  <span>
                    Авто: <span className="font-semibold">{draft.source.vehicleCode}</span>
                  </span>
                ) : null}
                {draft.source.referralCode ? (
                  <span>
                    Реферал: <span className="font-semibold">{draft.source.referralCode}</span>
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <form className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-linear">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Имя"
              required
              value={draft.personal.firstName}
              onChange={(value) =>
                updateDraft((prev) => ({
                  ...prev,
                  personal: { ...prev.personal, firstName: value },
                }))
              }
              placeholder="Иван"
            />
            <Field
              label="Фамилия"
              required
              value={draft.personal.lastName}
              onChange={(value) =>
                updateDraft((prev) => ({
                  ...prev,
                  personal: { ...prev.personal, lastName: value },
                }))
              }
              placeholder="Петров"
            />
            <Field
              type="date"
              label="Дата рождения"
              required
              value={draft.personal.dateOfBirth}
              onChange={(value) =>
                updateDraft((prev) => ({
                  ...prev,
                  personal: { ...prev.personal, dateOfBirth: value },
                }))
              }
            />
            <div className="space-y-2">
              <Label>Город проживания</Label>
              <select
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                value={draft.personal.city}
                onChange={(event) =>
                  updateDraft((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, city: event.target.value },
                  }))
                }
              >
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Email"
              required
              type="email"
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
              value={draft.personal.email}
              onChange={(value) =>
                updateDraft((prev) => ({
                  ...prev,
                  personal: { ...prev.personal, email: value },
                }))
              }
              placeholder="ivan@example.com"
            />
            <Field
              label="Телефон"
              required
              type="tel"
              icon={<Phone className="h-4 w-4 text-muted-foreground" />}
              value={draft.personal.phone}
              onChange={(value) =>
                updateDraft((prev) => ({
                  ...prev,
                  personal: { ...prev.personal, phone: value },
                }))
              }
              placeholder="+971 50 123 4567"
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-xs text-muted-foreground">
            Данные проверяются автоматически. Используйте официальное имя и контактные
            данные — это ускорит проверку заявки.
          </div>
        </form>

        <div className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-linear">
          <h3 className="text-sm font-semibold text-foreground">Согласия</h3>
          <p className="text-xs text-muted-foreground">
            Эти подтверждения обязательны перед отправкой документов. Мы используем их для
            проверки кредитной истории и подписания оферты.
          </p>
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
              Согласен на проверку кредитной истории и запрос данных в финансовых учреждениях.
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
              Принимаю <a href="/legal" className="underline">условия оферты</a> и политику конфиденциальности.
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

        <section className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-linear md:grid-cols-2">
          <div className="space-y-3 border-b border-border pb-4 md:border-b-0 md:border-r md:pb-0">
            <h3 className="text-sm font-semibold text-foreground">Выбранный автомобиль</h3>
            {selectedCar ? (
              <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">{selectedCar.name}</p>
                <p>
                  {selectedCar.metrics.range} · {selectedCar.metrics.acceleration}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Перейдите на страницу предложения, чтобы выбрать авто.
                <button
                  type="button"
                  onClick={() => router.push("/offer")}
                  className="ml-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600 underline decoration-dashed"
                >
                  Открыть /offer
                </button>
              </p>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Тариф и реферал</h3>
            {selectedPlan ? (
              <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">{selectedPlan.name}</p>
                <p>
                  {selectedPlan.termMonths} мес · аванс {selectedPlan.downPaymentPercent}%
                </p>
                <p>AED {selectedPlan.priceAED.toLocaleString("en-GB")} / месяц</p>
                {draft.source.referralCode ? (
                  <p className="pt-2 text-xs uppercase tracking-[0.3em]">
                    Реферал · {draft.source.referralCode}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Укажите тариф на странице предложения.
                <button
                  type="button"
                  onClick={() => router.push("/offer")}
                  className="ml-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600 underline decoration-dashed"
                >
                  Настроить условия
                </button>
              </p>
            )}
            {!draft.source.referralCode ? (
              <p className="text-xs text-muted-foreground">
                Добавьте `ref` в ссылку, чтобы партнёр получил вознаграждение.
              </p>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border"
            onClick={() => router.push("/offer")}
          >
            Назад к предложению
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={handleNext}
            disabled={isSaving}
          >
            Перейти к документам
          </Button>
        </div>
      </section>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: ReactNode;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  icon,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            {icon}
          </span>
        ) : null}
        <Input
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn("rounded-xl border-border", icon && "pl-10")}
        />
      </div>
    </div>
  );
}
