import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function OpsCarsPage() {
  return (
    <RouteScaffold
      title="Операции · Автопарк"
      description="Управление автопарком, фильтры и интеграции с телематикой из /beta/ops/cars/index.html."
      referencePath="/beta/ops/cars/index.html"
    />
  );
}
