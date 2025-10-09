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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  OpsClientDeal,
  OpsClientDocument,
  OpsClientProfile,
} from "@/lib/data/operations/clients";

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ClientDetailProps = {
  profile: OpsClientProfile;
  deals: OpsClientDeal[];
  documents: OpsClientDocument[];
};

export function ClientDetailView({ profile, deals, documents }: ClientDetailProps) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
        <Link href="/ops/clients">← Back to clients</Link>
      </Button>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardDescription>Client</CardDescription>
            <CardTitle className="text-2xl">{profile.fullName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              ID: {profile.clientId} · {profile.program} · Client since {profile.memberSince}
            </p>
          </div>
          <Badge variant="success" className="rounded-lg">
            Preferred
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</p>
            <p className="mt-1 text-sm text-foreground">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phone</p>
            <p className="mt-1 text-sm text-foreground">{profile.phone}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Address</p>
            <p className="mt-1 text-sm text-foreground">{profile.address}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Passport</p>
            <p className="mt-1 text-sm text-foreground">{profile.passport}</p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scoring</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{profile.metrics.scoring}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overdue</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{profile.metrics.overdue}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Limit</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{profile.metrics.limit}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardDescription>Deals</CardDescription>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal ID</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/ops/deals/${toSlug(deal.dealId)}`}
                      className="text-foreground underline-offset-2 hover:underline"
                    >
                      {deal.dealId}
                    </Link>
                  </TableCell>
                  <TableCell>{deal.vehicle}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg">
                      {deal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{deal.updatedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardDescription>Documents</CardDescription>
          <CardTitle>Identity files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.status}</p>
              </div>
              <Badge variant="outline" className="rounded-lg">
                Update
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
