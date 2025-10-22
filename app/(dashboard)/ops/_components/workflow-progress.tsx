"use client";

import { cn } from "@/lib/utils";
import { OPS_DEAL_STATUS_ORDER, OPS_WORKFLOW_STATUS_MAP, type OpsDealStatusKey } from "@/lib/supabase/queries/operations";

type WorkflowProgressProps = {
  currentStatus: OpsDealStatusKey;
};

export function WorkflowProgress({ currentStatus }: WorkflowProgressProps) {
  const currentIndex = OPS_DEAL_STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-card/50 p-4">
      <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Этапы сделки</h3>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {OPS_DEAL_STATUS_ORDER.map((status, index) => {
          const meta = OPS_WORKFLOW_STATUS_MAP[status];
          const isCompleted = currentIndex > index;
          const isActive = currentIndex === index;

          return (
            <li
              key={status}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition",
                isActive
                  ? "border-brand-500/80 bg-brand-500/15 text-brand-700 shadow-[0_0_0_1px_rgba(59,130,246,0.12)] dark:text-brand-200"
                  : isCompleted
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                    : "border-border/70 bg-muted/40 text-muted-foreground",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  isActive
                    ? "border-brand-500 bg-brand-500 text-white"
                    : isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-background text-muted-foreground dark:bg-muted/40",
                )}
              >
                {index + 1}
              </span>
              <span className="font-medium leading-snug">{meta.title}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
