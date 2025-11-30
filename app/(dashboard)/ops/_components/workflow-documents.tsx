import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkflowDocumentEntry = {
  label: string;
  value: string;
  status?: string | null;
  url?: string | null;
  kind?: "document" | "parameter";
};

export type WorkflowDocumentGroupEntry = {
  stageKey: string;
  stageTitle: string;
  taskTitle: string;
  taskTemplateId: string;
  documents: WorkflowDocumentEntry[];
};

type WorkflowDocumentsProps = {
  groups: WorkflowDocumentGroupEntry[];
  additional: WorkflowDocumentEntry[];
  className?: string;
};

export function WorkflowDocuments({ groups, additional, className }: WorkflowDocumentsProps) {
  const hasGroups = groups.length > 0;
  const hasAdditional = additional.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Документы сделки
        </p>
        {hasGroups ? (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={`${group.stageKey}-${group.taskTemplateId}`}
                className="rounded-lg border border-border/60 bg-background/80"
              >
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-sm font-semibold text-foreground">
                  <span>{group.taskTitle}</span>
                </div>
                <div className="flex flex-col px-4 py-2">
                  {group.documents.map((doc, idx) => (
                    <div
                      key={`${group.taskTemplateId}-doc-${idx}-${doc.label}`}
                      className="flex items-start justify-between gap-3 py-2 text-[11px]"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-foreground">{doc.label}</span>
                        {doc.kind === "parameter" ? (
                          doc.status ? (
                            <span className="text-muted-foreground">{doc.status}</span>
                          ) : null
                        ) : (
                          <span className="text-muted-foreground">
                            {doc.value}
                            {doc.status && doc.value !== "—" ? ` • ${doc.status}` : ""}
                          </span>
                        )}
                      </div>
                      {doc.kind === "parameter" ? (
                        <span className="text-right text-xs font-medium text-foreground">
                          {doc.value || "—"}
                        </span>
                      ) : doc.url ? (
                        <Button asChild size="sm" variant="outline" className="rounded-lg">
                          <Link href={doc.url} target="_blank">
                            Открыть
                          </Link>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="rounded-lg text-[11px] text-muted-foreground">
                          {doc.value === "—" ? "—" : doc.status ?? "Нет ссылки"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
            —
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Дополнительные документы
        </p>
        {hasAdditional ? (
          <div className="flex flex-col gap-2">
            {additional.map((doc, index) => (
              <div
                key={`additional-${index}-${doc.label}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{doc.label}</span>
                  <span className="text-muted-foreground">
                    {doc.value}
                    {doc.status && doc.value !== "—" ? ` • ${doc.status}` : ""}
                  </span>
                </div>
                {doc.url ? (
                  <Button asChild size="sm" variant="outline" className="rounded-lg">
                    <Link href={doc.url} target="_blank">
                      Открыть
                    </Link>
                  </Button>
                ) : (
                  <Badge variant="outline" className="rounded-lg text-[11px] text-muted-foreground">
                    {doc.value === "—" ? "—" : doc.status ?? "Нет ссылки"}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
            —
          </p>
        )}
      </div>
    </div>
  );
}
