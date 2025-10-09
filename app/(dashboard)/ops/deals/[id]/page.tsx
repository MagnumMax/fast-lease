import { notFound } from "next/navigation";

import { DealDetailView } from "@/app/(dashboard)/ops/_components/deal-detail";
import { getOperationsDealDetail } from "@/lib/supabase/queries/operations";

type OpsDealDetailsProps = {
  params: { id: string };
};

export default async function OpsDealDetailsPage({ params }: OpsDealDetailsProps) {
  const detail = await getOperationsDealDetail(params.id);

  if (!detail) {
    notFound();
  }

  return <DealDetailView detail={detail} />;
}
