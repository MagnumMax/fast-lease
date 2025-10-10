"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, FileText, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getCarById } from "@/lib/data/cars";
import { pricingPlans } from "@/lib/data/pricing";

import { useApplicationForm } from "../../_components/application-form-context";

export default function ApplicationStatusPage() {
  const router = useRouter();
  const { draft, resetDraft, isHydrated } = useApplicationForm();

  if (!isHydrated) {
    return <div className="h-40 animate-pulse rounded-3xl bg-surface-subtle" />;
  }

  const selectedCar = draft.selectedCarId
    ? getCarById(draft.selectedCarId)
    : undefined;
  const selectedPlan = draft.planId
    ? pricingPlans.find((plan) => plan.id === draft.planId)
    : undefined;

  if (draft.status !== "submitted") {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-linear">
          <Clock className="mx-auto h-12 w-12 text-brand-600" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">
            Заявка в процессе заполнения
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Вы не завершили процесс подачи. Продолжите со шага, на котором
            остановились, документы и данные сохранены на устройстве.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-xl">
              <Link href="/apply/start">Продолжить заполнение</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                resetDraft();
                router.push("/apply/start");
              }}
            >
              Начать заново
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-6 rounded-3xl border border-border bg-card p-6 text-center shadow-linear">
        <CheckCircle2
          className="mx-auto h-12 w-12 text-emerald-500"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-semibold text-foreground">
          Заявка отправлена
        </h1>
        <p className="text-sm text-muted-foreground">
          Спасибо! Мы получили вашу заявку и уже начали верификацию данных.
          Менеджер свяжется с вами в течение 6 рабочих часов.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-xl">
            <Link href="/login">Войти в личный кабинет</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-border">
            <Link href="/">На главную</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Черновик сохранён до {formatDateRelative(draft.submittedAt)}. После
          входа в личный кабинет вы сможете отслеживать статус и загружать
          дополнительные документы.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <StatusCard
          title="Заявка"
          description="Основная информация"
          icon={<FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />}
        >
          <dl className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <dt>Номер</dt>
              <dd>{draft.createdAt.slice(0, 10).replace(/-/g, "")}-FL</dd>
            </div>
            <div className="flex justify-between">
              <dt>Отправлено</dt>
              <dd>{formatDate(draft.submittedAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Резидент</dt>
              <dd>
                {draft.residencyStatus === "resident"
                  ? "Резидент ОАЭ"
                  : "Нерезидент"}
              </dd>
            </div>
          </dl>
        </StatusCard>

        <StatusCard
          title="Статус обработки"
          description="Мы проверяем документы"
          icon={<RefreshCcw className="h-4 w-4 text-brand-600" aria-hidden="true" />}
        >
          <p className="text-sm text-muted-foreground">
            Сейчас заявка находится у команды скоринга. Проверяем документы,
            подтверждаем платежеспособность и готовим драфт договора.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Сервис отправит уведомление на email и в личный кабинет, как только
            потребуется дополнительная информация.
          </p>
        </StatusCard>
      </section>

      <section className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-linear md:grid-cols-2">
        <div className="space-y-3 border-b border-border pb-4 md:border-b-0 md:border-r md:pb-0">
          <h3 className="text-sm font-semibold text-foreground">Автомобиль</h3>
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
              Автомобиль будет согласован с менеджером.
            </p>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Тариф</h3>
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
              Детали будут уточнены после согласования.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-border bg-surface-subtle px-6 py-5 text-sm text-muted-foreground shadow-linear">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Хотите оформить ещё одну заявку? Вы можете начать новый процесс прямо
            сейчас, черновик текущей сохранён.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl border-border"
            onClick={() => {
              resetDraft();
              router.push("/apply/start");
            }}
          >
            Новая заявка
          </Button>
        </div>
      </section>
    </div>
  );
}

function StatusCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-linear">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateRelative(value?: string) {
  if (!value) return "24 часа";
  const date = new Date(value);
  const formatter = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });
  const now = new Date();
  const diff = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));
  return formatter.format(diff, "hour");
}
