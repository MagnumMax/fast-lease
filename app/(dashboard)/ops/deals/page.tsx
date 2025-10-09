import { OpsDealsBoard } from "@/app/(dashboard)/ops/_components/deals-board";
import { getOperationsDeals } from "@/lib/supabase/queries/operations";

export default async function OpsDealsPage() {
  const deals = await getOperationsDeals();

  return <OpsDealsBoard initialDeals={deals} />;
}
