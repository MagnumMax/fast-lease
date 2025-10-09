import { CheckCircle2, Upload, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "./utils";

type ServiceAttachment = {
  label?: string | null;
  storage_path?: string | null;
  slot?: string | null;
  url?: string | null;
};

export type VehicleServiceItem = {
  id: string;
  title: string;
  description?: string | null;
  serviceType?: string | null;
  dueDate?: string | null;
  mileageTarget?: number | null;
  status: string;
  completedAt?: string | null;
  attachments: ServiceAttachment[];
};

type ServiceScheduleListProps = {
  services: VehicleServiceItem[];
  onUploadClick?: (service: VehicleServiceItem) => void;
  onCompleteClick?: (service: VehicleServiceItem) => void;
};

function resolveServiceStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "bg-emerald-100 text-emerald-700";
  if (normalized === "overdue") return "bg-rose-100 text-rose-700";
  if (normalized === "in_progress") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export function ServiceScheduleList({
  services,
  onUploadClick,
  onCompleteClick,
}: ServiceScheduleListProps) {
  return (
    <Card className="border border-border bg-card shadow-linear">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Wrench className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <CardTitle className="text-lg font-semibold text-foreground">
            Service schedule & confirmations
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            There are no planned services yet. We will notify you when the next check is due.
          </p>
        ) : (
          services.map((service) => {
            const attachmentsCount = service.attachments?.length ?? 0;
            const dueMeta = [
              service.dueDate ? `Due ${formatDate(service.dueDate)}` : null,
              service.mileageTarget
                ? `${service.mileageTarget.toLocaleString("en-GB")} km`
                : null,
              service.completedAt
                ? `Completed ${formatDate(service.completedAt)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");

            const canMarkCompleted =
              service.status !== "completed" && Boolean(onCompleteClick);

            return (
              <article
                key={service.id}
                className="space-y-3 rounded-2xl border border-border p-4"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {service.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{dueMeta}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${resolveServiceStatusTone(service.status)}`}
                  >
                    {service.status.replace(/_/g, " ")}
                  </span>
                </header>

                {service.description ? (
                  <p className="text-xs text-muted-foreground">
                    {service.description}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-border text-xs font-medium"
                    onClick={() => onUploadClick?.(service)}
                  >
                    <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                    Upload photos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl text-xs font-semibold"
                    disabled={!canMarkCompleted}
                    onClick={() => onCompleteClick?.(service)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Mark as completed
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Photos submitted: {attachmentsCount}/6
                  </p>
                </div>

                {attachmentsCount ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {service.attachments.map((attachment, index) => (
                      <div
                        key={`${service.id}-${attachment.slot ?? index}`}
                        className="rounded-xl border border-border bg-surface-subtle p-2 text-xs text-muted-foreground"
                      >
                        <p className="font-medium text-foreground">
                          {attachment.label ?? `Attachment ${index + 1}`}
                        </p>
                        <p className="truncate">{attachment.storage_path ?? attachment.url ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
