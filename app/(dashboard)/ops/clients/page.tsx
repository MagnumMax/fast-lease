import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function OpsClientsPage() {
  return (
    <RouteScaffold
      title="Операции · Клиенты"
      description="Список клиентов с фильтрами, модалками и поиском из /beta/ops/clients/index.html."
      referencePath="/beta/ops/clients/index.html"
    />
  );
}
