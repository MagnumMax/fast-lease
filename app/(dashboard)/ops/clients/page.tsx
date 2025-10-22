import { OpsClientsDirectory } from "@/app/(dashboard)/ops/_components/clients-directory";
import { getOperationsClients } from "@/lib/supabase/queries/operations-server";

export default async function OpsClientsPage() {
  const clients = await getOperationsClients();

  return <OpsClientsDirectory initialClients={clients} />;
}
