"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.ComponentPropsWithoutRef<"input">;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    const isFileInput = type === "file";
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
          isFileInput &&
            "h-auto min-h-11 cursor-pointer px-0 py-1.5 pr-4 file:ml-2 file:mr-4 file:h-9 file:rounded-lg file:border file:border-border file:bg-card file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-foreground file:shadow-sm file:transition-colors hover:file:bg-surface-subtle",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
