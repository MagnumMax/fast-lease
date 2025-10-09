import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAllCars, getCarById } from "@/lib/data/cars";

type CarPageProps = {
  params: { id: string };
};

function formatCurrency(value: number, currency: string = "AED") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

export function generateStaticParams() {
  return getAllCars().map((car) => ({ id: car.id }));
}

export default function CarDetailsPage({ params }: CarPageProps) {
  const car = getCarById(params.id);

  if (!car) {
    notFound();
  }

  const downPaymentAED = Math.round(car.lease.buyoutAED * 0.2);

  return (
    <div className="flex flex-col gap-8">
      <Button
        asChild
        variant="outline"
        className="w-fit rounded-xl border-border text-sm font-medium"
      >
        <Link href="/" className="gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All vehicles
        </Link>
      </Button>

      <section className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image
              src={car.heroImage}
              alt={car.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 65vw"
              priority
            />
            <div className="absolute left-4 top-4 flex gap-2">
              {car.badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <article className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-linear">
            <header>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Description
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                {car.name} · {car.year}
              </h1>
            </header>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {car.description}
            </p>
            <dl className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
              {car.specs.map((spec) => (
                <div key={spec.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {spec.label}
                  </dt>
                  <dd className="font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>

        <aside className="space-y-6">
          <article className="rounded-3xl border border-border bg-card p-6 shadow-linear">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Leasing Terms
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              {car.lease.title}
            </h2>
            <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <dt>Monthly Payment</dt>
                <dd className="font-semibold text-foreground">
                  {formatCurrency(car.lease.monthlyAED)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Term</dt>
                <dd className="font-semibold text-foreground">
                  {car.lease.termMonths} months
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Buyout</dt>
                <dd className="font-semibold text-foreground">
                  {formatCurrency(car.lease.buyoutAED)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Down Payment</dt>
                <dd className="font-semibold text-foreground">
                  {formatCurrency(downPaymentAED)}
                </dd>
              </div>
            </dl>
            <Button
              asChild
              className="mt-5 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-linear hover:bg-slate-800"
            >
              <Link href={`/apply/start?car=${car.id}`} className="gap-2">
                <PenSquare className="h-4 w-4" aria-hidden="true" />
                Apply for Leasing
              </Link>
            </Button>
          </article>

          <article className="rounded-3xl border border-border bg-card p-6 shadow-linear">
            <h2 className="text-sm font-semibold text-foreground">Advantages</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {car.advantages.map((benefit) => (
                <li
                  key={benefit}
                  className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/70"
                >
                  {benefit}
                </li>
              ))}
            </ul>
          </article>
        </aside>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-linear">
        <h2 className="text-sm font-semibold text-foreground">Owner Reviews</h2>
        <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
          {car.reviews.map((review) => (
            <li
              key={review.author}
              className="rounded-xl border border-border px-4 py-3"
            >
              <p className="text-sm text-muted-foreground">
                “{review.text}”
              </p>
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                {review.author}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
          <span>Want to compare? Return to catalog.</span>
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link href="/" className="gap-2">
              Back to catalog
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
