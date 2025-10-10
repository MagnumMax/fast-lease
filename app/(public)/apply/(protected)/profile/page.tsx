"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Mail, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getCarById } from "@/lib/data/cars";
import { pricingPlans } from "@/lib/data/pricing";

import { useApplicationForm } from "../../_components/application-form-context";

const cityOptions = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
];

export default function ApplicationProfilePage() {
  const router = useRouter();
  const { draft, updateDraft, isHydrated } = useApplicationForm();
  const [error, setError] = useState<string | null>(null);

  const selectedCar = useMemo(
    () => (draft.selectedCarId ? getCarById(draft.selectedCarId) : undefined),
    [draft.selectedCarId],
  );

  const selectedPlan = useMemo(
    () => pricingPlans.find((plan) => plan.id === draft.planId),
    [draft.planId],
  );

  if (!isHydrated) {
    return <div className="h-40 animate-pulse rounded-3xl bg-surface-subtle" />;
  }

  const handleNext = () => {
    const { personal, consents } = draft;
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
      setError("Необходимо согласиться с условиями и проверкой кредитной истории.");
      return;
    }
    setError(null);
    router.push("/apply/documents");
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-linear">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Шаг 2 · Профиль заявителя
          </span>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Личные данные
            </h2>
            <p className="text-sm text-muted-foreground">
              Эти данные появятся в договоре и будут проверены службой безопасности
              Fast Lease. Используйте официальное имя как в паспорте.
            </p>
          </div>
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
            Данные проверяются автоматически. Если вы укажете неверную информацию,
            процесс может затянуться.
          </div>
        </form>

        <section className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-linear md:grid-cols-2">
          <div className="space-y-3 border-b border-border pb-4 md:border-b-0 md:border-r md:pb-0">
            <h3 className="text-sm font-semibold text-foreground">
              Выбранный автомобиль
            </h3>
            {selectedCar ? (
              <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">{selectedCar.name}</p>
                <p>
                  {selectedCar.metrics.range} · {selectedCar.metrics.acceleration}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Автомобиль не выбран. Вернитесь на предыдущий шаг.
              </p>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Тарифная программа
            </h3>
            {selectedPlan ? (
              <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">{selectedPlan.name}</p>
                <p>AED {selectedPlan.priceAED.toLocaleString("en-GB")} / месяц</p>
                <p>
                  {selectedPlan.termMonths} мес · аванс {selectedPlan.downPaymentPercent}%
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Тариф не выбран. Вернитесь на предыдущий шаг.
              </p>
            )}
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
            onClick={() => router.push("/apply/start")}
          >
            Назад
          </Button>
          <Button type="button" className="rounded-xl" onClick={handleNext}>
            К документам
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
