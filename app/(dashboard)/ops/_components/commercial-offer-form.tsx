"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type CommercialOfferData,
  CommercialOfferDownloadButtonRenty,
} from "@/app/(dashboard)/ops/_components/commercial-offer-pdf-renty";
import { saveCommercialOffer, type SaveCommercialOfferResult } from "@/app/(dashboard)/ops/deals/[id]/actions";
import type { OpsCommercialOffer } from "@/lib/supabase/queries/operations";

const FIELD_CONFIG: Array<{
  id: "priceVat" | "termMonths" | "downPayment" | "insuranceRateAnnual";
  label: string;
  placeholder: string;
}> = [
  { id: "priceVat", label: "Стоимость с VAT, AED", placeholder: "Например, 145000" },
  { id: "termMonths", label: "Срок, месяцев", placeholder: "36" },
  { id: "downPayment", label: "Аванс, AED", placeholder: "20000" },
  { id: "insuranceRateAnnual", label: "Ставка страхования, % годовых", placeholder: "2.1" },
];
const INTEREST_RATE_LABEL = "Ставка финансирования, % годовых";
const INTEREST_RATE_MIN = 16;
const INTEREST_RATE_MAX = 25;
const INTEREST_RATE_STEP = 0.5;

type FormState = {
  priceVat: string;
  termMonths: string;
  downPayment: string;
  interestRateAnnual: string;
  insuranceRateAnnual: string;
  comment: string;
};

type CommercialOfferFormProps = {
  dealId: string;
  slug: string;
  dealNumber: string | null;
  clientName: string | null;
  vehicleName: string | null;
  companyName: string | null;
  offer: OpsCommercialOffer | null;
};

function formatInitialNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "";
  return `${value}`;
}

function normalizeInterestRate(value: number | null): number {
  if (value == null || Number.isNaN(value)) return INTEREST_RATE_MIN;

  const clamped = Math.min(INTEREST_RATE_MAX, Math.max(INTEREST_RATE_MIN, value));
  const stepsFromMin = Math.round((clamped - INTEREST_RATE_MIN) / INTEREST_RATE_STEP);
  const snapped = INTEREST_RATE_MIN + stepsFromMin * INTEREST_RATE_STEP;

  return Number(snapped.toFixed(1));
}

function formatInitialInterestRate(value: number | null): string {
  return normalizeInterestRate(value ?? INTEREST_RATE_MIN).toString();
}

export function CommercialOfferForm({
  dealId,
  slug,
  dealNumber,
  clientName,
  vehicleName,
  companyName,
  offer,
}: CommercialOfferFormProps) {
  const [form, setForm] = useState<FormState>(
    () => ({
      priceVat: formatInitialNumber(offer?.priceVat ?? null),
      termMonths: formatInitialNumber(offer?.termMonths ?? null),
      downPayment: formatInitialNumber(offer?.downPaymentAmount ?? null),
      interestRateAnnual: formatInitialInterestRate(offer?.interestRateAnnual ?? INTEREST_RATE_MIN),
      insuranceRateAnnual: formatInitialNumber(offer?.insuranceRateAnnual ?? null),
      comment: offer?.comment ?? "",
    }),
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveCommercialOfferResult | null>(null);

  const offerData: CommercialOfferData | null = useMemo(() => {
    const hasValues =
      form.priceVat.trim() ||
      form.termMonths.trim() ||
      form.downPayment.trim() ||
      form.interestRateAnnual.trim() ||
      form.insuranceRateAnnual.trim();

    if (!hasValues) return null;

    const preparedAt = offer?.updatedAt ?? new Date().toISOString();
    const preparedBy = offer?.updatedByName ?? companyName ?? "Fast Lease";

    return {
      dealNumber: dealNumber ?? undefined,
      clientName: clientName ?? undefined,
      vehicleName: vehicleName ?? undefined,
      vehicleVin: null,
      priceVat: form.priceVat || null,
      termMonths: form.termMonths || null,
      downPayment: form.downPayment || null,
      interestRateAnnual: form.interestRateAnnual || null,
      insuranceRateAnnual: form.insuranceRateAnnual || null,
      comment: form.comment || offer?.comment || null,
      preparedBy,
      preparedByPhone: offer?.updatedByPhone ?? null,
      preparedByEmail: offer?.updatedByEmail ?? null,
      preparedAt,
      companyName: companyName ?? "Fast Lease",
    };
  }, [companyName, dealNumber, clientName, form, offer, vehicleName]);

  const lastUpdated = useMemo(() => {
    if (!offer?.updatedAt) return null;
    const dt = new Date(offer.updatedAt);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "long" });
  }, [offer]);

  function handleInputChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleInterestRateChange(nextValue: number) {
    const normalized = normalizeInterestRate(nextValue);
    handleInputChange("interestRateAnnual", normalized.toString());
  }

  const interestRateValue = useMemo(
    () => normalizeInterestRate(Number.parseFloat(form.interestRateAnnual)),
    [form.interestRateAnnual],
  );

  function resetToPayload() {
    setForm({
      priceVat: formatInitialNumber(offer?.priceVat ?? null),
      termMonths: formatInitialNumber(offer?.termMonths ?? null),
      downPayment: formatInitialNumber(offer?.downPaymentAmount ?? null),
      interestRateAnnual: formatInitialInterestRate(offer?.interestRateAnnual ?? INTEREST_RATE_MIN),
      insuranceRateAnnual: formatInitialNumber(offer?.insuranceRateAnnual ?? null),
      comment: offer?.comment ?? "",
    });
    setResult(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const response = await saveCommercialOffer({
        dealId,
        slug,
        priceVat: form.priceVat,
        termMonths: form.termMonths,
        downPayment: form.downPayment,
        interestRateAnnual: form.interestRateAnnual,
        insuranceRateAnnual: form.insuranceRateAnnual,
        comment: form.comment,
      });
      setResult(response);
    });
  }

  const handleDownloadClick = async () => {
    // Если данных нет — не сохраняем, просто выходим
    if (!offerData) return;

    setResult(null);
    // Триггерим сохранение перед генерацией, чтобы payload был актуален
    const response = await saveCommercialOffer({
      dealId,
      slug,
      priceVat: form.priceVat,
      termMonths: form.termMonths,
      downPayment: form.downPayment,
      interestRateAnnual: form.interestRateAnnual,
      insuranceRateAnnual: form.insuranceRateAnnual,
      comment: form.comment,
    });
    setResult(response);
  };

  const calculations = useMemo(() => {
    const parseNumberInput = (value: string): number | null => {
      if (!value) return null;
      const digits = value.replace(/[^\d.,-]/g, "").replace(",", ".");
      const parsed = Number(digits);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const formatCurrencyAED = (value: number | null): string => {
      if (value == null || Number.isNaN(value)) return "—";
      return `AED ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    };
    const formatPercent = (value: number | null): string => {
      if (value == null || Number.isNaN(value)) return "—";
      return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
    };

    const price = parseNumberInput(form.priceVat);
    const termMonths = parseNumberInput(form.termMonths);
    const downPayment = parseNumberInput(form.downPayment) ?? 0;
    const annualRate = parseNumberInput(form.interestRateAnnual);
    const insuranceAnnualRate = parseNumberInput(form.insuranceRateAnnual);

    const principal = price != null ? Math.max(0, price - downPayment) : null;
    const monthlyRatePercent = annualRate != null ? annualRate / 12 : null;
    const periodRatePercent =
      annualRate != null && termMonths != null ? (annualRate * termMonths) / 12 : null;
    const totalInterestAmount =
      principal != null && annualRate != null && termMonths != null && termMonths > 0
        ? principal * (annualRate / 100) * (termMonths / 12)
        : null;
    const payoffWithInterest =
      principal != null && totalInterestAmount != null ? principal + totalInterestAmount : null;
    const monthlyLeasePayment =
      payoffWithInterest != null && termMonths != null && termMonths > 0
        ? payoffWithInterest / termMonths
        : null;
    const insuranceTotal =
      price != null && insuranceAnnualRate != null && termMonths != null && termMonths > 0
        ? price * (insuranceAnnualRate / 100) * (termMonths / 12)
        : null;
    const totalForClient =
      payoffWithInterest != null && insuranceTotal != null
        ? payoffWithInterest + insuranceTotal + downPayment
        : null;

    return [
      { label: "Месячная ставка, %", value: formatPercent(monthlyRatePercent) },
      { label: "Ставка за срок, %", value: formatPercent(periodRatePercent) },
      { label: "Финансируемая сумма", value: formatCurrencyAED(principal) },
      { label: "Итого к погашению", value: formatCurrencyAED(payoffWithInterest) },
      { label: "Ежемесячный платёж", value: formatCurrencyAED(monthlyLeasePayment) },
      { label: "Доход по процентам", value: formatCurrencyAED(totalInterestAmount) },
      { label: "Страховые платежи", value: formatCurrencyAED(insuranceTotal) },
      { label: "Итого для клиента (страх. + аванс)", value: formatCurrencyAED(totalForClient) },
    ];
  }, [form.downPayment, form.insuranceRateAnnual, form.interestRateAnnual, form.priceVat, form.termMonths]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {lastUpdated ? (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground/80">
              Обновлено: {lastUpdated} {offer?.updatedByName ? `• ${offer.updatedByName}` : ""}
            </p>
          </div>
        ) : (
          <div />
        )}
      </div>

      <form id="commercial-offer-form" className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          {FIELD_CONFIG.map((field) => (
            <div key={field.id} className="space-y-1">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                name={field.id}
                value={form[field.id]}
                onChange={(event) => handleInputChange(field.id, event.target.value)}
                placeholder={field.placeholder}
                className="rounded-lg"
              />
            </div>
          ))}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="interestRateAnnual">{INTEREST_RATE_LABEL}</Label>
              <span className="text-sm font-semibold text-foreground">
                {interestRateValue.toFixed(1)}%
              </span>
            </div>
            <input
              id="interestRateAnnual"
              name="interestRateAnnual"
              type="range"
              min={INTEREST_RATE_MIN}
              max={INTEREST_RATE_MAX}
              step={INTEREST_RATE_STEP}
              value={interestRateValue}
              onChange={(event) => handleInterestRateChange(Number.parseFloat(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              aria-valuemin={INTEREST_RATE_MIN}
              aria-valuemax={INTEREST_RATE_MAX}
              aria-valuenow={interestRateValue}
              aria-valuetext={`${interestRateValue.toFixed(1)}%`}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{INTEREST_RATE_MIN}%</span>
              <span>Шаг 0.5%</span>
              <span>{INTEREST_RATE_MAX}%</span>
            </div>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Расчётные показатели
          </p>
          <dl className="grid gap-2 md:grid-cols-2">
            {calculations.map((item) => (
              <div key={item.label} className="space-y-0.5 rounded-md bg-background/40 p-2">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="text-sm font-semibold text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="space-y-1">
          <Label htmlFor="offer-comment">Комментарий (виден в КП)</Label>
          <Textarea
            id="offer-comment"
            value={form.comment}
            onChange={(event) => handleInputChange("comment", event.target.value)}
            placeholder="Дополнительные условия, скидки, особые заметки"
            className="min-h-[80px] rounded-lg"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {result ? (
            <div
              className={`flex items-center gap-2 text-sm ${result.success ? "text-emerald-600" : "text-destructive"}`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {result.success ? "Сохранено" : result.error}
            </div>
          ) : (
            <div />
          )}

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:ml-auto">
            <Button type="submit" size="sm" className="rounded-lg" disabled={pending}>
              {pending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Сохраняем...
                </span>
              ) : (
                "Сохранить КП"
              )}
            </Button>
            <CommercialOfferDownloadButtonRenty
              data={offerData}
              label="Скачать PDF (Renty)"
              iconOnly={false}
              ariaLabel="Скачать КП в шаблоне Renty"
              onGenerate={handleDownloadClick}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
