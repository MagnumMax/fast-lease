import { OpsSellersDirectory } from "@/app/(dashboard)/ops/_components/sellers-directory";
import { getOperationsSellers } from "@/lib/supabase/queries/operations-server";

export default async function WorkspaceSellersPage() {
  const sellers = await getOperationsSellers();

  return <OpsSellersDirectory initialSellers={sellers} />;
}
