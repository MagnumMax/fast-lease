"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CommercialOfferDownloadButton,
  type CommercialOfferData,
} from "@/app/(dashboard)/ops/_components/commercial-offer-pdf";
import { saveCommercialOffer, type SaveCommercialOfferResult } from "@/app/(dashboard)/ops/deals/[id]/actions";
import type { OpsCommercialOffer } from "@/lib/supabase/queries/operations";

const DEFAULT_COMMERCIAL_OFFER = {
  priceVat: 350000,
  termMonths: 12,
  downPayment: 70000,
  interestRateAnnual: 25,
  insuranceRateAnnual: 4,
};

const FIELD_CONFIG: Array<{
  id: "priceVat" | "termMonths" | "downPayment" | "interestRateAnnual" | "insuranceRateAnnual";
  label: string;
  placeholder: string;
}> = [
  { id: "priceVat", label: "Стоимость с VAT, AED", placeholder: "Например, 145000" },
  { id: "termMonths", label: "Срок, месяцев", placeholder: "36" },
  { id: "downPayment", label: "Аванс, AED", placeholder: "20000" },
  { id: "interestRateAnnual", label: "Ставка финансирования, % годовых", placeholder: "8.5" },
  { id: "insuranceRateAnnual", label: "Ставка страхования, % годовых", placeholder: "2.1" },
];

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
      priceVat: formatInitialNumber(offer?.priceVat ?? DEFAULT_COMMERCIAL_OFFER.priceVat),
      termMonths: formatInitialNumber(offer?.termMonths ?? DEFAULT_COMMERCIAL_OFFER.termMonths),
      downPayment: formatInitialNumber(offer?.downPaymentAmount ?? DEFAULT_COMMERCIAL_OFFER.downPayment),
      interestRateAnnual: formatInitialNumber(offer?.interestRateAnnual ?? DEFAULT_COMMERCIAL_OFFER.interestRateAnnual),
      insuranceRateAnnual: formatInitialNumber(
        offer?.insuranceRateAnnual ?? DEFAULT_COMMERCIAL_OFFER.insuranceRateAnnual,
      ),
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

  function resetToPayload() {
    setForm({
      priceVat: formatInitialNumber(offer?.priceVat ?? DEFAULT_COMMERCIAL_OFFER.priceVat),
      termMonths: formatInitialNumber(offer?.termMonths ?? DEFAULT_COMMERCIAL_OFFER.termMonths),
      downPayment: formatInitialNumber(offer?.downPaymentAmount ?? DEFAULT_COMMERCIAL_OFFER.downPayment),
      interestRateAnnual: formatInitialNumber(offer?.interestRateAnnual ?? DEFAULT_COMMERCIAL_OFFER.interestRateAnnual),
      insuranceRateAnnual: formatInitialNumber(
        offer?.insuranceRateAnnual ?? DEFAULT_COMMERCIAL_OFFER.insuranceRateAnnual,
      ),
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {lastUpdated ? (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground/80">
              Обновлено: {lastUpdated} {offer?.updatedByName ? `• ${offer.updatedByName}` : ""}
            </p>
          </div>
        ) : <div />}
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
          ) : <div />}

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:ml-auto">
            <Button type="submit" size="sm" className="rounded-lg" disabled={pending}>
              {pending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Сохраняем...
                </span>
              ) : (
                "Сохранить"
              )}
            </Button>
            <CommercialOfferDownloadButton
              data={offerData}
              label="Скачать"
              iconOnly={false}
              ariaLabel="Скачать КП (PDF)"
              onGenerate={handleDownloadClick}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
