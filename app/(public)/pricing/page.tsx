import { Check, Minus, Sparkles } from "lucide-react";

import {
  pricingComparison,
  pricingFaqs,
  pricingPlans,
} from "@/lib/data/pricing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PricingEstimator } from "./_components/pricing-estimator";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function PricingPage() {
  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Финансовые программы
          </span>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Тарифы и buy-out программы Fast Lease
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Выберите пакет, который соответствует вашему сценарию владения.
              Все программы включают телематику, страховки и поддержку Fast
              Lease. Скидка на buy-out применяется автоматически.<br />
              <span className="font-medium text-foreground">
                Growth
              </span>{" "}
              — баланс стоимости и сервисов, рекомендован для большинства
              клиентов.
            </p>
          </div>
          <div className="rounded-3xl border border-dashed border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
            <Sparkles className="mr-2 inline h-4 w-4 align-middle text-brand-600" />
            Заполните заявку онлайн — рассмотрим в среднем за 6 рабочих часов.
          </div>
        </div>
        <PricingEstimator />
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Сравните пакеты
          </h2>
          <Button asChild variant="ghost" className="rounded-xl">
            <a href="/apply/start">Оформить заявку</a>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.id}
              className={plan.recommended ? "border-brand-500" : undefined}
            >
              <CardHeader className="border-none">
                <CardTitle className="flex items-center justify-between text-2xl">
                  {plan.name}
                  {plan.recommended ? (
                    <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                      Рекомендация
                    </span>
                  ) : null}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">От</p>
                  <p className="text-3xl font-semibold text-foreground">
                    {formatCurrency(plan.priceAED)}
                    <span className="text-base font-normal text-muted-foreground">
                      / месяц
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Срок {plan.termMonths} месяцев · аванс {plan.downPaymentPercent}%
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.includes.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 rounded-xl bg-surface-subtle px-3 py-2"
                    >
                      <Check className="mt-0.5 h-4 w-4 text-brand-600" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-none">
                <Button asChild className="w-full rounded-xl" variant={plan.recommended ? "brand" : "outline"}>
                  <a href={`/apply/start?plan=${plan.id}`}>Выбрать тариф</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">
          Что входит в тарифы
        </h2>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-linear">
          <div className="grid grid-cols-4 border-b border-border bg-surface-subtle px-6 py-4 text-left text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <span>Опции</span>
            <span>Foundation</span>
            <span>Growth</span>
            <span>Enterprise</span>
          </div>
          <div className="divide-y divide-border">
            {pricingComparison.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-4 items-center px-6 py-3 text-sm text-muted-foreground"
              >
                <span className="font-medium text-foreground">{row.label}</span>
                <ComparisonCell active={row.foundation} />
                <ComparisonCell active={row.growth} />
                <ComparisonCell active={row.enterprise} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Частые вопросы
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {pricingFaqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-border bg-card p-5 shadow-linear"
            >
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function ComparisonCell({ active }: { active: boolean }) {
  return active ? (
    <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
      <Check className="h-4 w-4" aria-hidden="true" />
      Включено
    </span>
  ) : (
    <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
      <Minus className="h-4 w-4" aria-hidden="true" />
      Нет
    </span>
  );
}
