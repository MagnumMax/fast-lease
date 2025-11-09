import { RoleDashboardPlaceholder } from "@/components/placeholders/role-dashboard-placeholder";

const metrics = [
  {
    label: "Заявки в скоринге",
    value: "32",
    trend: "11 ждут документов",
    tone: "warning" as const,
  },
  {
    label: "Approve rate",
    value: "61%",
    trend: "+4pp к прошлой неделе",
    tone: "positive" as const,
  },
  {
    label: "Средний SLA",
    value: "3.4 ч",
    trend: "2 заявки просрочены",
    tone: "warning" as const,
  },
  {
    label: "Потенциальный риск",
    value: "AED 2.8M",
    trend: "4 сделок в High",
    tone: "critical" as const,
  },
];

const highlights = [
  {
    title: "AECB задержка",
    description: "API отвечает 4-5 секунд. Возможны таймауты для batch скоринга.",
    status: "Мониторинг",
    tone: "info" as const,
  },
  {
    title: "LTR-081125-9021",
    description: "Новый работодатель, нет подтверждения payroll. Нужна ручная верификация.",
    status: "Manual review",
    tone: "warning" as const,
  },
  {
    title: "Порог по отрасли",
    description: "Transportation превысил лимит концентрации. Нужно согласование с EXCO.",
    status: "High",
    tone: "critical" as const,
  },
];

const actions = [
  {
    title: "Утвердить скоринг пакета #R-118",
    owner: "Senior RM",
    due: "12:00",
    status: "5 заявок",
    tone: "info" as const,
  },
  {
    title: "Пересчитать PD по новой модели",
    owner: "Risk Analytics",
    due: "Сегодня",
    status: "v4 beta",
    tone: "positive" as const,
  },
  {
    title: "Эскалировать 2 отклонения в Legal",
    owner: "Risk Lead",
    due: "EOD",
    status: "compliance",
    tone: "warning" as const,
  },
];

export default function RiskDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      title="Риск-менеджмент"
      description="Скоринг заявок, лимиты и концентрации."
      referencePath="docs/portal-sitemap.md#/risk/dashboard"
      metrics={metrics}
      highlights={highlights}
      actions={actions}
    />
  );
}
