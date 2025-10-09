import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ClientPortalSnapshot } from "@/lib/supabase/queries/client-portal";

import { classNames, formatCurrency, formatDate } from "./utils";

type DealSummaryCardProps = {
  deal: ClientPortalSnapshot["deal"];
  vehicle: ClientPortalSnapshot["vehicle"];
  vehicleImages: ClientPortalSnapshot["vehicleImages"];
  nextSchedule?: {
    dueDate: string;
    amount: number;
    status: string;
  } | null;
  outstandingAmount?: number | null;
};

export const FALLBACK_IMAGES: Record<string, string> = {
  "rolls-royce-cullinan": "/assets/rolls-royce-cullinan-exterior.jpg",
  "lamborghini-huracan": "/assets/lamborghini-huracan.jpg",
  "volvo-xc40-recharge": "/assets/volvo-xc40-recharge.jpg",
  "rivian-r1t-adventure": "/assets/rivian-r1t-adventure.jpg",
  "bentley-bentayga": "/assets/bentley-bw.jpg",
  "ferrari-488-spider": "/assets/ferrari-458-italia.jpg",
};

function resolveVehicleSlug(vehicle: DealSummaryCardProps["vehicle"]) {
  if (!vehicle) return null;
  const parts = [vehicle.make, vehicle.model]
    .filter(Boolean)
    .map((part) =>
      String(part)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase(),
    );
  return parts.length ? parts.join("-") : null;
}

function resolveHeroImage(
  vehicle: DealSummaryCardProps["vehicle"],
  vehicleImages: DealSummaryCardProps["vehicleImages"],
) {
  const primary = vehicleImages.find((image) => image.isPrimary);
  const candidate = primary ?? vehicleImages[0];
  if (candidate?.storagePath) {
    // Attempt to map storage path to public asset. Fallback will handle unresolved cases.
    const parts = candidate.storagePath.split("/");
    const folder = parts.length >= 2 ? parts[1] : null;
    if (folder) {
      const mapped = FALLBACK_IMAGES[folder];
      if (mapped) {
        return mapped;
      }
    }
  }

  const slug = resolveVehicleSlug(vehicle);
  if (slug && FALLBACK_IMAGES[slug]) {
    return FALLBACK_IMAGES[slug];
  }

  return "/assets/rolls-royce-cullinan-exterior.jpg";
}

function resolveDealStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active") {
    return "bg-emerald-500/15 text-emerald-500";
  }
  if (normalized === "pending_activation" || normalized === "draft") {
    return "bg-amber-500/15 text-amber-500";
  }
  if (normalized === "suspended" || normalized === "defaulted") {
    return "bg-rose-500/15 text-rose-500";
  }
  return "bg-slate-500/15 text-slate-500";
}

export function DealSummaryCard({
  deal,
  vehicle,
  vehicleImages,
  nextSchedule,
  outstandingAmount,
}: DealSummaryCardProps) {
  if (!deal) {
    return null;
  }

  const heroImage = resolveHeroImage(vehicle, vehicleImages);
  const vehicleName = [vehicle?.make, vehicle?.model]
    .filter(Boolean)
    .join(" ");
  const vehicleVariant = vehicle?.variant ? ` ${vehicle.variant}` : "";
  const dealTitle =
    deal.dealNumber && vehicleName
      ? `${deal.dealNumber} · ${vehicleName}${vehicleVariant}`
      : vehicleName || deal.dealNumber || "Current deal";

  const contractMeta = [
    deal.termMonths ? `${deal.termMonths} мес.` : null,
    deal.contractStartDate
      ? `c ${formatDate(deal.contractStartDate)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const nextPaymentLabel = nextSchedule
    ? `${formatDate(nextSchedule.dueDate)}${
        nextSchedule.status ? ` · ${nextSchedule.status}` : ""
      }`
    : "—";

  return (
    <Card className="overflow-hidden border-border bg-card shadow-linear">
      <CardHeader className="gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Deal
              </span>
              <Badge
                variant="secondary"
                className={classNames(
                  "rounded-full px-3 py-1 text-[11px] font-medium",
                  resolveDealStatusTone(deal.status),
                )}
              >
                {deal.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
              {dealTitle}
            </CardTitle>
            <CardDescription className="max-w-xl text-sm leading-relaxed">
              {contractMeta.length
                ? `Lease-to-own program ${contractMeta}.`
                : "Lease-to-own program tailored to your profile."}
            </CardDescription>
          </div>
          <figure className="relative h-44 w-full overflow-hidden rounded-2xl border border-border bg-surface-subtle shadow-sm md:h-52 md:w-80">
            <Image
              src={heroImage}
              alt={vehicleName || "Lease vehicle"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 320px"
              priority
            />
          </figure>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-2xl bg-surface-subtle p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Monthly payment
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {formatCurrency(deal.monthlyPayment ?? vehicle?.monthlyLeaseRate ?? 0)}
          </p>
        </article>
        <article className="rounded-2xl bg-surface-subtle p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Next payment
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {formatCurrency(nextSchedule?.amount ?? deal.monthlyPayment ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">{nextPaymentLabel}</p>
        </article>
        <article className="rounded-2xl bg-surface-subtle p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Outstanding
          </p>
          <p
            className={classNames(
              "mt-2 text-lg font-semibold",
              (outstandingAmount ?? 0) > 0 ? "text-rose-600" : "text-foreground",
            )}
          >
            {formatCurrency(outstandingAmount ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">
            Updated {formatDate(deal.updatedAt)}
          </p>
        </article>
      </CardContent>
    </Card>
  );
}
