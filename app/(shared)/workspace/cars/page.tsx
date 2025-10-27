import { OpsCarsCatalogue } from "@/app/(dashboard)/ops/_components/cars-catalogue";
import { getOperationsCars } from "@/lib/supabase/queries/operations-server";

export default async function WorkspaceCarsPage() {
  const cars = await getOperationsCars();

  return <OpsCarsCatalogue initialCars={cars} />;
}
