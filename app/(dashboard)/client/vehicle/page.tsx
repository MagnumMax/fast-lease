import { redirect } from "next/navigation";

import {
  DocumentsPanel,
  VehicleOverviewCard,
  ServiceScheduleList,
  formatDate,
} from "@/app/(dashboard)/client/_components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { getClientPortalSnapshot } from "@/lib/supabase/queries/client-portal";

export default async function ClientVehiclePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?next=/client/vehicle");
  }

  const snapshot = await getClientPortalSnapshot(sessionUser.user.id);

  const deliveryDocuments = snapshot.dealDocuments
    .filter((doc) =>
      doc.documentType
        ?.toLowerCase()
        .includes("delivery"),
    )
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      href: doc.signedUrl,
    }));

  const insuranceDocuments = snapshot.dealDocuments
    .filter((doc) =>
      doc.documentType?.toLowerCase().includes("insurance"),
    )
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      href: doc.signedUrl,
    }));

  return (
    <div className="space-y-8">
      <VehicleOverviewCard
        vehicle={snapshot.vehicle}
        vehicleImages={snapshot.vehicleImages}
        telematics={snapshot.vehicleTelematics}
      />

      <Card className="border border-border bg-card shadow-linear">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            Service reminders
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload the required photo checklist to confirm vehicle condition before scheduled maintenance.
          </p>
        </CardHeader>
        <CardContent>
          <ServiceScheduleList services={snapshot.vehicleServices.map((service) => ({
            id: service.id,
            title: service.title,
            description: service.description,
            serviceType: service.serviceType,
            dueDate: service.dueDate,
            mileageTarget: service.mileageTarget,
            status: service.status,
            completedAt: service.completedAt,
            attachments: Array.isArray(service.attachments)
              ? service.attachments
              : [],
          }))} />
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <DocumentsPanel
          title="Delivery & acceptance"
          documents={deliveryDocuments}
          emptyState="Delivery paperwork will appear here after handover."
        />
        <DocumentsPanel
          title="Insurance"
          documents={insuranceDocuments}
          emptyState="Insurance policy will be uploaded after activation."
        />
      </section>

      <Card className="border border-border bg-card shadow-linear">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">
            Next actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {snapshot.vehicleServices.length
              ? `Your next planned visit: ${formatDate(
                  snapshot.vehicleServices[0].dueDate ?? snapshot.deal?.contractStartDate ?? new Date().toISOString(),
                )}.`
              : "No scheduled maintenance visits yet."}
          </p>
          <p>
            For urgent issues, open a support ticket — operators will respond within the SLA defined for your plan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
