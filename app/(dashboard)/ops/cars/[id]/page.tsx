import { notFound } from "next/navigation";

import { CarDetailView } from "@/app/(dashboard)/ops/_components/car-detail";
import {
  OPS_VEHICLE_DOCUMENTS,
  OPS_VEHICLE_PROFILE,
  OPS_VEHICLE_SERVICE_LOG,
} from "@/lib/supabase/queries/operations";

type OpsCarDetailsProps = {
  params: Promise<{ id: string }>;
};

export default async function OpsCarDetailsPage({ params }: OpsCarDetailsProps) {
  const { id } = await params;
  const profile = OPS_VEHICLE_PROFILE;
  const documents = OPS_VEHICLE_DOCUMENTS;
  const serviceLog = OPS_VEHICLE_SERVICE_LOG;

  if (!profile) {
    notFound();
  }

  return <CarDetailView profile={profile} documents={documents} serviceLog={serviceLog} />;
}
