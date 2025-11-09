import { Headset, LifeBuoy, MapPin, PhoneCall, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  officeLocations,
  supportChannels,
  supportWorkflow,
} from "@/lib/data/support";

export default function SupportPage() {
  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Поддержка Fast Lease
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Всегда на связи 24/7
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Мы сопровождаем клиента на всех этапах владения автомобилем: от
            оформления заявки до обслуживания и buy-out. Выберите удобный канал,
            и команда поддержки подключится в течение SLA.
          </p>
          <div className="rounded-3xl border border-dashed border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
            <Headset className="mr-2 inline h-4 w-4 align-middle text-brand-600" />
            92% запросов закрываем менее чем за 6 часов. Экстренные обращения —
            в приоритете.
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-linear">
          <h2 className="text-sm font-semibold text-foreground">
            Написать в поддержку
          </h2>
          <p className="text-sm text-muted-foreground">
            Опишите вопрос, и мы свяжемся с вами по телефону или email.
          </p>
          <form className="grid gap-3 text-sm text-muted-foreground">
            <div className="grid gap-2">
              <Label htmlFor="support-name">Имя</Label>
              <Input
                id="support-name"
                required
                placeholder="Например, Алексей Иванов"
                className="rounded-xl border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="support-email">Email или телефон</Label>
              <Input
                id="support-email"
                required
                placeholder="you@example.com"
                className="rounded-xl border-border"
                type="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="support-subject">Тема</Label>
              <Input
                id="support-subject"
                placeholder="Например, продление договора"
                className="rounded-xl border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="support-message">Сообщение</Label>
              <Textarea
                id="support-message"
                placeholder="Опишите ситуацию или вопрос..."
                className="rounded-xl"
              />
            </div>
            <Button type="submit" className="mt-2 rounded-xl">
              Отправить запрос
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Нажимая на кнопку, вы соглашаетесь с обработкой персональных данных
            и условиями оферты Fast Lease.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">
          Каналы поддержки
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {supportChannels.map((channel) => (
            <article
              key={channel.id}
              className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-linear"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">
                  {channel.title}
                </h3>
                <span className="rounded-full bg-surface-subtle px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {channel.availability}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {channel.description}
              </p>
              <p className="text-lg font-semibold text-foreground">
                {channel.contact}
              </p>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-xl border-border text-sm font-medium"
              >
                <a href={channel.href} target="_blank" rel="noreferrer">
                  {channel.actionLabel}
                </a>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Как мы решаем запросы
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {supportWorkflow.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-linear"
            >
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span>Шаг {index + 1}</span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Timer className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  {step.eta}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Офисы и выдача автомобилей
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {officeLocations.map((office) => (
            <article
              key={office.city}
              className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-linear"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
                {office.city}
              </div>
              <p className="text-sm text-muted-foreground">{office.address}</p>
              <p className="text-sm text-muted-foreground">
                Часы работы: {office.workingHours}
              </p>
              <p className="text-sm font-medium text-foreground">
                Телефон: {office.phone}
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-border"
                >
                  <a href={`tel:${office.phone.replace(/\s/g, "")}`}>
                    <PhoneCall className="mr-2 h-4 w-4" aria-hidden="true" />
                    Позвонить
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                >
                  <a href={office.mapLink} target="_blank" rel="noreferrer">
                    Открыть карту
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-border bg-surface-subtle px-6 py-5 text-sm text-muted-foreground shadow-linear">
        <div className="flex flex-wrap items-center gap-3">
          <LifeBuoy className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <span>
            Есть аккаунт? Войдите, чтобы отслеживать тикеты и историю запросов в
            режиме реального времени.
          </span>
          <Button asChild size="sm" variant="brand" className="rounded-xl">
            <a href="/login">Войти в личный кабинет</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
