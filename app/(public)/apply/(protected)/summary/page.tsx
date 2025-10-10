"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Edit3 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { getCarById } from "@/lib/data/cars";
import { pricingPlans } from "@/lib/data/pricing";

import { useApplicationForm } from "../../_components/application-form-context";
import {
  ensureApplicationDraftAction,
  submitApplicationAction,
} from "../../actions";

export default function ApplicationSummaryPage() {
  const router = useRouter();
  const { draft, updateDraft, isHydrated } = useApplicationForm();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();

  if (!isHydrated) {
    return <div className="h-40 animate-pulse rounded-3xl bg-surface-subtle" />;
  }

  const selectedCar = draft.selectedCarId
    ? getCarById(draft.selectedCarId)
    : undefined;
  const selectedPlan = draft.planId
    ? pricingPlans.find((plan) => plan.id === draft.planId)
    : undefined;

  const missingDocuments = draft.documents.filter(
    (doc) => !doc.optional && !doc.uploaded,
  );

  const handleSubmit = () => {
    if (missingDocuments.length) {
      setError("Не все обязательные документы отмечены как загруженные.");
      return;
    }
    if (!draft.consents.creditCheck || !draft.consents.terms) {
      setError("Подтвердите согласия перед отправкой.");
      return;
    }
    setError(null);

    startSubmitting(async () => {
      try {
        let applicationId = draft.applicationId;
        let applicationNumber = draft.applicationNumber;

        if (!applicationId) {
          const ensured = await ensureApplicationDraftAction({
            applicationId: draft.applicationId,
            residencyStatus: draft.residencyStatus,
            selectedCarId: draft.selectedCarId,
            planId: draft.planId,
            preferences: draft.preferences,
            personal: draft.personal,
          });

          applicationId = ensured.applicationId;
          applicationNumber = ensured.applicationNumber;

          updateDraft((prev) => ({
            ...prev,
            applicationId: ensured.applicationId,
            applicationNumber: ensured.applicationNumber,
          }));
        }

        if (!applicationId) {
          throw new Error("Не удалось определить идентификатор заявки.");
        }

        const result = await submitApplicationAction({
          applicationId,
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
          status: "submitted",
          submittedAt: result.submittedAt,
          applicationNumber: result.applicationNumber || applicationNumber,
          documents: prev.documents.map((doc) => ({
            ...doc,
            status: doc.status === "pending" ? doc.status : "submitted",
          })),
        }));

        router.push("/apply/status");
      } catch (actionError) {
        const message =
          actionError instanceof Error
            ? actionError.message
            : "Не удалось отправить заявку.";
        setError(message);
      }
    });
  };

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-linear">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Шаг 4 · Проверка данных
          </span>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Подтвердите заявку
            </h2>
            <p className="text-sm text-muted-foreground">
              Проверьте данные. После отправки менеджер свяжется с вами для
              финальной проверки и подписи договора.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SummaryCard title="Автомобиль" href="/offer">
            {selectedCar ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="text-base font-semibold text-foreground">
                  {selectedCar.name}
                </p>
                <p>
                  {selectedCar.metrics.range} · {selectedCar.metrics.acceleration}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Автомобиль не выбран.
              </p>
            )}
          </SummaryCard>

          <SummaryCard title="Тариф" href="/offer">
            {selectedPlan ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="text-base font-semibold text-foreground">
                  {selectedPlan.name}
                </p>
                <p>AED {selectedPlan.priceAED.toLocaleString("en-GB")} / месяц</p>
                <p>
                  {selectedPlan.termMonths} мес · аванс {selectedPlan.downPaymentPercent}%
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Тариф не выбран.
              </p>
            )}
          </SummaryCard>

          <SummaryCard title="Личные данные" href="/apply/start">
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Имя:</span> {" "}
                {draft.personal.firstName} {draft.personal.lastName}
              </li>
              <li>
                <span className="font-medium text-foreground">Дата рождения:</span> {" "}
                {draft.personal.dateOfBirth || "—"}
              </li>
              <li>
                <span className="font-medium text-foreground">Город:</span> {" "}
                {draft.personal.city}
              </li>
              <li className="flex items-center gap-2">
                <span className="font-medium text-foreground">Email:</span>
                {draft.personal.email || "—"}
              </li>
              <li>
                <span className="font-medium text-foreground">Телефон:</span> {" "}
                {draft.personal.phone || "—"}
              </li>
            </ul>
          </SummaryCard>

          <SummaryCard title="Предпочтения" href="/offer">
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">
                  Бюджет/мес:
                </span>{" "}
                AED {draft.preferences.monthlyBudget.toLocaleString("en-GB")}
              </li>
              <li>
                <span className="font-medium text-foreground">Назначение:</span> {" "}
                {resolveUsageLabel(draft.preferences.usagePurpose)}
              </li>
              <li>
                <span className="font-medium text-foreground">Пробег:</span> {" "}
                {draft.preferences.mileage}
              </li>
              {draft.preferences.notes ? (
                <li>
                  <span className="font-medium text-foreground">Комментарии:</span> {" "}
                  {draft.preferences.notes}
                </li>
              ) : null}
            </ul>
          </SummaryCard>
        </div>

        <section className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-linear">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Документы</h3>
            <Link href="/apply/documents" className="text-xs text-brand-600">
              Изменить
            </Link>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {draft.documents.map((doc) => (
              <li
                key={doc.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
                  doc.uploaded
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-border bg-surface-subtle",
                )}
              >
                <span>{doc.title}</span>
                <span className="text-xs">
                  {doc.uploaded
                    ? doc.fileName ??
                      (doc.status === "pending_offline"
                        ? "Предоставлю менеджеру"
                        : "Загружено")
                    : "Не загружено"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-linear">
          <h3 className="text-sm font-semibold text-foreground">Согласия</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-slate-900 focus:ring-brand-500"
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
              Согласие на проверку кредитной истории
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-slate-900 focus:ring-brand-500"
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
              Принимаю условия оферты и политику конфиденциальности
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-slate-900 focus:ring-brand-500"
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
              Получать информацию о специальных предложениях
            </label>
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
            onClick={() => router.push("/apply/documents")}
          >
            Назад
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            Отправить заявку
          </Button>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-linear">
      <div className="flex items-center justify-between text-sm font-semibold text-foreground">
        {title}
        <Link href={href} className="flex items-center gap-1 text-xs text-brand-600">
          <Edit3 className="h-3 w-3" aria-hidden="true" />
          Изменить
        </Link>
      </div>
      {children}
    </div>
  );
}

function resolveUsageLabel(value: string) {
  switch (value) {
    case "business":
      return "Бизнес / служебный";
    case "mixed":
      return "Смешанный";
    default:
      return "Личные поездки";
  }
}
