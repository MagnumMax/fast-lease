import { RoleDashboardPlaceholder } from "@/components/placeholders/role-dashboard-placeholder";

const metrics = [
  {
    label: "Открытые обращения",
    value: "68",
    trend: "12 с приоритетом High",
    tone: "warning" as const,
  },
  {
    label: "SLA 1 линия",
    value: "92%",
    trend: "−3% к прошлой неделе",
    tone: "warning" as const,
  },
  {
    label: "CSAT rolling",
    value: "4.7 / 5",
    trend: "+0.2 за 30 дней",
    tone: "positive" as const,
  },
  {
    label: "Автоматизация",
    value: "38%",
    trend: "flows WhatsApp + IVR",
    tone: "info" as const,
  },
];

const highlights = [
  {
    title: "WhatsApp очередь",
    description: "14 клиентов ждут подтверждение статус \"Vehicle ready\". Нужно синкнуть с ops.",
    status: "ETA 1h",
    tone: "warning" as const,
  },
  {
    title: "Инцидент IVR",
    description: "Потеря записей звонков 04:00–06:00 GST. Требуется аплоад в CRM.",
    status: "P2",
    tone: "critical" as const,
  },
  {
    title: "Новые шаблоны",
    description: "Product загрузил 3 сообщения для статуса Delivery. Нужна проверка copy + юр. согласование.",
    status: "Review",
    tone: "info" as const,
  },
];

const actions = [
  {
    title: "Назначить менеджеров на SLA 4h",
    owner: "Support Lead",
    due: "Через 30 мин",
    status: "Shift #2",
    tone: "warning" as const,
  },
  {
    title: "Передать 5 заявок в Risk",
    owner: "Escalations",
    due: "Сегодня",
    status: "pipeline R-21",
    tone: "info" as const,
  },
  {
    title: "Обновить макросы Zendesk",
    owner: "Automation",
    due: "Завтра",
    status: "v2 rollout",
    tone: "positive" as const,
  },
];

export default function SupportDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      title="Поддержка"
      description="Очереди обращений, SLA и автоматизация коммуникаций."
      referencePath="docs/portal-sitemap.md#/support/dashboard"
      metrics={metrics}
      highlights={highlights}
      actions={actions}
    />
  );
}
