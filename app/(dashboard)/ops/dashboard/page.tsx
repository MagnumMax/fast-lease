import { OpsDashboardScreen } from "@/app/(dashboard)/ops/_components/dashboard-screen";
import { getOperationsDashboardSnapshotClient } from "@/lib/supabase/queries/operations-client";

export default async function OpsDashboardPage() {
  const snapshot = await getOperationsDashboardSnapshotClient();

  return <OpsDashboardScreen snapshot={snapshot} />;
}
