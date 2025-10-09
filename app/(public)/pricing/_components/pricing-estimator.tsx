"use client";

import { useMemo, useState } from "react";
import { Calculator, Percent, Wallet } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRICE_RANGE = {
  min: 150_000,
  max: 900_000,
  step: 10_000,
};

const TERM_OPTIONS = [24, 36, 48, 60];
const DOWN_PAYMENT_OPTIONS = [10, 15, 20, 30];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
  }).format(value);
}

function calculateMonthlyPayment(
  vehiclePrice: number,
  termMonths: number,
  downPaymentPercent: number,
) {
  const downPayment = vehiclePrice * (downPaymentPercent / 100);
  const financedAmount = vehiclePrice - downPayment;
  const flatRate = 0.045; // 4.5% effective annual rate
  const financeFee = financedAmount * flatRate * (termMonths / 12);
  const serviceBundle = 450; // fixed monthly service + telematics
  const monthly = (financedAmount + financeFee) / termMonths + serviceBundle;
  return {
    monthly,
    downPayment,
    totalPayable: downPayment + monthly * termMonths,
  };
}

export function PricingEstimator() {
  const [vehiclePrice, setVehiclePrice] = useState<number>(420_000);
  const [term, setTerm] = useState<number>(36);
  const [downPercent, setDownPercent] = useState<number>(15);

  const estimation = useMemo(
    () => calculateMonthlyPayment(vehiclePrice, term, downPercent),
    [vehiclePrice, term, downPercent],
  );

  return (
    <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-linear">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calculator className="h-4 w-4" aria-hidden="true" />
          Калькулятор стоимости
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Оцените ежемесячный платёж до подачи заявки. Итоговые условия
          подтверждаются после скоринга.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="vehicle-price">Стоимость автомобиля</Label>
          <Input
            id="vehicle-price"
            type="range"
            min={PRICE_RANGE.min}
            max={PRICE_RANGE.max}
            step={PRICE_RANGE.step}
            value={vehiclePrice}
            onChange={(event) =>
              setVehiclePrice(Number(event.target.value) || PRICE_RANGE.min)
            }
            aria-valuetext={formatCurrency(vehiclePrice)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(PRICE_RANGE.min)}</span>
            <span>{formatCurrency(vehiclePrice)}</span>
            <span>{formatCurrency(PRICE_RANGE.max)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="term-select">Срок лизинга</Label>
            <select
              id="term-select"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              value={term}
              onChange={(event) => setTerm(Number(event.target.value))}
            >
              {TERM_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} месяцев
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="down-payment-select">Авансовый платёж</Label>
            <select
              id="down-payment-select"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              value={downPercent}
              onChange={(event) => setDownPercent(Number(event.target.value))}
            >
              {DOWN_PAYMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}% от стоимости
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wallet className="h-4 w-4" aria-hidden="true" />
            Ежемесячный платёж
          </div>
          <span className="text-base font-semibold text-foreground">
            {formatCurrency(estimation.monthly)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-1 lg:grid-cols-2">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4" aria-hidden="true" />
            Авансовый платёж:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(estimation.downPayment)}
            </span>
          </div>
          <div>
            Общая стоимость программы:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(estimation.totalPayable)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Расчёт носит справочный характер и не является публичной офертой.
          Индивидуальное предложение формируется после проверки документов.
        </p>
      </div>
    </div>
  );
}
