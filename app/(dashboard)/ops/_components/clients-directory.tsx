"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CarFront, Mail, Phone, Plus, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createOperationsClient } from "@/app/(dashboard)/ops/clients/actions";
import type { OpsClientRecord } from "@/lib/supabase/queries/operations";
import { useDashboard } from "@/components/providers/dashboard-context";
import { WorkspaceListHeader } from "@/components/workspace/list-page-header";

const CLIENT_STATUS_TONE_CLASS: Record<string, string> = {
  success: "border-emerald-400/80 bg-emerald-500/10 text-emerald-700",
  danger: "border-rose-400/80 bg-rose-500/10 text-rose-700",
  muted: "border-border bg-background/60 text-muted-foreground",
};

const FILTER_ALL_VALUE = "__all";

function normalizeVin(value: string | null | undefined) {
  return value ? value.replace(/[^a-z0-9]/gi, "").toLowerCase() : "";
}

function resolveClientStatusToneClass(status: string | undefined | null) {
  if (!status) {
    return CLIENT_STATUS_TONE_CLASS.muted;
  }

  switch (status) {
    case "Active":
      return CLIENT_STATUS_TONE_CLASS.success;
    case "Blocked":
      return CLIENT_STATUS_TONE_CLASS.danger;
    default:
      return CLIENT_STATUS_TONE_CLASS.muted;
  }
}

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  type: "personal" | "company";
};

function createDefaultClientFormState(): ClientFormState {
  return {
    name: "",
    email: "",
    phone: "",
    type: "personal",
  };
}

type OpsClientsDirectoryProps = {
  initialClients: OpsClientRecord[];
};

export function OpsClientsDirectory({ initialClients }: OpsClientsDirectoryProps) {
  const { setHeaderActions, searchQuery } = useDashboard();
  const [clients, setClients] = useState(initialClients);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL_VALUE);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setHeaderActions(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Filter className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Фильтр по статусу</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={statusFilter === FILTER_ALL_VALUE}
            onCheckedChange={() => setStatusFilter(FILTER_ALL_VALUE)}
          >
            Все статусы
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={statusFilter === "Active"}
            onCheckedChange={() => setStatusFilter("Active")}
          >
            Active
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={statusFilter === "Blocked"}
            onCheckedChange={() => setStatusFilter("Blocked")}
          >
            Blocked
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, statusFilter]);
  const pageSize = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ClientFormState>(() =>
    createDefaultClientFormState(),
  );

  const summary = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((client) => client.status === "Active").length;
    const blocked = total - active;
    return { total, active, blocked };
  }, [clients]);

  const normalizedStatusFilter = statusFilter === FILTER_ALL_VALUE ? "" : statusFilter;

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedVinQuery = normalizeVin(searchQuery);
    return clients.filter((client) => {
      const tagsJoined = client.tags.join(" ").toLowerCase();
      const searchableText = `${client.name} ${client.email} ${client.phone} ${tagsJoined} ${client.leasing?.vin ?? ""}`.toLowerCase();
      const matchesText = !query || searchableText.includes(query);
      const matchesVin =
        normalizedVinQuery.length > 0 && normalizeVin(client.leasing?.vin).includes(normalizedVinQuery);
      const matchesStatus = !normalizedStatusFilter || client.status === normalizedStatusFilter;
      return (matchesText || matchesVin) && matchesStatus;
    });
  }, [clients, searchQuery, normalizedStatusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageSliceStart = currentPage * pageSize;
  const currentClients = filteredClients.slice(
    pageSliceStart,
    pageSliceStart + pageSize,
  );

  useEffect(() => {
    setPage(0);
  }, [searchQuery, normalizedStatusFilter, clients]);

  function handleCreateClient() {
    if (!formState.name.trim()) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createOperationsClient({
        name: formState.name.trim(),
        email: formState.email.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        type: formState.type,
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

  const createDialog = (
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
        <Button variant="outline" className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Новый покупатель
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl p-0">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Создать покупателя</DialogTitle>
            <DialogDescription>Заполните контактную информацию покупателя.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <label htmlFor="client-type" className="text-sm font-medium text-foreground/80">
                Тип покупателя
              </label>
              <RadioGroup
                id="client-type"
                value={formState.type}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, type: value as "personal" | "company" }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="type-personal" />
                  <label htmlFor="type-personal" className="text-sm">
                    Физическое лицо
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="type-company" />
                  <label htmlFor="type-company" className="text-sm">
                    Юридическое лицо
                  </label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <label htmlFor="client-name" className="text-sm font-medium text-foreground/80">
                Полное имя
              </label>
              <Input
                id="client-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Иван Иванов"
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
                placeholder="client@fastlease.dev"
                className="rounded-xl"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="client-phone" className="text-sm font-medium text-foreground/80">
                Телефон
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
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl">
              Отмена
            </Button>
            <Button onClick={handleCreateClient} className="rounded-xl" disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <WorkspaceListHeader
        title="Покупатели"
        stats={[
          { label: "Всего", value: summary.total },
          { label: "Активных", value: summary.active },
          { label: "Заблокированы", value: summary.blocked },
        ]}
        action={createDialog}
      />

      <Card className="border border-border/70 bg-card/70 backdrop-blur">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Полное имя</TableHead>
                <TableHead className="min-w-[120px]">Статус</TableHead>
                <TableHead className="min-w-[200px]">Контакты</TableHead>
                <TableHead className="min-w-[220px]">Сделка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentClients.length ? (
                currentClients.map((client) => (
                  <TableRow key={client.id} className="align-top">
                    <TableCell className="max-w-[240px]">
                      <Link
                        href={client.detailHref}
                        className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                      >
                        {client.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-lg text-xs">
                          {client.entityType === "company" ? "Company" : "Personal"}
                        </Badge>
                        {client.segment &&
                        client.segment !==
                          (client.entityType === "company" ? "Company" : "Personal") ? (
                          <Badge variant="outline" className="rounded-lg text-xs">
                            {client.segment}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveClientStatusToneClass(client.status)}`}>
                        {client.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{client.email || "—"}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.leasing && client.leasing.dealId ? (
                        <div className="space-y-1">
                          <Link
                            href={`/ops/deals/${client.leasing.dealId}`}
                            className="flex items-center gap-2 font-medium text-foreground hover:underline"
                          >
                            <CarFront className="h-4 w-4 text-muted-foreground" />
                            <span>{client.leasing.vehicle}</span>
                          </Link>
                          {client.leasing.dealNumber ? (
                            <p className="text-xs text-muted-foreground">
                              {client.leasing.dealNumber}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Подходящих покупателей не найдено. Измените фильтры или создайте нового покупателя.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {pageCount > 1 ? (
          <CardFooter className="flex flex-col gap-3 border-t border-border/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Показаны записи {filteredClients.length ? pageSliceStart + 1 : 0}–
              {Math.min(pageSliceStart + pageSize, filteredClients.length)} из {filteredClients.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={currentPage === 0}
                className="rounded-xl"
              >
                Назад
              </Button>
              <span className="text-xs text-muted-foreground">
                Страница {currentPage + 1} из {pageCount}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((prev) => Math.min(prev + 1, pageCount - 1))}
                disabled={currentPage >= pageCount - 1}
                className="rounded-xl"
              >
                Далее
              </Button>
            </div>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
