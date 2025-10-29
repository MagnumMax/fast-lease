"use client";

import { useMemo, useState, useTransition, type ComponentProps } from "react";
import { useRouter } from "next/navigation";

import { Pencil, RefreshCw } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OpsDealDetail } from "@/lib/supabase/queries/operations";
import { OPS_WORKFLOW_STATUS_MAP } from "@/lib/supabase/queries/operations";
import { updateOperationsDeal } from "@/app/(dashboard)/ops/deals/[id]/actions";

type DealEditDialogProps = {
  detail: OpsDealDetail;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  triggerSize?: ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
};

type FormState = {
  dealNumber: string;
  source: string;
  statusKey: string;
  principalAmount: string;
  totalAmount: string;
  monthlyPayment: string;
  monthlyLeaseRate: string;
  interestRate: string;
  downPaymentAmount: string;
  securityDeposit: string;
  processingFee: string;
  termMonths: string;
  contractStartDate: string;
  contractEndDate: string;
  firstPaymentDate: string;
  activatedAt: string;
  completedAt: string;
};

type FormSectionProps = {
  title: string;
  description?: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
};

const STATUS_OPTIONS = Object.entries(OPS_WORKFLOW_STATUS_MAP);

function formatNumberInput(value: number | null | undefined, fractionDigits = 2) {
  if (value == null || Number.isNaN(Number(value))) {
    return "";
  }
  const numeric = Number(value);
  const formatted = numeric.toFixed(fractionDigits);
  if (Number(formatted) === numeric) {
    return numeric.toString();
  }
  return formatted;
}

function formatDateInput(value: string | null | undefined) {
  if (!value) return "";
  if (value.length >= 10) {
    return value.slice(0, 10);
  }
  return "";
}

function formatDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const tzOffsetMinutes = date.getTimezoneOffset();
  const localTime = new Date(date.getTime() - tzOffsetMinutes * 60 * 1000);
  return localTime.toISOString().slice(0, 16);
}

function FormSection({ title, description, columns = 2, children }: FormSectionProps) {
  const gridClass = columns === 1 ? "" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className={`grid gap-4 ${gridClass}`}>{children}</div>
    </div>
  );
}

export function DealEditDialog({
  detail,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName = "",
}: DealEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialState = useMemo<FormState>(() => {
    const defaults = detail.editDefaults;
    return {
      dealNumber: defaults.dealNumber ?? "",
      source: defaults.source ?? "",
      statusKey: defaults.statusKey ?? detail.statusKey,
      principalAmount: formatNumberInput(defaults.principalAmount, 2),
      totalAmount: formatNumberInput(defaults.totalAmount, 2),
      monthlyPayment: formatNumberInput(defaults.monthlyPayment, 2),
      monthlyLeaseRate: formatNumberInput(defaults.monthlyLeaseRate, 4),
      interestRate: formatNumberInput(defaults.interestRate, 4),
      downPaymentAmount: formatNumberInput(defaults.downPaymentAmount, 2),
      securityDeposit: formatNumberInput(defaults.securityDeposit, 2),
      processingFee: formatNumberInput(defaults.processingFee, 2),
      termMonths:
        defaults.termMonths != null && Number.isFinite(defaults.termMonths)
          ? String(defaults.termMonths)
          : "",
      contractStartDate: formatDateInput(defaults.contractStartDate),
      contractEndDate: formatDateInput(defaults.contractEndDate),
      firstPaymentDate: formatDateInput(defaults.firstPaymentDate),
      activatedAt: formatDateTimeInput(defaults.activatedAt),
      completedAt: formatDateTimeInput(defaults.completedAt),
    };
  }, [detail.editDefaults, detail.statusKey]);

  const [form, setForm] = useState<FormState>(initialState);

  const canSubmit = useMemo(() => {
    return !isPending;
  }, [isPending]);

  function resetForm() {
    setForm(initialState);
    setErrorMessage(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  function handleChange(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = event.currentTarget;
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await updateOperationsDeal({
        dealId: detail.dealUuid,
        slug: detail.slug,
        dealNumber: form.dealNumber,
        source: form.source,
        statusKey: form.statusKey,
        principalAmount: form.principalAmount,
        totalAmount: form.totalAmount,
        monthlyPayment: form.monthlyPayment,
        monthlyLeaseRate: form.monthlyLeaseRate,
        interestRate: form.interestRate,
        downPaymentAmount: form.downPaymentAmount,
        securityDeposit: form.securityDeposit,
        processingFee: form.processingFee,
        termMonths: form.termMonths,
        contractStartDate: form.contractStartDate,
        contractEndDate: form.contractEndDate,
        firstPaymentDate: form.firstPaymentDate,
        activatedAt: form.activatedAt,
        completedAt: form.completedAt,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={["gap-2", "rounded-lg", triggerClassName].filter(Boolean).join(" ")}
        >
          <Pencil className="h-4 w-4" /> Редактировать
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Редактирование сделки</DialogTitle>
            <DialogDescription>
              Обновите финансовые параметры и даты. Значения группированы так же, как на странице деталей.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormSection title="Сведения о сделке" description="Основная информация для идентификации">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Номер сделки</Label>
                <Input
                  value={form.dealNumber}
                  onChange={handleChange("dealNumber")}
                  placeholder="DEAL-2025-0001"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Источник</Label>
                <Input
                  value={form.source}
                  onChange={handleChange("source")}
                  placeholder="Например, CRM или портал"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Статус</Label>
                <select
                  value={form.statusKey}
                  onChange={handleChange("statusKey")}
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {STATUS_OPTIONS.map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.title}
                    </option>
                  ))}
                </select>
              </div>
            </FormSection>

            <FormSection title="Финансы" description="Суммы и ставки" columns={3}>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Сумма сделки</Label>
                <Input
                  value={form.principalAmount}
                  onChange={handleChange("principalAmount")}
                  placeholder="Например, 150000"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Общая сумма</Label>
                <Input
                  value={form.totalAmount}
                  onChange={handleChange("totalAmount")}
                  placeholder="Введите общую сумму"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ежемесячный платёж</Label>
                <Input
                  value={form.monthlyPayment}
                  onChange={handleChange("monthlyPayment")}
                  placeholder="Например, 3200"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ставка лизинга</Label>
                <Input
                  value={form.monthlyLeaseRate}
                  onChange={handleChange("monthlyLeaseRate")}
                  placeholder="0.015"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Процентная ставка</Label>
                <Input
                  value={form.interestRate}
                  onChange={handleChange("interestRate")}
                  placeholder="0.08"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Первоначальный взнос</Label>
                <Input
                  value={form.downPaymentAmount}
                  onChange={handleChange("downPaymentAmount")}
                  placeholder="Например, 20000"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Страховой депозит</Label>
                <Input
                  value={form.securityDeposit}
                  onChange={handleChange("securityDeposit")}
                  placeholder="Введите сумму"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Комиссия</Label>
                <Input
                  value={form.processingFee}
                  onChange={handleChange("processingFee")}
                  placeholder="Например, 1500"
                  className="rounded-lg"
                />
              </div>
            </FormSection>

            <FormSection title="Договор" description="Сроки и ключевые даты" columns={3}>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Срок (мес.)</Label>
                <Input
                  value={form.termMonths}
                  onChange={handleChange("termMonths")}
                  placeholder="24"
                  className="rounded-lg"
                  type="number"
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Старт договора</Label>
                <Input
                  value={form.contractStartDate}
                  onChange={handleChange("contractStartDate")}
                  type="date"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Окончание договора</Label>
                <Input
                  value={form.contractEndDate}
                  onChange={handleChange("contractEndDate")}
                  type="date"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Первая оплата</Label>
                <Input
                  value={form.firstPaymentDate}
                  onChange={handleChange("firstPaymentDate")}
                  type="date"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Активация</Label>
                <Input
                  value={form.activatedAt}
                  onChange={handleChange("activatedAt")}
                  type="datetime-local"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Завершение</Label>
                <Input
                  value={form.completedAt}
                  onChange={handleChange("completedAt")}
                  type="datetime-local"
                  className="rounded-lg"
                />
              </div>
            </FormSection>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-rose-400/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-900 dark:text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
              disabled={isPending}
              className="gap-2 rounded-lg"
            >
              <RefreshCw className="h-4 w-4" /> Сбросить
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-lg"
                disabled={isPending}
              >
                Отмена
              </Button>
              <Button type="submit" className="rounded-lg" disabled={!canSubmit}>
                {isPending ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
