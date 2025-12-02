"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
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
  id: "priceVat" | "termMonths";
  label: string;
  placeholder: string;
  disabled?: boolean;
}> = [
  { id: "priceVat", label: "Стоимость с VAT, AED", placeholder: "Например, 145000" },
  { id: "termMonths", label: "Срок, месяцев", placeholder: "36" },
];
const INTEREST_RATE_LABEL = "Ставка финансирования, % годовых";
const INTEREST_RATE_MIN = 16;
const INTEREST_RATE_MAX = 25;
const INTEREST_RATE_STEP = 0.5;

type FormState = {
  priceVat: string;
  termMonths: string;
  downPaymentAmount: string;
  downPaymentPercent: string;
  downPaymentSource: "amount" | "percent";
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

function formatInitialNumber(value: number | null, fractionDigits?: number): string {
  if (value == null || Number.isNaN(value)) return "";
  if (typeof fractionDigits === "number") {
    const fixed = value.toFixed(fractionDigits);
    return fixed.replace(/\.?0+$/, "");
  }
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

function parseNumberInput(value: string): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumericInput(value: number | null, fractionDigits: number): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(fractionDigits).replace(/\.?0+$/, "");
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
  const [form, setForm] = useState<FormState>(() => {
    const initialPrice = offer?.priceVat ?? null;
    const initialAmount = offer?.downPaymentAmount ?? null;
    const initialPercent =
      offer?.downPaymentPercent ??
      (initialPrice != null && initialPrice !== 0 && initialAmount != null
        ? Number(((initialAmount / initialPrice) * 100).toFixed(2))
        : null);
    const initialSource: "amount" | "percent" = offer?.downPaymentPercent != null ? "percent" : "amount";

    return {
      priceVat: formatInitialNumber(initialPrice),
      termMonths: formatInitialNumber(offer?.termMonths ?? null),
      downPaymentAmount: formatInitialNumber(initialAmount),
      downPaymentPercent: formatInitialNumber(initialPercent, 2),
      downPaymentSource: initialSource,
      interestRateAnnual: formatInitialInterestRate(offer?.interestRateAnnual ?? INTEREST_RATE_MIN),
      insuranceRateAnnual: formatInitialNumber(offer?.insuranceRateAnnual ?? 4),
      comment: offer?.comment ?? "",
    };
  });
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveCommercialOfferResult | null>(null);

  const priceValue = useMemo(() => parseNumberInput(form.priceVat), [form.priceVat]);

  const resolvedDownPayment = useMemo(() => {
    const amountValue = parseNumberInput(form.downPaymentAmount);
    const percentValue = parseNumberInput(form.downPaymentPercent);
    const source = form.downPaymentSource;

    let resolvedAmount = amountValue;
    let resolvedPercent = percentValue;

    if (source === "percent" && percentValue != null && priceValue != null) {
      resolvedAmount = Number(((percentValue / 100) * priceValue).toFixed(2));
    } else if (source === "amount" && amountValue != null && priceValue != null && priceValue !== 0) {
      resolvedPercent = Number(((amountValue / priceValue) * 100).toFixed(2));
    }

    return { amount: resolvedAmount, percent: resolvedPercent, source, price: priceValue };
  }, [form.downPaymentAmount, form.downPaymentPercent, form.downPaymentSource, priceValue]);

  const offerData: CommercialOfferData | null = useMemo(() => {
    const hasValues =
      form.priceVat.trim() ||
      form.termMonths.trim() ||
      form.downPaymentAmount.trim() ||
      form.downPaymentPercent.trim() ||
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
      downPayment:
        resolvedDownPayment.amount != null
          ? formatNumericInput(resolvedDownPayment.amount, 2)
          : form.downPaymentAmount || null,
      downPaymentPercent:
        resolvedDownPayment.percent != null
          ? formatNumericInput(resolvedDownPayment.percent, 2)
          : form.downPaymentPercent || null,
      interestRateAnnual: form.interestRateAnnual || null,
      insuranceRateAnnual: form.insuranceRateAnnual || null,
      comment: form.comment || offer?.comment || null,
      preparedBy,
      preparedByPhone: offer?.updatedByPhone ?? null,
      preparedByEmail: offer?.updatedByEmail ?? null,
      preparedAt,
      companyName: companyName ?? "Fast Lease",
    };
  }, [
    companyName,
    dealNumber,
    clientName,
    form,
    offer,
    resolvedDownPayment.amount,
    resolvedDownPayment.percent,
    vehicleName,
  ]);

  const lastUpdated = useMemo(() => {
    if (!offer?.updatedAt) return null;
    const dt = new Date(offer.updatedAt);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "long" });
  }, [offer]);

  function handleInputChange(field: keyof FormState, value: string) {
    setResult(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleDownPaymentAmountChange(value: string) {
    setResult(null);
    setForm((prev) => {
      const price = parseNumberInput(prev.priceVat);
      const amountValue = parseNumberInput(value);
      const percentValue =
        price != null && price !== 0 && amountValue != null
          ? Math.max(0, Math.min((amountValue / price) * 100, 100))
          : null;

      return {
        ...prev,
        downPaymentSource: "amount",
        downPaymentAmount: value,
        downPaymentPercent: percentValue != null ? formatNumericInput(percentValue, 2) : "",
      };
    });
  }

  function handleDownPaymentPercentChange(value: string) {
    setResult(null);
    setForm((prev) => {
      const price = parseNumberInput(prev.priceVat);
      const percentValue = parseNumberInput(value);
      const clampedPercent = percentValue != null ? Math.max(0, Math.min(percentValue, 100)) : null;
      const amountValue =
        price != null && price !== 0 && clampedPercent != null ? (price * clampedPercent) / 100 : null;

      return {
        ...prev,
        downPaymentSource: "percent",
        downPaymentPercent: value,
        downPaymentAmount: amountValue != null ? formatNumericInput(amountValue, 2) : "",
      };
    });
  }

  function handleInterestRateChange(nextValue: number) {
    const normalized = normalizeInterestRate(nextValue);
    handleInputChange("interestRateAnnual", normalized.toString());
  }

  const interestRateValue = useMemo(
    () => normalizeInterestRate(Number.parseFloat(form.interestRateAnnual)),
    [form.interestRateAnnual],
  );

  useEffect(() => {
    if (priceValue == null || priceValue === 0) {
      return;
    }

    if (form.downPaymentSource === "amount") {
      const amountValue = parseNumberInput(form.downPaymentAmount);
      const nextPercent =
        amountValue != null ? formatNumericInput(Math.max(0, Math.min((amountValue / priceValue) * 100, 100)), 2) : "";
      if (nextPercent !== form.downPaymentPercent) {
        setForm((prev) => ({ ...prev, downPaymentPercent: nextPercent }));
      }
    } else {
      const percentValue = parseNumberInput(form.downPaymentPercent);
      const nextAmount =
        percentValue != null ? formatNumericInput(Math.max(0, (percentValue / 100) * priceValue), 2) : "";
      if (nextAmount !== form.downPaymentAmount) {
        setForm((prev) => ({ ...prev, downPaymentAmount: nextAmount }));
      }
    }
  }, [form.downPaymentAmount, form.downPaymentPercent, form.downPaymentSource, priceValue]);

  function resetToPayload() {
    setForm({
      priceVat: formatInitialNumber(offer?.priceVat ?? null),
      termMonths: formatInitialNumber(offer?.termMonths ?? null),
      downPaymentAmount: formatInitialNumber(offer?.downPaymentAmount ?? null),
      downPaymentPercent: formatInitialNumber(
        offer?.downPaymentPercent ??
          (offer?.priceVat && offer?.priceVat !== 0 && offer?.downPaymentAmount != null
            ? Number(((offer.downPaymentAmount / offer.priceVat) * 100).toFixed(2))
            : null),
        2,
      ),
      downPaymentSource: offer?.downPaymentPercent != null ? "percent" : "amount",
      interestRateAnnual: formatInitialInterestRate(offer?.interestRateAnnual ?? INTEREST_RATE_MIN),
      insuranceRateAnnual: formatInitialNumber(offer?.insuranceRateAnnual ?? 4),
      comment: offer?.comment ?? "",
    });
    setResult(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const downPaymentAmountPayload =
        resolvedDownPayment.amount != null
          ? formatNumericInput(resolvedDownPayment.amount, 2)
          : form.downPaymentAmount;
      const downPaymentPercentPayload =
        resolvedDownPayment.percent != null
          ? formatNumericInput(resolvedDownPayment.percent, 2)
          : form.downPaymentPercent;

      const response = await saveCommercialOffer({
        dealId,
        slug,
        priceVat: form.priceVat,
        termMonths: form.termMonths,
        downPayment: downPaymentAmountPayload,
        downPaymentPercent: downPaymentPercentPayload,
        downPaymentSource: form.downPaymentSource,
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
    const downPaymentAmountPayload =
      resolvedDownPayment.amount != null
        ? formatNumericInput(resolvedDownPayment.amount, 2)
        : form.downPaymentAmount;
    const downPaymentPercentPayload =
      resolvedDownPayment.percent != null
        ? formatNumericInput(resolvedDownPayment.percent, 2)
        : form.downPaymentPercent;
    // Триггерим сохранение перед генерацией, чтобы payload был актуален
    const response = await saveCommercialOffer({
      dealId,
      slug,
      priceVat: form.priceVat,
      termMonths: form.termMonths,
      downPayment: downPaymentAmountPayload,
      downPaymentPercent: downPaymentPercentPayload,
      downPaymentSource: form.downPaymentSource,
      interestRateAnnual: form.interestRateAnnual,
      insuranceRateAnnual: form.insuranceRateAnnual,
      comment: form.comment,
    });
    setResult(response);
  };

  const calculations = useMemo(() => {
    const formatCurrencyAED = (value: number | null): string => {
      if (value == null || Number.isNaN(value)) return "—";
      return `AED ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    };
    const formatPercent = (value: number | null): string => {
      if (value == null || Number.isNaN(value)) return "—";
      return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
    };

    const price = priceValue;
    const termMonths = parseNumberInput(form.termMonths);
    const downPayment = resolvedDownPayment.amount ?? 0;
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
      { label: "Итого для покупателя (страх. + аванс)", value: formatCurrencyAED(totalForClient) },
    ];
  }, [
    resolvedDownPayment.amount,
    form.insuranceRateAnnual,
    form.interestRateAnnual,
    priceValue,
    form.termMonths,
  ]);

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
                disabled={field.disabled}
              />
            </div>
          ))}
          <div className="space-y-2 md:col-span-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="downPaymentAmount" className="text-xs text-muted-foreground">
                  Аванс, AED
                </Label>
                <Input
                  id="downPaymentAmount"
                  name="downPaymentAmount"
                  value={form.downPaymentAmount}
                  onChange={(event) => handleDownPaymentAmountChange(event.target.value)}
                  placeholder="20000"
                  className="rounded-lg"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="downPaymentPercent" className="text-xs text-muted-foreground">
                  Аванс, %
                </Label>
                <Input
                  id="downPaymentPercent"
                  name="downPaymentPercent"
                  value={form.downPaymentPercent}
                  onChange={(event) => handleDownPaymentPercentChange(event.target.value)}
                  placeholder="10"
                  className="rounded-lg"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
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
            <div className="space-y-1">
              <Label htmlFor="insuranceRateAnnual">Ставка страхования, % годовых</Label>
              <Input
                id="insuranceRateAnnual"
                name="insuranceRateAnnual"
                value={form.insuranceRateAnnual}
                onChange={(event) => handleInputChange("insuranceRateAnnual", event.target.value)}
                placeholder="4.0"
                className="rounded-lg"
                disabled
              />
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
