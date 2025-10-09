import { OpsDashboardScreen } from "@/app/(dashboard)/ops/_components/dashboard-screen";
import { getOperationsDashboardSnapshot } from "@/lib/supabase/queries/operations";

export default async function OpsDashboardPage() {
  const snapshot = await getOperationsDashboardSnapshot();

  return <OpsDashboardScreen snapshot={snapshot} />;
}
