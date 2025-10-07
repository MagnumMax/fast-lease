import { RouteScaffold } from "@/components/placeholders/route-scaffold";

type OpsClientDetailsProps = {
  params: { id: string };
};

export default function OpsClientDetailsPage({
  params,
}: OpsClientDetailsProps) {
  return (
    <RouteScaffold
      title={`Операции · Клиент ${params.id}`}
      description="Расширенная карточка клиента с аналитикой и активами из /beta/ops/clients/client-104/index.html."
      referencePath="/beta/ops/clients/client-104/index.html"
    />
  );
}
