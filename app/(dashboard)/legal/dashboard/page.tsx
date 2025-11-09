import { RoleDashboardPlaceholder } from "@/components/placeholders/role-dashboard-placeholder";

const metrics = [
  {
    label: "Контракты в работе",
    value: "19",
    trend: "6 ждут подписи клиента",
    tone: "info" as const,
  },
  {
    label: "Turnaround",
    value: "5.2 ч",
    trend: "−40 мин к прошлому спринту",
    tone: "positive" as const,
  },
  {
    label: "Compliance alerts",
    value: "3",
    trend: "2 high-risk регионы",
    tone: "warning" as const,
  },
  {
    label: "E-sign отклонения",
    value: "1",
    trend: "LTR-081125-9107",
    tone: "critical" as const,
  },
];

const highlights = [
  {
    title: "KYC документы",
    description: "Клиент #LTR-081125-3421 загрузил просроченный Emirates ID. Нужен запрос обновления.",
    status: "Due 4h",
    tone: "warning" as const,
  },
  {
    title: "Новая редакция договора",
    description: "Product внёс изменения в clausу buy-out. Провести ревью до завтрашнего релиза.",
    status: "Review",
    tone: "info" as const,
  },
  {
    title: "Регуляторный запрос",
    description: "Central Bank запросил пакет документов по инвесторам batch-52.",
    status: "Critical",
    tone: "critical" as const,
  },
];

const actions = [
  {
    title: "Подготовить addendum для LTR-081125-9042",
    owner: "Legal Ops",
    due: "Сегодня",
    status: "новые условия",
    tone: "info" as const,
  },
  {
    title: "Проверить 3 e-sign ошибки",
    owner: "Digital Legal",
    due: "2 ч",
    status: "DocuSign",
    tone: "warning" as const,
  },
  {
    title: "Согласовать политику санкций",
    owner: "Compliance",
    due: "Пятница",
    status: "версия 1.3",
    tone: "positive" as const,
  },
];

export default function LegalDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      title="Юридический отдел"
      description="Договоры, e-sign и регуляторные запросы."
      referencePath="docs/portal-sitemap.md#/legal/dashboard"
      metrics={metrics}
      highlights={highlights}
      actions={actions}
    />
  );
}
