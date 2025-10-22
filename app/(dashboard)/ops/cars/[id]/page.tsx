import { notFound } from "next/navigation";

import { CarDetailView } from "@/app/(dashboard)/ops/_components/car-detail";
import {
  OPS_VEHICLE_DOCUMENTS,
  OPS_VEHICLE_PROFILE,
  OPS_VEHICLE_SERVICE_LOG,
} from "@/lib/supabase/queries/operations";

type OpsCarDetailsProps = {
  params: { id: string };
};

export default function OpsCarDetailsPage({ params }: OpsCarDetailsProps) {
  const profile = OPS_VEHICLE_PROFILE;
  const documents = OPS_VEHICLE_DOCUMENTS;
  const serviceLog = OPS_VEHICLE_SERVICE_LOG;

  if (!profile) {
    notFound();
  }

  return <CarDetailView profile={profile} documents={documents} serviceLog={serviceLog} />;
}
