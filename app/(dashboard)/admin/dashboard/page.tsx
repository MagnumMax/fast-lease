import { RoleDashboardPlaceholder } from "@/components/placeholders/role-dashboard-placeholder";

const metrics = [
  {
    label: "Активные пользователи",
    value: "128",
    trend: "+6 за неделю",
    tone: "positive" as const,
  },
  {
    label: "Запросы на доступ",
    value: "14",
    trend: "4 ожидают подтверждения",
    tone: "warning" as const,
  },
  {
    label: "Инциденты интеграций",
    value: "2",
    trend: "Webhook + e-sign",
    tone: "critical" as const,
  },
  {
    label: "Деплои последних 24ч",
    value: "3",
    trend: "production синхронизирован",
    tone: "info" as const,
  },
];

const highlights = [
  {
    title: "RBAC матрица",
    description: "Появились новые роли risk/legal — нужно обновить правила в Supabase и sync c workflow.",
    status: "Due сегодня",
    tone: "warning" as const,
  },
  {
    title: "Мониторинг интеграций",
    description: "Webhook AECB отправил 3 ошибки подряд. Проверьте креды и ретраи.",
    status: "High",
    tone: "critical" as const,
  },
  {
    title: "Настройки уведомлений",
    description: "Product просит включить WhatsApp для статуса \"Delivery scheduled\".",
    status: "Запрос #4821",
    tone: "info" as const,
  },
];

const actions = [
  {
    title: "Одобрить 4 заявки на доступ",
    owner: "Security",
    due: "До 13:00",
    status: "Миграция ролей",
    tone: "warning" as const,
  },
  {
    title: "Синхронизировать edge functions",
    owner: "Platform",
    due: "Сегодня",
    status: "release-2024.06",
    tone: "info" as const,
  },
  {
    title: "Утвердить интеграцию ERP",
    owner: "CTO",
    due: "Завтра",
    status: "ждёт подписания",
    tone: "positive" as const,
  },
];

export default function AdminDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      title="Администратор"
      description="Системные показатели и статусы инфраструктуры Fast Lease."
      referencePath="docs/portal-sitemap.md#/admin"
      metrics={metrics}
      highlights={highlights}
      actions={actions}
    />
  );
}
