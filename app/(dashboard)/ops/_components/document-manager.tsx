"use client";

import { Download, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateMaskInput } from "@/components/ui/date-mask-input";
import type { ReactNode } from "react";

// Reusable FormSection component (copied from dialogs to be self-contained)
type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: number;
  action?: ReactNode;
};

function FormSection({ title, description, children, columns = 2, action }: FormSectionProps) {
  const gridClass = columns === 1 ? "" : `sm:grid-cols-${columns}`;
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={`grid gap-4 ${gridClass}`}>{children}</div>
    </div>
  );
}

export type DocumentDraft = {
  id: string;
  type: string;
  file: File | null;
  documentNumber: string;
  expireDate: string;
};

export type ManagedDocument = {
  id: string;
  title: string;
  typeLabel: string;
  url: string | null;
  uploadedAt: string | null;
  metadata: Record<string, unknown> | null;
};

type DocumentManagerProps = {
  title: string;
  description?: string;
  existingDocs: ManagedDocument[];
  drafts: DocumentDraft[];
  options: ReadonlyArray<{ value: string; label: string }>;
  onAddDraft: () => void;
  onTypeChange: (id: string, type: string) => void;
  onFileChange: (id: string, file: File | null) => void;
  onDocumentNumberChange: (id: string, value: string) => void;
  onExpireDateChange: (id: string, value: string) => void;
  onRemoveDraft: (id: string) => void;
  onDeleteExisting?: (id: string) => void;
  isDeletingExisting?: (id: string) => boolean;
  validationMessage?: string | null;
  emptyMessage?: string;
  actionError?: string | null;
  actionMessage?: string | null;
  acceptTypes?: string;
};

const EMPTY_SELECT_VALUE = "__empty";
const DEFAULT_ACCEPT_TYPES = ".pdf,.png,.jpg,.jpeg";

export function DocumentManager({
  title,
  description,
  existingDocs,
  drafts,
  options,
  onAddDraft,
  onTypeChange,
  onFileChange,
  onDocumentNumberChange,
  onExpireDateChange,
  onRemoveDraft,
  onDeleteExisting,
  isDeletingExisting,
  validationMessage,
  emptyMessage = "Нет загруженных документов",
  actionError,
  actionMessage,
  acceptTypes = DEFAULT_ACCEPT_TYPES,
}: DocumentManagerProps) {
  return (
    <FormSection
      title={title}
      description={description}
      columns={1}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault(); // Explicitly prevent default
            onAddDraft();
          }}
          className="flex items-center gap-2 rounded-lg"
        >
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      }
    >
      <div className="space-y-4">
        {existingDocs.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Уже загружено
            </p>
            <ul className="space-y-2">
              {existingDocs.map((doc) => {
                const uploadedDisplay = doc.uploadedAt
                  ? new Date(doc.uploadedAt).toLocaleDateString("ru-RU")
                  : null;
                const isRemoving = isDeletingExisting ? isDeletingExisting(doc.id) : false;
                
                const metadata = doc.metadata;
                const documentNumber = typeof metadata?.document_number === 'string' ? metadata.document_number : null;
                const expireDate = typeof metadata?.expire_date === 'string' ? metadata.expire_date : null;

                return (
                  <li
                    key={doc.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {doc.typeLabel ? <span>Тип: {doc.typeLabel}</span> : null}
                        {uploadedDisplay ? <span>Загружен: {uploadedDisplay}</span> : null}
                        {documentNumber ? <span>№: {documentNumber}</span> : null}
                        {expireDate ? <span>Срок: {expireDate}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.url ? (
                        <Button asChild size="sm" variant="outline" className="rounded-lg">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Скачать документ"
                            className="flex items-center justify-center"
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="rounded-lg text-muted-foreground">
                          Нет файла
                        </Badge>
                      )}
                      {onDeleteExisting ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteExisting(doc.id)}
                          disabled={isRemoving}
                          className="rounded-lg text-muted-foreground hover:text-destructive"
                          aria-label="Удалить документ"
                        >
                          {isRemoving ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
        
        {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
        {actionMessage ? <p className="text-xs text-muted-foreground">{actionMessage}</p> : null}
        
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="space-y-3 rounded-xl border border-dashed border-border/60 bg-background/50 p-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Тип документа</Label>
                  <Select
                    value={draft.type || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      onTypeChange(
                        draft.id,
                        value === EMPTY_SELECT_VALUE ? "" : value
                      )
                    }
                  >
                    <SelectTrigger className="h-10 w-full rounded-lg border border-border bg-background/80 text-sm">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>Выберите тип</SelectItem>
                      {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Файл</Label>
                  <Input
                    type="file"
                    accept={acceptTypes}
                    className="h-10 cursor-pointer rounded-lg border-border bg-background/80 text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      onFileChange(draft.id, file);
                    }}
                  />
                </div>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Номер документа (необязательно)</Label>
                  <Input
                    value={draft.documentNumber}
                    onChange={(e) => onDocumentNumberChange(draft.id, e.target.value)}
                    placeholder="Например: 784-1234-1234567-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Срок действия (необязательно)</Label>
                  <DateMaskInput
                    value={draft.expireDate}
                    onChange={(value) => onExpireDateChange(draft.id, value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDraft(draft.id)}
                  className="h-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Удалить
                </Button>
              </div>
            </div>
          ))}
          {validationMessage ? (
            <p className="text-sm font-medium text-destructive">{validationMessage}</p>
          ) : null}
        </div>
      </div>
    </FormSection>
  );
}
