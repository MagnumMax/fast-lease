"use client";

import { useMemo, useState } from "react";
import { BookOpen, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { publicFaqs } from "@/lib/data/faq";
import { cn } from "@/lib/utils";

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-linear"
          : "border-slate-300 text-slate-700 hover:border-brand-500 hover:text-brand-600",
      )}
    >
      {label}
    </button>
  );
}

export default function FaqPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all",
  );

  const questions = useMemo(() => {
    if (selectedCategory === "all") {
      return publicFaqs.flatMap((category) =>
        category.questions.map((question) => ({
          ...question,
          category: category.name,
        })),
      );
    }

    return publicFaqs
      .filter((category) => category.id === selectedCategory)
      .flatMap((category) =>
        category.questions.map((question) => ({
          ...question,
          category: category.name,
        })),
      );
  }, [selectedCategory]);

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          База знаний Fast Lease
        </span>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Часто задаваемые вопросы
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Собрали ответы на самые популярные вопросы о лизинге, платежах и
            сервисе. Используйте фильтры, чтобы быстрее найти нужную тему.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip
            label="Все темы"
            active={selectedCategory === "all"}
            onClick={() => setSelectedCategory("all")}
          />
          {publicFaqs.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.name}
              active={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {questions.map((faq) => (
          <details
            key={`${faq.category}-${faq.question}`}
            className="group rounded-3xl border border-border bg-card p-5 shadow-linear transition hover:shadow-2xl"
          >
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              {faq.question}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {faq.answer}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {faq.category}
            </p>
          </details>
        ))}
      </section>

      <section className="rounded-3xl border border-dashed border-border bg-surface-subtle px-6 py-5 text-sm text-muted-foreground shadow-linear">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <span>
            Не нашли ответ? Создайте тикет или напишите в чат — среднее время
            ответа 6 часов.
          </span>
          <Button asChild size="sm" variant="brand" className="rounded-xl">
            <a href="/support">Связаться с поддержкой</a>
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-linear">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
          Дополнительные ресурсы
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <ResourceLink
            label="Руководство по подаче заявки"
            description="Пошагово разбираем процесс оформления и верификации документов."
            href="/apply/start"
          />
          <ResourceLink
            label="Каталог автомобилей"
            description="Смотрите актуальные предложения и условия buy-out."
            href="/"
          />
          <ResourceLink
            label="Тарифы и buy-out программы"
            description="Сравните пакеты Foundation, Growth и Enterprise."
            href="/pricing"
          />
          <ResourceLink
            label="Кабинет покупателя"
            description="Отслеживайте платежи, документы и сервисные заявки."
            href="/login"
          />
        </div>
      </section>
    </div>
  );
}

function ResourceLink({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href: string;
}) {
  return (
    <a
      className="group flex flex-col gap-1 rounded-2xl border border-border bg-surface-subtle px-4 py-3 transition hover:border-brand-500 hover:bg-surface-subtle/80"
      href={href}
    >
      <span className="text-sm font-semibold text-foreground group-hover:text-brand-600">
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </a>
  );
}
