import { OpsDealsBoard } from "@/app/(dashboard)/ops/_components/deals-board";
import {
  getOperationsCars,
  getOperationsClients,
  getOperationsDeals,
} from "@/lib/supabase/queries/operations";

export default async function OpsDealsPage() {
  const [deals, clients, vehicles] = await Promise.all([
    getOperationsDeals(),
    getOperationsClients(),
    getOperationsCars(),
  ]);

  return (
    <OpsDealsBoard
      initialDeals={deals}
      clientDirectory={clients}
      vehicleDirectory={vehicles}
    />
  );
}
