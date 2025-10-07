import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function InvestorPortfolioPage() {
  return (
    <RouteScaffold
      title="Инвестор · Портфель"
      description="Список активов, доходность и фильтры из /beta/investor/portfolio/index.html."
      referencePath="/beta/investor/portfolio/index.html"
    />
  );
}
