import { RouteScaffold } from "@/components/placeholders/route-scaffold";

type CarPageProps = {
  params: { id: string };
};

export default function CarDetailsPage({ params }: CarPageProps) {
  return (
    <RouteScaffold
      title={`Карточка автомобиля · ${params.id}`}
      description="Заполняется компонентами из /beta/cars/[car-id]/index.html: галерея, калькулятор, спецификации."
      referencePath={`/beta/cars/${params.id}/index.html`}
    />
  );
}
