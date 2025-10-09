import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DocumentItem = {
  id: string;
  title: string;
  status?: string | null;
  href?: string | null;
  category?: string | null;
};

type DocumentsPanelProps = {
  title?: string;
  documents: DocumentItem[];
  emptyState?: string;
};

export function DocumentsPanel({
  title = "Documents",
  documents,
  emptyState = "No documents available yet.",
}: DocumentsPanelProps) {
  return (
    <Card className="border-border bg-card shadow-linear">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyState}</p>
        ) : (
          documents.map((doc) => (
            <article
              key={doc.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.status ?? "—"}
                </p>
              </div>
              <Button
                asChild={Boolean(doc.href)}
                variant="outline"
                size="sm"
                className="rounded-xl border-border text-xs font-medium"
                disabled={!doc.href}
              >
                {doc.href ? (
                  <a href={doc.href} target="_blank" rel="noreferrer">
                    <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
                    Download
                  </a>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
                    Pending
                  </>
                )}
              </Button>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
