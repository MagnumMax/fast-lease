"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type CommercialOfferData,
  CommercialOfferDownloadButtonRenty,
} from "@/app/(dashboard)/ops/_components/commercial-offer-pdf-renty";
import { saveCommercialOffer, type SaveCommercialOfferResult } from "@/app/(dashboard)/ops/deals/[id]/actions";
import type { OpsCommercialOffer } from "@/lib/supabase/queries/operations";
import {
  calculateCommercialOffer,
  type CommercialOfferCalculationMethod,
} from "@/lib/commercial-offer-calculations";

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
const INTEREST_RATE_MAX = 30;
const INTEREST_RATE_STEP = 0.5;

type FormState = {
  priceVat: string;
  termMonths: string;
  firstPaymentAmount: string;
  firstPaymentPercent: string;
  firstPaymentSource: "amount" | "percent";
  interestRateAnnual: string;
  insuranceRateAnnual: string;
  buyoutAmount: string;
  calculationMethod: CommercialOfferCalculationMethod;
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
  // Remove all whitespace
  let clean = value.replace(/\s/g, "");
  
  // If format is like 1,234,567.89 (US) - mixed dots and commas
  if (clean.includes(".") && clean.includes(",")) {
    // If dot is last, it's decimal (US)
    if (clean.lastIndexOf(".") > clean.lastIndexOf(",")) {
      clean = clean.replace(/,/g, "");
    } else {
      // Comma is last, it's decimal (EU) -> 1.234.567,89
      clean = clean.replace(/\./g, "").replace(",", ".");
    }
  } else if ((clean.match(/,/g) || []).length > 1) {
    // Multiple commas -> thousands (1,000,000)
    clean = clean.replace(/,/g, "");
  } else {
    // Single comma or no comma
    // If single comma, treat as dot (assuming 0,5 or 1000,50)
    // Note: This might be ambiguous for "1,000" (could be 1000 or 1.0)
    // But in this context (large amounts), users might type "1,000".
    // However, if they type "24,9", they mean 24.9.
    // Let's assume comma is decimal if it's a single comma.
    clean = clean.replace(",", ".");
  }
  
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumericInput(value: number | null, fractionDigits: number): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(fractionDigits).replace(/\.?0+$/, "");
}

function formatCurrencyAED(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `AED ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatCurrencyPlain(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatPercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
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
    const initialAmount = offer?.firstPaymentAmount ?? null;
    const initialPercent =
      offer?.firstPaymentPercent ??
      (initialPrice != null && initialPrice !== 0 && initialAmount != null
        ? Number(((initialAmount / initialPrice) * 100).toFixed(2))
        : null);
    const initialSource: "amount" | "percent" = offer?.firstPaymentPercent != null ? "percent" : "amount";

    return {
      priceVat: formatInitialNumber(initialPrice),
      termMonths: formatInitialNumber(offer?.termMonths ?? null),
      firstPaymentAmount: formatInitialNumber(initialAmount),
      firstPaymentPercent: formatInitialNumber(initialPercent, 2),
      firstPaymentSource: initialSource,
      interestRateAnnual: formatInitialInterestRate(offer?.interestRateAnnual ?? INTEREST_RATE_MIN),
      insuranceRateAnnual: formatInitialNumber(offer?.insuranceRateAnnual ?? 4),
      buyoutAmount: formatInitialNumber(offer?.buyoutAmount ?? null),
      calculationMethod: offer?.calculationMethod ?? "standard",
      comment: offer?.comment ?? "",
    };
  });
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveCommercialOfferResult | null>(null);

  const priceValue = useMemo(() => parseNumberInput(form.priceVat), [form.priceVat]);

  const resolvedFirstPayment = useMemo(() => {
    const amountValue = parseNumberInput(form.firstPaymentAmount);
    const percentValue = parseNumberInput(form.firstPaymentPercent);
    const source = form.firstPaymentSource;

    let resolvedAmount = amountValue;
    let resolvedPercent = percentValue;

    if (source === "percent" && percentValue != null && priceValue != null) {
      resolvedAmount = Number(((percentValue / 100) * priceValue).toFixed(2));
    } else if (source === "amount" && amountValue != null && priceValue != null && priceValue !== 0) {
      resolvedPercent = (amountValue / priceValue) * 100;
    }

    return { amount: resolvedAmount, percent: resolvedPercent, source, price: priceValue };
  }, [form.firstPaymentAmount, form.firstPaymentPercent, form.firstPaymentSource, priceValue]);

  const offerData: CommercialOfferData | null = useMemo(() => {
    const hasValues =
      form.priceVat.trim() ||
      form.termMonths.trim() ||
      form.firstPaymentAmount.trim() ||
      form.firstPaymentPercent.trim() ||
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
      firstPayment:
        resolvedFirstPayment.amount != null
          ? formatNumericInput(resolvedFirstPayment.amount, 2)
          : form.firstPaymentAmount || null,
      firstPaymentPercent:
        resolvedFirstPayment.percent != null
          ? formatNumericInput(resolvedFirstPayment.percent, 2)
          : form.firstPaymentPercent || null,
      interestRateAnnual: form.interestRateAnnual || null,
      insuranceRateAnnual: form.insuranceRateAnnual || null,
      buyoutAmount: form.buyoutAmount || null,
      calculationMethod: form.calculationMethod,
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
    resolvedFirstPayment.amount,
    resolvedFirstPayment.percent,
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

  function handleFirstPaymentAmountChange(value: string) {
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
        firstPaymentSource: "amount",
        firstPaymentAmount: value,
        firstPaymentPercent: percentValue != null ? formatNumericInput(percentValue, 2) : "",
      };
    });
  }

  function handleFirstPaymentPercentChange(value: string) {
    setResult(null);
    setForm((prev) => {
      const price = parseNumberInput(prev.priceVat);
      const percentValue = parseNumberInput(value);
      const clampedPercent = percentValue != null ? Math.max(0, Math.min(percentValue, 100)) : null;
      const amountValue =
        price != null && price !== 0 && clampedPercent != null ? (price * clampedPercent) / 100 : null;

      return {
        ...prev,
        firstPaymentSource: "percent",
        firstPaymentPercent: value,
        firstPaymentAmount: amountValue != null ? formatNumericInput(amountValue, 2) : "",
      };
    });
  }

  function handleInterestRateChange(nextValue: number) {
    const normalized = normalizeInterestRate(nextValue);
    handleInputChange("interestRateAnnual", normalized.toString());
  }

  function handleMethodChange(value: string) {
    setResult(null);
    setForm((prev) => ({
      ...prev,
      calculationMethod: value as CommercialOfferCalculationMethod,
    }));
  }

  const interestRateValue = useMemo(
    () => normalizeInterestRate(Number.parseFloat(form.interestRateAnnual)),
    [form.interestRateAnnual],
  );

  useEffect(() => {
    if (priceValue == null || priceValue === 0) {
      return;
    }

    if (form.firstPaymentSource === "amount") {
      const amountValue = parseNumberInput(form.firstPaymentAmount);
      const nextPercent =
        amountValue != null ? formatNumericInput(Math.max(0, Math.min((amountValue / priceValue) * 100, 100)), 2) : "";
      if (nextPercent !== form.firstPaymentPercent) {
        setForm((prev) => ({ ...prev, firstPaymentPercent: nextPercent }));
      }
    } else {
      const percentValue = parseNumberInput(form.firstPaymentPercent);
      const nextAmount =
        percentValue != null ? formatNumericInput(Math.max(0, (percentValue / 100) * priceValue), 2) : "";
      if (nextAmount !== form.firstPaymentAmount) {
        setForm((prev) => ({ ...prev, firstPaymentAmount: nextAmount }));
      }
    }
  }, [form.firstPaymentAmount, form.firstPaymentPercent, form.firstPaymentSource, priceValue]);

  function resetToPayload() {
    setForm({
      priceVat: formatInitialNumber(offer?.priceVat ?? null),
      termMonths: formatInitialNumber(offer?.termMonths ?? null),
      firstPaymentAmount: formatInitialNumber(offer?.firstPaymentAmount ?? null),
      firstPaymentPercent: formatInitialNumber(
        offer?.firstPaymentPercent ??
          (offer?.priceVat && offer?.priceVat !== 0 && offer?.firstPaymentAmount != null
            ? Number(((offer.firstPaymentAmount / offer.priceVat) * 100).toFixed(2))
            : null),
        2,
      ),
      firstPaymentSource: offer?.firstPaymentPercent != null ? "percent" : "amount",
      interestRateAnnual: formatInitialInterestRate(offer?.interestRateAnnual ?? INTEREST_RATE_MIN),
      insuranceRateAnnual: formatInitialNumber(offer?.insuranceRateAnnual ?? 4),
      buyoutAmount: formatInitialNumber(offer?.buyoutAmount ?? null),
      calculationMethod: offer?.calculationMethod ?? "standard",
      comment: offer?.comment ?? "",
    });
    setResult(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const firstPaymentAmountPayload =
        resolvedFirstPayment.amount != null
          ? formatNumericInput(resolvedFirstPayment.amount, 2)
          : form.firstPaymentAmount;
      const firstPaymentPercentPayload =
        resolvedFirstPayment.percent != null
          ? resolvedFirstPayment.percent.toString()
          : form.firstPaymentPercent;

      const response = await saveCommercialOffer({
        dealId,
        slug,
        priceVat: form.priceVat,
        termMonths: form.termMonths,
        firstPaymentAmount: firstPaymentAmountPayload,
        firstPaymentPercent: firstPaymentPercentPayload,
        firstPaymentSource: form.firstPaymentSource,
        interestRateAnnual: form.interestRateAnnual,
        insuranceRateAnnual: form.insuranceRateAnnual,
        buyoutAmount: form.buyoutAmount,
        calculationMethod: form.calculationMethod,
        comment: form.comment,
      });
      setResult(response);
    });
  }

  const handleDownloadClick = async () => {
    // Если данных нет — не сохраняем, просто выходим
    if (!offerData) return;

    setResult(null);
    const firstPaymentAmountPayload =
      resolvedFirstPayment.amount != null
        ? formatNumericInput(resolvedFirstPayment.amount, 2)
        : form.firstPaymentAmount;
    const firstPaymentPercentPayload =
      resolvedFirstPayment.percent != null
        ? resolvedFirstPayment.percent.toString()
        : form.firstPaymentPercent;
    // Триггерим сохранение перед генерацией, чтобы payload был актуален
    const response = await saveCommercialOffer({
      dealId,
      slug,
      priceVat: form.priceVat,
      termMonths: form.termMonths,
      firstPaymentAmount: firstPaymentAmountPayload,
      firstPaymentPercent: firstPaymentPercentPayload,
      firstPaymentSource: form.firstPaymentSource,
      interestRateAnnual: form.interestRateAnnual,
      insuranceRateAnnual: form.insuranceRateAnnual,
      calculationMethod: form.calculationMethod,
      comment: form.comment,
    });
    setResult(response);
  };

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const calculationResult = useMemo(() => {
    const price = priceValue;
    const termMonths = parseNumberInput(form.termMonths);
    const firstPayment = resolvedFirstPayment.amount ?? 0;
    const annualRate = parseNumberInput(form.interestRateAnnual);
    const insuranceAnnualRate = parseNumberInput(form.insuranceRateAnnual);
    const buyoutAmount = parseNumberInput(form.buyoutAmount);

    if (
      price == null ||
      termMonths == null ||
      annualRate == null ||
      insuranceAnnualRate == null
    ) {
      return null;
    }

    return calculateCommercialOffer({
      priceVat: price,
      firstPaymentAmount: firstPayment,
      firstPaymentSource: form.firstPaymentSource,
      termMonths,
      interestRateAnnual: annualRate,
      insuranceRateAnnual: insuranceAnnualRate,
      buyoutAmount,
      method: form.calculationMethod,
    });
  }, [
    resolvedFirstPayment.amount,
    form.insuranceRateAnnual,
    form.interestRateAnnual,
    form.buyoutAmount,
    priceValue,
    form.termMonths,
    form.firstPaymentSource,
    form.calculationMethod,
  ]);

  const calculations = useMemo(() => {
    if (!calculationResult) {
      return [
        { label: "Месячная ставка, %", value: "—" },
        { label: "Ставка за срок, %", value: "—" },
        { label: "Финансируемая сумма", value: "—" },
        { label: "Итого к погашению", value: "—" },
        { label: "Ежемесячный платёж", value: "—" },
        { label: "Доход по процентам", value: "—" },
        { label: "Годовая страховка", value: "—" },
        { label: "Сумма первого месяца", value: "—" },
        { label: "Итого для покупателя", value: "—" },
      ];
    }

    const result = calculationResult;
    return [
      { label: "Месячная ставка, %", value: formatPercent(result.rates.monthly) },
      { label: "Ставка за срок, %", value: formatPercent(result.rates.period) },
      { label: "Финансируемая сумма", value: formatCurrencyAED(result.financedAmount) },
      { label: "Итого к погашению", value: formatCurrencyAED(result.financedAmount + result.totalInterest) },
      { label: "Ежемесячный платёж", value: formatCurrencyAED(result.monthlyPayment) },
      { label: "Доход по процентам", value: formatCurrencyAED(result.totalInterest) },
      { label: "Годовая страховка", value: formatCurrencyAED(result.insuranceAnnual) },
      { label: "Сумма первого месяца", value: formatCurrencyAED(result.initialPayment) },
      { label: "Итого для покупателя", value: formatCurrencyAED(result.totalClientCost) },
    ];
  }, [calculationResult]);

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
        <div className="space-y-1">
          <Label htmlFor="calculationMethod">Алгоритм расчёта</Label>
          <Select
            value={form.calculationMethod}
            onValueChange={handleMethodChange}
            name="calculationMethod"
          >
            <SelectTrigger id="calculationMethod" className="rounded-lg">
              <SelectValue placeholder="Выберите метод" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Стандартный (Annuity)</SelectItem>
              <SelectItem value="inclusive_vat">С выкупной стоимостью (Buyout)</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                <Label htmlFor="firstPaymentAmount" className="text-xs text-muted-foreground">
                  First payment, AED
                </Label>
                <Input
                  id="firstPaymentAmount"
                  name="firstPaymentAmount"
                  value={form.firstPaymentAmount}
                  onChange={(event) => handleFirstPaymentAmountChange(event.target.value)}
                  placeholder="20000"
                  className="rounded-lg"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="firstPaymentPercent" className="text-xs text-muted-foreground">
                  First payment, %
                </Label>
                <Input
                  id="firstPaymentPercent"
                  name="firstPaymentPercent"
                  value={form.firstPaymentPercent}
                  onChange={(event) => handleFirstPaymentPercentChange(event.target.value)}
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
                placeholder="4"
                className="rounded-lg"
                inputMode="decimal"
              />
            </div>
            {form.calculationMethod === "inclusive_vat" && (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="buyoutAmount">Выкупная стоимость, AED</Label>
                <Input
                  id="buyoutAmount"
                  name="buyoutAmount"
                  value={form.buyoutAmount}
                  onChange={(event) => handleInputChange("buyoutAmount", event.target.value)}
                  placeholder="10000"
                  className="rounded-lg"
                  inputMode="decimal"
                />
              </div>
            )}
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
        {calculationResult?.schedule && calculationResult.schedule.length > 0 && (
          <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
            <button
              type="button"
              onClick={() => setIsScheduleOpen(!isScheduleOpen)}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>График платежей</span>
              {isScheduleOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isScheduleOpen && (
              <Table containerClassName="mt-3 border-0 rounded-none">
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs hover:bg-muted/50">
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead className="text-right">Платёж</TableHead>
                      <TableHead className="text-right">Тело</TableHead>
                      <TableHead className="text-right">Проценты</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Остаток</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculationResult.schedule.map((row) => (
                      <TableRow key={row.month} className="text-xs">
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right">{formatCurrencyPlain(row.amount)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrencyPlain(row.principal)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrencyPlain(row.interest)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrencyPlain(row.vat)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrencyPlain(row.balance)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 text-xs font-semibold hover:bg-muted/50">
                      <TableCell colSpan={2}>Итого</TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyPlain(calculationResult.schedule.reduce((acc, row) => acc + row.amount, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyPlain(
                          calculationResult.schedule.reduce((acc, row) => acc + row.principal, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyPlain(
                          calculationResult.schedule.reduce((acc, row) => acc + row.interest, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyPlain(calculationResult.schedule.reduce((acc, row) => acc + row.vat, 0))}
                      </TableCell>
                      <TableCell className="text-right">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
            )}
          </div>
        )}
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
