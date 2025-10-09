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
  return (
    <div className="rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-subtle">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                No scheduled payments found.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
