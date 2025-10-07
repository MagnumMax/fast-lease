import { RouteScaffold } from "@/components/placeholders/route-scaffold";

type OpsDealDetailsProps = {
  params: { id: string };
};

export default function OpsDealDetailsPage({
  params,
}: OpsDealDetailsProps) {
  return (
    <RouteScaffold
      title={`Операции · Сделка ${params.id}`}
      description="Детализация сделки с таймлайном и документами из /beta/ops/deals/deal-7801/index.html."
      referencePath="/beta/ops/deals/deal-7801/index.html"
    />
  );
}
