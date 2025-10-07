import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function ApplicationProfilePage() {
  return (
    <RouteScaffold
      title="Заявка · Шаг 2: Профиль заявителя"
      description="Форма персональных и контактных данных. Переносим поля и валидацию из /beta/application/new/index.html."
      referencePath="/beta/application/new/index.html"
    />
  );
}
