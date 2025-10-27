import { RouteScaffold } from "./route-scaffold";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MetricTone = "default" | "positive" | "warning" | "critical" | "info";

export type RoleDashboardMetric = {
  label: string;
  value: string;
  trend?: string;
  tone?: MetricTone;
};

export type RoleDashboardHighlight = {
  title: string;
  description: string;
  status?: string;
  tone?: MetricTone;
};

export type RoleDashboardAction = {
  title: string;
  owner: string;
  due: string;
  status?: string;
  tone?: MetricTone;
};

export type RoleDashboardPlaceholderProps = {
  title: string;
  description: string;
  referencePath?: string;
  metrics: RoleDashboardMetric[];
  highlights: RoleDashboardHighlight[];
  actions: RoleDashboardAction[];
};

const toneToBadgeVariant: Record<MetricTone, string> = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  info: "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
};

function resolveToneClasses(tone?: MetricTone) {
  if (!tone) return toneToBadgeVariant.default;
  return toneToBadgeVariant[tone] ?? toneToBadgeVariant.default;
}

export function RoleDashboardPlaceholder({
  title,
  description,
  referencePath,
  metrics,
  highlights,
  actions,
}: RoleDashboardPlaceholderProps) {
  return (
    <RouteScaffold title={title} description={description} referencePath={referencePath}>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="bg-card/70 backdrop-blur">
            <CardContent className="px-6 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {metric.label}
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {metric.value}
              </p>
              {metric.trend ? (
                <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${resolveToneClasses(metric.tone)}`}>
                  {metric.trend}
                </span>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Ключевые сигналы</CardTitle>
            <CardDescription>Обновления, требующие внимания.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {highlights.map((highlight) => (
              <div key={highlight.title} className="rounded-2xl border border-dashed border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-foreground">
                    {highlight.title}
                  </p>
                  {highlight.status ? (
                    <Badge variant="outline" className={`rounded-lg border-dashed ${resolveToneClasses(highlight.tone)}`}>
                      {highlight.status}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{highlight.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Следующие действия</CardTitle>
            <CardDescription>Команды, ответственные лица и сроки.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {actions.map((action) => (
              <div key={action.title} className="rounded-2xl border border-dashed border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-foreground">
                    {action.title}
                  </p>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${resolveToneClasses(action.tone)}`}>
                    {action.due}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Ответственный: {action.owner}</p>
                {action.status ? (
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{action.status}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </RouteScaffold>
  );
}
