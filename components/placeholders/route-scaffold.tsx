"use client";

type RouteScaffoldProps = {
  title: string;
  description?: string;
  referencePath?: string;
  children?: React.ReactNode;
};

export function RouteScaffold({
  title,
  description,
  referencePath,
  children,
}: RouteScaffoldProps) {
  return (
    <section className="flex flex-col gap-6 rounded-xl border border-dashed border-border/60 bg-card/60 p-8 shadow-subtle backdrop-blur-sm">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
        {referencePath ? (
          <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
            Спецификация: <span className="font-medium">{referencePath}</span>
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
