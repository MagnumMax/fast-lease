import { Copy, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "./utils";

type ReferralDeal = {
  id: string;
  friendName?: string | null;
  status?: string | null;
  monthlyPayment?: number | null;
  createdAt: string;
};

type ReferralReward = {
  id: string;
  rewardAmount?: number | null;
  status: string;
  createdAt: string;
};

type ReferralOverviewProps = {
  code: string;
  shareUrl?: string | null;
  stats: {
    clicks: number;
    applications: number;
    deals: number;
  };
  deals: ReferralDeal[];
  rewards: ReferralReward[];
  onCopyLink?: (shareUrl: string) => void;
};

function resolveDealStatusTone(status: string | null | undefined) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "ACTIVE") return "bg-emerald-100 text-emerald-700";
  if (normalized === "CANCELLED") return "bg-rose-100 text-rose-700";
  if (
    [
      "NEW",
      "OFFER_PREP",
      "VEHICLE_CHECK",
      "DOCS_COLLECT",
      "RISK_REVIEW",
      "FINANCE_REVIEW",
      "INVESTOR_PENDING",
      "CONTRACT_PREP",
      "DOC_SIGNING",
      "SIGNING_FUNDING",
      "VEHICLE_DELIVERY",
    ].includes(normalized)
  ) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

export function ReferralOverview({
  code,
  shareUrl,
  stats,
  deals,
  rewards,
  onCopyLink,
}: ReferralOverviewProps) {
  const conversion =
    stats.clicks > 0 ? Math.round((stats.deals / stats.clicks) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="border border-border bg-card shadow-linear">
        <CardHeader className="gap-3 pb-4">
          <div className="flex items-center gap-3">
            <Gift className="h-4 w-4 text-brand-600" />
            <CardTitle className="text-lg font-semibold text-foreground">
              Referral program
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Invite friends and earn 1% from each finalized deal.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Your referral link
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {shareUrl ?? "Link will appear after activation"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Code: <span className="font-semibold text-foreground">{code}</span>
            </p>
          </div>
          <Button
            type="button"
            className="w-full rounded-xl text-sm font-semibold md:w-auto"
            disabled={!shareUrl}
            onClick={() => shareUrl && onCopyLink?.(shareUrl)}
          >
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
            Copy link
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <article className="rounded-2xl border border-border bg-surface-subtle p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Clicks
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {stats.clicks}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-surface-subtle p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Applications
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {stats.applications}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-surface-subtle p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Deals
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {stats.deals}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-surface-subtle p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Conversion
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {conversion}%
          </p>
        </article>
      </div>

      <Card className="border border-border bg-card shadow-linear">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            Deals created with your code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Invite friends to see the first deals here.
            </p>
          ) : (
            deals.map((deal) => (
              <article
                key={deal.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {deal.friendName ?? "New referral"} · {deal.id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Monthly: {formatCurrency(deal.monthlyPayment ?? 0)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${resolveDealStatusTone(deal.status)}`}
                >
                  {deal.status?.replace(/_/g, " ") ?? "pending"}
                </span>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border border-border bg-card shadow-linear">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Rewards will appear after the first referred deal reaches activation.
            </p>
          ) : (
            rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(reward.rewardAmount ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Earned {new Date(reward.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {reward.status}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
