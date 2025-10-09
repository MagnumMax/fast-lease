"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Circle } from "lucide-react";

import { applicationSteps, type ApplicationStep } from "@/lib/data/application";
import { cn } from "@/lib/utils";

import { useApplicationForm } from "./application-form-context";

const STEP_ORDER = applicationSteps.map((step) => step.id) as Array<
  ApplicationStep["id"]
>;

function resolveCurrentStep(pathname: string): ApplicationStep["id"] {
  const segment = pathname.split("/apply/")[1]?.split("/")[0];
  if (!segment) return "start";
  return STEP_ORDER.includes(segment as ApplicationStep["id"])
    ? (segment as ApplicationStep["id"])
    : "start";
}

export function ApplicationProgress() {
  const pathname = usePathname();
  const { draft } = useApplicationForm();
  const currentStep = resolveCurrentStep(pathname ?? "");
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card px-6 py-5 shadow-linear md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Многошаговая заявка
          </p>
          <h1 className="mt-2 text-xl font-semibold text-foreground">
            {applicationSteps[currentIndex]?.title ?? "Заявка Fast Lease"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {applicationSteps[currentIndex]?.description ??
              "Заполните данные, загрузите документы и подтвердите заявку."}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground md:items-end">
          <span>
            Прогресс: {currentIndex + 1}/{applicationSteps.length}
          </span>
          <span className="text-xs text-muted-foreground">
            Статус: {draft.status === "submitted" ? "Отправлена" : "Черновик"}
          </span>
        </div>
      </div>

      <nav className="grid gap-3 md:grid-cols-5">
        {applicationSteps.map((step, index) => {
          const isCompleted = index < currentIndex || draft.status === "submitted";
          const isActive = index === currentIndex;
          const href = index <= currentIndex ? `/apply/${step.id}` : undefined;

          const content = (
            <div
              className={cn(
                "flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm transition",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-linear"
                  : "border-border bg-card text-muted-foreground hover:border-brand-500",
              )}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                {isCompleted ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4" aria-hidden="true" />
                )}
                Шаг {index + 1}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {step.title}
              </div>
              <p
                className={cn(
                  "text-xs leading-snug",
                  isActive ? "text-slate-200" : "text-muted-foreground",
                )}
              >
                {step.description}
              </p>
            </div>
          );

          if (!href) {
            return (
              <div key={step.id} className="cursor-default select-none">
                {content}
              </div>
            );
          }

          return (
            <Link key={step.id} href={href} className="block">
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
