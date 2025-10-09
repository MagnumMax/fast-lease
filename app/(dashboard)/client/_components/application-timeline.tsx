import { CheckCircle2, Clock, AlertOctagon } from "lucide-react";

type TimelineStepState = "done" | "active" | "pending";

export type ApplicationTimelineStep = {
  title: string;
  description?: string;
  state?: TimelineStepState;
  meta?: string | React.ReactNode;
};

type ApplicationTimelineProps = {
  steps: ApplicationTimelineStep[];
};

export function ApplicationTimeline({ steps }: ApplicationTimelineProps) {
  return (
    <div className="relative space-y-6">
      <div className="absolute left-4 top-3 h-[calc(100%-24px)] w-px bg-border" />
      {steps.map((step, index) => {
        const state: TimelineStepState = step.state ?? "pending";

        const icon =
          state === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : state === "active" ? (
            <AlertOctagon className="h-4 w-4 text-amber-500" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          );

        return (
          <div key={step.title} className="relative flex gap-4 pl-8">
            <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-surface-subtle">
              {icon}
            </span>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                {index + 1}. {step.title}
              </p>
              {step.description ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              ) : null}
              {step.meta ? (
                <div className="text-xs text-amber-600">{step.meta}</div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
