import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KeyInformationItem = {
  label: string;
  value: string | number | null | undefined;
};

type KeyInformationCardProps = {
  title?: string;
  items: KeyInformationItem[];
};

export function KeyInformationCard({
  title = "Key information",
  items,
}: KeyInformationCardProps) {
  return (
    <Card className="border-border bg-surface-subtle/40 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm text-muted-foreground">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4"
            >
              <dt className="font-medium text-foreground">{item.label}</dt>
              <dd className="text-right text-sm text-muted-foreground">
                {item.value ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
