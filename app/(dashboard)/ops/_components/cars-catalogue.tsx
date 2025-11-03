"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { OPS_VEHICLE_STATUS_META, type OpsCarRecord, type OpsTone } from "@/lib/supabase/queries/operations";
import { createOperationsCar } from "@/app/(dashboard)/ops/cars/actions";

type OpsCarsCatalogueProps = {
  initialCars: OpsCarRecord[];
};

const BODY_TYPES = ["Luxury SUV", "Luxury sedan", "Sports car", "Electric car"];

const STATUS_TONE_CLASS: Record<OpsTone, string> = {
  success: "border-emerald-400/80 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-400/80 bg-amber-500/10 text-amber-700",
  info: "border-sky-400/80 bg-sky-500/10 text-sky-700",
  danger: "border-rose-400/80 bg-rose-500/10 text-rose-700",
  muted: "border-border bg-background/60 text-muted-foreground",
};

function resolveStatusToneClass(tone: OpsTone | undefined | null) {
  if (!tone) {
    return STATUS_TONE_CLASS.muted;
  }
  return STATUS_TONE_CLASS[tone] ?? STATUS_TONE_CLASS.muted;
}

type CarFormState = {
  name: string;
  vin: string;
  year: string;
  type: string;
  price: string;
  mileage: string;
};

function createDefaultCarFormState(): CarFormState {
  return {
    name: "",
    vin: "",
    year: "",
    type: "Luxury SUV",
    price: "",
    mileage: "",
  };
}

export function OpsCarsCatalogue({ initialCars }: OpsCarsCatalogueProps) {
  const [cars, setCars] = useState(initialCars);
  const [searchQuery, setSearchQuery] = useState("");
  const [bodyTypeFilter, setBodyTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<CarFormState>(() =>
    createDefaultCarFormState(),
  );

  const bodyTypeOptions = useMemo(() => {
    const set = new Set<string>(BODY_TYPES);
    cars.forEach((car) => {
      if (car.bodyType) {
        set.add(car.bodyType);
      }
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "ru"));
  }, [cars]);

  const filteredCars = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return cars.filter((car) => {
      const matchesQuery =
        !query ||
        `${car.name} ${car.vin} ${car.variant ?? ""}`.toLowerCase().includes(query);
      const matchesBodyType = !bodyTypeFilter || (car.bodyType ?? "").toLowerCase() === bodyTypeFilter.toLowerCase();
      const matchesStatus = !statusFilter || car.status === statusFilter;
      return matchesQuery && matchesBodyType && matchesStatus;
    });
  }, [cars, searchQuery, bodyTypeFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredCars.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageSliceStart = currentPage * pageSize;
  const currentCars = filteredCars.slice(pageSliceStart, pageSliceStart + pageSize);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, bodyTypeFilter, statusFilter, cars]);

  function handleCreateCar() {
    if (!formState.name.trim() || !formState.vin.trim()) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await createOperationsCar({
        name: formState.name.trim(),
        vin: formState.vin.trim(),
        year: formState.year.trim() || undefined,
        type: formState.type,
        price: formState.price.trim() || undefined,
        mileage: formState.mileage.trim() || undefined,
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

  return (
    <div className="space-y-6">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardDescription>Fleet</CardDescription>
            <CardTitle>Vehicles</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Поиск (VIN, марка, модель)"
                  className="h-10 w-64 rounded-xl pl-9 pr-3"
                />
              </div>
              <select
                value={bodyTypeFilter}
                onChange={(event) => setBodyTypeFilter(event.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="">Все типы</option>
                {bodyTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="">Все статусы</option>
                {Object.entries(OPS_VEHICLE_STATUS_META).map(([status, meta]) => (
                  <option key={status} value={status}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
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
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Add car
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Add vehicle</DialogTitle>
                  <DialogDescription>Extend the fleet catalogue.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="car-name" className="text-sm font-medium text-foreground/80">
                      Name
                    </label>
                    <Input
                      id="car-name"
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Rolls-Royce Cullinan"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="car-vin" className="text-sm font-medium text-foreground/80">
                      VIN
                    </label>
                    <Input
                      id="car-vin"
                      value={formState.vin}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, vin: event.target.value }))
                      }
                      placeholder="AAX-341"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="car-year" className="text-sm font-medium text-foreground/80">
                        Year
                      </label>
                      <Input
                        id="car-year"
                        type="number"
                        value={formState.year}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, year: event.target.value }))
                        }
                        placeholder="2025"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="car-type" className="text-sm font-medium text-foreground/80">
                        Type
                      </label>
                      <select
                        id="car-type"
                        value={formState.type}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, type: event.target.value }))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        {BODY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="car-price" className="text-sm font-medium text-foreground/80">
                      Cost
                    </label>
                    <Input
                      id="car-price"
                      value={formState.price}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, price: event.target.value }))
                      }
                      placeholder="AED 1,500,000"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="car-mileage" className="text-sm font-medium text-foreground/80">
                      Mileage
                    </label>
                    <Input
                      id="car-mileage"
                      value={formState.mileage}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, mileage: event.target.value }))
                      }
                      placeholder="12,800 km"
                      className="rounded-xl"
                    />
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
                    onClick={handleCreateCar}
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

      <Card className="hidden border border-border bg-card/60 backdrop-blur md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Автомобиль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Год</TableHead>
                <TableHead>Пробег</TableHead>
                <TableHead>Стоимость</TableHead>
                <TableHead>Активная сделка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCars.length ? (
                currentCars.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell className="space-y-1">
                      {car.detailHref ? (
                        <Link
                          href={car.detailHref}
                          className="text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {car.name}
                        </Link>
                      ) : (
                        <div className="text-sm font-semibold text-foreground">{car.name}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        VIN: {car.vin}
                        {car.variant ? ` • ${car.variant}` : ""}
                        {car.year ? ` • ${car.year}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveStatusToneClass(car.statusTone)}`}>
                        {car.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{car.bodyType ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{car.year ?? "—"}</TableCell>
                    <TableCell className="text-sm text-foreground">{car.mileage}</TableCell>
                    <TableCell className="text-sm text-foreground">{car.price}</TableCell>
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Автомобили не найдены. Измените фильтры или добавьте новый автомобиль.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
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
      </Card>

      <div className="grid gap-4 md:hidden">
        {currentCars.length ? currentCars.map((car) => (
          <Card key={car.vin} className="bg-card/60 backdrop-blur">
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
                </div>
                <Badge variant="outline" className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveStatusToneClass(car.statusTone)}`}>
                  {car.statusLabel}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <span>Тип: {car.bodyType ?? "—"}</span>
                <span>Год: {car.year ?? "—"}</span>
                <span>Пробег: {car.mileage}</span>
                <span>Стоимость: {car.price}</span>
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
