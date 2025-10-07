import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function ApplicationStartPage() {
  return (
    <RouteScaffold
      title="Заявка · Шаг 1: Старт"
      description="Экран стартовой анкеты с выбором автомобиля и ключевых параметров. Базируется на первом шаге /beta/application/new/index.html."
      referencePath="/beta/application/new/index.html"
    />
  );
}
