import { OpsCarsCatalogue } from "@/app/(dashboard)/ops/_components/cars-catalogue";
import { getOperationsCars } from "@/lib/supabase/queries/operations";

export default async function OpsCarsPage() {
  const cars = await getOperationsCars();

  return <OpsCarsCatalogue initialCars={cars} />;
}
