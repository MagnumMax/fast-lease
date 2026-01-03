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
import { DateMaskInput } from "@/components/ui/date-mask-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ALLOWED_ACCEPT_TYPES } from "@/lib/constants/uploads";
import type {
  OpsClientDocument,
  OpsClientProfile,
  OpsClientType,
} from "@/lib/supabase/queries/operations";
import {
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_LABEL_MAP,
  type ClientDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import {
  type UpdateOperationsClientInput,
  type UpdateOperationsClientResult,
  type DeleteOperationsClientInput,
  type DeleteOperationsClientResult,
  type VerifyClientDeletionResult,
  type DeleteClientDocumentResult,
  uploadClientDocuments,
  deleteClientDocument,
  verifyClientDeletion,
} from "@/app/(dashboard)/ops/clients/actions";
import { getSignedUploadUrlAction } from "@/app/(dashboard)/ops/actions/storage";
import { sortDocumentOptions } from "@/lib/documents/options";
import { sanitizeFileName } from "@/lib/documents/upload";
import { useFileUpload } from "@/hooks/use-file-upload";
import { buildSlugWithId } from "@/lib/utils/slugs";
import { DocumentManager, type ManagedDocument, type DocumentDraft } from "./document-manager";

const EMPTY_SELECT_VALUE = "__empty";

type ClientEditDialogProps = {
  profile: OpsClientProfile;
  documents: OpsClientDocument[];
  onSubmit: (input: UpdateOperationsClientInput) => Promise<UpdateOperationsClientResult>;
  onDelete: (input: DeleteOperationsClientInput) => Promise<DeleteOperationsClientResult>;
};

type ClientTypeValue = OpsClientType;

const CLIENT_TYPE_OPTIONS: Array<{ value: ClientTypeValue; label: string }> = [
  { value: "Personal", label: "Personal" },
  { value: "Company", label: "Company" },
];

type FormState = {
  fullName: string;
  clientType: ClientTypeValue;
  status: "Active" | "Blocked";
  email: string;
  phone: string;
  nationality: string;
  residencyStatus: string;
  dateOfBirth: string;
  companyContactName: string;
  companyContactEmiratesId: string;
  companyTrn: string;
  companyLicenseNumber: string;
  employmentEmployer: string;
  employmentPosition: string;
  employmentYears: string;
  monthlyIncome: string;
  existingLoans: string;
  creditScore: string;
  riskGrade: string;
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
const PERSON_DOCUMENT_OPTIONS = sortDocumentOptions(
  CLIENT_DOCUMENT_TYPES.filter((option) => option.context !== "company"),
);
const COMPANY_DOCUMENT_OPTIONS = sortDocumentOptions(CLIENT_DOCUMENT_TYPES);
const PERSONAL_DOCUMENT_TYPE_VALUES = new Set<ClientDocumentTypeValue>(
  PERSON_DOCUMENT_OPTIONS.map((option) => option.value),
);
const COMPANY_DOCUMENT_TYPE_VALUES = new Set<ClientDocumentTypeValue>(
  COMPANY_DOCUMENT_OPTIONS.map((option) => option.value),
);
const CLIENT_IDENTITY_KEYWORDS = [
  "emirates",
  "passport",
  "id",
  "identity",
  "nationality",
  "удостоверение",
  "паспорт",
  "виза",
  "residency",
  "resident",
  "license",
  "driving",
  "company",
];

const RESIDENT_STATUS_VALUE = "resident" as const;
const NON_RESIDENT_STATUS_VALUE = "nonresident" as const;
type ResidencyToggleValue = typeof RESIDENT_STATUS_VALUE | typeof NON_RESIDENT_STATUS_VALUE;

function isNonResidentStatus(value?: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === NON_RESIDENT_STATUS_VALUE) {
    return true;
  }
  return normalized.replace(/[\s_-]+/g, "") === NON_RESIDENT_STATUS_VALUE;
}

function getResidencyStatusDisplay(value?: string | null): {
  normalizedValue: ResidencyToggleValue;
  label: string;
  description: string;
} {
  if (isNonResidentStatus(value)) {
    return {
      normalizedValue: NON_RESIDENT_STATUS_VALUE,
      label: "Нерезидент",
      description: "Нет подтверждённого статуса резидента ОАЭ или документы ещё в процессе.",
    };
  }

  return {
    normalizedValue: RESIDENT_STATUS_VALUE,
    label: "Резидент ОАЭ",
    description: "Есть Emirates ID или действующая резидентская виза.",
  };
}

function buildInitialState(profile: OpsClientProfile): FormState {
  return {
    fullName: profile.fullName ?? "",
    clientType: profile.clientType === "Company" ? "Company" : "Personal",
    status: profile.status === "Blocked" ? "Blocked" : "Active",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    nationality: profile.nationality ?? "",
    residencyStatus: profile.residencyStatus ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    companyContactName: profile.company.contactName ?? "",
    companyContactEmiratesId: profile.company.contactEmiratesId ?? "",
    companyTrn: profile.company.trn ?? "",
    companyLicenseNumber: profile.company.licenseNumber ?? "",
    employmentEmployer: profile.employment.employer ?? "",
    employmentPosition: profile.employment.position ?? "",
    employmentYears: profile.employment.years != null ? String(profile.employment.years) : "",
    monthlyIncome: profile.financial.monthlyIncome != null ? String(profile.financial.monthlyIncome) : "",
    existingLoans: profile.financial.existingLoans != null ? String(profile.financial.existingLoans) : "",
    creditScore: profile.financial.creditScore != null ? String(profile.financial.creditScore) : "",
    riskGrade: profile.financial.riskGrade ?? "",
  };
}

export function ClientEditDialog({ profile, documents, onSubmit, onDelete }: ClientEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildInitialState(profile));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { upload: uploadFile } = useFileUpload<{ bucket: string; path: string }>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [canConfirmDelete, setCanConfirmDelete] = useState(false);
  const [personalDocumentDrafts, setPersonalDocumentDrafts] = useState<DocumentDraft[]>([]);
  const [companyDocumentDrafts, setCompanyDocumentDrafts] = useState<DocumentDraft[]>([]);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(() => new Set());

  function resolveDocumentContext(doc: OpsClientDocument): "personal" | "company" {
    if (doc.context === "company" || doc.context === "personal") {
      return doc.context;
    }

    const documentType = (doc.documentType ?? "").toLowerCase();
    const category = (doc.category ?? "").toLowerCase();
    const metadataContext =
      typeof doc.metadata === "object" && doc.metadata !== null
        ? String((doc.metadata as Record<string, unknown>)["upload_context"] ?? "").toLowerCase()
        : "";

    if (metadataContext === "company") {
      return "company";
    }
    if (documentType === "company_license" || category === "company") {
      return "company";
    }

    const nameLower = (doc.name ?? "").toLowerCase();
    if (nameLower.includes("company") || nameLower.includes("license")) {
      return "company";
    }

    return "personal";
  }

  const filterDocumentsByTypes = useCallback(
    (allowedTypes: Set<ClientDocumentTypeValue>, desiredContext: "personal" | "company") => {
      return documents.filter((doc) => {
        const context = resolveDocumentContext(doc);
        if (context !== desiredContext) {
          return false;
        }

        const documentType = (doc.documentType ?? "") as ClientDocumentTypeValue | "";
        if (documentType && allowedTypes.has(documentType)) {
          return true;
        }

        const category = (doc.category ?? "").toLowerCase();
        const typeNormalized = (doc.documentType ?? "").toLowerCase();
        const name = (doc.name ?? "").toLowerCase();

        return CLIENT_IDENTITY_KEYWORDS.some(
          (keyword) =>
            category.includes(keyword) || typeNormalized.includes(keyword) || name.includes(keyword),
        );
      });
    },
    [documents],
  );

  const personalDocuments: ManagedDocument[] = useMemo(
    () =>
      filterDocumentsByTypes(PERSONAL_DOCUMENT_TYPE_VALUES, "personal").map((doc) => ({
        id: doc.id,
        title: doc.name,
        typeLabel:
          doc.documentType && CLIENT_DOCUMENT_TYPE_LABEL_MAP[doc.documentType]
            ? CLIENT_DOCUMENT_TYPE_LABEL_MAP[doc.documentType]
            : doc.documentType ?? "Документ",
        url: doc.url ?? null,
        uploadedAt: doc.uploadedAt ?? null,
        metadata: doc.metadata as Record<string, unknown> | null,
      })),
    [filterDocumentsByTypes],
  );
  const companyDocuments: ManagedDocument[] = useMemo(
    () =>
      filterDocumentsByTypes(COMPANY_DOCUMENT_TYPE_VALUES, "company").map((doc) => ({
        id: doc.id,
        title: doc.name,
        typeLabel:
          doc.documentType && CLIENT_DOCUMENT_TYPE_LABEL_MAP[doc.documentType]
            ? CLIENT_DOCUMENT_TYPE_LABEL_MAP[doc.documentType]
            : doc.documentType ?? "Документ",
        url: doc.url ?? null,
        uploadedAt: doc.uploadedAt ?? null,
        metadata: doc.metadata as Record<string, unknown> | null,
      })),
    [filterDocumentsByTypes],
  );

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

  const isDraftIncomplete = useCallback((drafts: DocumentDraft[]) => {
    return drafts.some((draft) => {
      const hasType = draft.type !== "";
      const hasFile = draft.file instanceof File && draft.file.size > 0;
      return (hasType && !hasFile) || (hasFile && !hasType);
    });
  }, []);

  const personalHasIncomplete = useMemo(
    () => isDraftIncomplete(personalDocumentDrafts),
    [personalDocumentDrafts, isDraftIncomplete],
  );
  const companyHasIncomplete = useMemo(
    () => isDraftIncomplete(companyDocumentDrafts),
    [companyDocumentDrafts, isDraftIncomplete],
  );

  const detailSlug = useMemo(
    () => buildSlugWithId(profile.fullName, profile.userId) || profile.userId,
    [profile.fullName, profile.userId],
  );

  const personalValidationMessage = personalHasIncomplete
    ? "Укажите тип и файл для каждого документа покупателя."
    : null;
  const companyValidationMessage = companyHasIncomplete
    ? "Укажите тип и файл для каждого документа компании."
    : null;

  const canSubmit = useMemo(() => {
    return form.fullName.trim().length > 0 && !personalHasIncomplete && !companyHasIncomplete;
  }, [form.fullName, personalHasIncomplete, companyHasIncomplete]);
  const residencyStatusDisplay = useMemo(
    () => getResidencyStatusDisplay(form.residencyStatus),
    [form.residencyStatus],
  );

  const handleDeleteExistingDocument = useCallback(
    async (documentId: string) => {
      if (!documentId || isDocumentDeleting(documentId)) {
        return;
      }

      setDocumentActionError(null);
      setDocumentActionMessage(null);
      setDocumentDeleting(documentId, true);

      try {
        const result: DeleteClientDocumentResult = await deleteClientDocument({
          clientId: profile.userId,
          documentId,
          slug: detailSlug,
        });

        if (!result.success) {
          setDocumentActionError(result.error);
          return;
        }

        setDocumentActionMessage("Документ удалён.");
        router.refresh();
      } catch (error) {
        console.error("[operations] client document delete error", error);
        setDocumentActionError("Не удалось удалить документ. Попробуйте ещё раз.");
      } finally {
        setDocumentDeleting(documentId, false);
      }
    },
    [detailSlug, isDocumentDeleting, profile.userId, router, setDocumentDeleting],
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
      setPersonalDocumentDrafts([]);
      setCompanyDocumentDrafts([]);
      setDocumentActionError(null);
      setDocumentActionMessage(null);
      setDeletingDocumentIds(new Set());
    }
  }, [open, profile]);

  useEffect(() => {
    if (form.clientType === "Personal") {
      if (companyDocumentDrafts.length > 0) {
        setCompanyDocumentDrafts([]);
      }
    }
  }, [form.clientType, companyDocumentDrafts.length]);

  function handleChange<K extends keyof FormState>(key: K) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.currentTarget.value;
      setForm((prev) => ({ ...prev, [key]: value }));
    };
  }

  function handleResidencyToggle(nextValue: boolean) {
    setForm((prev) => ({
      ...prev,
      residencyStatus: nextValue ? RESIDENT_STATUS_VALUE : NON_RESIDENT_STATUS_VALUE,
    }));
  }

  function addPersonalDocumentDraft() {
    setPersonalDocumentDrafts((prev) => [...prev, createDocumentDraft()]);
  }
  function changePersonalDocumentType(id: string, nextType: string) {
    setPersonalDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, type: nextType } : draft)),
    );
  }
  function changePersonalDocumentFile(id: string, file: File | null) {
    setPersonalDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, file } : draft)),
    );
  }
  function removePersonalDocumentDraft(id: string) {
    setPersonalDocumentDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }
  function changePersonalDocumentNumber(id: string, value: string) {
    setPersonalDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, documentNumber: value } : draft)),
    );
  }
  function changePersonalDocumentExpireDate(id: string, value: string) {
    setPersonalDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, expireDate: value } : draft)),
    );
  }

  function addCompanyDocumentDraft() {
    setCompanyDocumentDrafts((prev) => [...prev, createDocumentDraft()]);
  }
  function changeCompanyDocumentType(id: string, nextType: string) {
    setCompanyDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, type: nextType } : draft)),
    );
  }
  function changeCompanyDocumentFile(id: string, file: File | null) {
    setCompanyDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, file } : draft)),
    );
  }
  function removeCompanyDocumentDraft(id: string) {
    setCompanyDocumentDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }
  function changeCompanyDocumentNumber(id: string, value: string) {
    setCompanyDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, documentNumber: value } : draft)),
    );
  }
  function changeCompanyDocumentExpireDate(id: string, value: string) {
    setCompanyDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, expireDate: value } : draft)),
    );
  }

  async function submit() {
    setErrorMessage(null);
    const payload: UpdateOperationsClientInput = {
      userId: profile.userId,
      fullName: form.fullName,
      clientType: form.clientType,
      status: form.status,
      email: form.email,
      phone: form.phone,
      nationality: form.nationality,
      residencyStatus: form.residencyStatus,
      dateOfBirth: form.dateOfBirth,
      companyContactName: form.clientType === "Company" ? form.companyContactName : undefined,
      companyContactEmiratesId:
        form.clientType === "Company" ? form.companyContactEmiratesId : undefined,
      companyTrn: form.clientType === "Company" ? form.companyTrn : undefined,
      companyLicenseNumber: form.clientType === "Company" ? form.companyLicenseNumber : undefined,
      employment: {
        employer: form.employmentEmployer,
        position: form.employmentPosition,
        years: form.employmentYears,
      },
      financial: {
        monthlyIncome: form.monthlyIncome,
        existingLoans: form.existingLoans,
        creditScore: form.creditScore,
        riskGrade: form.riskGrade,
      },
    };

    const result = await onSubmit(payload);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    const detailSlug = buildSlugWithId(form.fullName, profile.userId) || profile.userId;

    const readyPersonalDrafts = personalDocumentDrafts.filter(
      (draft): draft is DocumentDraft & { type: ClientDocumentTypeValue; file: File } =>
        draft.type !== "" &&
        PERSONAL_DOCUMENT_TYPE_VALUES.has(draft.type) &&
        draft.file instanceof File,
    );
    const readyCompanyDrafts = companyDocumentDrafts.filter(
      (draft): draft is DocumentDraft & { type: ClientDocumentTypeValue; file: File } =>
        draft.type !== "" &&
        COMPANY_DOCUMENT_TYPE_VALUES.has(draft.type) &&
        draft.file instanceof File,
    );

    if (readyPersonalDrafts.length > 0 || readyCompanyDrafts.length > 0) {
      const formData = new FormData();
      formData.append("clientId", profile.userId);
      formData.append("slug", detailSlug);

      let documentIndex = 0;
      const processDrafts = async (
        drafts: Array<DocumentDraft & { type: ClientDocumentTypeValue; file: File }>,
        context: "personal" | "company",
      ) => {
        for (const draft of drafts) {
          const file = draft.file;
          const sanitizedName = sanitizeFileName(file.name);
          const path = `clients/${profile.userId}/${Date.now()}-${sanitizedName}`;

          const result = await uploadFile(file, getSignedUploadUrlAction, {
            bucket: "profile-documents",
            path,
          });

          if (!result) {
            throw new Error(`Не удалось загрузить файл ${file.name}`);
          }

          formData.append(`documents[${documentIndex}][type]`, draft.type);
          formData.append(`documents[${documentIndex}][path]`, result.path);
          formData.append(`documents[${documentIndex}][size]`, String(file.size));
          formData.append(`documents[${documentIndex}][mime]`, file.type || "application/octet-stream");
          formData.append(`documents[${documentIndex}][name]`, file.name);
          formData.append(`documents[${documentIndex}][context]`, context);
          if (draft.documentNumber) {
            formData.append(`documents[${documentIndex}][document_number]`, draft.documentNumber);
          }
          if (draft.expireDate) {
            formData.append(`documents[${documentIndex}][expire_date]`, draft.expireDate);
          }
          documentIndex += 1;
        }
      };

      try {
        await processDrafts(readyPersonalDrafts, "personal");
        await processDrafts(readyCompanyDrafts, "company");
      } catch (e: any) {
        setErrorMessage(e.message || "Ошибка при загрузке файлов.");
        return;
      }

      const uploadResult = await uploadClientDocuments(formData);

      if (!uploadResult.success) {
        setErrorMessage(uploadResult.error);
        return;
      }
    }

    setPersonalDocumentDrafts([]);
    setCompanyDocumentDrafts([]);

    setOpen(false);
    router.refresh();
  }

  async function handleDeleteClick() {
    if (isPending || isCheckingDelete || isDeleting) {
      return;
    }

    setDeleteErrorMessage(null);
    setCanConfirmDelete(false);
    setIsCheckingDelete(true);

    try {
      const checkResult: VerifyClientDeletionResult = await verifyClientDeletion({
        userId: profile.userId,
      });

      if (!checkResult.canDelete) {
        setDeleteErrorMessage(
          checkResult.reason ?? "Покупателя нельзя удалить, пока у него есть активные сделки.",
        );
        setDeleteOpen(true);
        return;
      }

      setCanConfirmDelete(true);
      setDeleteOpen(true);
    } catch (error) {
      console.error("[operations] unexpected error during client deletion check", error);
      setDeleteErrorMessage("Не удалось проверить возможность удаления покупателя.");
    } finally {
      setIsCheckingDelete(false);
    }
  }

  function closeDeleteDialog() {
    if (isDeleting) return;
    setDeleteOpen(false);
    setDeleteErrorMessage(null);
    setCanConfirmDelete(false);
  }

  async function confirmDelete() {
    if (isDeleting || !canConfirmDelete) {
      return;
    }

    setDeleteErrorMessage(null);
    setIsDeleting(true);

    try {
      const result: DeleteOperationsClientResult = await onDelete({
        userId: profile.userId,
      });

      if (!result.success) {
        setDeleteErrorMessage(result.error);
        return;
      }

      setDeleteOpen(false);
      setOpen(false);
      router.replace("/ops/clients");
      router.refresh();
    } catch (error) {
      console.error("[operations] unexpected error during client deletion", error);
      setDeleteErrorMessage("Произошла ошибка при удалении покупателя.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isPending) return;
    startTransition(submit);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-xl">
            Редактировать
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование покупателя</DialogTitle>
            <DialogDescription>
              Обновите контактные данные, идентификационные сведения и финансовый профиль.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormSection title="Основная информация" columns={2}>
              <div className="sm:col-span-2">
                <Label htmlFor="client-fullname">Полное имя</Label>
                <Input
                  id="client-fullname"
                  value={form.fullName}
                  onChange={handleChange("fullName")}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-type">Тип покупателя</Label>
                <Select
                  value={form.clientType}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, clientType: value as ClientTypeValue }))
                  }
                >
                  <SelectTrigger
                    id="client-type"
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="client-status">Статус</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, status: value as FormState["status"] }))
                  }
                >
                  <SelectTrigger
                    id="client-status"
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="client-phone">Телефон</Label>
                <Input
                  id="client-phone"
                  value={form.phone}
                  onChange={handleChange("phone")}
                  className="mt-2"
                  placeholder="+971500000000"
                />
              </div>
              <div>
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  className="mt-2"
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <Label htmlFor="client-dob">Дата рождения</Label>
                <DateMaskInput
                  id="client-dob"
                  value={form.dateOfBirth}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, dateOfBirth: nextValue }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-nationality">Национальность</Label>
                <Input
                  id="client-nationality"
                  value={form.nationality}
                  onChange={handleChange("nationality")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-residency">Статус резидентства</Label>
                <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3 shadow-sm">
                  <div className="pr-4">
                    <p className="text-sm font-medium text-foreground">
                      {residencyStatusDisplay.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {residencyStatusDisplay.description}
                    </p>
                  </div>
                  <Switch
                    id="client-residency"
                    checked={residencyStatusDisplay.normalizedValue === RESIDENT_STATUS_VALUE}
                    onCheckedChange={handleResidencyToggle}
                    aria-label="Переключить статус резидентства"
                  />
                </div>
              </div>
            </FormSection>

            <DocumentManager
              title="Документы покупателя"
              description="Загрузка документов для идентификации."
              existingDocs={personalDocuments}
              drafts={personalDocumentDrafts}
              options={PERSON_DOCUMENT_OPTIONS}
              onAddDraft={addPersonalDocumentDraft}
              onTypeChange={changePersonalDocumentType}
              onFileChange={changePersonalDocumentFile}
              onDocumentNumberChange={changePersonalDocumentNumber}
              onExpireDateChange={changePersonalDocumentExpireDate}
              onRemoveDraft={removePersonalDocumentDraft}
              onDeleteExisting={handleDeleteExistingDocument}
              isDeletingExisting={isDocumentDeleting}
              validationMessage={personalValidationMessage}
              actionError={documentActionError}
              actionMessage={documentActionMessage}
              emptyMessage="Документы покупателя пока не загружены."
              acceptTypes={CLIENT_DOCUMENT_ACCEPT_TYPES}
            />

            {form.clientType === "Company" ? (
              <>
                <FormSection
                  title="Компания"
                  description="Основные сведения о компании и контактном лице."
                  columns={2}
                >
                  <div>
                    <Label htmlFor="company-contact-name">Контактное лицо</Label>
                    <Input
                      id="company-contact-name"
                      value={form.companyContactName}
                      onChange={handleChange("companyContactName")}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-contact-emirates">Emirates ID контактного лица</Label>
                    <Input
                      id="company-contact-emirates"
                      value={form.companyContactEmiratesId}
                      onChange={handleChange("companyContactEmiratesId")}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-trn">TRN</Label>
                    <Input
                      id="company-trn"
                      value={form.companyTrn}
                      onChange={handleChange("companyTrn")}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-license">Номер лицензии</Label>
                    <Input
                      id="company-license"
                      value={form.companyLicenseNumber}
                      onChange={handleChange("companyLicenseNumber")}
                      className="mt-2"
                    />
                  </div>
                </FormSection>
                <DocumentManager
                  title="Документы компании и контактного лица"
                  description="Загрузите корпоративные документы и документы ответственного лица."
                  existingDocs={companyDocuments}
                  drafts={companyDocumentDrafts}
                  options={COMPANY_DOCUMENT_OPTIONS}
                  onAddDraft={addCompanyDocumentDraft}
                  onTypeChange={changeCompanyDocumentType}
                  onFileChange={changeCompanyDocumentFile}
                  onDocumentNumberChange={changeCompanyDocumentNumber}
                  onExpireDateChange={changeCompanyDocumentExpireDate}
                  onRemoveDraft={removeCompanyDocumentDraft}
                  onDeleteExisting={handleDeleteExistingDocument}
                  isDeletingExisting={isDocumentDeleting}
                  validationMessage={companyValidationMessage}
                  actionError={documentActionError}
                  actionMessage={documentActionMessage}
                  emptyMessage="Документы компании пока не загружены. Добавьте идентификационные документы и лицензию компании."
                  acceptTypes={CLIENT_DOCUMENT_ACCEPT_TYPES}
                />
              </>
            ) : null}

            <FormSection
              title="Финансовая информация"
              description="Данные о занятости и финансовом профиле покупателя"
              columns={2}
            >
              <div>
                <Label htmlFor="client-employment-employer">Работодатель</Label>
                <Input
                  id="client-employment-employer"
                  value={form.employmentEmployer}
                  onChange={handleChange("employmentEmployer")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-employment-position">Должность</Label>
                <Input
                  id="client-employment-position"
                  value={form.employmentPosition}
                  onChange={handleChange("employmentPosition")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-employment-years">Стаж (лет)</Label>
                <Input
                  id="client-employment-years"
                  value={form.employmentYears}
                  onChange={handleChange("employmentYears")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-income">Месячный доход</Label>
                <Input
                  id="client-income"
                  value={form.monthlyIncome}
                  onChange={handleChange("monthlyIncome")}
                  className="mt-2"
                  placeholder="AED"
                />
              </div>
              <div>
                <Label htmlFor="client-loans">Текущие кредиты</Label>
                <Input
                  id="client-loans"
                  value={form.existingLoans}
                  onChange={handleChange("existingLoans")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-score">Кредитный рейтинг</Label>
                <Input
                  id="client-score"
                  value={form.creditScore}
                  onChange={handleChange("creditScore")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-risk">Риск-оценка</Label>
                <Input
                  id="client-risk"
                  value={form.riskGrade}
                  onChange={handleChange("riskGrade")}
                  className="mt-2"
                />
              </div>
            </FormSection>

            {errorMessage ? (
              <p className="text-sm text-red-500">{errorMessage}</p>
            ) : null}

            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="order-2 flex flex-col gap-3 sm:order-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="rounded-xl"
                  onClick={handleDeleteClick}
                  disabled={isPending || isCheckingDelete || isDeleting}
                >
                  {isCheckingDelete ? "Проверяем..." : "Удалить покупателя"}
                </Button>
              </div>
              <div className="order-1 flex gap-2 sm:order-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl"
                  disabled={!canSubmit || isPending}
                >
                  {isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(next) => (next ? setDeleteOpen(true) : closeDeleteDialog())}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Удалить покупателя</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Вы уверены, что хотите удалить покупателя <strong>{profile.fullName}</strong>? Это действие
                  необратимо.
                </p>
                <div className="space-y-2">
                  <p className="text-xs">Будут удалены:</p>
                  <ul className="text-xs mt-1 list-disc list-inside">
                    <li>Профиль покупателя</li>
                    <li>Все документы покупателя</li>
                    <li>Связанные завершённые сделки</li>
                    <li>Запись пользователя</li>
                  </ul>
                </div>
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
              className="rounded-xl"
              onClick={closeDeleteDialog}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              onClick={confirmDelete}
              disabled={isDeleting || !canConfirmDelete}
            >
              {isDeleting ? "Удаляем..." : "Удалить покупателя"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
