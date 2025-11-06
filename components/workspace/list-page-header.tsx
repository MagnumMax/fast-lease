import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ListStat = {
  label: string;
  value: ReactNode;
};

type HelperTone = "muted" | "info" | "success" | "warning" | "danger";

const HELPER_TONE_CLASS: Record<HelperTone, string> = {
  muted: "text-muted-foreground",
  info: "text-sky-600",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
};

type WorkspaceListHeaderProps = {
  title: string;
  stats?: ListStat[];
  action?: ReactNode;
  helperText?: ReactNode;
  helperTone?: HelperTone;
  className?: string;
};

export function WorkspaceListHeader({
  title,
  stats,
  action,
  helperText,
  helperTone = "muted",
  className,
}: WorkspaceListHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {stats?.length ? (
            <dl className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <dt className="text-muted-foreground">{stat.label}</dt>
                  <dd className="font-medium text-foreground">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {helperText ? (
          <p className={cn("text-sm", HELPER_TONE_CLASS[helperTone] ?? HELPER_TONE_CLASS.muted)}>
            {helperText}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
