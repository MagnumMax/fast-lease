import { notFound } from "next/navigation";

import { DealDetailView } from "@/app/(dashboard)/ops/_components/deal-detail";
import { getOperationsDealDetail } from "@/lib/supabase/queries/operations-server";

type OpsDealDetailsProps = {
  params: Promise<{ id: string }>;
};

export default async function OpsDealDetailsPage({ params }: OpsDealDetailsProps) {
  const { id } = await params;

  const detail = await getOperationsDealDetail(id);

  if (!detail) {
    notFound();
  }

  return <DealDetailView detail={detail} />;
}
