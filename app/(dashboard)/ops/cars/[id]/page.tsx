import { notFound } from "next/navigation";

import { CarDetailView } from "@/app/(dashboard)/ops/_components/car-detail";
import { getOperationsCarDetail } from "@/lib/supabase/queries/operations-server";

type OpsCarDetailsProps = {
  params: Promise<{ id: string }>;
};

export default async function OpsCarDetailsPage({ params }: OpsCarDetailsProps) {
  const { id } = await params;
  const detail = await getOperationsCarDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <CarDetailView
      slug={detail.slug}
      activeDeal={detail.activeDeal}
      deals={detail.deals}
      vehicle={detail.vehicle}
      profile={detail.profile}
      documents={detail.documents}
      serviceLog={detail.serviceLog}
      insurance={detail.insurance}
    />
  );
}
