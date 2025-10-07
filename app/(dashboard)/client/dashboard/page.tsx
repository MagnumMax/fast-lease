import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function ClientDashboardPage() {
  return (
    <RouteScaffold
      title="Клиент · Дашборд"
      description="Главная панель клиента с таймлайном заявки и KPI карточками. Основана на /beta/client/dashboard/index.html."
      referencePath="/beta/client/dashboard/index.html"
    />
  );
}
