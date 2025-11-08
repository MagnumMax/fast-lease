import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "./utils";

type PaymentScheduleEntry = {
  id: string;
  sequence: number;
  dueDate: string;
  amount: number;
  status: string;
};

type PaymentScheduleTableProps = {
  entries: PaymentScheduleEntry[];
};

function resolveScheduleStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "text-emerald-600";
  if (normalized === "overdue") return "text-rose-600";
  if (normalized === "pending") return "text-amber-600";
  return "text-muted-foreground";
}

export function PaymentScheduleTable({ entries }: PaymentScheduleTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
        No scheduled payments found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-surface-subtle">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium text-foreground">
                  {entry.sequence}
                </TableCell>
                <TableCell>{formatDate(entry.dueDate)}</TableCell>
                <TableCell className="font-semibold text-foreground">
                  {formatCurrency(entry.amount)}
                </TableCell>
                <TableCell className={`font-medium ${resolveScheduleStatusTone(entry.status)}`}>
                  {entry.status.replace(/_/g, " ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Payment #{entry.sequence}</span>
              <span className={resolveScheduleStatusTone(entry.status)}>
                {entry.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {formatCurrency(entry.amount)}
            </p>
            <p className="text-sm text-muted-foreground">Due {formatDate(entry.dueDate)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
