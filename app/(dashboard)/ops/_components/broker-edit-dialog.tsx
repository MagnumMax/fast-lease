"use client";

import {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type {
  OpsBrokerDocument,
  OpsBrokerProfile,
} from "@/lib/supabase/queries/operations";
import {
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_LABEL_MAP,
  type ClientDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import {
  type UpdateOperationsBrokerInput,
  type UpdateOperationsBrokerResult,
  type DeleteOperationsBrokerInput,
  type DeleteOperationsBrokerResult,
  type DeleteOperationsBrokerDocumentResult,
  uploadOperationsBrokerDocuments,
  deleteOperationsBrokerDocument,
} from "@/app/(dashboard)/ops/brokers/actions";
import { sortDocumentOptions } from "@/lib/documents/options";

const EMPTY_SELECT_VALUE = "__empty";

type BrokerEditDialogProps = {
  profile: OpsBrokerProfile;
  documents: OpsBrokerDocument[];
  onSubmit: (input: UpdateOperationsBrokerInput) => Promise<UpdateOperationsBrokerResult>;
  onDelete: (input: DeleteOperationsBrokerInput) => Promise<DeleteOperationsBrokerResult>;
};

type FormState = {
  fullName: string;
  status: "Active" | "Blocked";
  email: string;
  phone: string;
  nationality: string;
  source: string;
  emiratesId: string;
  passportNumber: string;
  bankDetails: string;
  contactEmail: string;
  contactPhone: string;
  type: "personal" | "company" | "";
};

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: number;
};

function FormSection({ title, description, children, columns = 2 }: FormSectionProps) {
  const gridClass = columns === 1 ? "" : `sm:grid-cols-${columns}`;
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className={`grid gap-4 ${gridClass}`}>{children}</div>
    </div>
  );
}

type DocumentDraft = {
  id: string;
  type: ClientDocumentTypeValue | "";
  file: File | null;
};

function createDocumentDraft(): DocumentDraft {
  const identifier =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `doc-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: identifier,
    type: "",
    file: null,
  } satisfies DocumentDraft;
}

const CLIENT_DOCUMENT_ACCEPT_TYPES = ".pdf,.png,.jpg,.jpeg";
const DOCUMENT_OPTIONS = sortDocumentOptions(CLIENT_DOCUMENT_TYPES);

function buildInitialState(profile: OpsBrokerProfile): FormState {
  const metadata = profile.metadata || {};
  const brokerDetails = profile.brokerDetails || {};

  return {
    fullName: profile.fullName ?? "",
    status: profile.status === "Blocked" ? "Blocked" : "Active",
    email: profile.email ?? (metadata.ops_email as string) ?? "",
    phone: profile.phone ?? (metadata.ops_phone as string) ?? "",
    nationality: profile.nationality ?? (metadata.nationality as string) ?? "",
    source: profile.source ?? (metadata.source as string) ?? "",
    emiratesId: (metadata.emirates_id as string) ?? "",
    passportNumber: (metadata.passport_number as string) ?? "",
    bankDetails: (brokerDetails.broker_bank_details as string) ?? "",
    contactEmail: (brokerDetails.broker_contact_email as string) ?? "",
    contactPhone: (brokerDetails.broker_contact_phone as string) ?? "",
    type: profile.entityType ?? "",
  };
}

export function BrokerEditDialog({ profile, documents, onSubmit, onDelete }: BrokerEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildInitialState(profile));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [canConfirmDelete, setCanConfirmDelete] = useState(false);
  
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraft[]>([]);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(() => new Set());

  const isDocumentDeleting = useCallback(
    (documentId: string) => deletingDocumentIds.has(documentId),
    [deletingDocumentIds],
  );

  const setDocumentDeleting = useCallback((documentId: string, deleting: boolean) => {
    setDeletingDocumentIds((prev) => {
      const next = new Set(prev);
      if (deleting) {
        next.add(documentId);
      } else {
        next.delete(documentId);
      }
      return next;
    });
  }, []);

  const isDraftIncomplete = useMemo(() => {
    return documentDrafts.some((draft) => {
      const hasType = draft.type !== "";
      const hasFile = draft.file instanceof File && draft.file.size > 0;
      return (hasType && !hasFile) || (hasFile && !hasType);
    });
  }, [documentDrafts]);

  const validationMessage = isDraftIncomplete
    ? "Укажите тип и файл для каждого документа."
    : null;

  const canSubmit = useMemo(() => {
    return form.fullName.trim().length > 0 && !isDraftIncomplete;
  }, [form.fullName, isDraftIncomplete]);

  const handleDeleteExistingDocument = useCallback(
    async (doc: OpsBrokerDocument) => {
      const documentId = doc.id;
      if (!documentId || isDocumentDeleting(documentId)) {
        return;
      }

      setDocumentActionError(null);
      setDocumentActionMessage(null);
      setDocumentDeleting(documentId, true);

      try {
        const result: DeleteOperationsBrokerDocumentResult = await deleteOperationsBrokerDocument({
          brokerId: profile.userId,
          documentId,
        });

        if (!result.success) {
          setDocumentActionError(result.error);
          return;
        }

        setDocumentActionMessage("Документ удалён.");
        router.refresh();
      } catch (error) {
        console.error("[operations] broker document delete error", error);
        setDocumentActionError("Не удалось удалить документ. Попробуйте ещё раз.");
      } finally {
        setDocumentDeleting(documentId, false);
      }
    },
    [isDocumentDeleting, profile.userId, router, setDocumentDeleting],
  );

  useEffect(() => {
    if (!open) {
      setForm(buildInitialState(profile));
      setErrorMessage(null);
      setDeleteErrorMessage(null);
      setDeleteOpen(false);
      setIsCheckingDelete(false);
      setIsDeleting(false);
      setCanConfirmDelete(false);
      setDocumentDrafts([]);
      setDocumentActionError(null);
      setDocumentActionMessage(null);
      setDeletingDocumentIds(new Set());
    }
  }, [open, profile]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMessage(null);
    setDocumentActionError(null);

    startTransition(async () => {
      // 1. Upload documents if any
      if (documentDrafts.length > 0) {
        const formData = new FormData();
        formData.append("brokerId", profile.userId);
        
        let hasFiles = false;
        for (const draft of documentDrafts) {
          if (draft.file && draft.type) {
            formData.append("files", draft.file);
            formData.append("types", draft.type);
            hasFiles = true;
          }
        }

        if (hasFiles) {
          const uploadResult = await uploadOperationsBrokerDocuments(formData);
          if (!uploadResult.success) {
            setErrorMessage(uploadResult.error);
            return;
          }
        }
      }

      // 2. Update profile
      const result = await onSubmit({
        userId: profile.userId,
        fullName: form.fullName,
        status: form.status,
        email: form.email || "",
        phone: form.phone || undefined,
        nationality: form.nationality,
        source: form.source,
        emiratesId: form.emiratesId,
        passportNumber: form.passportNumber,
        bankDetails: form.bankDetails,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        type: form.type || undefined,
      });

      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  const handleCheckDelete = async () => {
    setIsCheckingDelete(true);
    setDeleteErrorMessage(null);
    
    setCanConfirmDelete(true);
    setIsCheckingDelete(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteErrorMessage(null);

    try {
      const result = await onDelete({ userId: profile.userId });
      if (result.success) {
        router.push("/ops/brokers");
        router.refresh();
      } else {
        setDeleteErrorMessage(result.error);
        if (result.dealsCount) {
             // Specific message handling if needed, though error string covers it
        }
      }
    } catch (error) {
      setDeleteErrorMessage("Не удалось удалить брокера.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleStatusChange = (value: string) => {
    setForm((prev) => ({ ...prev, status: value as "Active" | "Blocked" }));
  };

  const handleTypeChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      type: value === EMPTY_SELECT_VALUE ? "" : (value as "personal" | "company"),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Редактировать
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Редактирование брокера</DialogTitle>
          <DialogDescription>
            Измените данные профиля или добавьте документы.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <FormSection title="Основная информация">
            <div className="space-y-2">
              <Label htmlFor="fullName">ФИО / Название</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={handleChange("fullName")}
                placeholder="Иванов Иван"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Тип</Label>
              <Select
                value={form.type || EMPTY_SELECT_VALUE}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT_VALUE}>Не выбрано</SelectItem>
                  <SelectItem value="personal">Физлицо</SelectItem>
                  <SelectItem value="company">Юрлицо</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select value={form.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Активен</SelectItem>
                  <SelectItem value="Blocked">Заблокирован</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormSection>

          <FormSection title="Контактные данные">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="example@mail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="+971..."
              />
            </div>
          </FormSection>

          <FormSection title="Дополнительно">
             <div className="space-y-2">
              <Label htmlFor="nationality">Гражданство</Label>
              <Input
                id="nationality"
                value={form.nationality}
                onChange={handleChange("nationality")}
                placeholder="Russian Federation"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="source">Источник</Label>
              <Input
                id="source"
                value={form.source}
                onChange={handleChange("source")}
                placeholder="Например: Recommendation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emiratesId">Emirates ID</Label>
              <Input
                id="emiratesId"
                value={form.emiratesId}
                onChange={handleChange("emiratesId")}
                placeholder="784-..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passportNumber">Номер паспорта</Label>
              <Input
                id="passportNumber"
                value={form.passportNumber}
                onChange={handleChange("passportNumber")}
              />
            </div>
          </FormSection>

          <FormSection title="Реквизиты">
             <div className="col-span-2 space-y-2">
              <Label htmlFor="bankDetails">Банковские реквизиты (IBAN)</Label>
              <Input
                id="bankDetails"
                value={form.bankDetails}
                onChange={handleChange("bankDetails")}
                placeholder="AE..."
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="contactEmail">Email для связи</Label>
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={handleChange("contactEmail")}
                placeholder="contact@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Телефон для связи</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={form.contactPhone}
                onChange={handleChange("contactPhone")}
                placeholder="+971..."
              />
            </div>
          </FormSection>

          {/* Document Management Section */}
          <div className="space-y-4 border-t border-border/40 pt-4">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Документы</p>
                    <p className="text-xs text-muted-foreground">Загрузите копии паспорта, Emirates ID и другие документы.</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDocumentDrafts(prev => [...prev, createDocumentDraft()])}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить
                </Button>
            </div>

             {/* Existing Documents */}
             {documents.length > 0 && (
                <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Уже загружено
                  </p>
                  <ul className="space-y-2">
                    {documents.map((doc) => {
                      const typeLabel =
                        doc.documentType && CLIENT_DOCUMENT_TYPE_LABEL_MAP[doc.documentType as ClientDocumentTypeValue]
                          ? CLIENT_DOCUMENT_TYPE_LABEL_MAP[doc.documentType as ClientDocumentTypeValue]
                          : doc.documentType ?? "Документ";
                       const uploadedDisplay = doc.uploadedAt
                        ? new Date(doc.uploadedAt).toLocaleDateString("ru-RU")
                        : null;
                      const isRemoving = isDocumentDeleting(doc.id);

                      return (
                        <li
                          key={doc.id}
                          className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {doc.documentType ? <span>Тип: {typeLabel}</span> : null}
                              {uploadedDisplay ? <span>Загружен: {uploadedDisplay}</span> : null}
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
                             <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteExistingDocument(doc)}
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
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

            {/* Document Drafts */}
            {documentDrafts.length > 0 && (
                <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Новые файлы
                  </p>
                   <ul className="space-y-2">
                    {documentDrafts.map((draft, index) => (
                      <li
                        key={draft.id}
                        className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-end sm:gap-4"
                      >
                         <div className="flex-1 space-y-2">
                            <Label htmlFor={`doc-type-${draft.id}`} className="text-xs">
                              Тип документа
                            </Label>
                            <Select
                              value={draft.type}
                              onValueChange={(val) => {
                                setDocumentDrafts((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], type: val as ClientDocumentTypeValue };
                                  return next;
                                });
                              }}
                            >
                              <SelectTrigger id={`doc-type-${draft.id}`}>
                                <SelectValue placeholder="Выберите тип" />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex-1 space-y-2">
                            <Label htmlFor={`doc-file-${draft.id}`} className="text-xs">
                              Файл
                            </Label>
                            <Input
                              id={`doc-file-${draft.id}`}
                              type="file"
                              accept={CLIENT_DOCUMENT_ACCEPT_TYPES}
                              className="text-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setDocumentDrafts((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], file };
                                  return next;
                                });
                              }}
                            />
                          </div>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setDocumentDrafts(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="mb-0.5 text-muted-foreground hover:text-destructive"
                          >
                             <Trash2 className="h-4 w-4" />
                          </Button>
                      </li>
                    ))}
                   </ul>
                </div>
            )}
          </div>

          {documentActionError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {documentActionError}
            </div>
          )}
           {documentActionMessage && (
            <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
              {documentActionMessage}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
           {validationMessage && (
            <div className="rounded-lg bg-orange-500/10 p-3 text-sm text-orange-600">
              {validationMessage}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:gap-0">
             <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
             >
                Удалить брокера
             </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={!canSubmit || isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить изменения"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
      
       {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удаление брокера</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить этого брокера? Это действие нельзя отменить.
              <br />
              <br />
              Проверьте, нет ли активных сделок, связанных с этим брокером.
            </DialogDescription>
          </DialogHeader>
          
          {deleteErrorMessage && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {deleteErrorMessage}
            </div>
          )}

          <DialogFooter>
             <Button
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={isDeleting}
             >
                Отмена
             </Button>
              {!canConfirmDelete ? (
                 <Button
                    variant="destructive"
                    onClick={handleCheckDelete}
                    disabled={isCheckingDelete}
                 >
                    {isCheckingDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : "Продолжить"}
                 </Button>
              ) : (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                 >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подтвердить удаление"}
                 </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
