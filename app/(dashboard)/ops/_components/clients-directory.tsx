"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CarFront, Mail, Phone, Plus, Search } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { WorkspaceListHeader } from "@/components/workspace/list-page-header";

const CLIENT_STATUS_TONE_CLASS: Record<string, string> = {
  success: "border-emerald-400/80 bg-emerald-500/10 text-emerald-700",
  danger: "border-rose-400/80 bg-rose-500/10 text-rose-700",
  muted: "border-border bg-background/60 text-muted-foreground",
};

const FILTER_ALL_VALUE = "__all";
const OVERDUE_ALL_VALUE = "__overdue_all";

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
};

function createDefaultClientFormState(): ClientFormState {
  return {
    name: "",
    email: "",
    phone: "",
  };
}

type OpsClientsDirectoryProps = {
  initialClients: OpsClientRecord[];
};

export function OpsClientsDirectory({ initialClients }: OpsClientsDirectoryProps) {
  const [clients, setClients] = useState(initialClients);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL_VALUE);
  const [overdueFilter, setOverdueFilter] = useState<string>(OVERDUE_ALL_VALUE);
  const [page, setPage] = useState(0);
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
  const normalizedOverdueFilter = overdueFilter === OVERDUE_ALL_VALUE ? "" : overdueFilter;

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
      const matchesOverdue =
        !normalizedOverdueFilter ||
        (normalizedOverdueFilter === "0" ? client.overdue === 0 : client.overdue > 0);
      return (matchesText || matchesVin) && matchesStatus && matchesOverdue;
    });
  }, [clients, searchQuery, normalizedStatusFilter, normalizedOverdueFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageSliceStart = currentPage * pageSize;
  const currentClients = filteredClients.slice(
    pageSliceStart,
    pageSliceStart + pageSize,
  );

  useEffect(() => {
    setPage(0);
  }, [searchQuery, normalizedStatusFilter, normalizedOverdueFilter, clients]);

function handleCreateClient() {
    if (!formState.name.trim()) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createOperationsClient({
        name: formState.name.trim(),
        email: formState.email.trim() || undefined,
        phone: formState.phone.trim() || undefined,
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

      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск (имя, email, телефон, теги, VIN)"
              className="h-10 rounded-xl pl-9 pr-3"
            />
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 md:w-48">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL_VALUE}>Все статусы</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 md:w-48">
                <SelectValue placeholder="Все задолженности" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OVERDUE_ALL_VALUE}>Все задолженности</SelectItem>
                <SelectItem value="0">Без просрочек</SelectItem>
                <SelectItem value=">0">Есть просрочки</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/70 backdrop-blur">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Полное имя</TableHead>
                <TableHead className="min-w-[120px]">Статус</TableHead>
                <TableHead className="min-w-[200px]">Контакты</TableHead>
                <TableHead className="min-w-[140px]">Просрочки</TableHead>
                <TableHead className="min-w-[220px]">Лизинг</TableHead>
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
                      {client.segment ? (
                        <div className="mt-2">
                          <Badge variant="outline" className="rounded-lg text-xs">
                            {client.segment}
                          </Badge>
                        </div>
                      ) : null}
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
                    <TableCell className="text-sm text-foreground">
                      {client.overdue > 0 ? (
                        <Badge variant="danger" className="rounded-lg">
                          {client.metricsSummary?.overdue ?? `${client.overdue} проср.`}
                        </Badge>
                      ) : (
                        client.metricsSummary?.overdue ?? "Нет просрочек"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.leasing ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-foreground">
                            <CarFront className="h-4 w-4 text-muted-foreground" />
                            <span>{client.leasing.vehicle}</span>
                          </div>
                          {client.leasing.vin ? (
                            <p className="text-xs text-muted-foreground">VIN: {client.leasing.vin}</p>
                          ) : null}
                          <div className="grid grid-cols-[auto,1fr] gap-x-2 text-xs text-muted-foreground">
                            <span>Сумма:</span>
                            <span>{client.leasing.amount}</span>
                            <span>Старт:</span>
                            <span>{client.leasing.since}</span>
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
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
