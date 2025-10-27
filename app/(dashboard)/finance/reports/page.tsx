import { formatCurrency } from "@/app/(dashboard)/client/_components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const reportSnapshots = [
  {
    title: "Weekly cash flow",
    value: 1120000,
    change: "+6% WoW",
    tone: "success" as const,
    link: "cashflow_weekly.pdf",
  },
  {
    title: "FX exposure",
    value: 420000,
    change: "AED → USD hedge 65%",
    tone: "warning" as const,
    link: "fx_coverage.xlsx",
  },
  {
    title: "OpEx burn",
    value: 280000,
    change: "−4% к плану",
    tone: "success" as const,
    link: "opex_mtd.xlsx",
  },
];

const kpiRows = [
  { metric: "Collections %, MTD", current: "93%", target: "95%", owner: "Collections" },
  { metric: "Avg. payout time", current: "6.4h", target: "< 8h", owner: "FinOps" },
  { metric: "Stripe → Bank reconciliation", current: "99.1%", target: "100%", owner: "Accounting" },
  { metric: "Investor yield", current: "12.1%", target: "12%", owner: "Finance" },
];

export default function FinanceReportsPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        {reportSnapshots.map((report) => (
          <Card key={report.title} className="bg-card/70">
            <CardHeader className="pb-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{report.title}</p>
              <CardTitle className="text-2xl">{formatCurrency(report.value)}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant={report.tone}>{report.change}</Badge>
              <a
                href={`#${report.link}`}
                className="text-xs font-semibold text-brand-600"
              >
                Скачать
              </a>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border border-border bg-card/70">
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">KPI snapshot</p>
            <CardTitle className="text-2xl">Финансовые показатели</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiRows.map((row) => (
                <TableRow key={row.metric}>
                  <TableCell className="font-medium">{row.metric}</TableCell>
                  <TableCell>{row.current}</TableCell>
                  <TableCell>{row.target}</TableCell>
                  <TableCell>{row.owner}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
