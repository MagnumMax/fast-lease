import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RouteScaffoldProps = {
  title: string;
  description?: string;
  referencePath?: string;
  children?: ReactNode;
};

export function RouteScaffold({
  title,
  description,
  referencePath,
  children,
}: RouteScaffoldProps) {
  return (
    <Card className="border border-dashed border-border bg-card backdrop-blur-sm">
      <CardHeader className="gap-3 border-b border-border">
        {/* <CardTitle className="text-2xl tracking-tight">{title}</CardTitle> */}
        {description ? (
          <CardDescription className="max-w-2xl text-sm leading-relaxed">
            {description}
          </CardDescription>
        ) : null}
        {referencePath ? (
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Спецификация: <span className="font-medium">{referencePath}</span>
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6 py-6">{children}</CardContent>
    </Card>
  );
}
