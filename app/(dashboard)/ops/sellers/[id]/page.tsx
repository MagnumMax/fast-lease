import { notFound } from "next/navigation";
import { getOperationsSellerDetail } from "@/lib/supabase/queries/operations-server";
import { SellerDetailView } from "@/app/(dashboard)/ops/_components/seller-detail";

type OpsSellerDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OpsSellerDetailsPage({ params }: OpsSellerDetailsPageProps) {
  const { id } = await params;
  const detail = await getOperationsSellerDetail(id);
  if (!detail) {
    notFound();
  }
  return (
    <SellerDetailView
      profile={detail.profile}
      deals={detail.deals}
      documents={detail.documents}
    />
  );
}
