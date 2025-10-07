import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function ApplicationSummaryPage() {
  return (
    <RouteScaffold
      title="Заявка · Шаг 4: Резюме и подписание"
      description="Финальное подтверждение заявки с recaptcha, чекбоксами и расчетом платежей из /beta/application/new/index.html."
      referencePath="/beta/application/new/index.html"
    />
  );
}
