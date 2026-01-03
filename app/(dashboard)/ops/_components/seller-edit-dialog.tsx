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
import { DateMaskInput } from "@/components/ui/date-mask-input";
import { ALLOWED_ACCEPT_TYPES } from "@/lib/constants/uploads";
import type {
  OpsSellerDocument,
  OpsSellerProfile,
} from "@/lib/supabase/queries/operations";
import {
  SELLER_DOCUMENT_TYPES,
  SELLER_DOCUMENT_TYPE_LABEL_MAP,
  type SellerDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import {
  type UpdateOperationsSellerInput,
  type UpdateOperationsSellerResult,
  type DeleteOperationsSellerInput,
  type DeleteOperationsSellerResult,
  type DeleteOperationsSellerDocumentResult,
  uploadOperationsSellerDocuments,
  deleteOperationsSellerDocument,
} from "@/app/(dashboard)/ops/sellers/actions";
import { sortDocumentOptions } from "@/lib/documents/options";
import { getSignedUploadUrlAction } from "@/app/(dashboard)/ops/actions/storage";
import { sanitizeFileName } from "@/lib/documents/upload";
import { useFileUpload } from "@/hooks/use-file-upload";

import {
  DocumentManager,
  type DocumentDraft,
  type ManagedDocument,
} from "./document-manager";

const EMPTY_SELECT_VALUE = "__empty";

type SellerEditDialogProps = {
  profile: OpsSellerProfile;
  documents: OpsSellerDocument[];
  onSubmit: (input: UpdateOperationsSellerInput) => Promise<UpdateOperationsSellerResult>;
  onDelete: (input: DeleteOperationsSellerInput) => Promise<DeleteOperationsSellerResult>;
};

type FormState = {
  fullName: string;
  status: "Active" | "Blocked";
  email: string;
  phone: string;
  nationality: string;
  source: string;
  bankDetails: string;
  contactEmail: string;
  contactPhone: string;
  dateOfBirth: string;
  type: "personal" | "company" | "";
};

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

function createDocumentDraft(): DocumentDraft {
  const identifier =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `doc-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: identifier,
    type: "",
    file: null,
    documentNumber: "",
    expireDate: "",
  } satisfies DocumentDraft;
}

const CLIENT_DOCUMENT_ACCEPT_TYPES = ALLOWED_ACCEPT_TYPES;
const DOCUMENT_OPTIONS = sortDocumentOptions(SELLER_DOCUMENT_TYPES);

function buildInitialState(profile: OpsSellerProfile): FormState {
  const metadata = profile.metadata || {};
  const sellerDetails = profile.sellerDetails || {};

  return {
    fullName: profile.fullName ?? "",
    status: profile.status === "blocked" ? "Blocked" : "Active",
    email: profile.email ?? (metadata.ops_email as string) ?? "",
    phone: profile.phone ?? (metadata.ops_phone as string) ?? "",
    nationality: profile.nationality ?? (metadata.nationality as string) ?? "",
    source: profile.source ?? (metadata.source as string) ?? "",
    bankDetails: (sellerDetails.seller_bank_details as string) ?? "",
    contactEmail: (sellerDetails.seller_contact_email as string) ?? "",
    contactPhone: (sellerDetails.seller_contact_phone as string) ?? "",
    dateOfBirth: (metadata.date_of_birth as string) ?? "",
    type: profile.entityType ?? "",
  };
}

export function SellerEditDialog({ profile, documents, onSubmit, onDelete }: SellerEditDialogProps) {
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
  const { upload: uploadFile } = useFileUpload<{ bucket: string; path: string }>();
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
    async (documentId: string) => {
      if (!documentId || isDocumentDeleting(documentId)) {
        return;
      }

      setDocumentActionError(null);
      setDocumentActionMessage(null);
      setDocumentDeleting(documentId, true);

      try {
        const result: DeleteOperationsSellerDocumentResult = await deleteOperationsSellerDocument({
          sellerId: profile.userId,
          documentId,
        });

        if (!result.success) {
          setDocumentActionError(result.error);
          return;
        }

        setDocumentActionMessage("Документ удалён.");
        router.refresh();
      } catch (error) {
        console.error("[operations] seller document delete error", error);
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

  const changeDocumentType = (id: string, type: string) => {
    setDocumentDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, type: type as SellerDocumentTypeValue | "" } : d))
    );
  };

  const changeDocumentFile = (id: string, file: File | null) => {
    setDocumentDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, file } : d))
    );
  };
  
  const changeDocumentNumber = (id: string, documentNumber: string) => {
    setDocumentDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, documentNumber } : d))
    );
  };

  const changeDocumentExpireDate = (id: string, expireDate: string) => {
    setDocumentDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, expireDate } : d))
    );
  };

  const managedDocuments: ManagedDocument[] = useMemo(() => {
    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      typeLabel:
        doc.documentType && SELLER_DOCUMENT_TYPE_LABEL_MAP[doc.documentType as SellerDocumentTypeValue]
          ? SELLER_DOCUMENT_TYPE_LABEL_MAP[doc.documentType as SellerDocumentTypeValue]
          : doc.documentType ?? "Документ",
      url: doc.url,
      uploadedAt: doc.uploadedAt ?? null,
      metadata: doc.metadata ?? null,
    }));
  }, [documents]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMessage(null);
    setDocumentActionError(null);

    startTransition(async () => {
      // 1. Upload documents if any
      if (documentDrafts.length > 0) {
        const uploadedDocs: { 
          path: string; 
          name: string;
          type: string;
          documentNumber?: string;
          expireDate?: string;
        }[] = [];
        let uploadError = null;

        for (const draft of documentDrafts) {
          if (draft.file && draft.type) {
            try {
              const sanitizedName = sanitizeFileName(draft.file.name);
              const path = `sellers/${profile.userId}/${Date.now()}-${sanitizedName}`;

              const result = await uploadFile(draft.file, getSignedUploadUrlAction, {
                bucket: "profile-documents",
                path,
              });

              if (!result) {
                throw new Error("Failed to upload file to storage");
              }

              uploadedDocs.push({
                path,
                name: draft.file.name,
                type: draft.type,
                documentNumber: draft.documentNumber,
                expireDate: draft.expireDate
              });
            } catch (err: any) {
              console.error("Upload error:", err);
              uploadError = err.message;
              break; 
            }
          }
        }

        if (uploadError) {
          setErrorMessage(`Ошибка загрузки: ${uploadError}`);
          return;
        }

        if (uploadedDocs.length > 0) {
          const uploadResult = await uploadOperationsSellerDocuments(profile.userId, uploadedDocs);
          if (!uploadResult.success) {
            setErrorMessage(uploadResult.error || "Ошибка сохранения документов");
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
        bankDetails: form.bankDetails,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
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
    
    // In this version we just try to delete directly, but we can implement a check step if needed.
    // The delete action itself checks for deals and returns an error if blocked.
    // So we can just proceed to confirmation or try calling delete to "check" (but that would delete).
    // Let's just allow user to click "Delete" and show error if it fails due to deals.
    // Or we can simulate a check if we had a verify function. 
    // Since we don't have verifySellerDeletion yet, we'll just skip the pre-check visual 
    // and handle the error from deleteOperationsSeller.
    
    setCanConfirmDelete(true);
    setIsCheckingDelete(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteErrorMessage(null);

    try {
      const result = await onDelete({ userId: profile.userId });
      if (result.success) {
        router.push("/ops/sellers");
        router.refresh();
      } else {
        setDeleteErrorMessage(result.error);
        if (result.dealsCount) {
             // Specific message handling if needed, though error string covers it
        }
      }
    } catch (error) {
      setDeleteErrorMessage("Не удалось удалить продавца.");
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
          <DialogTitle>Редактирование продавца</DialogTitle>
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
              <Label htmlFor="dateOfBirth">Дата рождения</Label>
              <DateMaskInput
                id="dateOfBirth"
                value={form.dateOfBirth}
                onChange={(val) => setForm((prev) => ({ ...prev, dateOfBirth: val }))}
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

          <DocumentManager
            title="Документы"
            description="Загрузите копии паспорта, Emirates ID и другие документы."
            existingDocs={managedDocuments}
            drafts={documentDrafts}
            options={DOCUMENT_OPTIONS}
            onAddDraft={() => setDocumentDrafts((prev) => [...prev, createDocumentDraft()])}
            onTypeChange={changeDocumentType}
            onFileChange={changeDocumentFile}
            onDocumentNumberChange={changeDocumentNumber}
            onExpireDateChange={changeDocumentExpireDate}
            onRemoveDraft={(id) => setDocumentDrafts((prev) => prev.filter((d) => d.id !== id))}
            onDeleteExisting={handleDeleteExistingDocument}
            isDeletingExisting={isDocumentDeleting}
            validationMessage={validationMessage}
            actionError={documentActionError}
            actionMessage={documentActionMessage}
            emptyMessage="Нет загруженных документов"
            acceptTypes={CLIENT_DOCUMENT_ACCEPT_TYPES}
          />

          {errorMessage ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
            >
              Удалить продавца
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={!canSubmit || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удаление продавца</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить продавца <strong>{profile.fullName}</strong>?
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>

          {deleteErrorMessage ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {deleteErrorMessage}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Отмена
            </Button>
            {!canConfirmDelete ? (
                 <Button variant="destructive" onClick={handleCheckDelete} disabled={isDeleting || isCheckingDelete}>
                  {isCheckingDelete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Удалить
                </Button>
            ) : (
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Подтвердить удаление
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
