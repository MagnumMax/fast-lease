import { RoleDashboardPlaceholder } from "@/components/placeholders/role-dashboard-placeholder";

const metrics = [
  {
    label: "Сборы за неделю",
    value: "AED 1.2M",
    trend: "+14% к плану",
    tone: "positive" as const,
  },
  {
    label: "Просрочка > 30 дн",
    value: "AED 320K",
    trend: "+12% к цели",
    tone: "warning" as const,
  },
  {
    label: "Платежи сегодня",
    value: "AED 180K",
    trend: "11 в обработке",
    tone: "info" as const,
  },
  {
    label: "Пулы инвесторам",
    value: "AED 640K",
    trend: "Следующая волна 15:00",
    tone: "info" as const,
  },
];

const highlights = [
  {
    title: "Collections",
    description: "21 договор просрочен >15 дней. Нужно согласовать эскалации и hand-off в поддержку.",
    status: "SLA 24h",
    tone: "warning" as const,
  },
  {
    title: "Reconciliation",
    description: "Расхождение по payout #LTR-081125-1098 (Stripe vs. bank) — 18K AED без привязки.",
    status: "High",
    tone: "critical" as const,
  },
  {
    title: "FX лимит",
    description: "Остаток по USD котировке 65%. Проверьте заявки инвесторов до закрытия торгов.",
    status: "Ежедневный контроль",
    tone: "info" as const,
  },
];

const actions = [
  {
    title: "Отправить batch выплат инвесторам",
    owner: "Finance Ops",
    due: "15:00",
    status: "wave-27",
    tone: "info" as const,
  },
  {
    title: "Согласовать реструктуризацию LTR-081125-9042",
    owner: "Risk + Finance",
    due: "Сегодня",
    status: "ждёт подписи",
    tone: "warning" as const,
  },
  {
    title: "Обновить лимиты на оплату сервисов",
    owner: "Accounting",
    due: "Завтра",
    status: "CapEx budget",
    tone: "positive" as const,
  },
];

export default function FinanceDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      title="Финансы"
      description="Кассовые позиции, просрочка и график выплат."
      referencePath="docs/portal-sitemap.md#/finance/overview"
      metrics={metrics}
      highlights={highlights}
      actions={actions}
    />
  );
}
