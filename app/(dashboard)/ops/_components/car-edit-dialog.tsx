"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Loader2, Plus, Trash2, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type {
  OpsVehicleData,
  OpsVehicleDocument,
  OpsVehicleProfile,
  VehicleDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import { VEHICLE_DOCUMENT_TYPES } from "@/lib/supabase/queries/operations";
import { sortDocumentOptions } from "@/lib/documents/options";
import {
  type UpdateOperationsCarInput,
  type UpdateOperationsCarResult,
  deleteOperationsCar,
  type DeleteOperationsCarResult,
  type DeleteVehicleImageResult,
  deleteVehicleImage,
  type UpdateVehicleImageMetaResult,
  updateVehicleImageMeta,
  type UpdateVehicleDocumentResult,
  updateVehicleDocument,
  type DeleteVehicleDocumentResult,
  deleteVehicleDocument,
  verifyVehicleDeletion,
  type VerifyVehicleDeletionResult,
  type UploadVehicleDocumentsResult,
  uploadVehicleDocuments,
  type UploadVehicleImagesResult,
  uploadVehicleImages,
  updateOperationsCar,
} from "@/app/(dashboard)/ops/cars/actions";

type CarEditDialogProps = {
  vehicle: OpsVehicleData;
  slug: string;
  documents: OpsVehicleDocument[];
  gallery?: OpsVehicleProfile["gallery"];
};

type FormState = {
  vin: string;
  licensePlate: string;
  make: string;
  model: string;
  variant: string;
  year: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  engineCapacity: string;
  mileage: string;
  colorExterior: string;
  colorInterior: string;
  status: string;
  features: string;
};

type DocumentDraft = {
  id: string;
  type: VehicleDocumentTypeValue | "";
  file: File | null;
  title: string;
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
    title: "",
  } satisfies DocumentDraft;
}

const VEHICLE_DOCUMENT_ACCEPT_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp";
const VEHICLE_IMAGE_ACCEPT_TYPES = ".jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

function buildFormState(vehicle: OpsVehicleData): FormState {
  return {
    vin: vehicle.vin ?? "",
    licensePlate: vehicle.licensePlate ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    variant: vehicle.variant ?? "",
    year: vehicle.year != null ? String(vehicle.year) : "",
    bodyType: vehicle.bodyType ?? "",
    fuelType: vehicle.fuelType ?? "",
    transmission: vehicle.transmission ?? "",
    engineCapacity: vehicle.engineCapacity != null ? String(vehicle.engineCapacity) : "",
    mileage: vehicle.mileage != null ? String(vehicle.mileage) : "",
    colorExterior: vehicle.colorExterior ?? "",
    colorInterior: vehicle.colorInterior ?? "",
    status: vehicle.status ?? "draft",
    features: vehicle.features.length > 0 ? vehicle.features.join("\n") : "",
  };
}

type FormSectionProps = {
  title: string;
  description?: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
};

function FormSection({ title, description, columns = 2, children }: FormSectionProps) {
  const gridClass = columns === 1 ? "" : `sm:grid-cols-${columns}`;
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

export function CarEditDialog({ vehicle, slug, documents, gallery }: CarEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildFormState(vehicle));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploadingImages, startImageUpload] = useTransition();
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraft[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [canConfirmDelete, setCanConfirmDelete] = useState(false);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [imageActionMessage, setImageActionMessage] = useState<string | null>(null);
  const [deletingImageIds, setDeletingImageIds] = useState<Set<string>>(() => new Set());
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(() => new Set());
  const imageUploadFormRef = useRef<HTMLFormElement | null>(null);
  const imageUploadFormId = useId();

  const vehicleDocumentsList = useMemo(
    () => documents.filter((doc) => doc.source === "vehicle"),
    [documents],
  );

  const existingImages = useMemo(() => {
    if (!Array.isArray(gallery)) {
      return [];
    }

    return gallery.reduce<
      Array<{
        id: string;
        url: string;
        label: string | null;
        isPrimary: boolean;
      }>
    >((acc, image) => {
      if (!image || typeof image !== "object") {
        return acc;
      }

      const id = (image as { id?: unknown }).id;
      const url = (image as { url?: unknown }).url;

      if (typeof id !== "string" || id.length === 0) {
        return acc;
      }

      if (typeof url !== "string" || url.length === 0) {
        return acc;
      }

      const label = (image as { label?: string | null }).label ?? null;
      const isPrimary = Boolean((image as { isPrimary?: unknown }).isPrimary);

      acc.push({
        id,
        url,
        label,
        isPrimary,
      });

      return acc;
    }, []);
  }, [gallery]);

  const documentTypeOptions = useMemo(
    () => sortDocumentOptions(VEHICLE_DOCUMENT_TYPES),
    [],
  );

  const documentInitialState = useMemo(() => {
    const state: Record<string, { title: string; type: string }> = {};
    vehicleDocumentsList.forEach((doc) => {
      const typeCode = doc.typeCode ?? "";
      state[doc.id] = {
        type: typeCode,
        title: typeCode === "other" ? doc.title ?? "" : "",
      };
    });
    return state;
  }, [vehicleDocumentsList]);

  const [documentEdits, setDocumentEdits] = useState<Record<string, { title: string; type: string }>>(
    () => ({ ...documentInitialState }),
  );
  const [documentErrors, setDocumentErrors] = useState<Record<string, string | null>>(() => ({}));
  const [updatingDocumentIds, setUpdatingDocumentIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setDocumentEdits({ ...documentInitialState });
    setDocumentErrors({});
    setUpdatingDocumentIds(new Set());
  }, [documentInitialState]);

  const imageInitialLabels = useMemo(() => {
    const state: Record<string, string> = {};
    existingImages.forEach((image) => {
      state[image.id] = image.label ?? "";
    });
    return state;
  }, [existingImages]);

  const [imageLabelEdits, setImageLabelEdits] = useState<Record<string, string>>(() => ({
    ...imageInitialLabels,
  }));
  const [imageMetaErrors, setImageMetaErrors] = useState<Record<string, string | null>>(() => ({}));
  const [updatingImageIds, setUpdatingImageIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setImageLabelEdits({ ...imageInitialLabels });
    setImageMetaErrors({});
    setUpdatingImageIds(new Set());
  }, [imageInitialLabels]);

  const isImageDeleting = (imageId: string) => deletingImageIds.has(imageId);
  const isImageUpdating = (imageId: string) => updatingImageIds.has(imageId);
  const isDocumentDeleting = (documentId: string) => deletingDocumentIds.has(documentId);
  const isDocumentUpdating = (documentId: string) => updatingDocumentIds.has(documentId);

  function setImageDeleting(imageId: string, deleting: boolean) {
    setDeletingImageIds((prev) => {
      const next = new Set(prev);
      if (deleting) {
        next.add(imageId);
      } else {
        next.delete(imageId);
      }
      return next;
    });
  }

  function setImageUpdating(imageId: string, updating: boolean) {
    setUpdatingImageIds((prev) => {
      const next = new Set(prev);
      if (updating) {
        next.add(imageId);
      } else {
        next.delete(imageId);
      }
      return next;
    });
  }

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

  function setDocumentUpdating(documentId: string, updating: boolean) {
    setUpdatingDocumentIds((prev) => {
      const next = new Set(prev);
      if (updating) {
        next.add(documentId);
      } else {
        next.delete(documentId);
      }
      return next;
    });
  }

  const vehicleName = useMemo(() => {
    const combined = `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim();
    if (combined.length > 0) return combined;
    return vehicle.vin ?? "автомобиль";
  }, [vehicle.make, vehicle.model, vehicle.vin]);

  const hasIncompleteDocuments = useMemo(() => {
    return documentDrafts.some((draft) => {
      const hasType = draft.type !== "";
      const hasFile = draft.file instanceof File && draft.file.size > 0;
      const requiresTitle = draft.type === "other";
      const hasTitle = draft.title.trim().length > 0;
      return (
        (hasType && !hasFile) ||
        (hasFile && !hasType) ||
        (requiresTitle && hasFile && !hasTitle)
      );
    });
  }, [documentDrafts]);

  const documentValidationMessage = hasIncompleteDocuments
    ? "Для каждого документа укажите тип и файл. Если выбран тип \"Другой документ\", добавьте название."
    : null;

  const canSubmit = useMemo(() => {
    return (
      form.vin.trim().length > 0 &&
      form.make.trim().length > 0 &&
      form.model.trim().length > 0 &&
      form.bodyType.trim().length > 0 &&
      !hasIncompleteDocuments
    );
  }, [form.bodyType, form.make, form.model, form.vin, hasIncompleteDocuments]);

  function resetForm() {
    setForm(buildFormState(vehicle));
    setErrorMessage(null);
    setDeleteErrorMessage(null);
    setDeleteOpen(false);
    setIsCheckingDelete(false);
    setCanConfirmDelete(false);
    setDocumentDrafts([]);
    setIsDeleting(false);
    setImageActionError(null);
    setImageActionMessage(null);
    setDeletingImageIds(new Set());
    setDocumentActionError(null);
    setDocumentActionMessage(null);
    setDeletingDocumentIds(new Set());
    setDocumentEdits({ ...documentInitialState });
    setDocumentErrors({});
    setUpdatingDocumentIds(new Set());
    setImageLabelEdits({ ...imageInitialLabels });
    setImageMetaErrors({});
    setUpdatingImageIds(new Set());
    if (imageUploadFormRef.current) {
      imageUploadFormRef.current.reset();
    }
  }

  function handleChange(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.currentTarget.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  function handleAddDocumentDraft() {
    setDocumentDrafts((prev) => [...prev, createDocumentDraft()]);
  }

  function handleDocumentTypeChange(id: string, nextType: VehicleDocumentTypeValue | "") {
    setDocumentDrafts((prev) =>
      prev.map((draft) => {
        if (draft.id !== id) return draft;
        const isOther = nextType === "other";
        return {
          ...draft,
          type: nextType,
          title: isOther ? draft.title : "",
        };
      }),
    );
  }

  function handleDocumentFileChange(id: string, file: File | null) {
    setDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, file } : draft)),
    );
  }

  function handleRemoveDocumentDraft(id: string) {
    setDocumentDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }

  function handleDocumentDraftTitleChange(id: string, title: string) {
    setDocumentDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, title } : draft)),
    );
  }

  function ensureDocumentEditState(documentId: string) {
    setDocumentEdits((prev) => {
      if (prev[documentId]) {
        return prev;
      }
      return {
        ...prev,
        [documentId]: documentInitialState[documentId] ?? { title: "", type: "" },
      };
    });
  }

  function handleExistingDocumentTitleChange(documentId: string, value: string) {
    ensureDocumentEditState(documentId);
    setDocumentEdits((prev) => ({
      ...prev,
      [documentId]: {
        ...(prev[documentId] ?? documentInitialState[documentId] ?? { title: "", type: "" }),
        title: value,
      },
    }));
  }

  function handleExistingDocumentTypeChange(documentId: string, value: string) {
    ensureDocumentEditState(documentId);
    setDocumentEdits((prev) => {
      const initial = documentInitialState[documentId] ?? { title: "", type: "" };
      const existing = prev[documentId] ?? initial;
      const isOther = value === "other";
      const nextTitle = isOther ? existing.title : "";
      return {
        ...prev,
        [documentId]: {
          title: nextTitle,
          type: value,
        },
      };
    });
    setDocumentErrors((prev) => {
      if (!prev[documentId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  }

  async function handleExistingDocumentSave(documentId: string) {
    const draft = documentEdits[documentId] ?? documentInitialState[documentId];
    if (!draft) {
      return;
    }

    const normalizedType = draft.type.trim();
    const normalizedTitle = draft.title.trim();
    const initial = documentInitialState[documentId] ?? { title: "", type: "" };
    const initialType = initial.type.trim();
    const initialTitle = initial.title.trim();
    const requiresTitle = normalizedType === "other";
    const initialRequiredTitle = initialType === "other";
    const typeDirty = normalizedType !== initialType;
    const titleDirty = requiresTitle
      ? normalizedTitle !== initialTitle
      : initialRequiredTitle && !requiresTitle;

    if (!typeDirty && !titleDirty) {
      return;
    }

    if (normalizedType.length === 0) {
      setDocumentErrors((prev) => ({ ...prev, [documentId]: "Выберите тип документа." }));
      return;
    }

    if (requiresTitle && !normalizedTitle) {
      setDocumentErrors((prev) => ({ ...prev, [documentId]: "Добавьте название для типа \"Другой документ\"." }));
      return;
    }

    setDocumentActionError(null);
    setDocumentActionMessage(null);
    setDocumentErrors((prev) => ({ ...prev, [documentId]: null }));
    setDocumentUpdating(documentId, true);

    try {
      const result: UpdateVehicleDocumentResult = await updateVehicleDocument({
        vehicleId: vehicle.id,
        documentId,
        slug,
        title: requiresTitle ? normalizedTitle : undefined,
        type: normalizedType || undefined,
      });

      if (!result.success) {
        setDocumentErrors((prev) => ({ ...prev, [documentId]: result.error }));
        return;
      }

      setDocumentActionMessage("Документ обновлён.");
      router.refresh();
    } catch (error) {
      console.error("[operations] vehicle document save error", error);
      setDocumentErrors((prev) => ({
        ...prev,
        [documentId]: "Не удалось сохранить документ. Попробуйте ещё раз.",
      }));
    } finally {
      setDocumentUpdating(documentId, false);
    }
  }

  async function handleExistingDocumentDelete(documentId: string) {
    if (!documentId || isDocumentDeleting(documentId)) {
      return;
    }

    setDocumentActionError(null);
    setDocumentActionMessage(null);
    setDocumentErrors((prev) => ({ ...prev, [documentId]: null }));
    setDocumentDeleting(documentId, true);

    try {
      const result: DeleteVehicleDocumentResult = await deleteVehicleDocument({
        vehicleId: vehicle.id,
        documentId,
        slug,
      });

      if (!result.success) {
        setDocumentErrors((prev) => ({ ...prev, [documentId]: result.error }));
        return;
      }

      setDocumentActionMessage("Документ удалён.");
      router.refresh();
    } catch (error) {
      console.error("[operations] vehicle document delete error", error);
      setDocumentErrors((prev) => ({
        ...prev,
        [documentId]: "Не удалось удалить документ. Попробуйте ещё раз.",
      }));
    } finally {
      setDocumentDeleting(documentId, false);
    }
  }

  function handleDeleteImage(imageId: string) {
    if (!imageId || isImageDeleting(imageId)) {
      return;
    }

    setImageActionError(null);
    setImageActionMessage(null);
    setImageMetaErrors((prev) => ({ ...prev, [imageId]: null }));
    setImageDeleting(imageId, true);

    deleteVehicleImage({
      vehicleId: vehicle.id,
      imageId,
      slug,
    })
      .then((result: DeleteVehicleImageResult) => {
        if (!result.success) {
          setImageActionError(result.error);
          return;
        }
        setImageActionMessage("Фото удалено.");
        router.refresh();
      })
      .catch((error) => {
        console.error("[operations] vehicle image delete error", error);
        setImageActionError("Не удалось удалить изображение. Попробуйте ещё раз.");
      })
      .finally(() => {
        setImageDeleting(imageId, false);
      });
  }

  function handleImageLabelChange(imageId: string, value: string) {
    setImageLabelEdits((prev) => ({ ...prev, [imageId]: value }));
  }

  async function handleImageLabelSave(imageId: string) {
    const currentLabel = (imageLabelEdits[imageId] ?? "").trim();
    const initialLabel = (imageInitialLabels[imageId] ?? "").trim();

    if (currentLabel === initialLabel && !imageMetaErrors[imageId]) {
      return;
    }

    setImageActionError(null);
    setImageActionMessage(null);
    setImageMetaErrors((prev) => ({ ...prev, [imageId]: null }));
    setImageUpdating(imageId, true);

    try {
      const result: UpdateVehicleImageMetaResult = await updateVehicleImageMeta({
        vehicleId: vehicle.id,
        imageId,
        slug,
        label: currentLabel,
      });

      if (!result.success) {
        setImageMetaErrors((prev) => ({ ...prev, [imageId]: result.error }));
        return;
      }

      setImageActionMessage("Подпись обновлена.");
      router.refresh();
    } catch (error) {
      console.error("[operations] vehicle image label update error", error);
      setImageMetaErrors((prev) => ({
        ...prev,
        [imageId]: "Не удалось обновить изображение. Попробуйте ещё раз.",
      }));
    } finally {
      setImageUpdating(imageId, false);
    }
  }

  async function handleImageSetPrimary(imageId: string) {
    setImageActionError(null);
    setImageActionMessage(null);
    setImageMetaErrors((prev) => ({ ...prev, [imageId]: null }));
    setImageUpdating(imageId, true);

    try {
      const result: UpdateVehicleImageMetaResult = await updateVehicleImageMeta({
        vehicleId: vehicle.id,
        imageId,
        slug,
        setPrimary: true,
      });

      if (!result.success) {
        setImageMetaErrors((prev) => ({ ...prev, [imageId]: result.error }));
        return;
      }

      setImageActionMessage("Основное фото обновлено.");
      router.refresh();
    } catch (error) {
      console.error("[operations] vehicle image primary update error", error);
      setImageMetaErrors((prev) => ({
        ...prev,
        [imageId]: "Не удалось обновить статус изображения.",
      }));
    } finally {
      setImageUpdating(imageId, false);
    }
  }

  const handleImageUpload = (formData: FormData) => {
    setImageActionError(null);
    setImageActionMessage(null);

    formData.set("vehicleId", vehicle.id);
    formData.set("slug", slug);

    startImageUpload(() => {
      uploadVehicleImages(formData)
        .then((result: UploadVehicleImagesResult) => {
          if (!result.success) {
            setImageActionError(result.error);
            return;
          }
          if (imageUploadFormRef.current) {
            imageUploadFormRef.current.reset();
          }
          setImageActionMessage(
            result.uploaded > 0
              ? result.uploaded === 1
                ? "Фото успешно загружено."
                : `Загружено ${result.uploaded} фото.`
              : "Новые фото не выбраны.",
          );
          router.refresh();
        })
        .catch((error) => {
          console.error("[operations] vehicle image upload error", error);
          setImageActionError("Не удалось загрузить изображения. Попробуйте ещё раз.");
        });
    });
  };

  async function submit() {
    setErrorMessage(null);

    const payload: UpdateOperationsCarInput = {
      vehicleId: vehicle.id,
      slug,
      vin: form.vin,
      licensePlate: form.licensePlate,
      make: form.make,
      model: form.model,
      variant: form.variant,
      year: form.year,
      bodyType: form.bodyType,
      fuelType: form.fuelType,
      transmission: form.transmission,
      engineCapacity: form.engineCapacity,
      mileage: form.mileage,
      colorExterior: form.colorExterior,
      colorInterior: form.colorInterior,
      status: (form.status as UpdateOperationsCarInput["status"]) ?? "available",
      features: form.features,
    };

    const result: UpdateOperationsCarResult = await updateOperationsCar(payload);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    if (documentDrafts.length > 0) {
      const readyDrafts = documentDrafts.filter(
        (draft): draft is DocumentDraft & { type: VehicleDocumentTypeValue; file: File } =>
          draft.type !== "" && draft.file instanceof File,
      );

      if (readyDrafts.length === 0) {
        setDocumentDrafts([]);
      } else {
        const formData = new FormData();
        formData.append("vehicleId", vehicle.id);
        formData.append("slug", slug);

        readyDrafts.forEach((draft, index) => {
          formData.append(`documents[${index}][type]`, draft.type);
          formData.append(`documents[${index}][file]`, draft.file);
          if (draft.type === "other") {
            formData.append(`documents[${index}][title]`, draft.title.trim());
          }
        });

        const uploadResult: UploadVehicleDocumentsResult = await uploadVehicleDocuments(formData);

        if (!uploadResult.success) {
          setErrorMessage(uploadResult.error);
          return;
        }
      }
    }

    setDocumentDrafts([]);
    setOpen(false);
    router.replace(`/ops/cars/${result.slug}`);
    router.refresh();
  }

  async function handleDeleteClick() {
    if (isPending || isCheckingDelete || isDeleting) {
      return;
    }

    setErrorMessage(null);
    setDeleteErrorMessage(null);
    setCanConfirmDelete(false);
    setIsCheckingDelete(true);
    try {
      const checkResult: VerifyVehicleDeletionResult = await verifyVehicleDeletion({
        vehicleId: vehicle.id,
        slug,
      });

      if (!checkResult.canDelete) {
        setDeleteErrorMessage(
          checkResult.reason ?? "Автомобиль связан со сделками и не может быть удалён.",
        );
        setDeleteOpen(true);
        return;
      }

      setCanConfirmDelete(true);
      setDeleteOpen(true);
    } catch (error) {
      console.error("[operations] unexpected error during vehicle deletion check", error);
      setDeleteErrorMessage("Не удалось проверить возможность удаления автомобиля.");
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
      const result: DeleteOperationsCarResult = await deleteOperationsCar({
        vehicleId: vehicle.id,
        slug,
      });

      if (!result.success) {
        setDeleteErrorMessage(result.error);
        return;
      }

      setDeleteOpen(false);
      setOpen(false);
      router.replace("/ops/cars");
      router.refresh();
    } catch (error) {
      console.error("[operations] unexpected error during vehicle deletion", error);
      setDeleteErrorMessage("Не удалось удалить автомобиль.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isPending) return;
    startTransition(submit);
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            resetForm();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-xl">
            Редактировать
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Редактирование автомобиля</DialogTitle>
            <DialogDescription>
              Обновите технические характеристики автомобиля и связанные документы.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormSection title="Основная информация" columns={2}>
              <div className="space-y-1">
                <Label>VIN</Label>
                <Input
                  value={form.vin}
                  onChange={handleChange("vin")}
                  placeholder="Например, WDC12345678900001"
                  className="rounded-lg uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label>Госномер</Label>
                <Input
                  value={form.licensePlate}
                  onChange={handleChange("licensePlate")}
                  placeholder="Например, A 12345"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label>Марка</Label>
                <Input value={form.make} onChange={handleChange("make")} placeholder="Rolls-Royce" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Модель</Label>
                <Input value={form.model} onChange={handleChange("model")} placeholder="Cullinan" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Комплектация</Label>
                <Input value={form.variant} onChange={handleChange("variant")} placeholder="Black Badge" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Год выпуска</Label>
                <Input value={form.year} onChange={handleChange("year")} placeholder="2024" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Тип кузова</Label>
                <Input value={form.bodyType} onChange={handleChange("bodyType")} placeholder="SUV" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Тип топлива</Label>
                <Input value={form.fuelType} onChange={handleChange("fuelType")} placeholder="petrol" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Трансмиссия</Label>
                <Input value={form.transmission} onChange={handleChange("transmission")} placeholder="automatic" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Объём двигателя (л)</Label>
                <Input value={form.engineCapacity} onChange={handleChange("engineCapacity")} placeholder="4.0" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Пробег (км)</Label>
                <Input value={form.mileage} onChange={handleChange("mileage")} placeholder="1200" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Статус</Label>
                <select
                  value={form.status}
                  onChange={handleChange("status")}
                  className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="draft">Черновик</option>
                  <option value="available">Доступен</option>
                  <option value="reserved">Резерв</option>
                  <option value="leased">В лизинге</option>
                  <option value="maintenance">На сервисе</option>
                  <option value="retired">Списан</option>
                </select>
              </div>
            </FormSection>

            <FormSection title="Внешний вид" columns={2}>
              <div className="space-y-1">
                <Label>Цвет кузова</Label>
                <Input value={form.colorExterior} onChange={handleChange("colorExterior")} placeholder="Arctic White" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Цвет салона</Label>
                <Input value={form.colorInterior} onChange={handleChange("colorInterior")} placeholder="Black" className="rounded-lg" />
              </div>
            </FormSection>

            <FormSection title="Особенности" columns={1}>
              <div className="space-y-1">
                <Label>Особенности</Label>
                <Textarea
                  value={form.features}
                  onChange={handleChange("features")}
                  placeholder="Укажите особенности автомобиля, по одной в строке"
                  className="rounded-lg"
                  rows={4}
                />
              </div>
            </FormSection>

            <div className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Фотографии автомобиля</h4>
                  <p className="text-xs text-muted-foreground">
                    Загрузите новые изображения. Превью появятся на странице деталей.
                  </p>
                </div>
                {imageActionMessage ? (
                  <Badge variant="outline" className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {imageActionMessage}
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Текущие фото</p>
                  {existingImages.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {existingImages.map((image) => {
                        const editedLabel = imageLabelEdits[image.id] ?? "";
                        const initialLabel = imageInitialLabels[image.id] ?? "";
                        const isLabelDirty = editedLabel.trim() !== initialLabel.trim();
                        const isBusy = isImageUpdating(image.id) || isImageDeleting(image.id);

                        return (
                          <div
                            key={image.id}
                            className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-3"
                          >
                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                              <Image
                                src={image.url}
                                alt={image.label ?? "Фото автомобиля"}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover"
                              />
                              {image.isPrimary ? (
                                <span className="absolute left-3 top-3 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                                  Основное
                                </span>
                              ) : null}
                            </div>
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <Label
                                  htmlFor={`image-label-${image.id}`}
                                  className="text-xs font-medium text-muted-foreground"
                                >
                                  Подпись изображения
                                </Label>
                                <Input
                                  id={`image-label-${image.id}`}
                                  value={editedLabel}
                                  onChange={(event) =>
                                    handleImageLabelChange(image.id, event.target.value)
                                  }
                                  placeholder="Например, Передняя часть"
                                  className="rounded-lg"
                                />
                              </div>
                              {imageMetaErrors[image.id] ? (
                                <p className="text-xs text-destructive">{imageMetaErrors[image.id]}</p>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleImageLabelSave(image.id)}
                                  disabled={isBusy || (!isLabelDirty && !imageMetaErrors[image.id])}
                                  className="rounded-lg"
                                >
                                  {isImageUpdating(image.id) ? "Сохраняем..." : "Сохранить подпись"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleImageSetPrimary(image.id)}
                                  disabled={isBusy || image.isPrimary}
                                  className="rounded-lg"
                                >
                                  {image.isPrimary ? "Основное" : "Сделать основным"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteImage(image.id)}
                                  disabled={isBusy}
                                  className="shrink-0 rounded-lg"
                                >
                                  <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                                  {isImageDeleting(image.id) ? "Удаление..." : "Удалить"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Фотографии ещё не загружены.</p>
                  )}
                </div>
                {imageActionError ? <p className="text-sm text-destructive">{imageActionError}</p> : null}
                <div className="space-y-2">
                  <Label htmlFor="vehicle-images-upload">Выберите файлы</Label>
                  <Input
                    id="vehicle-images-upload"
                    name="images"
                    type="file"
                    accept={VEHICLE_IMAGE_ACCEPT_TYPES}
                    multiple
                    className="rounded-lg"
                    form={imageUploadFormId}
                  />
                  <p className="text-xs text-muted-foreground">
                    Поддерживаются {VEHICLE_IMAGE_ACCEPT_TYPES.replace(/,/g, ", ")} до 10&nbsp;МБ.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button form={imageUploadFormId} type="submit" disabled={isUploadingImages}>
                    {isUploadingImages ? "Загрузка..." : "Загрузить фото"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (imageUploadFormRef.current) {
                        imageUploadFormRef.current.reset();
                      }
                      setImageActionError(null);
                      setImageActionMessage(null);
                    }}
                    disabled={isUploadingImages}
                  >
                    Сбросить
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Документы автомобиля</h4>
                  <p className="text-xs text-muted-foreground">Добавьте документы, связанные с автомобилем.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleAddDocumentDraft}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить документ
                </Button>
              </div>
              <div className="space-y-3">
                {vehicleDocumentsList.length > 0 ? (
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Загруженные</p>
                    <div className="space-y-3">
                      {vehicleDocumentsList.map((doc) => {
                        const edit =
                          documentEdits[doc.id] ?? documentInitialState[doc.id] ?? {
                            title: doc.title ?? "",
                            type: doc.typeCode ?? "",
                          };
                        const initial = documentInitialState[doc.id] ?? {
                          title: doc.title ?? "",
                          type: doc.typeCode ?? "",
                        };
                        const normalizedType = edit.type.trim();
                        const initialType = initial.type.trim();
                        const requiresTitle = normalizedType === "other";
                        const initialRequiredTitle = initialType === "other";
                        const isBusy = isDocumentUpdating(doc.id) || isDocumentDeleting(doc.id);
                        const isDirty =
                          normalizedType !== initialType ||
                          (requiresTitle
                            ? edit.title.trim() !== initial.title.trim()
                            : initialRequiredTitle && !requiresTitle);

                        const typeLabel = (() => {
                          const option = documentTypeOptions.find((opt) => opt.value === normalizedType);
                          return option?.label ?? doc.type ?? doc.title ?? "Документ";
                        })();
                        const heading = requiresTitle
                          ? edit.title.trim() || "Документ"
                          : typeLabel;

                        return (
                          <div
                            key={doc.id}
                            className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-4"
                          >
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground" title={heading}>
                                  {heading}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.date ? `Загружен: ${doc.date}` : "Дата не указана"}
                                </p>
                                {requiresTitle ? (
                                  <div className="space-y-1 pt-2">
                                    <Label htmlFor={`document-title-${doc.id}`}>Название</Label>
                                    <Input
                                      id={`document-title-${doc.id}`}
                                      value={edit.title}
                                      onChange={(event) =>
                                        handleExistingDocumentTitleChange(doc.id, event.target.value)
                                      }
                                      placeholder="Опишите документ"
                                      className="rounded-lg"
                                    />
                                  </div>
                                ) : null}
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`document-type-${doc.id}`}>Тип документа</Label>
                                <select
                                  id={`document-type-${doc.id}`}
                                  value={edit.type}
                                  onChange={(event) =>
                                    handleExistingDocumentTypeChange(
                                      doc.id,
                                      event.currentTarget.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  <option value="">Не указан</option>
                                  {documentTypeOptions.map((type) => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {documentErrors[doc.id] ? (
                              <p className="text-xs text-destructive">{documentErrors[doc.id]}</p>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2">
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
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleExistingDocumentSave(doc.id)}
                                disabled={isBusy || !isDirty}
                                className="rounded-lg"
                              >
                                {isDocumentUpdating(doc.id) ? "Сохраняем..." : "Сохранить"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleExistingDocumentDelete(doc.id)}
                                disabled={isBusy}
                                className="rounded-lg text-muted-foreground hover:text-destructive"
                                aria-label="Удалить документ"
                              >
                                {isDocumentDeleting(doc.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {documentActionError ? (
                  <p className="text-xs text-destructive">{documentActionError}</p>
                ) : null}
                {documentActionMessage ? (
                  <p className="text-xs text-muted-foreground">{documentActionMessage}</p>
                ) : null}

                {documentDrafts.length > 0 ? (
                  <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Новые документы
                    </p>
                    <div className="space-y-2">
                      {documentDrafts.map((draft) => (
                        <div
                          key={draft.id}
                          className="grid gap-3 rounded-xl border border-border/60 bg-background/50 p-3 sm:grid-cols-[200px_1fr_auto]"
                        >
                          <div className="space-y-1">
                            <Label htmlFor={`document-type-${draft.id}`}>Тип документа</Label>
                            <select
                              id={`document-type-${draft.id}`}
                              value={draft.type}
                              onChange={(event) =>
                                handleDocumentTypeChange(draft.id, event.currentTarget.value as VehicleDocumentTypeValue)
                              }
                              className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <option value="">Выберите тип</option>
                              {documentTypeOptions.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                            {draft.type === "other" ? (
                              <div className="space-y-1 pt-2">
                                <Label htmlFor={`document-title-draft-${draft.id}`}>Название</Label>
                                <Input
                                  id={`document-title-draft-${draft.id}`}
                                  value={draft.title}
                                  onChange={(event) =>
                                    handleDocumentDraftTitleChange(draft.id, event.target.value)
                                  }
                                  placeholder="Опишите документ"
                                  className="rounded-lg"
                                />
                              </div>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`document-file-${draft.id}`}>Файл</Label>
                            <Input
                              id={`document-file-${draft.id}`}
                              type="file"
                              accept={VEHICLE_DOCUMENT_ACCEPT_TYPES}
                              onChange={(event) =>
                                handleDocumentFileChange(draft.id, event.currentTarget.files?.[0] ?? null)
                              }
                              className="rounded-lg"
                            />
                            <p className="text-xs text-muted-foreground">
                              Допустимые форматы: PDF, DOC, DOCX, JPG, PNG, WEBP (до 50 МБ).
                            </p>
                          </div>
                          <div className="flex items-center justify-end">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleRemoveDocumentDraft(draft.id)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Удалить</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {documentDrafts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                    Добавьте новый документ, чтобы прикрепить файлы к автомобилю.
                  </div>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  <p>Документы будут доступны в разделе «Документы» автомобиля после сохранения.</p>
                  <p className="mt-1">
                    Если вы добавили документ, обязательно выберите его тип и файл для загрузки.
                  </p>
                </div>
                {documentValidationMessage ? (
                  <p className="text-xs text-destructive">{documentValidationMessage}</p>
                ) : null}
              </div>
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="order-2 flex flex-col gap-3 sm:order-1">
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-xl"
                  onClick={handleDeleteClick}
                  disabled={isPending || isCheckingDelete || isDeleting}
                >
                  {isCheckingDelete ? "Проверяем…" : "Удалить автомобиль"}
                </Button>
              </div>
              <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => {
                    resetForm();
                    setOpen(false);
                  }}
                  disabled={isPending}
                >
                  Отменить
                </Button>
                <Button type="submit" disabled={!canSubmit || isPending} className="rounded-xl">
                  {isPending && !isDeleting ? "Сохраняем…" : "Сохранить изменения"}
                </Button>
              </div>
          </DialogFooter>
        </form>
        <form
          id={imageUploadFormId}
          ref={imageUploadFormRef}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            handleImageUpload(formData);
          }}
          className="hidden"
          encType="multipart/form-data"
        >
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <input type="hidden" name="slug" value={slug} />
        </form>

      </DialogContent>
    </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(next) => (next ? setDeleteOpen(true) : closeDeleteDialog())}>
        <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Удалить автомобиль</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Подтвердите удаление автомобиля <strong>{vehicleName}</strong>. Все связанные документы будут
                удалены безвозвратно.
              </p>
              <div className="space-y-1">
                <p className="text-xs">Будут удалены:</p>
                <ul className="text-xs mt-1 list-disc list-inside">
                  <li>Информация об автомобиле</li>
                  <li>Загруженные документы</li>
                  <li>Связанные черновые данные по авто</li>
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
            {isDeleting ? "Удаляем…" : "Удалить автомобиль"}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
