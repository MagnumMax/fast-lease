"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Plus, Trash2, X } from "lucide-react";
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
import {
  type UpdateOperationsCarInput,
  type UpdateOperationsCarResult,
  deleteOperationsCar,
  type DeleteOperationsCarResult,
  type DeleteVehicleImageResult,
  deleteVehicleImage,
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

const VEHICLE_DOCUMENT_ACCEPT_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp";
const VEHICLE_IMAGE_ACCEPT_TYPES = ".jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

function buildFormState(vehicle: OpsVehicleData): FormState {
  return {
    vin: vehicle.vin ?? "",
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

  const documentTypeOptions = VEHICLE_DOCUMENT_TYPES;

  const isImageDeleting = (imageId: string) => deletingImageIds.has(imageId);

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

  const vehicleName = useMemo(() => {
    const combined = `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim();
    if (combined.length > 0) return combined;
    return vehicle.vin ?? "автомобиль";
  }, [vehicle.make, vehicle.model, vehicle.vin]);

  const hasIncompleteDocuments = useMemo(() => {
    return documentDrafts.some((draft) => {
      const hasType = draft.type !== "";
      const hasFile = draft.file instanceof File && draft.file.size > 0;
      return (hasType && !hasFile) || (hasFile && !hasType);
    });
  }, [documentDrafts]);

  const documentValidationMessage = hasIncompleteDocuments
    ? "Выберите тип и файл для каждого добавленного документа."
    : null;

  const canSubmit = useMemo(() => {
    return (
      form.vin.trim().length > 0 &&
      form.make.trim().length > 0 &&
      form.model.trim().length > 0 &&
      !hasIncompleteDocuments
    );
  }, [form.make, form.model, form.vin, hasIncompleteDocuments]);

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
      prev.map((draft) => (draft.id === id ? { ...draft, type: nextType } : draft)),
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

  function handleDeleteImage(imageId: string) {
    if (!imageId || isImageDeleting(imageId)) {
      return;
    }

    setImageActionError(null);
    setImageActionMessage(null);
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
                <Input value={form.vin} onChange={handleChange("vin")} placeholder="Например, WDC12345678900001" className="rounded-lg" />
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
                <Label>Цвет кузова</Label>
                <Input value={form.colorExterior} onChange={handleChange("colorExterior")} placeholder="Obsidian" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Цвет салона</Label>
                <Input value={form.colorInterior} onChange={handleChange("colorInterior")} placeholder="Black" className="rounded-lg" />
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

            <FormSection title="Цвета и внешний вид" columns={2}>
              <div className="space-y-1">
                <Label>Цвет кузова</Label>
                <Input value={form.colorExterior} onChange={handleChange("colorExterior")} placeholder="Arctic White" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Цвет салона</Label>
                <Input value={form.colorInterior} onChange={handleChange("colorInterior")} placeholder="Black" className="rounded-lg" />
              </div>
            </FormSection>

            <FormSection title="Параметры" columns={2}>
              <div className="space-y-1">
                <Label>VIN</Label>
                <Input value={form.vin} onChange={handleChange("vin")} placeholder="Например, WDC12345678900001" className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label>Пробег (км)</Label>
                <Input value={form.mileage} onChange={handleChange("mileage")} placeholder="1200" className="rounded-lg" />
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
                      {existingImages.map((image) => (
                        <div
                          key={image.id}
                          className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-2"
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                            <Image
                              src={image.url}
                              alt={image.label ?? "Фото автомобиля"}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <p className="truncate text-xs font-medium text-foreground">
                                {image.label ?? "Фото без названия"}
                              </p>
                              {image.isPrimary ? (
                                <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-wide">
                                  Основное
                                </Badge>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteImage(image.id)}
                              disabled={isImageDeleting(image.id)}
                              className="shrink-0"
                            >
                              <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                              {isImageDeleting(image.id) ? "Удаление..." : "Удалить"}
                            </Button>
                          </div>
                        </div>
                      ))}
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
                    <div className="space-y-2">
                      {vehicleDocumentsList.map((doc) => (
                        <div key={doc.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/50 p-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {doc.type ? <Badge variant="outline">{doc.type}</Badge> : null}
                              {doc.date ? <span>{doc.date}</span> : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
