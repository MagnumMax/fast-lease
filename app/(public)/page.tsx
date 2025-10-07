import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function LandingPage() {
  return (
    <div className="space-y-6">
      <RouteScaffold
        title="Главная · Каталог автомобилей"
        description="Реализация повторяет прототип /beta/index.html. Здесь появится каталог, фильтры и hero-блок в точности по спецификации."
        referencePath="/beta/index.html"
      />
    </div>
  );
}
