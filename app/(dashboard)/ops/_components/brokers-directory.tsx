"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CarFront, Mail, Phone, Plus, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { createOperationsBroker } from "@/app/(dashboard)/ops/brokers/actions";
import type { OpsClientRecord, OpsClientEntityType } from "@/lib/supabase/queries/operations";
import { useDashboard } from "@/components/providers/dashboard-context";
import { WorkspaceListHeader } from "@/components/workspace/list-page-header";

const BROKER_STATUS_TONE_CLASS: Record<string, string> = {
  success: "border-emerald-400/80 bg-emerald-500/10 text-emerald-700",
  danger: "border-rose-400/80 bg-rose-500/10 text-rose-700",
  muted: "border-border bg-background/60 text-muted-foreground",
};

const FILTER_ALL_VALUE = "__all";

function normalizeVin(value: string | null | undefined) {
  return value ? value.replace(/[^a-z0-9]/gi, "").toLowerCase() : "";
}

function resolveBrokerStatusToneClass(status: string | undefined | null) {
  if (!status) {
    return BROKER_STATUS_TONE_CLASS.muted;
  }

  switch (status) {
    case "Active":
      return BROKER_STATUS_TONE_CLASS.success;
    case "Blocked":
      return BROKER_STATUS_TONE_CLASS.danger;
    default:
      return BROKER_STATUS_TONE_CLASS.muted;
  }
}

function resolveBrokerTypeLabel(entityType?: OpsClientEntityType | null) {
  return entityType === "company" ? "Company" : "Personal";
}

type BrokerFormState = {
  name: string;
  email: string;
  phone: string;
  type: "personal" | "company";
};

function createDefaultBrokerFormState(): BrokerFormState {
  return {
    name: "",
    email: "",
    phone: "",
    type: "personal",
  };
}

type OpsBrokersDirectoryProps = {
  initialBrokers: OpsClientRecord[];
};

export function OpsBrokersDirectory({ initialBrokers }: OpsBrokersDirectoryProps) {
  const { setHeaderActions, searchQuery } = useDashboard();
  const [brokers, setBrokers] = useState(initialBrokers);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL_VALUE);
  const [typeFilter, setTypeFilter] = useState<string>(FILTER_ALL_VALUE);
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

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Фильтр по типу</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={typeFilter === FILTER_ALL_VALUE}
            onCheckedChange={() => setTypeFilter(FILTER_ALL_VALUE)}
          >
            Все типы
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={typeFilter === "personal"}
            onCheckedChange={() => setTypeFilter("personal")}
          >
            Физлицо
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={typeFilter === "company"}
            onCheckedChange={() => setTypeFilter("company")}
          >
            Юрлицо
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, statusFilter, typeFilter]);
  const pageSize = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<BrokerFormState>(() =>
    createDefaultBrokerFormState(),
  );

  const summary = useMemo(() => {
    const total = brokers.length;
    const active = brokers.filter((broker) => broker.status === "Active").length;
    const blocked = total - active;
    return { total, active, blocked };
  }, [brokers]);

  const normalizedStatusFilter = statusFilter === FILTER_ALL_VALUE ? "" : statusFilter;
  const normalizedTypeFilter = typeFilter === FILTER_ALL_VALUE ? "" : typeFilter;

  const filteredBrokers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedVinQuery = normalizeVin(searchQuery);
    return brokers.filter((broker) => {
      const tagsJoined = broker.tags.join(" ").toLowerCase();
      const searchableText = `${broker.name} ${broker.email} ${broker.phone} ${tagsJoined} ${broker.leasing?.vin ?? ""}`.toLowerCase();
      const matchesText = !query || searchableText.includes(query);
      const matchesVin =
        normalizedVinQuery.length > 0 && normalizeVin(broker.leasing?.vin).includes(normalizedVinQuery);
      const matchesStatus = !normalizedStatusFilter || broker.status === normalizedStatusFilter;
      const brokerType = broker.entityType === "company" ? "company" : "personal";
      const matchesType = !normalizedTypeFilter || brokerType === normalizedTypeFilter;
      return (matchesText || matchesVin) && matchesStatus && matchesType;
    });
  }, [brokers, searchQuery, normalizedStatusFilter, normalizedTypeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredBrokers.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageSliceStart = currentPage * pageSize;
  const currentBrokers = filteredBrokers.slice(
    pageSliceStart,
    pageSliceStart + pageSize,
  );

  useEffect(() => {
    setPage(0);
  }, [searchQuery, normalizedStatusFilter, normalizedTypeFilter, brokers]);

  function handleCreateBroker() {
    if (!formState.name.trim()) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createOperationsBroker({
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
        setBrokers((prev) => {
          const filtered = prev.filter(
            (broker) => broker.detailHref !== result.data.detailHref,
          );
          return [result.data, ...filtered];
        });

        setFormState(createDefaultBrokerFormState());
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
          setFormState(createDefaultBrokerFormState());
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Новый брокер
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl p-0">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Создать брокера</DialogTitle>
            <DialogDescription>Заполните контактную информацию брокера.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <label htmlFor="broker-type" className="text-sm font-medium text-foreground/80">
                Тип брокера
              </label>
              <RadioGroup
                id="broker-type"
                value={formState.type}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, type: value as "personal" | "company" }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="type-personal" />
                  <label
                    htmlFor="type-personal"
                    className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Физическое лицо
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="type-company" />
                  <label
                    htmlFor="type-company"
                    className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Юридическое лицо
                  </label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <label htmlFor="broker-name" className="text-sm font-medium text-foreground/80">
                Полное имя
              </label>
              <Input
                id="broker-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Иван Иванов"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="broker-email" className="text-sm font-medium text-foreground/80">
                Email
              </label>
              <Input
                id="broker-email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="broker@fastlease.dev"
                className="rounded-xl"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="broker-phone" className="text-sm font-medium text-foreground/80">
                Телефон
              </label>
              <Input
                id="broker-phone"
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
            <Button onClick={handleCreateBroker} className="rounded-xl" disabled={isSaving}>
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
        title="Брокеры"
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
                <TableHead className="min-w-[240px]">Сделки</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentBrokers.length ? (
                currentBrokers.map((broker) => (
                  <TableRow key={broker.id} className="align-top">
                    <TableCell className="max-w-[240px]">
                      <Link
                        href={broker.detailHref}
                        className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                      >
                        {broker.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px] uppercase">
                          {resolveBrokerTypeLabel(broker.entityType)}
                        </Badge>
                        {broker.segment ? (
                          <Badge variant="outline" className="rounded-lg text-xs">
                            {broker.segment}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveBrokerStatusToneClass(
                          broker.status,
                        )}`}
                      >
                        {broker.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{broker.email || "—"}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{broker.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {broker.deals && broker.deals.length ? (
                        <>
                          <div className="flex flex-col gap-2">
                            {(() => {
                              const lastDeal = broker.deals[broker.deals.length - 1];
                              return (
                                <div key={lastDeal.id} className="space-y-1">
                                  <Link
                                    href={lastDeal.href}
                                    className="flex items-center gap-2 font-medium text-foreground hover:underline"
                                  >
                                    <CarFront className="h-4 w-4 text-muted-foreground" />
                                    <span>{lastDeal.vehicle}</span>
                                  </Link>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-semibold">{lastDeal.number}</span>
                                    {lastDeal.vin ? <span className="ml-2">VIN {lastDeal.vin}</span> : null}
                                    <span className="ml-2">{lastDeal.amount}</span>
                                    <span className="ml-2">{lastDeal.since}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          {broker.deals.length > 1 ? (
                            <Link
                              href={`${broker.detailHref}#broker-deals`}
                              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                            >
                              + ещё {broker.deals.length - 1}
                            </Link>
                          ) : null}
                        </>
                      ) : broker.leasing && broker.leasing.dealId ? (
                        <div className="space-y-1">
                          <Link
                            href={`/ops/deals/${broker.leasing.dealId}`}
                            className="flex items-center gap-2 font-medium text-foreground hover:underline"
                          >
                            <CarFront className="h-4 w-4 text-muted-foreground" />
                            <span>{broker.leasing.vehicle}</span>
                          </Link>
                          {broker.leasing.dealNumber ? (
                            <p className="text-xs text-muted-foreground">{broker.leasing.dealNumber}</p>
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
                    Подходящих брокеров не найдено. Измените фильтры или создайте нового брокера.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {pageCount > 1 ? (
          <CardFooter className="flex flex-col gap-3 border-t border-border/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Показаны записи {filteredBrokers.length ? pageSliceStart + 1 : 0}–
              {Math.min(pageSliceStart + pageSize, filteredBrokers.length)} из {filteredBrokers.length}
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
