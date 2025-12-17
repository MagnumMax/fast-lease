import { notFound } from "next/navigation";
import { getOperationsBrokerDetail } from "@/lib/supabase/queries/operations-server";
import { OpsBrokerDetailView } from "@/app/(dashboard)/ops/_components/broker-detail";

type AdminBrokerDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminBrokerDetailsPage({ params }: AdminBrokerDetailsPageProps) {
  const { id } = await params;
  const detail = await getOperationsBrokerDetail(id);
  if (!detail) {
    notFound();
  }
  return (
    <OpsBrokerDetailView
      profile={detail.profile}
      deals={detail.deals}
      documents={detail.documents}
      backUrl="/admin/brokers"
    />
  );
}
