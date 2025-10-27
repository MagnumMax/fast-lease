import { ClientDetailView } from "@/app/(dashboard)/ops/_components/client-detail";
import {
  OPS_CLIENT_DEALS,
  OPS_CLIENT_DOCUMENTS,
  OPS_CLIENT_PROFILE,
} from "@/lib/supabase/queries/operations";

export default async function OpsClientDetailsPage() {
  const profile = OPS_CLIENT_PROFILE;
  const deals = OPS_CLIENT_DEALS;
  const documents = OPS_CLIENT_DOCUMENTS;

  return <ClientDetailView profile={profile} deals={deals} documents={documents} />;
}
