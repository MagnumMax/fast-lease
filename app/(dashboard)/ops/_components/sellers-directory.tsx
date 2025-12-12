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
import { createOperationsSeller } from "@/app/(dashboard)/ops/sellers/actions";
import type { OpsClientRecord } from "@/lib/supabase/queries/operations";
import { useDashboard } from "@/components/providers/dashboard-context";
import { WorkspaceListHeader } from "@/components/workspace/list-page-header";

const SELLER_STATUS_TONE_CLASS: Record<string, string> = {
  success: "border-emerald-400/80 bg-emerald-500/10 text-emerald-700",
  danger: "border-rose-400/80 bg-rose-500/10 text-rose-700",
  muted: "border-border bg-background/60 text-muted-foreground",
};

const FILTER_ALL_VALUE = "__all";

function normalizeVin(value: string | null | undefined) {
  return value ? value.replace(/[^a-z0-9]/gi, "").toLowerCase() : "";
}

function resolveSellerStatusToneClass(status: string | undefined | null) {
  if (!status) {
    return SELLER_STATUS_TONE_CLASS.muted;
  }

  switch (status) {
    case "Active":
      return SELLER_STATUS_TONE_CLASS.success;
    case "Blocked":
      return SELLER_STATUS_TONE_CLASS.danger;
    default:
      return SELLER_STATUS_TONE_CLASS.muted;
  }
}

function resolveSellerTypeLabel(entityType?: "individual" | "company" | null) {
  return entityType === "company" ? "Company" : "Private";
}

type SellerFormState = {
  name: string;
  email: string;
  phone: string;
  type: "individual" | "company";
};

function createDefaultSellerFormState(): SellerFormState {
  return {
    name: "",
    email: "",
    phone: "",
    type: "individual",
  };
}

type OpsSellersDirectoryProps = {
  initialSellers: OpsClientRecord[];
};

export function OpsSellersDirectory({ initialSellers }: OpsSellersDirectoryProps) {
  const { setHeaderActions, searchQuery } = useDashboard();
  const [sellers, setSellers] = useState(initialSellers);
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
            checked={typeFilter === "individual"}
            onCheckedChange={() => setTypeFilter("individual")}
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
  const [formState, setFormState] = useState<SellerFormState>(() =>
    createDefaultSellerFormState(),
  );

  const summary = useMemo(() => {
    const total = sellers.length;
    const active = sellers.filter((seller) => seller.status === "Active").length;
    const blocked = total - active;
    return { total, active, blocked };
  }, [sellers]);

  const normalizedStatusFilter = statusFilter === FILTER_ALL_VALUE ? "" : statusFilter;
  const normalizedTypeFilter = typeFilter === FILTER_ALL_VALUE ? "" : typeFilter;

  const filteredSellers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedVinQuery = normalizeVin(searchQuery);
    return sellers.filter((seller) => {
      const tagsJoined = seller.tags.join(" ").toLowerCase();
      const searchableText = `${seller.name} ${seller.email} ${seller.phone} ${tagsJoined} ${seller.leasing?.vin ?? ""}`.toLowerCase();
      const matchesText = !query || searchableText.includes(query);
      const matchesVin =
        normalizedVinQuery.length > 0 && normalizeVin(seller.leasing?.vin).includes(normalizedVinQuery);
      const matchesStatus = !normalizedStatusFilter || seller.status === normalizedStatusFilter;
      const matchesType = !normalizedTypeFilter || (seller.entityType ?? "individual") === normalizedTypeFilter;
      return (matchesText || matchesVin) && matchesStatus && matchesType;
    });
  }, [sellers, searchQuery, normalizedStatusFilter, normalizedTypeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredSellers.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageSliceStart = currentPage * pageSize;
  const currentSellers = filteredSellers.slice(
    pageSliceStart,
    pageSliceStart + pageSize,
  );

  useEffect(() => {
    setPage(0);
  }, [searchQuery, normalizedStatusFilter, normalizedTypeFilter, sellers]);

  function handleCreateSeller() {
    if (!formState.name.trim()) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createOperationsSeller({
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
        setSellers((prev) => {
          const filtered = prev.filter(
            (seller) => seller.detailHref !== result.data.detailHref,
          );
          return [result.data, ...filtered];
        });

        setFormState(createDefaultSellerFormState());
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
          setFormState(createDefaultSellerFormState());
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Новый продавец
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl p-0">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Создать продавца</DialogTitle>
            <DialogDescription>Заполните контактную информацию продавца.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <label htmlFor="seller-type" className="text-sm font-medium text-foreground/80">
                Тип продавца
              </label>
              <RadioGroup
                id="seller-type"
                value={formState.type}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, type: value as "individual" | "company" }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="r-individual" />
                  <label
                    htmlFor="r-individual"
                    className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Физлицо
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="r-company" />
                  <label
                    htmlFor="r-company"
                    className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Юрлицо
                  </label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <label htmlFor="seller-name" className="text-sm font-medium text-foreground/80">
                Полное имя
              </label>
              <Input
                id="seller-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Иван Иванов"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="seller-email" className="text-sm font-medium text-foreground/80">
                Email
              </label>
              <Input
                id="seller-email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="seller@fastlease.dev"
                className="rounded-xl"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="seller-phone" className="text-sm font-medium text-foreground/80">
                Телефон
              </label>
              <Input
                id="seller-phone"
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
            <Button onClick={handleCreateSeller} className="rounded-xl" disabled={isSaving}>
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
        title="Продавцы"
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
              {currentSellers.length ? (
                currentSellers.map((seller) => (
                  <TableRow key={seller.id} className="align-top">
                    <TableCell className="max-w-[240px]">
                      <Link
                        href={seller.detailHref}
                        className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                      >
                        {seller.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px] uppercase">
                          {resolveSellerTypeLabel(seller.entityType)}
                        </Badge>
                        {seller.segment ? (
                          <Badge variant="outline" className="rounded-lg text-xs">
                            {seller.segment}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveSellerStatusToneClass(
                          seller.status,
                        )}`}
                      >
                        {seller.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{seller.email || "—"}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{seller.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {seller.deals && seller.deals.length ? (
                        <>
                          <div className="flex flex-col gap-2">
                            {(() => {
                              const lastDeal = seller.deals[seller.deals.length - 1];
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
                          {seller.deals.length > 1 ? (
                            <Link
                              href={`${seller.detailHref}#seller-deals`}
                              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                            >
                              + ещё {seller.deals.length - 1}
                            </Link>
                          ) : null}
                        </>
                      ) : seller.leasing && seller.leasing.dealId ? (
                        <div className="space-y-1">
                          <Link
                            href={`/ops/deals/${seller.leasing.dealId}`}
                            className="flex items-center gap-2 font-medium text-foreground hover:underline"
                          >
                            <CarFront className="h-4 w-4 text-muted-foreground" />
                            <span>{seller.leasing.vehicle}</span>
                          </Link>
                          {seller.leasing.dealNumber ? (
                            <p className="text-xs text-muted-foreground">{seller.leasing.dealNumber}</p>
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
                    Подходящих продавцов не найдено. Измените фильтры или создайте нового продавца.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {pageCount > 1 ? (
          <CardFooter className="flex flex-col gap-3 border-t border-border/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Показаны записи {filteredSellers.length ? pageSliceStart + 1 : 0}–
              {Math.min(pageSliceStart + pageSize, filteredSellers.length)} из {filteredSellers.length}
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
