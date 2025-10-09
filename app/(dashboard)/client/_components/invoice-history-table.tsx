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
  return (
    <div className="rounded-2xl border border-border">
      <Table>
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
          {entries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-sm text-muted-foreground"
              >
                No invoices to display.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((invoice) => (
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
