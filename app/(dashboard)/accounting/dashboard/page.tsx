import { RoleDashboardPlaceholder } from "@/components/placeholders/role-dashboard-placeholder";

const metrics = [
  {
    label: "Месяц закрыт на",
    value: "78%",
    trend: "GL сверен в 9 из 12 разделов",
    tone: "info" as const,
  },
  {
    label: "Журнал проводок",
    value: "412",
    trend: "+32 к вчера",
    tone: "warning" as const,
  },
  {
    label: "Неотмеченные расходы",
    value: "AED 97K",
    trend: "7 сервисных заказов",
    tone: "warning" as const,
  },
  {
    label: "Налоговые статусы",
    value: "OK",
    trend: "VAT return draft",
    tone: "positive" as const,
  },
];

const highlights = [
  {
    title: "Bank feeds",
    description: "Emirates NBD не прислал выгрузку за 02.07. Требуется ручной импорт.",
    status: "High",
    tone: "critical" as const,
  },
  {
    title: "CapEx tagging",
    description: "5 операций по сервису Tesla без проекта. Нужна разметка до закрытия дня.",
    status: "Due сегодня",
    tone: "warning" as const,
  },
  {
    title: "Аудиторский запрос",
    description: "KPMG просит расшифровку начисленных процентов по batch-44.",
    status: "External",
    tone: "info" as const,
  },
];

const actions = [
  {
    title: "Провести 18 ручных проводок",
    owner: "GL team",
    due: "14:00",
    status: "closing-week",
    tone: "warning" as const,
  },
  {
    title: "Сверить выплаты с FinOps",
    owner: "Accounting",
    due: "Сегодня",
    status: "wave-27",
    tone: "info" as const,
  },
  {
    title: "Обновить VAT декларацию",
    owner: "Tax",
    due: "3 дня",
    status: "draft",
    tone: "positive" as const,
  },
];

export default function AccountingDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      title="Бухгалтерия"
      description="Закрытие периода, проводки и соответствие налогам."
      referencePath="docs/portal-sitemap.md#/accounting/dashboard"
      metrics={metrics}
      highlights={highlights}
      actions={actions}
    />
  );
}
