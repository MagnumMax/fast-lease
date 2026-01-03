"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Filter, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { OPS_VEHICLE_STATUS_META, type OpsCarRecord, type OpsTone } from "@/lib/supabase/queries/operations";
import { createOperationsCar } from "@/app/(dashboard)/ops/cars/actions";
import { WorkspaceListHeader } from "@/components/workspace/list-page-header";
import { useDashboard } from "@/components/providers/dashboard-context";

type OpsCarsCatalogueProps = {
  initialCars: OpsCarRecord[];
};

const STATUS_TONE_CLASS: Record<OpsTone, string> = {
  success: "border-emerald-400/80 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-400/80 bg-amber-500/10 text-amber-700",
  info: "border-sky-400/80 bg-sky-500/10 text-sky-700",
  danger: "border-rose-400/80 bg-rose-500/10 text-rose-700",
  muted: "border-border bg-background/60 text-muted-foreground",
};

const FILTER_ALL_VALUE = "__all";

function normalizeVin(value: string | null | undefined) {
  return value ? value.replace(/[^a-z0-9]/gi, "").toLowerCase() : "";
}

function resolveStatusToneClass(tone: OpsTone | undefined | null) {
  if (!tone) {
    return STATUS_TONE_CLASS.muted;
  }
  return STATUS_TONE_CLASS[tone] ?? STATUS_TONE_CLASS.muted;
}

type CarFormState = {
  make: string;
  model: string;
  vin: string;
  year: string;
  mileage: string;
};

function createDefaultCarFormState(): CarFormState {
  return {
    make: "",
    model: "",
    vin: "",
    year: "",
    mileage: "",
  };
}

export function OpsCarsCatalogue({ initialCars }: OpsCarsCatalogueProps) {
  const { setHeaderActions, searchQuery } = useDashboard();
  const [cars, setCars] = useState(initialCars);
  const [bodyTypeFilter, setBodyTypeFilter] = useState<string>(FILTER_ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL_VALUE);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<CarFormState>(() =>
    createDefaultCarFormState(),
  );

  const summary = useMemo(() => {
    const total = cars.length;
    const available = cars.filter((car) => car.status === "available").length;
    const leased = cars.filter((car) => car.status === "leased").length;
    const maintenance = cars.filter((car) => car.status === "maintenance").length;

    return {
      total,
      available,
      leased,
      maintenance,
    };
  }, [cars]);

  const resolveLicensePlateLabel = (car: OpsCarRecord): string | null =>
    car.licensePlateDisplay ?? car.licensePlate ?? null;

  const bodyTypeOptions = useMemo(() => {
    const set = new Set<string>();
    cars.forEach((car) => {
      if (car.bodyType) {
        set.add(car.bodyType);
      }
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "ru"));
  }, [cars]);

  const normalizedBodyTypeFilter = bodyTypeFilter === FILTER_ALL_VALUE ? "" : bodyTypeFilter;
  const normalizedStatusFilter = statusFilter === FILTER_ALL_VALUE ? "" : statusFilter;

  const filteredCars = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedVinQuery = normalizeVin(searchQuery);
    return cars.filter((car) => {
      const licensePlateLabel = resolveLicensePlateLabel(car);
      const matchesText =
        !query ||
        `${car.name} ${car.vin} ${car.variant ?? ""} ${car.licensePlate ?? ""} ${licensePlateLabel ?? ""}`
          .toLowerCase()
          .includes(query);
      const matchesVin =
        normalizedVinQuery.length > 0 && normalizeVin(car.vin).includes(normalizedVinQuery);
      const matchesBodyType =
        !normalizedBodyTypeFilter ||
        (car.bodyType ?? "").toLowerCase() === normalizedBodyTypeFilter.toLowerCase();
      const matchesStatus = !normalizedStatusFilter || car.status === normalizedStatusFilter;
      return (matchesText || matchesVin) && matchesBodyType && matchesStatus;
    });
  }, [cars, searchQuery, normalizedBodyTypeFilter, normalizedStatusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredCars.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageSliceStart = currentPage * pageSize;
  const currentCars = filteredCars.slice(pageSliceStart, pageSliceStart + pageSize);

  useEffect(() => {
    setHeaderActions(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Filter className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Статус</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={statusFilter === FILTER_ALL_VALUE}
            onCheckedChange={() => setStatusFilter(FILTER_ALL_VALUE)}
          >
            Все статусы
          </DropdownMenuCheckboxItem>
          {Object.entries(OPS_VEHICLE_STATUS_META).map(([status, meta]) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={statusFilter === status}
              onCheckedChange={() => setStatusFilter(status)}
            >
              {meta.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Тип кузова</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={bodyTypeFilter === FILTER_ALL_VALUE}
            onCheckedChange={() => setBodyTypeFilter(FILTER_ALL_VALUE)}
          >
            Все типы
          </DropdownMenuCheckboxItem>
          {bodyTypeOptions.map((type) => (
            <DropdownMenuCheckboxItem
              key={type}
              checked={bodyTypeFilter === type}
              onCheckedChange={() => setBodyTypeFilter(type)}
            >
              {type}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, statusFilter, bodyTypeFilter, bodyTypeOptions]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, normalizedBodyTypeFilter, normalizedStatusFilter, cars]);

  const canCreateCar =
    formState.make.trim().length > 0 && formState.model.trim().length > 0;

  function handleCreateCar() {
    if (!canCreateCar) {
      setErrorMessage("Заполните обязательные поля: марка и модель.");
      return;
    }

    const vinValue = formState.vin.trim().toUpperCase();
    if (vinValue.length > 0 && vinValue.length < 5) {
      setErrorMessage("VIN должен содержать минимум 5 символов.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const payload = {
        vin: vinValue.length > 0 ? vinValue : undefined,
        make: formState.make.trim(),
        model: formState.model.trim(),
        year: formState.year.trim(),
        mileage: formState.mileage.trim(),
      };

      const result = await createOperationsCar({
        ...payload,
      });

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      if (result.data) {
        setCars((prev) => {
          const filtered = prev.filter((car) => car.id !== result.data.id);
          return [result.data, ...filtered];
        });

        setFormState(createDefaultCarFormState());
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
          setFormState(createDefaultCarFormState());
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Добавить автомобиль
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>Добавить автомобиль</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80" htmlFor="car-make">
                Марка<span className="text-destructive">*</span>
              </label>
              <Input
                id="car-make"
                value={formState.make}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, make: event.target.value }))
                }
                placeholder="Rolls-Royce"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80" htmlFor="car-model">
                Модель<span className="text-destructive">*</span>
              </label>
              <Input
                id="car-model"
                value={formState.model}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, model: event.target.value }))
                }
                placeholder="Cullinan"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80" htmlFor="car-vin">
                VIN
              </label>
              <Input
                id="car-vin"
                value={formState.vin}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    vin: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="WDC12345678900001"
                className="rounded-xl uppercase"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80" htmlFor="car-year">
                Год выпуска
              </label>
              <Input
                id="car-year"
                value={formState.year}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, year: event.target.value }))
                }
                placeholder="2024"
                inputMode="numeric"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80" htmlFor="car-mileage">
                Пробег (км)
              </label>
              <Input
                id="car-mileage"
                value={formState.mileage}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, mileage: event.target.value }))
                }
                placeholder="1200"
                inputMode="numeric"
                className="rounded-xl"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Поля, отмеченные <span className="text-destructive">*</span>, обязательны для заполнения.
          </p>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleCreateCar}
            className="rounded-xl"
            disabled={isSaving || !canCreateCar}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <WorkspaceListHeader
        title="Автопарк"
        stats={[
          { label: "Всего", value: summary.total },
          { label: "Доступны", value: summary.available },
          { label: "В лизинге", value: summary.leased },
          { label: "На обслуживании", value: summary.maintenance },
        ]}
        action={createDialog}
      />

      <div className="hidden rounded-2xl border border-border bg-card/60 backdrop-blur overflow-hidden md:block">
        <Table containerClassName="border-0 rounded-none">
          <TableHeader>
              <TableRow>
                <TableHead>Автомобиль</TableHead>
                <TableHead>Госномер</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Активная сделка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCars.length ? (
                currentCars.map((car) => {
                  const carTitle = car.year ? `${car.name}, ${car.year}` : car.name;

                  return (
                    <TableRow key={car.id}>
                      <TableCell className="space-y-1">
                        {car.detailHref ? (
                          <Link
                            href={car.detailHref}
                            className="text-sm font-semibold text-foreground hover:text-primary"
                          >
                            {carTitle}
                          </Link>
                        ) : (
                          <div className="text-sm font-semibold text-foreground">{carTitle}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          VIN: {car.vin}
                          {car.variant ? ` • ${car.variant}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {resolveLicensePlateLabel(car) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveStatusToneClass(car.statusTone)}`}>
                          {car.statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{car.bodyType ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {car.activeDealNumber ? (
                          <div className="flex flex-col gap-1">
                            {car.activeDealHref ? (
                              <Link
                                href={car.activeDealHref}
                                className="text-sm font-medium text-primary hover:text-primary/80"
                              >
                                {car.activeDealNumber}
                              </Link>
                            ) : (
                              <span className="text-sm font-medium text-foreground">{car.activeDealNumber}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Нет активной сделки</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Автомобили не найдены. Измените фильтры или добавьте новый автомобиль.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        {pageCount > 1 ? (
          <CardFooter className="flex flex-col gap-3 border-t border-border/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Показаны записи {filteredCars.length ? pageSliceStart + 1 : 0}–
              {Math.min(pageSliceStart + pageSize, filteredCars.length)} из {filteredCars.length}
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
      </div>

      <div className="grid gap-4 md:hidden">
        {currentCars.length ? currentCars.map((car) => (
          <Card key={car.id} className="bg-card/60 backdrop-blur">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  {car.detailHref ? (
                    <Link
                      href={car.detailHref}
                      className="text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {car.name}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{car.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">VIN: {car.vin}</p>
                  <p className="text-xs text-muted-foreground">
                    Госномер: {resolveLicensePlateLabel(car) ?? "—"}
                  </p>
                </div>
                <Badge variant="outline" className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveStatusToneClass(car.statusTone)}`}>
                  {car.statusLabel}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <span>Тип: {car.bodyType ?? "—"}</span>
                <span className="col-span-2">
                  {car.activeDealNumber ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {car.activeDealHref ? (
                        <Link
                          href={car.activeDealHref}
                          className="font-medium text-primary hover:text-primary/80"
                        >
                          {car.activeDealNumber}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{car.activeDealNumber}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Нет активной сделки</span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )) : (
          <p className="text-sm text-muted-foreground">Автомобили не найдены.</p>
        )}
      </div>
    </div>
  );
}
