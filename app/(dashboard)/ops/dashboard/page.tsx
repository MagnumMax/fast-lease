import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function OpsDashboardPage() {
  return (
    <RouteScaffold
      title="Операционный дашборд"
      description="Рабочий стол операционной команды с метриками и очередью задач из /beta/ops/dashboard/index.html."
      referencePath="/beta/ops/dashboard/index.html"
    />
  );
}
