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
import type { OpsCarRecord } from "@/lib/data/operations/cars";
import { createOperationsCar } from "@/app/(dashboard)/ops/cars/actions";

type OpsCarsCatalogueProps = {
  initialCars: OpsCarRecord[];
};

const BODY_TYPES = ["Luxury SUV", "Luxury sedan", "Sports car", "Electric car"];

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

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OpsCarsCatalogue({ initialCars }: OpsCarsCatalogueProps) {
  const [cars, setCars] = useState(initialCars);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<CarFormState>(() =>
    createDefaultCarFormState(),
  );

  const filteredCars = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return cars.filter((car) => {
      const matchesQuery =
        !query ||
        `${car.name} ${car.vin}`.toLowerCase().includes(query);
      const matchesType = !typeFilter || car.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [cars, searchQuery, typeFilter]);

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
          const filtered = prev.filter((car) => car.vin !== result.data.vin);
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
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search car (VIN/name)"
                className="h-10 w-64 rounded-xl pl-9 pr-3"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="">All types</option>
              {BODY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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

      <div className="hidden rounded-2xl border border-border bg-card/60 backdrop-blur md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>VIN</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Mileage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCars.map((car) => (
              <TableRow key={car.vin}>
                <TableCell className="font-medium">
                  <Link
                    href={`/ops/cars/${toSlug(car.name)}`}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {car.vin}
                  </Link>
                </TableCell>
                <TableCell>{car.name}</TableCell>
                <TableCell>{car.year}</TableCell>
                <TableCell>{car.type}</TableCell>
                <TableCell>{car.price}</TableCell>
                <TableCell>{car.mileage}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 md:hidden">
        {filteredCars.map((car) => (
          <Card key={car.vin} className="bg-card/60 backdrop-blur">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{car.name}</p>
                  <p className="text-xs text-muted-foreground">VIN: {car.vin}</p>
                </div>
                <Badge variant="outline" className="rounded-lg">
                  {car.type}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <span>Year: {car.year}</span>
                <span>Mileage: {car.mileage}</span>
                <span>Cost: {car.price}</span>
                <span>Battery: {car.battery}</span>
              </div>
              <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
                <Link href={`/ops/cars/${toSlug(car.name)}`}>Open profile</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
