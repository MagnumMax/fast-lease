import { RoleDashboardPlaceholder } from "@/components/placeholders/role-dashboard-placeholder";

const metrics = [
  {
    label: "Инспекции сегодня",
    value: "12",
    trend: "3 в висячих статусах",
    tone: "warning" as const,
  },
  {
    label: "Средний TAT",
    value: "2.6 ч",
    trend: "−18 мин к прошлой неделе",
    tone: "positive" as const,
  },
  {
    label: "Сервисные заявки",
    value: "27",
    trend: "8 требуют фото",
    tone: "info" as const,
  },
  {
    label: "Отказы QA",
    value: "2",
    trend: "VIN #7801, #7813",
    tone: "critical" as const,
  },
];

const highlights = [
  {
    title: "Отсутствуют фото панели",
    description: "LTR-081125-7813 не загрузил 6 фото после сервиса. Нужен повторный вызов клиента.",
    status: "Follow-up",
    tone: "warning" as const,
  },
  {
    title: "Сервисный центр Dubai South",
    description: "SLAs нарушены 3 раза. Требуется отчёт и возможная ротация поставщика.",
    status: "Audit",
    tone: "critical" as const,
  },
  {
    title: "Новые чек-листы",
    description: "Инженерия обновила 9 пунктов для EV-моделей. Нужно внедрить с завтрашней смены.",
    status: "Release",
    tone: "info" as const,
  },
];

const actions = [
  {
    title: "Назначить инспектора на VIN 5YJ3E1EA",
    owner: "Field Ops",
    due: "Через 1 ч",
    status: "inspection-queue",
    tone: "warning" as const,
  },
  {
    title: "Подтвердить ремонт у партнёра #SR-2109",
    owner: "Workshop",
    due: "Сегодня",
    status: "quote ready",
    tone: "info" as const,
  },
  {
    title: "Закрыть QA для 4 доставок",
    owner: "Tech QA",
    due: "18:00",
    status: "handover",
    tone: "positive" as const,
  },
];

export default function TechDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      title="Технический контроль"
      description="Инспекции, сервисные заказы и качество выдач."
      referencePath="docs/portal-sitemap.md#/tech/dashboard"
      metrics={metrics}
      highlights={highlights}
      actions={actions}
    />
  );
}
