"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createOperationsClient } from "@/app/(dashboard)/ops/clients/actions";
import type { OpsClientRecord } from "@/lib/data/operations/clients";

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  status: OpsClientRecord["status"];
};

function createDefaultClientFormState(): ClientFormState {
  return {
    name: "",
    email: "",
    phone: "",
    status: "Active",
  };
}

type OpsClientsDirectoryProps = {
  initialClients: OpsClientRecord[];
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OpsClientsDirectory({ initialClients }: OpsClientsDirectoryProps) {
  const [clients, setClients] = useState(initialClients);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [overdueFilter, setOverdueFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ClientFormState>(() =>
    createDefaultClientFormState(),
  );

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesQuery =
        !query ||
        `${client.name} ${client.email} ${client.phone}`.toLowerCase().includes(query);
      const matchesStatus = !statusFilter || client.status === statusFilter;
      const matchesOverdue =
        !overdueFilter ||
        (overdueFilter === "0" ? client.overdue === 0 : client.overdue > 0);
      return matchesQuery && matchesStatus && matchesOverdue;
    });
  }, [clients, searchQuery, statusFilter, overdueFilter]);

  function handleCreateClient() {
    if (!formState.name.trim()) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createOperationsClient({
        name: formState.name.trim(),
        email: formState.email.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        status: formState.status,
      });

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      if (result.data) {
        setClients((prev) => {
          const filtered = prev.filter(
            (client) => client.detailHref !== result.data.detailHref,
          );
          return [result.data, ...filtered];
        });

        setFormState(createDefaultClientFormState());
        setIsModalOpen(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardDescription>Clients</CardDescription>
            <CardTitle>Directory</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search (name/email/phone)"
                className="h-10 w-72 rounded-xl pl-9 pr-3"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
            </select>
            <select
              value={overdueFilter}
              onChange={(event) => setOverdueFilter(event.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="">All</option>
              <option value="0">No overdue</option>
              <option value=">0">Overdue</option>
            </select>
            <Dialog
              open={isModalOpen}
              onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) {
                  setErrorMessage(null);
                  setFormState(createDefaultClientFormState());
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Create client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Create client</DialogTitle>
                  <DialogDescription>Register a new client profile.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="client-name" className="text-sm font-medium text-foreground/80">
                      Name
                    </label>
                    <Input
                      id="client-name"
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Michael Adams"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="client-email" className="text-sm font-medium text-foreground/80">
                      Email
                    </label>
                    <Input
                      id="client-email"
                      value={formState.email}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="client@fastlease.io"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="client-phone" className="text-sm font-medium text-foreground/80">
                      Phone
                    </label>
                    <Input
                      id="client-phone"
                      value={formState.phone}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      placeholder="+971 50 000 0000"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="client-status" className="text-sm font-medium text-foreground/80">
                      Status
                    </label>
                    <select
                      id="client-status"
                      value={formState.status}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          status: event.target.value as OpsClientRecord["status"],
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </div>
                {errorMessage ? (
                  <p className="text-sm text-destructive">{errorMessage}</p>
                ) : null}
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateClient}
                    className="rounded-xl"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <div className="hidden rounded-2xl border border-border bg-card/60 backdrop-blur md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Scoring</TableHead>
              <TableHead>Overdue</TableHead>
              <TableHead>Limit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/ops/clients/${toSlug(client.name)}`}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {client.id}
                  </Link>
                </TableCell>
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>{client.scoring}</TableCell>
                <TableCell>{client.overdue}</TableCell>
                <TableCell>{client.limit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 md:hidden">
        {filteredClients.map((client) => (
          <Card key={client.id} className="bg-card/60 backdrop-blur">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.email}</p>
                </div>
                <Badge
                  variant={client.status === "Active" ? "success" : "danger"}
                  className="rounded-lg"
                >
                  {client.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <span>Phone: {client.phone}</span>
                <span>Scoring: {client.scoring}</span>
                <span>Overdue: {client.overdue}</span>
                <span>Limit: {client.limit}</span>
              </div>
              <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
                <Link href={`/ops/clients/${toSlug(client.name)}`}>Open profile</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
