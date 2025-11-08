import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "./utils";

type InvoiceEntry = {
  id: string;
  invoiceNumber: string | null;
  dueDate: string;
  totalAmount: number;
  status: string;
  purpose?: string | null;
  link?: string | null;
  downloadUrl?: string | null;
};

type InvoiceHistoryTableProps = {
  entries: InvoiceEntry[];
};

function resolveInvoiceStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "text-emerald-600";
  if (normalized === "overdue") return "text-rose-600";
  if (normalized === "pending") return "text-amber-600";
  return "text-muted-foreground";
}

export function InvoiceHistoryTable({ entries }: InvoiceHistoryTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
        No invoices to display.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="bg-surface-subtle">
              <TableHead>Invoice</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium text-foreground">
                  {invoice.link ? (
                    <a
                      href={invoice.link}
                      className="text-foreground underline-offset-2 hover:underline"
                    >
                      {invoice.invoiceNumber ?? invoice.id}
                    </a>
                  ) : (
                    invoice.invoiceNumber ?? invoice.id
                  )}
                </TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                  {invoice.purpose ?? "Monthly lease payment"}
                </TableCell>
                <TableCell className="font-semibold text-foreground">
                  {formatCurrency(invoice.totalAmount)}
                </TableCell>
                <TableCell
                  className={`font-medium ${resolveInvoiceStatusTone(invoice.status)}`}
                >
                  {invoice.status.replace(/_/g, " ")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    asChild={Boolean(invoice.downloadUrl)}
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-xl text-muted-foreground"
                    disabled={!invoice.downloadUrl}
                  >
                    {invoice.downloadUrl ? (
                      <a
                        href={invoice.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Download invoice"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <Download className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {entries.map((invoice) => (
          <article
            key={invoice.id}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>{invoice.invoiceNumber ?? invoice.id}</span>
              <span className={resolveInvoiceStatusTone(invoice.status)}>
                {invoice.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {formatCurrency(invoice.totalAmount)}
            </p>
            <p className="text-sm text-muted-foreground">
              Due {formatDate(invoice.dueDate)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {invoice.purpose ?? "Monthly lease payment"}
            </p>
            <div className="mt-4 flex justify-end">
              <Button
                asChild={Boolean(invoice.downloadUrl)}
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={!invoice.downloadUrl}
              >
                {invoice.downloadUrl ? (
                  <a
                    href={invoice.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Download invoice"
                  >
                    Download
                  </a>
                ) : (
                  <>Download</>
                )}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
