"use client";

import { useMemo, useState } from "react";
import { Filter, RefreshCw } from "lucide-react";

import type { InvestorPortfolioAssetRecord } from "@/lib/data/investor/portfolio";
import type { InvestorPortfolioSnapshot } from "@/lib/supabase/queries/investor";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_CONFIG: Record<
  InvestorPortfolioAssetRecord["status"],
  { label: string; badgeVariant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  active: { label: "Active", badgeVariant: "success" },
  completed: { label: "Completed", badgeVariant: "secondary" },
  defaulted: { label: "Defaulted", badgeVariant: "danger" },
};

const FILTERS: Array<{
  value: InvestorPortfolioAssetRecord["status"] | "all";
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "defaulted", label: "Defaulted" },
];

function formatCurrency(value: number, currency: string = "AED") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function statusBadge(status: InvestorPortfolioAssetRecord["status"]) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  return config;
}

function normalizeAssets(
  assets: InvestorPortfolioAssetRecord[],
  currency: string,
) {
  return assets.map((asset) => ({
    ...asset,
    lastPayoutFormatted: asset.lastPayoutAmount ? formatCurrency(asset.lastPayoutAmount, currency) : "—",
    irrFormatted: formatPercent(asset.irrPercent),
  }));
}

type InvestorPortfolioScreenProps = {
  snapshot: InvestorPortfolioSnapshot;
};

export function InvestorPortfolioScreen({ snapshot }: InvestorPortfolioScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InvestorPortfolioAssetRecord["status"] | "all">("all");

  const normalizedAssets = useMemo(
    () => normalizeAssets(snapshot.assets, snapshot.investor.currency),
    [snapshot.assets, snapshot.investor.currency],
  );

  const filteredAssets = useMemo(() => {
    return normalizedAssets.filter((asset) => {
      const matchesQuery = `${asset.assetCode} ${asset.vehicleMake} ${asset.vehicleModel} ${asset.vin}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = filter === "all" || asset.status === filter;
      return matchesQuery && matchesStatus;
    });
  }, [normalizedAssets, filter, query]);

  const selectedLabel = filter === "all" ? "All statuses" : FILTERS.find(f => f.value === filter)?.label ?? "Status";
  const selectedCount =
    filter === "all" ? normalizedAssets.length : normalizedAssets.filter(a => a.status === filter).length;

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardDescription>My Portfolio</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              Assets and metrics
            </CardTitle>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 shadow-sm">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by VIN or model"
                className="h-8 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant={filter === item.value ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-xl text-xs",
                    filter === item.value ? "shadow-linear" : "bg-background/80",
                  )}
                  onClick={() => setFilter(item.value)}
                >
                  {item.icon ? <item.icon className="mr-2 h-3.5 w-3.5" /> : null}
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden="true" />
            <span>{`${selectedLabel} · ${selectedCount} assets`}</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70">
            <Table containerClassName="border-0 rounded-none">
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border/60">
                  <TableHead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    VIN
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Model
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.2em] text-muted-foreground text-right">
                    IRR
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.2em] text-muted-foreground text-right">
                    Last payout
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => {
                  const config = statusBadge(asset.status);
                  return (
                    <TableRow key={asset.id} className="border-border/60">
                      <TableCell className="text-sm font-medium text-foreground">
                        {asset.href ? (
                          <a
                            href={asset.href}
                            className="text-foreground underline-offset-4 hover:underline"
                          >
                            {asset.vin}
                          </a>
                        ) : (
                          asset.vin
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {asset.vehicleMake} · {asset.vehicleModel}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.badgeVariant} className="rounded-lg text-xs">
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-foreground">
                        {asset.irrFormatted}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-foreground">
                        {asset.lastPayoutFormatted}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredAssets.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No assets match the current filters. Try adjusting the query.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
