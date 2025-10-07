import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function ApplicationStatusPage() {
  return (
    <RouteScaffold
      title="Заявка · Статус обработки"
      description="Страница визуализации пайплайна обработки заявки, повторяет /beta/application/submitted/index.html."
      referencePath="/beta/application/submitted/index.html"
    />
  );
}
