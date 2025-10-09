import { notFound } from "next/navigation";

import { CarDetailView } from "@/app/(dashboard)/ops/_components/car-detail";
import {
  getOperationsVehicleDocuments,
  getOperationsVehicleProfile,
  getOperationsVehicleServiceLog,
} from "@/lib/supabase/queries/operations";

type OpsCarDetailsProps = {
  params: { id: string };
};

export default function OpsCarDetailsPage({ params }: OpsCarDetailsProps) {
  const profile = getOperationsVehicleProfile();
  const documents = getOperationsVehicleDocuments();
  const serviceLog = getOperationsVehicleServiceLog();

  if (!profile) {
    notFound();
  }

  return <CarDetailView profile={profile} documents={documents} serviceLog={serviceLog} />;
}
