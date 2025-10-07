import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function ClientVehiclePage() {
  return (
    <RouteScaffold
      title="Клиент · Мой автомобиль"
      description="Карточка активного автомобиля, график обслуживания и документы из /beta/client/my-vehicle/index.html."
      referencePath="/beta/client/my-vehicle/index.html"
    />
  );
}
