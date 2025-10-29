import { notFound } from "next/navigation";

import { ClientDetailView } from "@/app/(dashboard)/ops/_components/client-detail";
import { getOperationsClientDetail } from "@/lib/supabase/queries/operations-server";

type OpsClientDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OpsClientDetailsPage({ params }: OpsClientDetailsPageProps) {
  const { id } = await params;

  const detail = await getOperationsClientDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <ClientDetailView
      profile={detail.profile}
      deals={detail.deals}
      documents={detail.documents}
      notifications={detail.notifications}
      supportTickets={detail.supportTickets}
      referral={detail.referrals}
    />
  );
}
