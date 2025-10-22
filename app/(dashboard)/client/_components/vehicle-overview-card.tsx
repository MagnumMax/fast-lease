import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientPortalSnapshot } from "@/lib/supabase/queries/client-portal";

import { formatCurrency } from "./utils";
import { FALLBACK_IMAGES as DEAL_FALLBACK_IMAGES } from "./deal-summary-card";

type VehicleOverviewCardProps = {
  vehicle: ClientPortalSnapshot["vehicle"];
  vehicleImages: ClientPortalSnapshot["vehicleImages"];
  telematics: ClientPortalSnapshot["vehicleTelematics"];
};

type TelemetryKey = "odometer" | "batteryHealth" | "fuelLevel";

const telemetryLabels: Array<{
  key: TelemetryKey;
  label: string;
  unit?: string;
}> = [
  { key: "odometer", label: "Mileage", unit: "km" },
  { key: "batteryHealth", label: "Battery", unit: "%" },
  { key: "fuelLevel", label: "Fuel", unit: "%" },
];

function resolveVehicleImage(
  vehicle: VehicleOverviewCardProps["vehicle"],
  images: VehicleOverviewCardProps["vehicleImages"],
) {
  const primary = images.find((image) => image.isPrimary);
  if (primary?.storagePath) {
    const parts = primary.storagePath.split("/");
    const folder = parts.length >= 2 ? parts[1] : "";
    if (folder && DEAL_FALLBACK_IMAGES[folder]) {
      return DEAL_FALLBACK_IMAGES[folder];
    }
  }

  const slug = [vehicle?.make, vehicle?.model]
    .filter(Boolean)
    .join("-")
    .toLowerCase();

  const fallback =
    (slug && DEAL_FALLBACK_IMAGES[slug]) ??
    "/assets/rolls-royce-cullinan.jpg";
  return fallback;
}

export function VehicleOverviewCard({
  vehicle,
  vehicleImages,
  telematics,
}: VehicleOverviewCardProps) {
  if (!vehicle) return null;

  const image = resolveVehicleImage(vehicle, vehicleImages);
  const meta = [
    vehicle.year,
    vehicle.bodyType,
    vehicle.transmission,
    vehicle.fuelType,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Card className="border border-border bg-card shadow-linear">
      <CardHeader className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Vehicle
          </p>
          <CardTitle className="mt-2 text-2xl font-semibold text-foreground">
            {[vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
        <figure className="relative h-40 w-full overflow-hidden rounded-2xl border border-border bg-surface-subtle lg:h-44 lg:w-72">
          <Image
            src={image}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 320px"
            priority
          />
          <div className="absolute left-4 top-4 flex gap-2">
            <Badge variant="secondary" className="rounded-full bg-white/80 text-xs font-medium">
              {vehicle.status}
            </Badge>
            {vehicle.monthlyLeaseRate ? (
              <Badge variant="secondary" className="rounded-full bg-white/80 text-xs font-medium">
                {formatCurrency(vehicle.monthlyLeaseRate)}/mo
              </Badge>
            ) : null}
          </div>
        </figure>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <dl className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
          {vehicle.vin ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                VIN
              </dt>
              <dd className="font-medium text-foreground">{vehicle.vin}</dd>
            </div>
          ) : null}
          {vehicle.mileage != null ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Mileage
              </dt>
              <dd className="font-medium text-foreground">
                {vehicle.mileage.toLocaleString("en-GB")} km
              </dd>
            </div>
          ) : null}
          {vehicle.residualValue != null ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Residual value
              </dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(vehicle.residualValue)}
              </dd>
            </div>
          ) : null}
          {vehicle.monthlyLeaseRate != null ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Monthly lease
              </dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(vehicle.monthlyLeaseRate)}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="rounded-2xl border border-dashed border-border bg-surface-subtle p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Telematics snapshot
          </p>
          {telematics ? (
            <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
              {telemetryLabels.map(({ key, label, unit }) => {
                const value = telematics[key];
                if (value == null) return null;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <dt>{label}</dt>
                    <dd className="font-medium text-foreground">
                      {value}
                      {unit ? ` ${unit}` : ""}
                    </dd>
                  </div>
                );
              })}
              {telematics.lastReportedAt ? (
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(telematics.lastReportedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Telemetry data is currently unavailable.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
