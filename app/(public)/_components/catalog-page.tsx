"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Filter, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getAllCars,
  type CarBodyType,
  type CarRecord,
} from "@/lib/data/cars";

type FilterChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

const cars = getAllCars();

const MAX_MONTHLY = Math.max(...cars.map((car) => car.lease.monthlyAED));
const SLIDER_STEP = 500;
const MONTHLY_RANGE = {
  min: 500,
  max: Math.ceil(MAX_MONTHLY / SLIDER_STEP) * SLIDER_STEP,
  step: SLIDER_STEP,
};

function formatCurrency(value: number, currency: string = "AED") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-linear"
          : "border-slate-300 text-slate-700 hover:border-brand-500 hover:text-brand-600",
      )}
    >
      {label}
    </button>
  );
}

function getAvailableBrands(dataset: CarRecord[], query: string) {
  const brands = Array.from(new Set(dataset.map((car) => car.brand))).sort(
    (a, b) => a.localeCompare(b),
  );
  if (!query.trim()) return brands;
  const normalized = query.toLowerCase();
  return brands.filter((brand) => brand.toLowerCase().includes(normalized));
}

function getSelectedBodiesDisplay(selected: Set<CarBodyType>): string {
  if (!selected.size) return "All body types";
  return Array.from(selected.values()).join(", ");
}

export function CatalogPage() {
  const [maxMonthly, setMaxMonthly] = useState<number>(MONTHLY_RANGE.max);
  const [brandQuery, setBrandQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedBodies, setSelectedBodies] = useState<Set<CarBodyType>>(
    () => new Set(),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const availableBrands = useMemo(
    () => getAvailableBrands(cars, brandQuery),
    [brandQuery],
  );

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      const matchesBrand =
        selectedBrands.length === 0 || selectedBrands.includes(car.brand);
      const matchesBody =
        selectedBodies.size === 0 || selectedBodies.has(car.body);
      const matchesPayment = car.lease.monthlyAED <= maxMonthly;
      return matchesBrand && matchesBody && matchesPayment;
    });
  }, [maxMonthly, selectedBodies, selectedBrands]);

  const activeFilters =
    selectedBrands.length +
    selectedBodies.size +
    (maxMonthly < MONTHLY_RANGE.max ? 1 : 0);

  const handleBrandSelection = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const values = Array.from(event.target.selectedOptions).map(
      (option) => option.value,
    );
    setSelectedBrands(values);
  };

  const toggleBody = (body: CarBodyType) => {
    setSelectedBodies((prev) => {
      const next = new Set(prev);
      if (next.has(body)) {
        next.delete(body);
      } else {
        next.add(body);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setBrandQuery("");
    setSelectedBrands([]);
    setSelectedBodies(new Set());
    setMaxMonthly(MONTHLY_RANGE.max);
  };

  const filterPanel = (
    <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-linear">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          <p className="text-sm text-muted-foreground">
            Choose a vehicle that matches your goals.
          </p>
          <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            Active: {activeFilters}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="brand"
            className="rounded-lg"
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 1024) {
                setFiltersOpen(false);
              }
            }}
          >
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            onClick={resetFilters}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-end">
        <div className="space-y-3 md:col-span-5">
          <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Make and Model
          </Label>
          <Input
            value={brandQuery}
            onChange={(event) => setBrandQuery(event.target.value)}
            placeholder="Search make"
            className="rounded-xl border-border focus-visible:ring-brand-500"
          />
          <select
            multiple
            value={selectedBrands}
            onChange={handleBrandSelection}
            className="h-32 w-full rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {availableBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Hold <kbd className="rounded bg-muted px-1">Cmd</kbd> /{" "}
            <kbd className="rounded bg-muted px-1">Ctrl</kbd> to select multiple
            options.
          </p>
        </div>

        <div className="space-y-3 md:col-span-4">
          <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Monthly Payment
          </Label>
          <input
            type="range"
            min={MONTHLY_RANGE.min}
            max={MONTHLY_RANGE.max}
            step={MONTHLY_RANGE.step}
            value={maxMonthly}
            onChange={(event) => setMaxMonthly(Number(event.target.value))}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Up to{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(maxMonthly)}
            </span>
          </p>
          <div className="flex justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>{formatCurrency(MONTHLY_RANGE.min)}</span>
            <span>{formatCurrency(MONTHLY_RANGE.max)}</span>
          </div>
        </div>

        <div className="space-y-3 md:col-span-3">
          <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Body Type
          </Label>
          <div className="flex flex-wrap gap-2">
            {(["SUV", "Sedan", "Hatchback", "Pickup"] as CarBodyType[]).map(
              (body) => (
                <FilterChip
                  key={body}
                  label={body}
                  active={selectedBodies.has(body)}
                  onClick={() => toggleBody(body)}
                />
              ),
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {getSelectedBodiesDisplay(selectedBodies)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-6 rounded-3xl border border-border bg-card px-6 py-8 shadow-linear sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Lease-to-own
          </span>
        <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Car Catalog
            </h1>
            <p className="text-sm text-muted-foreground">
              Verified vehicles with transparent ownership terms.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border text-sm font-medium"
            onClick={() => setFiltersOpen((prev) => !prev)}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            <span>
              Filters{" "}
              <span className="font-semibold text-foreground">
                ({filteredCars.length})
              </span>
            </span>
          </Button>
          <Button asChild variant="brand" className="rounded-xl px-5">
            <Link href="/apply/start">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Own Car
            </Link>
          </Button>
        </div>
      </header>

      <aside className={cn("lg:block", filtersOpen ? "block" : "hidden")}>
        {filterPanel}
      </aside>

      <section>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCars.map((car) => {
            const downPaymentAED = Math.round(car.lease.buyoutAED * 0.2);

            return (
              <article
                key={car.id}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-linear transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <Link
                  href={`/cars/${car.id}`}
                  className="relative block aspect-[4/3] overflow-hidden"
                >
                  <Image
                    src={car.heroImage}
                    alt={car.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  <div className="absolute left-4 top-4 flex gap-2">
                    {car.badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-slate-700 backdrop-blur"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </Link>

                <div className="flex flex-1 flex-col gap-5 p-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {car.brand}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      {car.name}
                    </h3>
                  </div>

                  <dl className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        Monthly
                      </dt>
                      <dd className="text-sm font-semibold text-foreground">
                        {formatCurrency(car.lease.monthlyAED)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        Buyout
                      </dt>
                      <dd className="text-sm font-semibold text-foreground">
                        {formatCurrency(car.lease.buyoutAED)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        Term
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {car.lease.termMonths} months
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        Down Payment
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {formatCurrency(downPaymentAED)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        Range
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {car.metrics.range}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        0–100 km/h
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {car.metrics.acceleration}
                      </dd>
                    </div>
                  </dl>

                  <Button
                    asChild
                    variant="outline"
                    className="mt-auto rounded-xl border-border text-sm font-medium"
                  >
                    <Link href={`/cars/${car.id}`} className="gap-2">
                      Details and Calculation
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {filteredCars.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-surface-subtle p-8 text-center text-sm text-muted-foreground">
            No vehicles match the selected filters. Adjust the criteria and try
            again.
          </div>
        ) : null}
      </section>
    </div>
  );
}
