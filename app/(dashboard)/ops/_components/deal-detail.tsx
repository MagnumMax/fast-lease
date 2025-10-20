import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OpsDealDetail } from "@/lib/supabase/queries/operations";
import { DealGuardTasks } from "@/app/(dashboard)/ops/_components/deal-guard-tasks";

type DealDetailProps = {
  detail: OpsDealDetail;
};

export function DealDetailView({ detail }: DealDetailProps) {
  const { profile, client, keyInformation, overview, documents, invoices, timeline, guardStatuses, dealUuid, statusKey, slug } =
    detail;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
        <Link href="/ops/deals">← Back to deals</Link>
      </Button>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardDescription>Deal</CardDescription>
            <CardTitle className="text-2xl">{profile.dealId}</CardTitle>
            <p className="text-sm text-muted-foreground">{profile.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="rounded-lg">
              {profile.status}
            </Badge>
            <Badge variant="info" className="rounded-lg">
              {profile.vehicleName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Monthly payment</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{profile.monthlyPayment}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Next payment</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{profile.nextPayment}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due amount</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{profile.dueAmount}</p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader>
            <CardDescription>Client</CardDescription>
            <CardTitle>{client.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phone</p>
                <p className="mt-1 text-foreground">{client.phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</p>
                <p className="mt-1 text-foreground">{client.email}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scoring</p>
              <Badge variant="success" className="mt-1 rounded-lg">
                {client.scoring}
              </Badge>
            </div>
            <p className="rounded-xl bg-surface-subtle px-4 py-3 text-xs text-muted-foreground">
              {client.notes}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader>
            <CardDescription>Key information</CardDescription>
            <CardTitle>Vehicle</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {keyInformation.map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardDescription>Meta</CardDescription>
          <CardTitle>Deal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {overview.map((item) => (
            <div key={item.label}>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-sm text-foreground">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur" id="tasks">
        <CardHeader>
          <CardDescription>Workflow</CardDescription>
          <CardTitle>Guard задачи для перехода</CardTitle>
        </CardHeader>
        <CardContent>
          <DealGuardTasks dealId={dealUuid} statusKey={statusKey} guardStatuses={guardStatuses} slug={slug} />
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardDescription>Documents</CardDescription>
          <CardTitle>Supporting files</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{doc.status}</p>
              </div>
              <Badge variant="outline" className="rounded-lg">
                View
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardDescription>Finance</CardDescription>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.type}</TableCell>
                  <TableCell>{invoice.totalAmount}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status.toLowerCase().includes("overdue")
                          ? "danger"
                          : invoice.status.toLowerCase().includes("pending")
                            ? "warning"
                            : "success"
                      }
                      className="rounded-lg"
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardDescription>History</CardDescription>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {timeline.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-border bg-background/60 p-4 text-sm text-foreground"
            >
              <p className="font-medium">{event.text}</p>
              <p className="text-xs text-muted-foreground">{event.timestamp}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
