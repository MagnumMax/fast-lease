import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DocumentListItem = {
  id: string;
  title: string;
  uploadedAt?: string | null;
  url?: string | null;
};

type DocumentListProps = {
  documents: DocumentListItem[];
  emptyMessage: string;
  className?: string;
};

function formatDocumentDate(value?: string | null): string {
  if (!value) {
    return "Не указана";
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Не указана";
}

export function DocumentList({ documents, emptyMessage, className }: DocumentListProps) {
  if (!documents.length) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyMessage}</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {documents.map((doc) => {
        const uploadLabel = formatDocumentDate(doc.uploadedAt);
        return (
          <div
            key={doc.id}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{doc.title}</p>
              <p className="text-xs text-muted-foreground">Дата загрузки: {uploadLabel}</p>
            </div>
            {doc.url ? (
              <Button asChild size="sm" variant="outline" className="rounded-lg">
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  Открыть
                </a>
              </Button>
            ) : (
              <Badge variant="outline" className="rounded-lg text-muted-foreground">
                Файл недоступен
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
