"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, FileUp, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { applicationDocuments } from "@/lib/data/application";
import { ALLOWED_ACCEPT_TYPES } from "@/lib/constants/uploads";
import { cn } from "@/lib/utils";

import {
  useApplicationForm,
} from "../../_components/application-form-context";
import {
  ensureApplicationDraftAction,
  uploadApplicationDocumentAction,
  updateDocumentStatusAction,
  getApplySignedUploadUrl,
} from "../../actions";

export default function ApplicationDocumentsPage() {
  const router = useRouter();
  const { draft, updateDraft, isHydrated } = useApplicationForm();
  const [error, setError] = useState<string | null>(null);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [isEnsuring, startEnsuring] = useTransition();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const hasEnsuredRef = useRef(false);

  const requirements = useMemo(
    () => applicationDocuments[draft.residencyStatus],
    [draft.residencyStatus],
  );

  useEffect(() => {
    if (!isHydrated || hasEnsuredRef.current) {
      return;
    }
    if (draft.applicationId) {
      hasEnsuredRef.current = true;
      return;
    }

    startEnsuring(async () => {
      try {
        const result = await ensureApplicationDraftAction({
          applicationId: draft.applicationId,
          residencyStatus: draft.residencyStatus,
          selectedCarId: draft.selectedCarId,
          planId: draft.planId,
          preferences: draft.preferences,
          personal: draft.personal,
          vehicleCode: draft.source.vehicleCode,
          referralCode: draft.source.referralCode,
        });
        hasEnsuredRef.current = true;
        updateDraft((prev) => ({
          ...prev,
          applicationId: result.applicationId,
          applicationNumber: result.applicationNumber,
        }));
      } catch (actionError) {
        const message =
          actionError instanceof Error
            ? actionError.message
            : "Не удалось создать черновик заявки.";
        setError(message);
      }
    });
  }, [
    isHydrated,
    draft.applicationId,
    draft.personal,
    draft.planId,
    draft.preferences,
    draft.residencyStatus,
    draft.selectedCarId,
    draft.source.vehicleCode,
    draft.source.referralCode,
    updateDraft,
  ]);

  if (!isHydrated) {
    return <div className="h-40 animate-pulse rounded-3xl bg-surface-subtle" />;
  }

  const ensureDraftId = async () => {
    if (draft.applicationId) {
      return draft.applicationId;
    }
    const result = await ensureApplicationDraftAction({
      applicationId: draft.applicationId,
      residencyStatus: draft.residencyStatus,
      selectedCarId: draft.selectedCarId,
      planId: draft.planId,
      preferences: draft.preferences,
      personal: draft.personal,
      vehicleCode: draft.source.vehicleCode,
      referralCode: draft.source.referralCode,
    });
    updateDraft((prev) => ({
      ...prev,
      applicationId: result.applicationId,
      applicationNumber: result.applicationNumber,
    }));
    return result.applicationId;
  };

  const handleUpload = (id: string) => {
    const input = fileInputs.current[id];
    input?.click();
  };

  const handleFileChange = async (id: string, file?: File) => {
    if (!file) return;
    try {
      const applicationId = await ensureDraftId();
      setPendingDocId(id);

      const urlResult = await getApplySignedUploadUrl({
        applicationId,
        documentId: id,
        fileName: file.name,
      });

      if (!urlResult.success) {
        throw new Error(urlResult.error);
      }

      const uploadResult = await fetch(urlResult.url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-amz-acl": "private",
        },
      });

      if (!uploadResult.ok) {
        throw new Error("Не удалось загрузить файл.");
      }

      const formData = new FormData();
      formData.append("applicationId", applicationId);
      formData.append("documentId", id);
      formData.append("path", urlResult.path);
      formData.append("name", file.name);
      formData.append("size", String(file.size));
      formData.append("mime", file.type || "application/octet-stream");

      const result = await uploadApplicationDocumentAction(formData);

      updateDraft((prev) => ({
        ...prev,
        documents: prev.documents.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                uploaded: true,
                fileName: result.fileName,
                status: result.status,
                recordId: result.recordId,
              }
            : doc,
        ),
      }));
      setError(null);
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "Не удалось загрузить документ.";
      setError(message);
    } finally {
      setPendingDocId(null);
      const input = fileInputs.current[id];
      if (input) {
        input.value = "";
      }
    }
  };

  const markAsProvided = async (id: string, provided: boolean) => {
    try {
      const applicationId = await ensureDraftId();
      setPendingDocId(id);
      const result = await updateDocumentStatusAction({
        applicationId,
        documentId: id,
        providedOffline: provided,
      });

      updateDraft((prev) => ({
        ...prev,
        documents: prev.documents.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                uploaded: provided,
                fileName: provided
                  ? result.fileName || "Предоставлю менеджеру"
                  : undefined,
                status: result.status,
                recordId: result.recordId,
              }
            : doc,
        ),
      }));
      setError(null);
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "Не удалось обновить состояние документа.";
      setError(message);
    } finally {
      setPendingDocId(null);
    }
  };

  const handleNext = () => {
    const missing = draft.documents.filter((doc) => !doc.optional && !doc.uploaded);
    if (missing.length) {
      setError("Загрузите обязательные документы или отметьте их как предоставленные.");
      return;
    }
    setError(null);
    router.push("/apply/summary");
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-linear">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Шаг 3 · Документы
          </span>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Загрузите документы для скоринга
            </h2>
            <p className="text-sm text-muted-foreground">
              Форматы: PDF, PNG, JPG. Размер до 10 МБ. При необходимости можно
              загрузить несколько файлов на следующем шаге через менеджера.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {requirements.map((doc) => {
            const state = draft.documents.find((item) => item.id === doc.id);
            const uploaded = state?.uploaded ?? false;
            const fileName = state?.fileName;
            return (
              <article
                key={doc.id}
                className={cn(
                  "flex h-full flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-linear",
                  uploaded && "border-emerald-400",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {doc.description}
                    </p>
                  </div>
                  {doc.optional ? (
                    <span className="rounded-full bg-surface-subtle px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                      Дополнительно
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {uploaded ? (
                      <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Paperclip className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{fileName ?? "Файл не загружен"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-border"
                      onClick={() => handleUpload(doc.id)}
                      disabled={pendingDocId === doc.id || isEnsuring}
                    >
                      <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
                      Загрузить
                    </Button>
                    {doc.optional ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => markAsProvided(doc.id, !uploaded)}
                        disabled={pendingDocId === doc.id || isEnsuring}
                      >
                        {uploaded ? "Очистить" : "Позже"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => markAsProvided(doc.id, !uploaded)}
                        disabled={pendingDocId === doc.id || isEnsuring}
                      >
                        {uploaded ? "Удалить" : "Есть у менеджера"}
                      </Button>
                    )}
                  </div>
                  <input
                    ref={(node) => {
                      fileInputs.current[doc.id] = node;
                    }}
                    type="file"
                    className="hidden"
                    accept={ALLOWED_ACCEPT_TYPES}
                    onChange={(event) =>
                      handleFileChange(doc.id, event.target.files?.[0] ?? undefined)
                    }
                  />
                </div>
              </article>
            );
          })}
        </div>

        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border"
            onClick={() => router.push("/apply/start")}
          >
            Назад
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={handleNext}
            disabled={pendingDocId !== null || isEnsuring}
          >
            К подтверждению
          </Button>
        </div>
      </section>
    </div>
  );
}
