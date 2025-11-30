import type { BadgeProps } from "@/components/ui/badge";
import { OPS_DEAL_STATUS_LABELS, type OpsDealStatusKey } from "@/lib/supabase/queries/operations";

type DealStatusBadgeVariant = BadgeProps["variant"];

const DEAL_STATUS_BADGE_VARIANTS: Record<OpsDealStatusKey, DealStatusBadgeVariant> = {
  NEW: "info",
  OFFER_PREP: "info",
  VEHICLE_CHECK: "warning",
  DOCS_COLLECT_BUYER: "warning",
  DOCS_COLLECT_SELLER: "warning",
  RISK_REVIEW: "danger",
  FINANCE_REVIEW: "warning",
  INVESTOR_PENDING: "secondary",
  CONTRACT_PREP: "outline",
  DOC_SIGNING: "info",
  SIGNING_FUNDING: "info",
  VEHICLE_DELIVERY: "warning",
  ACTIVE: "success",
  CANCELLED: "danger",
};

function getDealStatusBadgeMeta(status: OpsDealStatusKey) {
  const label = OPS_DEAL_STATUS_LABELS[status] ?? status;
  const variant = DEAL_STATUS_BADGE_VARIANTS[status] ?? "outline";

  return { label, variant } as const;
}

export { DEAL_STATUS_BADGE_VARIANTS, getDealStatusBadgeMeta };
