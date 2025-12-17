import { OpsBrokersDirectory } from "@/app/(dashboard)/ops/_components/brokers-directory";
import { getOperationsBrokers } from "@/lib/supabase/queries/operations-server";

export default async function WorkspaceBrokersPage() {
  const brokers = await getOperationsBrokers();

  return <OpsBrokersDirectory initialBrokers={brokers} />;
}
