import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function InvestorDashboardPage() {
  return (
    <RouteScaffold
      title="Инвестор · Дашборд"
      description="Обзор портфеля, графики доходности и KPI из /beta/investor/dashboard/index.html."
      referencePath="/beta/investor/dashboard/index.html"
    />
  );
}
