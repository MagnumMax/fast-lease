import { redirect } from "next/navigation";
import { Download } from "lucide-react";

import {
  InvoiceHistoryTable,
  PaymentScheduleTable,
  formatCurrency,
  formatDate,
} from "@/app/(dashboard)/client/_components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { getClientPortalSnapshot } from "@/lib/supabase/queries/client-portal";

function computeFinanceSummary(
  snapshot: Awaited<ReturnType<typeof getClientPortalSnapshot>>,
) {
  const nextSchedule = snapshot.paymentSchedules
    .filter((entry) => entry.status !== "paid")
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )[0];

  const outstandingInvoices = snapshot.invoices.filter((invoice) =>
    ["pending", "overdue"].includes(invoice.status),
  );

  const totalOutstanding = outstandingInvoices.reduce(
    (acc, invoice) => acc + invoice.totalAmount,
    0,
  );

  const lastPayment = snapshot.payments
    .filter((payment) => payment.status === "succeeded")
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

  return {
    nextSchedule,
    outstandingAmount: totalOutstanding,
    lastPayment,
  };
}

export default async function ClientInvoicesPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?next=/client/invoices");
  }

  const snapshot = await getClientPortalSnapshot(sessionUser.user.id);
  const { nextSchedule, outstandingAmount, lastPayment } =
    computeFinanceSummary(snapshot);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-linear">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Finance
            </p>
            {/* <h1 className="text-2xl font-semibold text-foreground">
              Payment schedule
            </h1> */}
            <p className="text-sm text-muted-foreground">
              Upcoming and completed payments for your lease agreement.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-border text-sm font-semibold"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Download SOA
          </Button>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Card className="border-border bg-surface-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Outstanding balance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold text-foreground">
              {formatCurrency(outstandingAmount)}
            </CardContent>
          </Card>
          <Card className="border-border bg-surface-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Next payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xl font-semibold text-foreground">
                {nextSchedule ? formatCurrency(nextSchedule.amount) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {nextSchedule ? formatDate(nextSchedule.dueDate) : "No upcoming invoices"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border bg-surface-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xl font-semibold text-foreground">
                {lastPayment ? formatCurrency(lastPayment.amount) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lastPayment
                  ? `Received ${formatDate(lastPayment.createdAt)}`
                  : "No payments recorded yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
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
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-linear">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              History
            </p>
            <h2 className="text-xl font-semibold text-foreground">
              Detailed invoices
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Status synced with finance module. Download each invoice to see the full breakdown.
          </p>
        </header>

        <div className="mt-6">
          <InvoiceHistoryTable
            entries={snapshot.invoices.map((invoice) => ({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              dueDate: invoice.dueDate,
              totalAmount: invoice.totalAmount,
              status: invoice.status,
              purpose: invoice.invoiceType,
              link: `/client/invoices/${invoice.id}`,
              downloadUrl: invoice.pdfUrl,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
