import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  OpsVehicleDocument,
  OpsVehicleProfile,
  OpsVehicleServiceLogEntry,
} from "@/lib/data/operations/cars";

type CarDetailProps = {
  profile: OpsVehicleProfile;
  documents: OpsVehicleDocument[];
  serviceLog: OpsVehicleServiceLogEntry[];
};

export function CarDetailView({ profile, documents, serviceLog }: CarDetailProps) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
        <Link href="/ops/cars">← Back to cars</Link>
      </Button>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardDescription>Vehicle</CardDescription>
          <CardTitle>{profile.heading}</CardTitle>
          <p className="text-sm text-muted-foreground">{profile.subtitle}</p>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-subtle">
            <Image
              src={profile.image}
              alt={profile.heading}
              width={960}
              height={540}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="space-y-4">
            {profile.specs.map((spec) => (
              <div key={spec.label} className="rounded-xl border border-border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{spec.label}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{spec.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardDescription>Documents</CardDescription>
          <CardTitle>Fleet records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{document.title}</p>
                <p className="text-xs text-muted-foreground">{document.status}</p>
              </div>
              <Badge variant="outline" className="rounded-lg">
                Download
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardDescription>Service</CardDescription>
            <CardTitle>History log</CardTitle>
          </div>
          <Badge variant="outline" className="rounded-lg">
            Aurora Telematics
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {serviceLog.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{entry.date}</span>
                <Badge variant="outline" className="rounded-lg">
                  {entry.icon === "radar" ? "Telemetry" : "Service"}
                </Badge>
              </div>
              <p className="mt-2 font-medium">{entry.description}</p>
              {entry.note ? (
                <p className="text-xs text-muted-foreground">{entry.note}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
