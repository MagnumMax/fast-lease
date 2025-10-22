import { OpsDealsBoard } from "@/app/(dashboard)/ops/_components/deals-board";
import {
  getOperationsCars,
  getOperationsClients,
  getOperationsDeals,
} from "@/lib/supabase/queries/operations-server";

export default async function OpsDealsPage() {
  console.log("[DEBUG] OpsDealsPage: Starting to load data...");

  const [deals, clients, vehicles] = await Promise.all([
    getOperationsDeals(),
    getOperationsClients(),
    getOperationsCars(),
  ]);

  console.log("[DEBUG] OpsDealsPage: Loaded data:", {
    dealsCount: deals.length,
    clientsCount: clients.length,
    vehiclesCount: vehicles.length,
  });

  return (
    <OpsDealsBoard
      initialDeals={deals}
      clientDirectory={clients}
      vehicleDirectory={vehicles}
    />
  );
}
