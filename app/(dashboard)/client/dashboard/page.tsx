import { redirect } from "next/navigation";

import {
  ApplicationTimeline,
  DealSummaryCard,
  DocumentsPanel,
  InvoiceHistoryTable,
  KeyInformationCard,
  NotificationsFeed,
  PaymentScheduleTable,
  formatCurrency,
  formatDate,
} from "@/app/(dashboard)/client/_components";
import type { ApplicationTimelineStep } from "@/app/(dashboard)/client/_components";
import { getSessionUser } from "@/lib/auth/session";
import { getClientPortalSnapshot } from "@/lib/supabase/queries/client-portal";

function selectUpcomingSchedule(
  schedules: Awaited<ReturnType<typeof getClientPortalSnapshot>>["paymentSchedules"],
) {
  if (!schedules.length) return null;

  const now = new Date();
  const future = schedules
    .filter((schedule) => {
      const due = new Date(schedule.dueDate);
      return !Number.isNaN(due.getTime()) && due >= now && schedule.status !== "paid";
    })
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

  return future[0] ?? schedules[0];
}

function calculateOutstandingAmount(
  invoices: Awaited<ReturnType<typeof getClientPortalSnapshot>>["invoices"],
  payments: Awaited<ReturnType<typeof getClientPortalSnapshot>>["payments"],
) {
  const relevantStatuses = new Set(["pending", "overdue"]);
  const outstandingInvoices = invoices.filter((invoice) =>
    relevantStatuses.has(invoice.status.toLowerCase()),
  );

  const totalOutstanding = outstandingInvoices.reduce(
    (acc, invoice) => acc + invoice.totalAmount,
    0,
  );

  if (!totalOutstanding) {
    return 0;
  }

  const paidAgainstOutstanding = payments
    .filter(
      (payment) =>
        payment.invoiceId &&
        outstandingInvoices.some((invoice) => invoice.id === payment.invoiceId) &&
        payment.status === "succeeded",
    )
    .reduce((acc, payment) => acc + payment.amount, 0);

  return Math.max(totalOutstanding - paidAgainstOutstanding, 0);
}

function buildTimelineSteps(snapshot: Awaited<
  ReturnType<typeof getClientPortalSnapshot>
>): ApplicationTimelineStep[] {
  const application = snapshot.application;
  const hasDocuments = snapshot.applicationDocuments.length > 0;
  const contractDocument = snapshot.dealDocuments.find((doc) =>
    doc.title.toLowerCase().includes("lease agreement"),
  );
  const inspectionService = snapshot.vehicleServices.find(
    (service) =>
      service.serviceType === "inspection" || service.title.toLowerCase().includes("inspection"),
  );
  const awaitingPhotos = snapshot.vehicleServices.find(
    (service) => service.status !== "completed" && (service.attachments?.length ?? 0) < 6,
  );

  return [
    {
      title: "Application submitted",
      description:
        "KYC verification completed. Contact details confirmed.",
      state:
        application && application.status !== "draft" ? "done" : "active",
    },
    {
      title: "AI document analysis",
      description:
        "Emirates ID and salary certificate files successfully recognized.",
      state: hasDocuments ? "done" : "pending",
    },
    {
      title: "Pre-delivery inspection",
      description:
        "Manager coordinates with the service station to confirm the report.",
      state:
        inspectionService && inspectionService.status === "completed"
          ? "done"
          : awaitingPhotos
            ? "active"
            : "pending",
      meta: awaitingPhotos
        ? "Registration card photo required to finalize report."
        : undefined,
    },
    {
      title: "Contract signing",
      description:
        "Lease agreement generated. We'll notify you when it's ready for signature.",
      state:
        contractDocument && (contractDocument.signedAt || contractDocument.status?.includes("signed"))
          ? "done"
          : "pending",
    },
  ];
}

function buildKeyInformation(snapshot: Awaited<
  ReturnType<typeof getClientPortalSnapshot>
>) {
  const vehicle = snapshot.vehicle;
  const deal = snapshot.deal;

  const entries = [
    {
      label: "VIN",
      value: vehicle?.vin ?? "—",
    },
    {
      label: "Program term",
      value: deal?.termMonths ? `${deal.termMonths} months` : "Custom",
    },
    {
      label: "Issue date",
      value: deal?.contractStartDate ? formatDate(deal.contractStartDate) : "—",
    },
    {
      label: "Mileage",
      value: vehicle?.mileage != null ? `${vehicle.mileage.toLocaleString("en-GB")} km` : "—",
    },
  ];

  return entries;
}

export default async function ClientDashboardPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/client/dashboard");
  }

  const snapshot = await getClientPortalSnapshot(sessionUser.user.id);

  const nextSchedule = selectUpcomingSchedule(snapshot.paymentSchedules);
  const outstandingAmount = calculateOutstandingAmount(
    snapshot.invoices,
    snapshot.payments,
  );

  const timelineSteps = buildTimelineSteps(snapshot);
  const keyInformation = buildKeyInformation(snapshot);

  const combinedDocuments = [
    ...snapshot.dealDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      href: doc.signedUrl,
    })),
    ...snapshot.applicationDocuments.map((doc) => ({
      id: doc.id,
      title: doc.documentType,
      status: doc.status,
      href: doc.signedUrl,
    })),
  ].slice(0, 6);

  return (
    <div className="space-y-8">
      <DealSummaryCard
        deal={snapshot.deal}
        vehicle={snapshot.vehicle}
        vehicleImages={snapshot.vehicleImages}
        nextSchedule={
          nextSchedule
            ? {
                dueDate: nextSchedule.dueDate,
                amount: nextSchedule.amount,
                status: nextSchedule.status,
              }
            : null
        }
        outstandingAmount={outstandingAmount}
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-linear">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Application status
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                Progress to activation
              </h2>
            </div>
            <span className="rounded-full bg-surface-subtle px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              {formatDate(snapshot.deal?.updatedAt ?? new Date().toISOString())}
            </span>
          </div>
          <div className="mt-6">
            <ApplicationTimeline steps={timelineSteps} />
          </div>
        </div>

        <KeyInformationCard items={keyInformation} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DocumentsPanel documents={combinedDocuments} />
        <NotificationsFeed notifications={snapshot.notifications} />
      </section>

      <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-linear">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Finance overview
            </p>
            <h2 className="text-xl font-semibold text-foreground">
              Payment schedule & history
            </h2>
          </div>
          <div className="rounded-2xl bg-surface-subtle px-4 py-2 text-sm text-muted-foreground">
            Total outstanding&nbsp;
            <span className="font-semibold text-foreground">
              {formatCurrency(outstandingAmount)}
            </span>
          </div>
        </header>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Upcoming schedule
          </h3>
          <PaymentScheduleTable
            entries={snapshot.paymentSchedules.map((entry) => ({
              id: entry.id,
              sequence: entry.sequence,
              dueDate: entry.dueDate,
              amount: entry.amount,
              status: entry.status,
            }))}
          />
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Payment history
          </h3>
          <InvoiceHistoryTable
            entries={snapshot.invoices.map((invoice) => ({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              dueDate: invoice.dueDate,
              totalAmount: invoice.totalAmount,
              status: invoice.status,
              purpose: invoice.invoiceType,
              href: null,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
