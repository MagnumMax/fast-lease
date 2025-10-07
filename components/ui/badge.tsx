"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-white shadow-linear dark:bg-slate-100 dark:text-slate-900",
        secondary:
          "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100",
        outline: "border-border text-muted-foreground",
        success: "border-transparent bg-emerald-100 text-emerald-700",
        warning: "border-transparent bg-amber-100 text-amber-700",
        danger: "border-transparent bg-rose-100 text-rose-700",
        info: "border-transparent bg-brand-100 text-brand-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
