import { RouteScaffold } from "@/components/placeholders/route-scaffold";

type OpsCarDetailsProps = {
  params: { id: string };
};

export default function OpsCarDetailsPage({ params }: OpsCarDetailsProps) {
  return (
    <RouteScaffold
      title={`Операции · Автомобиль ${params.id}`}
      description="Детальное досье автомобиля с телематикой и сервисами из /beta/ops/cars/rolls-royce-cullinan/index.html."
      referencePath="/beta/ops/cars/rolls-royce-cullinan/index.html"
    />
  );
}
