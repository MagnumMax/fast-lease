import { ClientDetailView } from "@/app/(dashboard)/ops/_components/client-detail";
import {
  getOperationsClientDeals,
  getOperationsClientDocuments,
  getOperationsClientProfile,
} from "@/lib/supabase/queries/operations";

type OpsClientDetailsProps = {
  params: { id: string };
};

export default function OpsClientDetailsPage({ params }: OpsClientDetailsProps) {
  const profile = getOperationsClientProfile();
  const deals = getOperationsClientDeals();
  const documents = getOperationsClientDocuments();

  return <ClientDetailView profile={profile} deals={deals} documents={documents} />;
}
