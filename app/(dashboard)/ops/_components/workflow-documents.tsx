import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ProfileCardMini } from "./profile-card-mini";
import type { ProfileSummaryPayload } from "../actions";

const COMMISSION_LABELS = new Set(["комиссия менеджера renty", "комиссия менеджера салона"]);

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

function parsePercent(value: string): number | null {
  const normalized = value.replace(",", ".").replace(/\s+/g, "");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCommissionValue(label: string, value: string, financedAmount?: number | null): string {
  if (value === "—") return value;
  const normalizedLabel = normalizeLabel(label);
  if (!COMMISSION_LABELS.has(normalizedLabel)) return value;
  if (financedAmount == null || !Number.isFinite(financedAmount)) return value;

  const percent = parsePercent(value);
  if (percent == null) return value;

  const amount = (financedAmount * percent) / 100;
  if (!Number.isFinite(amount)) return value;

  const percentText = percent.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  const amountText = amount.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  return `${percentText}% (${amountText} AED)`;
}

export type WorkflowDocumentEntry = {
  label: string;
  value: string;
  status?: string | null;
  url?: string | null;
  kind?: "document" | "parameter" | "section" | "profile_card";
  profileData?: ProfileSummaryPayload | null;
};

export type WorkflowDocumentGroupEntry = {
  stageKey: string;
  stageTitle: string;
  taskTitle: string;
  taskTemplateId: string;
  taskId?: string | null;
  documents: WorkflowDocumentEntry[];
};

type WorkflowDocumentsProps = {
  groups: WorkflowDocumentGroupEntry[];
  additional: WorkflowDocumentEntry[];
  financedAmount?: number | null;
  className?: string;
};

export function WorkflowDocuments({ groups, additional, financedAmount, className }: WorkflowDocumentsProps) {
  const visibleGroups = groups.filter((group) => group.documents.length > 0);
  const hasGroups = visibleGroups.length > 0;
  const hasAdditional = additional.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Документы сделки
        </p>
        {hasGroups ? (
          <div className="space-y-3">
            {visibleGroups.map((group) => (
              <div
                key={`${group.stageKey}-${group.taskTemplateId}`}
                className="rounded-lg border border-border/60 bg-background/80"
              >
                <div className="flex items-center justify-between gap-3 rounded-t-lg border-b border-border/60 bg-muted/10 px-4 py-2 text-sm font-semibold text-foreground">
                  {group.taskTemplateId && group.taskTemplateId !== "deal-documents" ? (
                    <Link
                      href={`/ops/tasks/${group.taskTemplateId}`}
                      className="hover:underline hover:text-brand-600 transition-colors"
                    >
                      {group.taskTitle}
                    </Link>
                  ) : (
                    <span>{group.taskTitle}</span>
                  )}
                  {group.taskTemplateId ? (
                    <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg px-2 text-xs font-medium">
                      <Link href={`/ops/tasks/${group.taskTemplateId}#reopen-task`}>Переоткрыть</Link>
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-col px-4 py-2">
                  {group.documents.map((doc, idx) => {
                    if (doc.kind === "section") {
                      return (
                        <div
                          key={`${group.taskTemplateId}-doc-${idx}-${doc.label}`}
                          className="col-span-full mt-3 mb-2"
                        >
                          <div className="flex items-center gap-2 border-l-[4px] border-primary/40 bg-muted/20 py-2 pl-3 pr-3 rounded-r-md">
                            <h4 className="text-xs font-bold text-foreground tracking-tight uppercase opacity-80">{doc.label}</h4>
                          </div>
                        </div>
                      );
                    }
                    if (doc.kind === "profile_card" && doc.profileData) {
                      return (
                        <div
                          key={`${group.taskTemplateId}-doc-${idx}-${doc.label}`}
                          className="flex items-start justify-between gap-3 py-2 text-[11px]"
                        >
                          <div className="flex flex-col gap-1 pt-1 shrink-0">
                            <span className="text-xs font-semibold text-foreground">{doc.label}</span>
                          </div>
                          <div className="w-full max-w-[75%]">
                            <ProfileCardMini label={doc.label} profile={doc.profileData} />
                          </div>
                        </div>
                      );
                    }
                    return (
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
                          {formatCommissionValue(doc.label, doc.value || "—", financedAmount)}
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
                    );
                  })}
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
