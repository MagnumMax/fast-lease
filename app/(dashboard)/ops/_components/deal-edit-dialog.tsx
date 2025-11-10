"use client";

import { useEffect, useMemo, useState, useTransition, type ComponentProps } from "react";
import { useRouter } from "next/navigation";

import { Loader2, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";

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
import { DatePickerInput } from "@/components/ui/date-picker";
import { DateTimePickerInput } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_DOCUMENT_TYPES, type DealDocumentTypeValue, type OpsDealDetail } from "@/lib/supabase/queries/operations";
import {
  updateOperationsDeal,
  uploadDealDocuments,
  uploadSellerDocuments,
  verifyDealDeletion,
  deleteOperationsDeal,
  deleteDealDocument,
  type DealDeletionBlockerType,
  type VerifyDealDeletionResult,
  type DeleteOperationsDealResult,
  type DeleteDealDocumentResult,
} from "@/app/(dashboard)/ops/deals/[id]/actions";
import { sortDocumentOptions } from "@/lib/documents/options";

const EMPTY_SELECT_VALUE = "__empty";

type DealEditDialogProps = {
  detail: OpsDealDetail;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  triggerSize?: ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
};

type FormState = {
  dealNumber: string;
  principalAmount: string;
  totalAmount: string;
  monthlyPayment: string;
  monthlyLeaseRate: string;
  interestRate: string;
  downPaymentAmount: string;
  securityDeposit: string;
  processingFee: string;
  termMonths: string;
  contractStartDate: string;
  contractEndDate: string;
  firstPaymentDate: string;
  activatedAt: string;
  completedAt: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insurancePolicyType: string;
  insurancePremiumAmount: string;
  insurancePaymentFrequency: string;
  insuranceNextPaymentDue: string;
  insuranceCoverageStart: string;
  insuranceCoverageEnd: string;
  insuranceDeductible: string;
  insuranceLastPaymentStatus: string;
  insuranceLastPaymentDate: string;
  insuranceNotes: string;
};

type FormSectionProps = {
  title: string;
  description?: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
};

type DealDocumentDraft = {
  id: string;
  type: DealDocumentTypeValue | "";
  file: File | null;
};

type SellerDocumentDraft = {
  id: string;
  title: string;
  file: File | null;
  url?: string | null;
  bucket?: string | null;
  storagePath?: string | null;
  uploadedAt?: string;
};

const DEAL_BLOCKER_LABELS: Record<DealDeletionBlockerType, string> = {
  payments: "Платежи",
  invoices: "Счета",
};

function createDealDocumentDraft(): DealDocumentDraft {
  const identifier =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `deal-doc-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: identifier,
    type: "",
    file: null,
  } satisfies DealDocumentDraft;
}

function createSellerDocumentDraft(): SellerDocumentDraft {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `seller-doc-${Math.random().toString(36).slice(2, 10)}`,
    title: "",
    file: null,
    url: null,
    bucket: null,
    storagePath: null,
    uploadedAt: new Date().toISOString(),
  } satisfies SellerDocumentDraft;
}

function formatNumberInput(value: number | null | undefined, fractionDigits = 2) {
  if (value == null || Number.isNaN(Number(value))) {
    return "";
  }
  const numeric = Number(value);
  const formatted = numeric.toFixed(fractionDigits);
  if (Number(formatted) === numeric) {
    return numeric.toString();
  }
  return formatted;
}

function formatDateInput(value: string | null | undefined) {
  if (!value) return "";
  if (value.length >= 10) {
    return value.slice(0, 10);
  }
  return "";
}

function formatDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const tzOffsetMinutes = date.getTimezoneOffset();
  const localTime = new Date(date.getTime() - tzOffsetMinutes * 60 * 1000);
  return localTime.toISOString().slice(0, 16);
}

function isDealDocumentDraftIncomplete(drafts: DealDocumentDraft[]): boolean {
  return drafts.some((draft) => {
    const hasType = draft.type !== "";
    const hasFile = draft.file instanceof File && draft.file.size > 0;
    return (hasType && !hasFile) || (hasFile && !hasType);
  });
}

function FormSection({ title, description, columns = 2, children }: FormSectionProps) {
  const gridClass = columns === 1 ? "" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className={`grid gap-4 ${gridClass}`}>{children}</div>
    </div>
  );
}

export function DealEditDialog({
  detail,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName = "",
}: DealEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dealDocumentDrafts, setDealDocumentDrafts] = useState<DealDocumentDraft[]>([]);
  const initialSellerDocuments = useMemo<SellerDocumentDraft[]>(
    () =>
      (detail.sellerDocuments ?? []).map((doc) => ({
        id: doc.id,
        title: doc.title ?? "",
        file: null,
        url: doc.url ?? null,
        bucket: doc.bucket ?? null,
        storagePath: doc.storagePath ?? null,
        uploadedAt: doc.uploadedAt ?? undefined,
      })),
    [detail.sellerDocuments],
  );
  const [sellerDocumentDrafts, setSellerDocumentDrafts] = useState<SellerDocumentDraft[]>(initialSellerDocuments);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [canConfirmDelete, setCanConfirmDelete] = useState(false);
  const [deleteBlockers, setDeleteBlockers] = useState<Array<{ type: DealDeletionBlockerType; count: number }>>([]);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(() => new Set());
  const deleteTargetLabel =
    typeof detail.editDefaults.dealNumber === "string" && detail.editDefaults.dealNumber.trim().length > 0
      ? detail.editDefaults.dealNumber.trim()
      : detail.slug;

  const initialState = useMemo<FormState>(() => {
    const defaults = detail.editDefaults;
    const insuranceDefaults = defaults.insurance ?? null;
    return {
      dealNumber: defaults.dealNumber ?? "",
      principalAmount: formatNumberInput(defaults.principalAmount, 2),
      totalAmount: formatNumberInput(defaults.totalAmount, 2),
      monthlyPayment: formatNumberInput(defaults.monthlyPayment, 2),
      monthlyLeaseRate: formatNumberInput(defaults.monthlyLeaseRate, 4),
      interestRate: formatNumberInput(defaults.interestRate, 4),
      downPaymentAmount: formatNumberInput(defaults.downPaymentAmount, 2),
      securityDeposit: formatNumberInput(defaults.securityDeposit, 2),
      processingFee: formatNumberInput(defaults.processingFee, 2),
      termMonths:
        defaults.termMonths != null && Number.isFinite(defaults.termMonths)
          ? String(defaults.termMonths)
          : "",
      contractStartDate: formatDateInput(defaults.contractStartDate),
      contractEndDate: formatDateInput(defaults.contractEndDate),
      firstPaymentDate: formatDateInput(defaults.firstPaymentDate),
      activatedAt: formatDateTimeInput(defaults.activatedAt),
      completedAt: formatDateTimeInput(defaults.completedAt),
      insuranceProvider: insuranceDefaults?.provider ?? "",
      insurancePolicyNumber: insuranceDefaults?.policyNumber ?? "",
      insurancePolicyType: insuranceDefaults?.policyType ?? "",
      insurancePremiumAmount: formatNumberInput(insuranceDefaults?.premiumAmount, 2),
      insurancePaymentFrequency: insuranceDefaults?.paymentFrequency ?? "",
      insuranceNextPaymentDue: formatDateInput(insuranceDefaults?.nextPaymentDue),
      insuranceCoverageStart: formatDateInput(insuranceDefaults?.coverageStart),
      insuranceCoverageEnd: formatDateInput(insuranceDefaults?.coverageEnd),
      insuranceDeductible: formatNumberInput(insuranceDefaults?.deductible, 2),
      insuranceLastPaymentStatus: insuranceDefaults?.lastPaymentStatus ?? "",
      insuranceLastPaymentDate: formatDateInput(insuranceDefaults?.lastPaymentDate),
      insuranceNotes: insuranceDefaults?.notes ?? "",
    };
  }, [detail.editDefaults]);

  const [form, setForm] = useState<FormState>(initialState);

  const dealDocumentsHasIncomplete = useMemo(
    () => isDealDocumentDraftIncomplete(dealDocumentDrafts),
    [dealDocumentDrafts],
  );
  const dealDocumentsValidationMessage = dealDocumentsHasIncomplete
    ? "Выберите тип и загрузите файл для каждого документа."
    : null;
  const sellerDocumentsHasIncomplete = useMemo(() => {
    return sellerDocumentDrafts.some((doc) => {
      const hasTitle = doc.title.trim().length > 0;
      const hasExistingFile = Boolean(doc.url || doc.storagePath);
      const hasNewFile = doc.file instanceof File && doc.file.size > 0;
      const hasFileReference = hasExistingFile || hasNewFile;
      return (hasTitle && !hasFileReference) || (!hasTitle && hasFileReference);
    });
  }, [sellerDocumentDrafts]);
  const sellerDocumentsValidationMessage = sellerDocumentsHasIncomplete
    ? "Для документов продавца заполните название и выберите файл."
    : null;
  const existingDealDocuments = detail.documents ?? [];
  const documentTypeOptions = useMemo(
    () => sortDocumentOptions(DEAL_DOCUMENT_TYPES),
    [],
  );
  const existingSellerDocuments = useMemo(
    () => sellerDocumentDrafts.filter((doc) => Boolean(doc.url || doc.storagePath)),
    [sellerDocumentDrafts],
  );
  const newSellerDocumentDrafts = useMemo(
    () => sellerDocumentDrafts.filter((doc) => !doc.url && !doc.storagePath),
    [sellerDocumentDrafts],
  );

  const isDocumentDeleting = (documentId: string) => deletingDocumentIds.has(documentId);

  function setDocumentDeleting(documentId: string, deleting: boolean) {
    setDeletingDocumentIds((prev) => {
      const next = new Set(prev);
      if (deleting) {
        next.add(documentId);
      } else {
        next.delete(documentId);
      }
      return next;
    });
  }

  const canSubmit = useMemo(() => {
    return !isPending && !dealDocumentsHasIncomplete && !sellerDocumentsHasIncomplete;
  }, [isPending, dealDocumentsHasIncomplete, sellerDocumentsHasIncomplete]);

  function resetForm() {
    setForm(initialState);
    setErrorMessage(null);
    setDealDocumentDrafts([]);
    setSellerDocumentDrafts(initialSellerDocuments);
    setDocumentActionError(null);
    setDocumentActionMessage(null);
    setDeletingDocumentIds(new Set());
  }

  useEffect(() => {
    setSellerDocumentDrafts(initialSellerDocuments);
  }, [initialSellerDocuments]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
      closeDeleteDialog();
    }
  }

  function handleChange(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = event.currentTarget;
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  function addDealDocumentDraft() {
    setDealDocumentDrafts((prev) => [...prev, createDealDocumentDraft()]);
  }

  function updateDealDocumentDraft(id: string, patch: Partial<DealDocumentDraft>) {
    setDealDocumentDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  function changeDealDocumentType(id: string, value: DealDocumentTypeValue | "") {
    updateDealDocumentDraft(id, { type: value });
  }

  function changeDealDocumentFile(id: string, file: File | null) {
    updateDealDocumentDraft(id, { file });
  }

  function removeDealDocumentDraft(id: string) {
    setDealDocumentDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }

  function addSellerDocumentDraft() {
    setSellerDocumentDrafts((prev) => [...prev, createSellerDocumentDraft()]);
  }

  function updateSellerDocumentDraft(id: string, patch: Partial<SellerDocumentDraft>) {
    setSellerDocumentDrafts((prev) => prev.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)));
  }

  function changeSellerDocumentFile(id: string, file: File | null) {
    updateSellerDocumentDraft(id, { file });
  }

  function removeSellerDocumentDraft(id: string) {
    setSellerDocumentDrafts((prev) => prev.filter((doc) => doc.id !== id));
  }

  function handleDeleteExistingDocument(documentId: string) {
    if (!documentId || isDocumentDeleting(documentId)) {
      return;
    }

    setDocumentActionError(null);
    setDocumentActionMessage(null);
    setDocumentDeleting(documentId, true);

    deleteDealDocument({
      dealId: detail.dealUuid,
      documentId,
      slug: detail.slug,
    })
      .then((result: DeleteDealDocumentResult) => {
        if (!result.success) {
          setDocumentActionError(result.error);
          return;
        }
        setDocumentActionMessage("Документ удалён.");
        router.refresh();
      })
      .catch((error) => {
        console.error("[operations] deal document delete error", error);
        setDocumentActionError("Не удалось удалить документ. Попробуйте ещё раз.");
      })
      .finally(() => {
        setDocumentDeleting(documentId, false);
      });
  }

  async function handleDeleteClick() {
    if (isPending || isCheckingDelete || isDeleting) {
      return;
    }

    setDeleteBlockers([]);
    setDeleteErrorMessage(null);
    setCanConfirmDelete(false);
    setIsCheckingDelete(true);

    try {
      const checkResult: VerifyDealDeletionResult = await verifyDealDeletion({
        dealId: detail.dealUuid,
      });

      if (!checkResult.canDelete) {
        if (Array.isArray(checkResult.blockers) && checkResult.blockers.length > 0) {
          setDeleteBlockers(checkResult.blockers);
        }
        setDeleteErrorMessage(checkResult.reason ?? "Сделку нельзя удалить.");
        setDeleteOpen(true);
        return;
      }

      setCanConfirmDelete(true);
      setDeleteOpen(true);
    } catch (error) {
      console.error("[operations] unexpected error during deal deletion check", error);
      setDeleteErrorMessage("Не удалось проверить возможность удаления сделки.");
      setDeleteOpen(true);
    } finally {
      setIsCheckingDelete(false);
    }
  }

  function closeDeleteDialog() {
    if (isDeleting) {
      return;
    }
    setDeleteOpen(false);
    setDeleteErrorMessage(null);
    setDeleteBlockers([]);
    setCanConfirmDelete(false);
  }

  async function confirmDelete() {
    if (isDeleting || !canConfirmDelete) {
      return;
    }

    setDeleteErrorMessage(null);
    setIsDeleting(true);

    try {
      const result: DeleteOperationsDealResult = await deleteOperationsDeal({
        dealId: detail.dealUuid,
        slug: detail.slug,
      });

      if (!result.success) {
        setDeleteErrorMessage(result.error);
        return;
      }

      setDeleteOpen(false);
      setOpen(false);
      router.replace("/ops/deals");
      router.refresh();
    } catch (error) {
      console.error("[operations] unexpected error during deal deletion", error);
      setDeleteErrorMessage("Не удалось удалить сделку.");
    } finally {
      setIsDeleting(false);
      setDeleteBlockers([]);
      setCanConfirmDelete(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const sellerDocumentsNeedingUpload = sellerDocumentDrafts.filter(
        (doc) => doc.file instanceof File && doc.file.size > 0,
      );

      let uploadedSellerDocuments: Array<{ id: string; title: string; bucket: string; storage_path: string; uploaded_at: string }> = [];

      if (sellerDocumentsNeedingUpload.length > 0) {
        const sellerFormData = new FormData();
        sellerFormData.append("dealId", detail.dealUuid);
        sellerFormData.append("slug", detail.slug);

        sellerDocumentsNeedingUpload.forEach((doc, index) => {
          sellerFormData.append(`documents[${index}][title]`, doc.title.trim());
          if (doc.file) {
            sellerFormData.append(`documents[${index}][file]`, doc.file);
          }
        });

        const sellerUploadResult = await uploadSellerDocuments(sellerFormData);

        if (!sellerUploadResult.success) {
          setErrorMessage(sellerUploadResult.error);
          return;
        }

        uploadedSellerDocuments = sellerUploadResult.documents;
      }

      const manualSellerDocuments = sellerDocumentDrafts
        .filter((doc) => !(doc.file instanceof File && doc.file.size > 0))
        .map((doc) => {
          const title = doc.title.trim();
          if (!title) {
            return null;
          }
          const hasExistingFile = Boolean(doc.url || doc.storagePath);
          if (!hasExistingFile) {
            return null;
          }
          return {
            id: doc.id,
            title,
            url: doc.url ?? undefined,
            bucket: doc.bucket ?? undefined,
            storagePath: doc.storagePath ?? undefined,
            uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      const sellerDocumentsPayload = [
        ...manualSellerDocuments,
        ...uploadedSellerDocuments.map((doc) => ({
          id: doc.id,
          title: doc.title,
          bucket: doc.bucket,
          storagePath: doc.storage_path,
          uploadedAt: doc.uploaded_at,
        })),
      ];

      const result = await updateOperationsDeal({
        dealId: detail.dealUuid,
        slug: detail.slug,
        dealNumber: form.dealNumber,
        principalAmount: form.principalAmount,
        totalAmount: form.totalAmount,
        monthlyPayment: form.monthlyPayment,
        monthlyLeaseRate: form.monthlyLeaseRate,
        interestRate: form.interestRate,
        downPaymentAmount: form.downPaymentAmount,
        securityDeposit: form.securityDeposit,
        processingFee: form.processingFee,
        termMonths: form.termMonths,
        contractStartDate: form.contractStartDate,
        contractEndDate: form.contractEndDate,
        firstPaymentDate: form.firstPaymentDate,
        activatedAt: form.activatedAt,
        completedAt: form.completedAt,
        insuranceProvider: form.insuranceProvider,
        insurancePolicyNumber: form.insurancePolicyNumber,
        insurancePolicyType: form.insurancePolicyType,
        insurancePremiumAmount: form.insurancePremiumAmount,
        insurancePaymentFrequency: form.insurancePaymentFrequency,
        insuranceNextPaymentDue: form.insuranceNextPaymentDue,
        insuranceCoverageStart: form.insuranceCoverageStart,
        insuranceCoverageEnd: form.insuranceCoverageEnd,
        insuranceDeductible: form.insuranceDeductible,
        insuranceLastPaymentStatus: form.insuranceLastPaymentStatus,
        insuranceLastPaymentDate: form.insuranceLastPaymentDate,
        insuranceNotes: form.insuranceNotes,
        sellerDocuments: sellerDocumentsPayload,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      const readyDealDocuments = dealDocumentDrafts.filter(
        (draft): draft is DealDocumentDraft & { type: DealDocumentTypeValue; file: File } =>
          draft.type !== "" && draft.file instanceof File && draft.file.size > 0,
      );

      if (readyDealDocuments.length > 0) {
        const documentsFormData = new FormData();
        documentsFormData.append("dealId", detail.dealUuid);
        documentsFormData.append("slug", detail.slug);

        readyDealDocuments.forEach((draft, index) => {
          documentsFormData.append(`documents[${index}][type]`, draft.type);
          documentsFormData.append(`documents[${index}][file]`, draft.file);
        });

        const uploadResult = await uploadDealDocuments(documentsFormData);

        if (!uploadResult.success) {
          setErrorMessage(uploadResult.error);
          return;
        }
      }

      setDealDocumentDrafts([]);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant={triggerVariant}
            size={triggerSize}
            className={["gap-2", "rounded-lg", triggerClassName].filter(Boolean).join(" ")}
          >
            <Pencil className="h-4 w-4" /> Редактировать
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Редактирование сделки</DialogTitle>
            <DialogDescription>
              Обновите финансовые параметры и даты. Значения группированы так же, как на странице деталей.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormSection title="Сведения о сделке" description="Основная информация для идентификации" columns={1}>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Номер сделки</Label>
                <Input
                  value={form.dealNumber}
                  onChange={handleChange("dealNumber")}
                  placeholder="LTR-081125-3782"
                  className="rounded-lg"
                />
              </div>
            </FormSection>

            <FormSection
              title="Документы сделки"
              description="Просмотрите загруженные файлы или добавьте новые документы."
              columns={1}
            >
              <div className="space-y-4">
                {existingDealDocuments.length ? (
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-background/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Уже загружено
                    </p>
                    <ul className="space-y-2">
                      {existingDealDocuments.map((doc) => {
                        const isRemoving = isDocumentDeleting(doc.id);

                        return (
                          <li
                            key={doc.id}
                            className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {doc.url ? (
                                <Button asChild size="sm" variant="outline" className="rounded-lg">
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                    <Paperclip className="mr-2 h-3.5 w-3.5" /> Открыть
                                  </a>
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteExistingDocument(doc.id)}
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
                ) : (
                  <p className="text-sm text-muted-foreground">Документы сделки ещё не загружены.</p>
                )}

                {documentActionError ? (
                  <p className="text-xs text-destructive">{documentActionError}</p>
                ) : null}
                {documentActionMessage ? (
                  <p className="text-xs text-muted-foreground">{documentActionMessage}</p>
                ) : null}

                <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-background/50 p-3">
                  {dealDocumentDrafts.map((draft) => (
                    <div key={draft.id} className="space-y-3 rounded-xl border border-border/50 bg-background/60 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Тип документа</Label>
                          <Select
                            value={draft.type || EMPTY_SELECT_VALUE}
                            onValueChange={(value) =>
                              changeDealDocumentType(
                                draft.id,
                                (value === EMPTY_SELECT_VALUE ? "" : value) as DealDocumentTypeValue | "",
                              )
                            }
                          >
                            <SelectTrigger className="h-10 w-full rounded-lg border border-border bg-background/80 text-sm">
                              <SelectValue placeholder="Выберите тип" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY_SELECT_VALUE}>Выберите тип</SelectItem>
                              {documentTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Файл</Label>
                          <Input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(event) =>
                              changeDealDocumentFile(
                                draft.id,
                                event.currentTarget.files && event.currentTarget.files[0] ? event.currentTarget.files[0] : null,
                              )
                            }
                            className="cursor-pointer rounded-lg"
                          />
                          {draft.file ? (
                            <p className="text-xs text-muted-foreground">{draft.file.name}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDealDocumentDraft(draft.id)}
                          className="rounded-lg text-muted-foreground hover:text-destructive"
                        >
                          Удалить
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDealDocumentDraft}
                      className="flex items-center gap-2 rounded-lg"
                      disabled={isPending}
                    >
                      <Plus className="h-4 w-4" /> Добавить документ
                    </Button>
                    <p className="text-xs text-muted-foreground">Допустимые форматы: PDF, JPG, PNG (до 10 МБ).</p>
                  </div>
                  {dealDocumentsValidationMessage ? (
                    <p className="text-xs text-destructive">{dealDocumentsValidationMessage}</p>
                  ) : null}
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Документы продавца автомобиля"
              description="Сохраните ссылки на документы, которые передал дилер или поставщик."
              columns={1}
            >
              <div className="space-y-4">
                {existingSellerDocuments.length ? (
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-background/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Уже загружено
                    </p>
                    <ul className="space-y-2">
                      {existingSellerDocuments.map((doc) => {
                        const title = doc.title?.trim().length ? doc.title : "Документ продавца";
                        return (
                          <li
                            key={doc.id}
                            className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground">{title}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {doc.url ? (
                                <Button asChild size="sm" variant="outline" className="rounded-lg">
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                    <Paperclip className="mr-2 h-3.5 w-3.5" /> Открыть
                                  </a>
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeSellerDocumentDraft(doc.id)}
                                className="rounded-lg text-muted-foreground hover:text-destructive"
                                aria-label="Удалить документ продавца"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Документы продавца пока не добавлены.</p>
                )}

                <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-background/50 p-3">
                  {newSellerDocumentDrafts.map((doc) => {
                    const hasTitle = doc.title.trim().length > 0;
                    const hasFile = doc.file instanceof File && doc.file.size > 0;
                    return (
                      <div key={doc.id} className="space-y-3 rounded-xl border border-border/50 bg-background/60 p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Название документа</Label>
                            <Input
                              value={doc.title}
                              onChange={(event) =>
                                updateSellerDocumentDraft(doc.id, { title: event.currentTarget.value })
                              }
                              placeholder="Invoice, Purchase Order ..."
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Файл</Label>
                            <Input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(event) =>
                                changeSellerDocumentFile(
                                  doc.id,
                                  event.currentTarget.files && event.currentTarget.files[0]
                                    ? event.currentTarget.files[0]
                                    : null,
                                )
                              }
                              className="cursor-pointer rounded-lg"
                            />
                            {doc.file ? (
                              <p className="text-xs text-muted-foreground">{doc.file.name}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSellerDocumentDraft(doc.id)}
                            className="rounded-lg text-muted-foreground hover:text-destructive"
                          >
                            Удалить
                          </Button>
                        </div>
                        {(!hasTitle && !hasFile) || (hasTitle && hasFile) ? null : (
                          <p className="text-xs text-destructive">Укажите и название, и выберите файл.</p>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSellerDocumentDraft}
                      className="flex items-center gap-2 rounded-lg"
                      disabled={isPending}
                    >
                      <Plus className="h-4 w-4" /> Добавить документ продавца
                    </Button>
                    <p className="text-xs text-muted-foreground">Допустимые форматы: PDF, JPG, PNG (до 10 МБ).</p>
                  </div>
                  {sellerDocumentsValidationMessage ? (
                    <p className="text-xs text-destructive">{sellerDocumentsValidationMessage}</p>
                  ) : null}
                </div>
              </div>
            </FormSection>

            <FormSection title="Финансы" description="Суммы и ставки" columns={3}>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Сумма сделки</Label>
                <Input
                  value={form.principalAmount}
                  onChange={handleChange("principalAmount")}
                  placeholder="Например, 150000"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Общая сумма</Label>
                <Input
                  value={form.totalAmount}
                  onChange={handleChange("totalAmount")}
                  placeholder="Введите общую сумму"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ежемесячный платёж</Label>
                <Input
                  value={form.monthlyPayment}
                  onChange={handleChange("monthlyPayment")}
                  placeholder="Например, 3200"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ставка лизинга</Label>
                <Input
                  value={form.monthlyLeaseRate}
                  onChange={handleChange("monthlyLeaseRate")}
                  placeholder="0.015"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Процентная ставка</Label>
                <Input
                  value={form.interestRate}
                  onChange={handleChange("interestRate")}
                  placeholder="0.08"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Первоначальный взнос</Label>
                <Input
                  value={form.downPaymentAmount}
                  onChange={handleChange("downPaymentAmount")}
                  placeholder="Например, 20000"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Страховой депозит</Label>
                <Input
                  value={form.securityDeposit}
                  onChange={handleChange("securityDeposit")}
                  placeholder="Введите сумму"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Комиссия</Label>
                <Input
                  value={form.processingFee}
                  onChange={handleChange("processingFee")}
                  placeholder="Например, 1500"
                  className="rounded-lg"
                />
              </div>
            </FormSection>

            <FormSection title="Страховка" description="Данные полиса и платежей" columns={2}>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Провайдер</Label>
                <Input
                  value={form.insuranceProvider}
                  onChange={handleChange("insuranceProvider")}
                  placeholder="AXA Insurance"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Номер полиса</Label>
                <Input
                  value={form.insurancePolicyNumber}
                  onChange={handleChange("insurancePolicyNumber")}
                  placeholder="POL-000123"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Тип покрытия</Label>
                <Input
                  value={form.insurancePolicyType}
                  onChange={handleChange("insurancePolicyType")}
                  placeholder="Comprehensive"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Премия</Label>
                <Input
                  value={form.insurancePremiumAmount}
                  onChange={handleChange("insurancePremiumAmount")}
                  placeholder="Например, 3200"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Частота платежей</Label>
                <Input
                  value={form.insurancePaymentFrequency}
                  onChange={handleChange("insurancePaymentFrequency")}
                  placeholder="monthly"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Следующий платёж</Label>
                <DatePickerInput
                  id="insurance-next-payment"
                  value={form.insuranceNextPaymentDue}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, insuranceNextPaymentDue: nextValue }))}
                  buttonClassName="rounded-lg"
                  placeholder="Выберите дату"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Начало покрытия</Label>
                <DatePickerInput
                  id="insurance-coverage-start"
                  value={form.insuranceCoverageStart}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, insuranceCoverageStart: nextValue }))}
                  buttonClassName="rounded-lg"
                  placeholder="Выберите дату"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Окончание покрытия</Label>
                <DatePickerInput
                  id="insurance-coverage-end"
                  value={form.insuranceCoverageEnd}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, insuranceCoverageEnd: nextValue }))}
                  buttonClassName="rounded-lg"
                  placeholder="Выберите дату"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Франшиза</Label>
                <Input
                  value={form.insuranceDeductible}
                  onChange={handleChange("insuranceDeductible")}
                  placeholder="Например, 500"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Статус последнего платежа</Label>
                <Input
                  value={form.insuranceLastPaymentStatus}
                  onChange={handleChange("insuranceLastPaymentStatus")}
                  placeholder="paid"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Дата последнего платежа</Label>
                <DatePickerInput
                  id="insurance-last-payment-date"
                  value={form.insuranceLastPaymentDate}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, insuranceLastPaymentDate: nextValue }))}
                  buttonClassName="rounded-lg"
                  placeholder="Выберите дату"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Примечание</Label>
                <Textarea
                  value={form.insuranceNotes}
                  onChange={(event) => setForm((prev) => ({ ...prev, insuranceNotes: event.currentTarget.value }))}
                  placeholder="Контакты брокера, условия отсрочки и т.д."
                  className="min-h-[72px] rounded-lg"
                />
              </div>
            </FormSection>

            <FormSection title="Договор" description="Сроки и ключевые даты" columns={3}>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Срок (мес.)</Label>
                <Input
                  value={form.termMonths}
                  onChange={handleChange("termMonths")}
                  placeholder="24"
                  className="rounded-lg"
                  type="number"
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Старт договора</Label>
                <DatePickerInput
                  id="contract-start-date"
                  value={form.contractStartDate}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, contractStartDate: nextValue }))}
                  buttonClassName="rounded-lg"
                  placeholder="Выберите дату"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Окончание договора</Label>
                <DatePickerInput
                  id="contract-end-date"
                  value={form.contractEndDate}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, contractEndDate: nextValue }))}
                  buttonClassName="rounded-lg"
                  placeholder="Выберите дату"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Первая оплата</Label>
                <DatePickerInput
                  id="contract-first-payment"
                  value={form.firstPaymentDate}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, firstPaymentDate: nextValue }))}
                  buttonClassName="rounded-lg"
                  placeholder="Выберите дату"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Активация</Label>
                <DateTimePickerInput
                  id="deal-activated-at"
                  value={form.activatedAt}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, activatedAt: nextValue }))}
                  buttonClassName="rounded-lg"
                  placeholder="Выберите дату и время"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Завершение</Label>
                <DateTimePickerInput
                  id="deal-completed-at"
                  value={form.completedAt}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, completedAt: nextValue }))}
                  buttonClassName="rounded-lg"
                  placeholder="Выберите дату и время"
                />
              </div>
            </FormSection>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-rose-400/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-900 dark:text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="order-2 flex flex-col gap-2 sm:order-1 sm:flex-row">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={isPending || isCheckingDelete || isDeleting}
                className="flex items-center gap-2 rounded-lg"
              >
                {isCheckingDelete ? "Проверяем..." : (
                  <>
                    <Trash2 className="h-4 w-4" /> Удалить сделку
                  </>
                )}
              </Button>
            </div>
            <div className="order-1 flex gap-2 sm:order-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-lg"
                disabled={isPending}
              >
                Отмена
              </Button>
              <Button type="submit" className="rounded-lg" disabled={!canSubmit}>
                {isPending ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(next) => (next ? setDeleteOpen(true) : closeDeleteDialog())}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Удалить сделку</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Вы уверены, что хотите удалить сделку <strong>{deleteTargetLabel}</strong>? Это действие
                  необратимо.
                </p>
                <div className="space-y-1">
                  <p className="text-xs">Будут удалены:</p>
                  <ul className="mt-1 list-disc list-inside text-xs">
                    <li>Все финансовые документы и платежи сделки</li>
                    <li>Оперативные задачи и события</li>
                    <li>Загруженные документы и вложения</li>
                  </ul>
                </div>
                {deleteBlockers.length > 0 ? (
                  <div className="rounded-lg border border-amber-300/60 bg-amber-100/60 p-2 text-xs text-amber-900">
                    <p className="font-medium">Перед удалением устраните связанные данные:</p>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      {deleteBlockers.map((blocker) => (
                        <li key={blocker.type}>
                          {(DEAL_BLOCKER_LABELS[blocker.type] ?? blocker.type)} — {blocker.count}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </DialogDescription>
          </DialogHeader>

          {deleteErrorMessage ? (
            <p className="text-sm text-destructive">{deleteErrorMessage}</p>
          ) : null}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg"
              onClick={closeDeleteDialog}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-lg"
              onClick={confirmDelete}
              disabled={isDeleting || !canConfirmDelete}
            >
              {isDeleting ? "Удаляем..." : "Удалить сделку"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
