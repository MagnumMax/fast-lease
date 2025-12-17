import { OpsDealsBoard } from "@/app/(dashboard)/ops/_components/deals-board";
import {
  getOperationsCars,
  getOperationsClients,
  getOperationsDeals,
} from "@/lib/supabase/queries/operations-server";

export default async function WorkspaceDealsPage() {
  console.log("[DEBUG] WorkspaceDealsPage: Starting to load data...");

  const [deals, clients, vehicles] = await Promise.all([
    getOperationsDeals(),
    getOperationsClients(),
    getOperationsCars(),
  ]);

  console.log("[DEBUG] WorkspaceDealsPage: Loaded data:", {
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
