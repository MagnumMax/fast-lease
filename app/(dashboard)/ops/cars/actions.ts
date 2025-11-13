"use server";

import { Buffer } from "node:buffer";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  OPS_VEHICLE_STATUS_META,
  VEHICLE_DOCUMENT_TYPES,
  VEHICLE_DOCUMENT_TYPE_LABEL_MAP,
  normalizeVehicleDocumentType,
  type VehicleDocumentTypeValue,
  type OpsCarRecord,
} from "@/lib/supabase/queries/operations";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { getMutationSessionUser } from "@/lib/auth/guards";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";
import { getWorkspacePaths } from "@/lib/workspace/routes";
import { buildSlugWithId } from "@/lib/utils/slugs";
import {
  uploadDocumentsBatch,
  type DocumentUploadCandidate,
  isFileLike,
  type FileLike,
  getFileName,
  sanitizeFileName,
} from "@/lib/documents/upload";

const createVehicleSchema = z.object({
  vin: z.string().min(3).optional(),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.string().optional(),
  bodyType: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  mileage: z.string().optional(),
});

const VEHICLE_STATUSES = [
  "draft",
  "available",
  "reserved",
  "leased",
  "maintenance",
  "retired",
] as const;

const VEHICLE_DOCUMENT_BUCKET = "vehicle-documents";
const VEHICLE_IMAGE_BUCKET = "vehicle-images";
const VEHICLE_IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const VEHICLE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const VEHICLE_DOCUMENT_TYPE_VALUES = new Set(
  VEHICLE_DOCUMENT_TYPES.map((entry) => entry.value),
);

const updateVehicleSchema = z.object({
  vehicleId: z.string().uuid(),
  slug: z.string().min(1),
  vin: z.string().min(3),
  licensePlate: z.string().optional(),
  make: z.string().min(1),
  model: z.string().min(1),
  variant: z.string().optional(),
  year: z.string().optional(),
  bodyType: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  engineCapacity: z.string().optional(),
  mileage: z.string().optional(),
  colorExterior: z.string().optional(),
  colorInterior: z.string().optional(),
  status: z.enum(VEHICLE_STATUSES),
  features: z.string().optional(),
});

const uploadVehicleDocumentsSchema = z.object({
  vehicleId: z.string().uuid(),
  slug: z.string().min(1),
});

const uploadVehicleImagesSchema = z.object({
  vehicleId: z.string().uuid(),
  slug: z.string().min(1),
});

const deleteVehicleImageSchema = z.object({
  vehicleId: z.string().uuid(),
  imageId: z.string().uuid(),
  slug: z.string().min(1),
});

const deleteVehicleSchema = z.object({
  vehicleId: z.string().uuid(),
  slug: z.string().min(1),
});

const updateVehicleImageMetaSchema = z.object({
  vehicleId: z.string().uuid(),
  imageId: z.string().uuid(),
  slug: z.string().min(1),
  label: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable(),
  setPrimary: z.boolean().optional(),
});

const updateVehicleDocumentSchema = z.object({
  vehicleId: z.string().uuid(),
  documentId: z.string().uuid(),
  slug: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .optional(),
  type: z.string().optional(),
});

const deleteVehicleDocumentSchema = z.object({
  vehicleId: z.string().uuid(),
  documentId: z.string().uuid(),
  slug: z.string().min(1),
});

type CreateOperationsCarInput = z.infer<typeof createVehicleSchema>;

export type CreateOperationsCarResult =
  | { data: OpsCarRecord; error?: undefined }
  | { data?: undefined; error: string };

export type UploadVehicleDocumentsResult =
  | { success: true; uploaded: number }
  | { success: false; error: string };

export type UploadVehicleImagesResult =
  | { success: true; uploaded: number }
  | { success: false; error: string };

type DeleteVehicleImageInput = z.infer<typeof deleteVehicleImageSchema>;
type UpdateVehicleImageMetaInput = z.infer<typeof updateVehicleImageMetaSchema>;
type UpdateVehicleDocumentInput = z.infer<typeof updateVehicleDocumentSchema>;
type DeleteVehicleDocumentInput = z.infer<typeof deleteVehicleDocumentSchema>;

export type DeleteVehicleImageResult =
  | { success: true }
  | { success: false; error: string };

type DeleteOperationsCarInput = z.infer<typeof deleteVehicleSchema>;

export type DeleteOperationsCarResult =
  | { success: true }
  | { success: false; error: string };

export type VerifyVehicleDeletionResult =
  | { canDelete: true }
  | { canDelete: false; reason?: string };

export type UpdateVehicleImageMetaResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateVehicleDocumentResult =
  | { success: true }
  | { success: false; error: string };

export type DeleteVehicleDocumentResult =
  | { success: true }
  | { success: false; error: string };

function parseYear(value?: string) {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1900) return null;
  return parsed;
}

function parseMileage(value?: string) {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDecimal(value?: string) {
  if (!value) return null;
  const normalized = value.replace(/[^0-9,\.\-]/g, "").replace(/,/g, ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeString(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createOperationsCar(
  input: CreateOperationsCarInput,
): Promise<CreateOperationsCarResult> {
  const parsed = createVehicleSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Введите корректные данные автомобиля." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { vin, make, model, year, bodyType, mileage, fuelType, transmission } = parsed.data;
  const normalizedVin = typeof vin === "string" ? vin.trim().toUpperCase() : "";
  const vinValue = normalizedVin.length > 0 ? normalizedVin : null;
  const normalizedMake = make.trim().replace(/\s+/g, " ");
  const normalizedModel = model.trim().replace(/\s+/g, " ");
  const normalizedBodyType = bodyType
    ? bodyType.trim().replace(/\s+/g, " ")
    : null;
  const normalizedFuel = fuelType ? fuelType.trim().replace(/\s+/g, " ") : null;
  const normalizedTransmission = transmission ? transmission.trim().replace(/\s+/g, " ") : null;
  const displayName = `${normalizedMake} ${normalizedModel}`.trim();

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        vin: vinValue,
        make: normalizedMake,
        model: normalizedModel,
        year: parseYear(year),
        body_type: normalizedBodyType,
        fuel_type: normalizedFuel,
        transmission: normalizedTransmission,
        mileage: parseMileage(mileage),
        status: "available",
      })
      .select("id, vin, license_plate, make, model, variant, year, body_type, mileage, status")
      .single();

    if (error) {
      console.error("[operations] failed to insert vehicle", error);
      return { error: "Не удалось сохранить автомобиль." };
    }

    for (const path of getWorkspacePaths("cars")) {
      revalidatePath(path);
    }

    const vehicleId = data.id ?? normalizedVin;
    const detailSlug =
      buildSlugWithId(displayName, vehicleId) ||
      buildSlugWithId(normalizedVin, vehicleId) ||
      vehicleId;
    const statusKey = typeof data.status === "string" ? data.status : "available";
    const statusMeta = OPS_VEHICLE_STATUS_META[statusKey] ?? OPS_VEHICLE_STATUS_META.available;
    const mileageValue = data.mileage != null ? Number(data.mileage) : null;
    const parsedMileageLabel =
      mileageValue != null
        ? `${mileageValue.toLocaleString("en-US", { maximumFractionDigits: 0 })} km`
        : (() => {
            const parsedMileage = parseMileage(mileage);
            return parsedMileage != null
              ? `${parsedMileage.toLocaleString("en-US", { maximumFractionDigits: 0 })} km`
              : "0 km";
          })();

    const licensePlateValue =
      typeof data.license_plate === "string" ? data.license_plate : null;
    const normalizedLicensePlate = normalizeString(licensePlateValue ?? undefined);

    const formatted: OpsCarRecord = {
      id: vehicleId,
      vin: (data.vin as string | null) ?? normalizedVin,
      licensePlate: normalizedLicensePlate,
      licensePlateDisplay: normalizedLicensePlate,
      name: `${data.make ?? normalizedMake} ${data.model ?? normalizedModel}`.trim(),
      make: data.make ?? normalizedMake,
      model: data.model ?? normalizedModel,
      variant: data.variant ?? null,
      year: data.year != null ? Number(data.year) : parseYear(year),
      bodyType: (data.body_type as string | null) ?? normalizedBodyType,
      status: statusKey,
      statusLabel: statusMeta.label,
      statusTone: statusMeta.tone,
      mileage: parsedMileageLabel,
      mileageValue,
      activeDealNumber: null,
      activeDealStatus: null,
      activeDealStatusLabel: null,
      activeDealStatusTone: null,
      activeDealHref: null,
      detailHref: `/ops/cars/${detailSlug}`,
      type: (data.body_type as string | null) ?? normalizedBodyType ?? null,
    };

    return { data: formatted };
  } catch (error) {
    console.error("[operations] unexpected error while creating vehicle", error);
    return { error: "Произошла ошибка при добавлении автомобиля." };
  }
}

export type UpdateOperationsCarInput = z.infer<typeof updateVehicleSchema>;

export type UpdateOperationsCarResult =
  | { success: true; slug: string }
  | { success: false; error: string };

export async function updateOperationsCar(
  input: UpdateOperationsCarInput,
): Promise<UpdateOperationsCarResult> {
  const parsed = updateVehicleSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid vehicle update payload", parsed.error.flatten());
    return { success: false, error: "Проверьте введённые данные и попробуйте снова." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const {
    vehicleId,
    slug,
    vin,
    licensePlate,
    make,
    model,
    variant,
    year,
    bodyType,
    fuelType,
    transmission,
    engineCapacity,
    mileage,
    colorExterior,
    colorInterior,
    status,
    features,
  } = parsed.data;

  const normalizedVin = vin.trim().toUpperCase();
  const normalizedMake = make.trim();
  const normalizedModel = model.trim();
  const slugSource = `${normalizedMake} ${normalizedModel}`.trim() || normalizedVin;
  const vehicleSlug = buildSlugWithId(slugSource, vehicleId) || slug;

  const featureLines = features
    ? features
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [];

  const normalizedLicensePlate = normalizeString(licensePlate);

  const vehicleUpdatePayload = {
    vin: normalizedVin,
    license_plate: normalizedLicensePlate,
    make: normalizedMake,
    model: normalizedModel,
    variant: normalizeString(variant),
    year: parseYear(year),
    body_type: normalizeString(bodyType),
    fuel_type: normalizeString(fuelType),
    transmission: normalizeString(transmission),
    engine_capacity: parseDecimal(engineCapacity),
    mileage: parseMileage(mileage),
    color_exterior: normalizeString(colorExterior),
    color_interior: normalizeString(colorInterior),
    status,
    features: featureLines.length > 0 ? featureLines : null,
  };

  try {
    const supabase = await createSupabaseServerClient();

    const { error: vehicleUpdateError } = await supabase
      .from("vehicles")
      .update(vehicleUpdatePayload)
      .eq("id", vehicleId);

    if (vehicleUpdateError) {
      console.error("[operations] failed to update vehicle", vehicleUpdateError);
      return { success: false, error: "Не удалось сохранить изменения автомобиля." };
    }

    for (const path of getWorkspacePaths("cars")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/cars/${slug}`);
    if (vehicleSlug !== slug) {
      revalidatePath(`/ops/cars/${vehicleSlug}`);
    }

    return { success: true, slug: vehicleSlug };
  } catch (error) {
    console.error("[operations] unexpected vehicle update error", error);
    return { success: false, error: "Произошла ошибка при сохранении. Попробуйте позже." };
  }
}

export async function uploadVehicleDocuments(
  formData: FormData,
): Promise<UploadVehicleDocumentsResult> {
  const base = {
    vehicleId: formData.get("vehicleId"),
    slug: formData.get("slug"),
  } satisfies Record<string, unknown>;

  const parsed = uploadVehicleDocumentsSchema.safeParse(base);

  if (!parsed.success) {
    console.warn("[operations] invalid vehicle document upload payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { vehicleId, slug } = parsed.data;

  const documentsMap = new Map<
    number,
    { type?: VehicleDocumentTypeValue | ""; file?: FileLike | null; title?: string }
  >();

  for (const [key, value] of formData.entries()) {
    const match = /^documents\[(\d+)\]\[(type|file|title)\]$/.exec(key);
    if (!match) continue;

    const index = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(index)) continue;

    const existing = documentsMap.get(index) ?? {};
    if (match[2] === "type" && typeof value === "string") {
      existing.type = value as VehicleDocumentTypeValue | "";
    }
    if (match[2] === "file" && isFileLike(value)) {
      existing.file = value;
    }
    if (match[2] === "title" && typeof value === "string") {
      existing.title = value;
    }
    documentsMap.set(index, existing);
  }

  const rawDocuments = Array.from(documentsMap.values());

  const hasIncompleteDocument = rawDocuments.some((entry) => {
    const hasType = Boolean(entry.type);
    const hasFile = isFileLike(entry.file) && entry.file.size > 0;
    const requiresTitle = entry.type === "other";
    const hasTitle = typeof entry.title === "string" && entry.title.trim().length > 0;
    return (
      (hasType && !hasFile) ||
      (hasFile && !hasType) ||
      (requiresTitle && hasFile && !hasTitle)
    );
  });

  if (hasIncompleteDocument) {
    return { success: false, error: "Заполните тип и выберите файл для каждого документа." };
  }

  const documents = rawDocuments.filter((entry): entry is {
    type: VehicleDocumentTypeValue;
    file: FileLike;
    title?: string;
  } => {
    if (!entry.type || !entry.file) {
      return false;
    }
    if (!VEHICLE_DOCUMENT_TYPE_VALUES.has(entry.type)) {
      return false;
    }
    if (
      entry.type === "other" &&
      (typeof entry.title !== "string" || entry.title.trim().length === 0)
    ) {
      return false;
    }
    return entry.file.size > 0;
  });

  if (documents.length === 0) {
    return { success: true, uploaded: 0 };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    const uploadedBy = authData?.user?.id ?? null;

    const candidates: DocumentUploadCandidate<VehicleDocumentTypeValue>[] = documents.map((doc) => {
      const trimmedTitle = (doc.title ?? "").trim();
      const fallbackName = getFileName(doc.file) || "vehicle-document";
      const defaultTitle =
        doc.type === "other"
          ? trimmedTitle || fallbackName
          : VEHICLE_DOCUMENT_TYPE_LABEL_MAP[doc.type] ?? fallbackName;

      return {
        type: doc.type,
        file: doc.file,
        title: defaultTitle,
        metadata: trimmedTitle ? { custom_title: trimmedTitle } : undefined,
      };
    });

    const uploadResult = await uploadDocumentsBatch<VehicleDocumentTypeValue>(candidates, {
      supabase,
      bucket: VEHICLE_DOCUMENT_BUCKET,
      table: "vehicle_documents",
      entityColumn: "vehicle_id",
      entityId: vehicleId,
      allowedTypes: VEHICLE_DOCUMENT_TYPE_VALUES,
      typeLabelMap: VEHICLE_DOCUMENT_TYPE_LABEL_MAP,
      uploadedBy,
      logPrefix: "[operations] vehicle document",
      messages: {
        upload: "Не удалось загрузить документ.",
        insert: "Документ не сохранился. Попробуйте ещё раз.",
      },
    });

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    for (const path of getWorkspacePaths("cars")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/cars/${slug}`);

    return { success: true, uploaded: uploadResult.uploaded };
  } catch (error) {
    console.error("[operations] unexpected error while uploading vehicle documents", error);
    return { success: false, error: "Произошла ошибка при загрузке документа." };
  }
}

export async function uploadVehicleImages(formData: FormData): Promise<UploadVehicleImagesResult> {
  const base = {
    vehicleId: formData.get("vehicleId"),
    slug: formData.get("slug"),
  } satisfies Record<string, unknown>;

  const parsed = uploadVehicleImagesSchema.safeParse(base);

  if (!parsed.success) {
    console.warn("[operations] invalid vehicle image upload payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные загрузки изображений." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { vehicleId, slug } = parsed.data;

  const imageEntries = formData
    .getAll("images")
    .filter(
      (entry): entry is File =>
        typeof File !== "undefined" && entry instanceof File && isFileLike(entry),
    );

  const images = imageEntries.filter((file) => file.size > 0);

  if (images.length === 0) {
    return { success: true, uploaded: 0 };
  }

  const invalidFile = images.find((file) => {
    if (file.size > VEHICLE_IMAGE_MAX_SIZE) {
      return true;
    }
    if (!file.type || !VEHICLE_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
      return true;
    }
    return false;
  });

  if (invalidFile) {
    const sizeLimitMb = Math.round(VEHICLE_IMAGE_MAX_SIZE / (1024 * 1024));
    return {
      success: false,
      error: `Поддерживаются только изображения (JPEG, PNG, WEBP, GIF) размером до ${sizeLimitMb} МБ.`,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServiceClient();

    const ensureBucketExists = async (): Promise<boolean> => {
      try {
        const { data: bucketInfo, error: bucketLookupError } = await serviceClient.storage.getBucket(
          VEHICLE_IMAGE_BUCKET,
        );
        if (bucketInfo && !bucketLookupError) {
          return true;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes("not found")) {
          console.warn("[operations] unable to verify vehicle image bucket", error);
          return false;
        }
      }

      const { error: bucketCreateError } = await serviceClient.storage.createBucket(
        VEHICLE_IMAGE_BUCKET,
        {
          public: false,
          fileSizeLimit: VEHICLE_IMAGE_MAX_SIZE,
        },
      );

      if (bucketCreateError && bucketCreateError.message?.toLowerCase().includes("already exists")) {
        return true;
      }

      if (bucketCreateError) {
        console.error("[operations] failed to create vehicle image bucket", bucketCreateError);
        return false;
      }

      return true;
    };

    const bucketReady = await ensureBucketExists();
    if (!bucketReady) {
      return { success: false, error: "Не удалось подготовить хранилище для изображений." };
    }

    const { data: existingImages, error: existingError } = await supabase
      .from("vehicle_images")
      .select("id, is_primary, sort_order")
      .eq("vehicle_id", vehicleId);

    if (existingError) {
      console.error("[operations] failed to load existing vehicle images", existingError);
      return { success: false, error: "Не удалось проверить текущее состояние галереи." };
    }

    const hasPrimaryImage = (existingImages ?? []).some((image) => Boolean(image?.is_primary));
    let nextSortOrder =
      (existingImages ?? []).reduce((acc, image) => {
        const sortOrder = Number(image?.sort_order ?? 0);
        return Number.isFinite(sortOrder) ? Math.max(acc, sortOrder) : acc;
      }, 0) ?? 0;

    let uploadedCount = 0;
    const uploadedPaths: string[] = [];

    for (const file of images) {
      const baseName = getFileName(file) || "image";
      const sanitizedName = sanitizeFileName(baseName);
      const uniqueSuffix =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const objectPath = `${vehicleId}/${uniqueSuffix}-${sanitizedName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const attemptUpload = async () => {
        const { error: uploadError } = await supabase.storage
          .from(VEHICLE_IMAGE_BUCKET)
          .upload(objectPath, buffer, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });
        return uploadError;
      };

      let uploadError = await attemptUpload();

      if (uploadError?.message?.toLowerCase().includes("bucket not found")) {
        const bucketCreated = await ensureBucketExists();
        if (!bucketCreated) {
          return { success: false, error: "Не удалось подготовить хранилище для изображений." };
        }
        uploadError = await attemptUpload();
      }

      if (uploadError) {
        console.error("[operations] failed to upload vehicle image", uploadError);
        if (uploadedPaths.length > 0) {
          await supabase.storage.from(VEHICLE_IMAGE_BUCKET).remove(uploadedPaths);
        }
        return { success: false, error: "Не удалось загрузить изображения. Попробуйте ещё раз." };
      }

      nextSortOrder += 1;
      const shouldSetPrimary = !hasPrimaryImage && uploadedCount === 0;

      const { error: insertError } = await supabase.from("vehicle_images").insert({
        vehicle_id: vehicleId,
        storage_path: objectPath,
        label: sanitizedName,
        is_primary: shouldSetPrimary,
        sort_order: nextSortOrder,
      });

      if (insertError) {
        console.error("[operations] failed to insert vehicle image record", insertError);
        await supabase.storage.from(VEHICLE_IMAGE_BUCKET).remove([objectPath, ...uploadedPaths]);
        return { success: false, error: "Изображение не сохранилось. Попробуйте ещё раз." };
      }

      uploadedCount += 1;
      uploadedPaths.push(objectPath);
    }

    for (const path of getWorkspacePaths("cars")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/cars/${slug}`);

    return { success: true, uploaded: uploadedCount };
  } catch (error) {
    console.error("[operations] unexpected error while uploading vehicle images", error);
    return { success: false, error: "Произошла ошибка при загрузке изображений." };
  }
}

export async function updateVehicleImageMeta(
  input: UpdateVehicleImageMetaInput,
): Promise<UpdateVehicleImageMetaResult> {
  const parsed = updateVehicleImageMetaSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid vehicle image meta payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для обновления изображения." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { vehicleId, imageId, slug, label, setPrimary } = parsed.data;
  const nextLabel = (() => {
    if (label === undefined) {
      return undefined;
    }
    if (label === null) {
      return null;
    }
    const trimmed = label.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();

  try {
    const serviceClient = await createSupabaseServiceClient();

    if (nextLabel !== undefined) {
      const { error: labelError } = await serviceClient
        .from("vehicle_images")
        .update({ label: nextLabel })
        .eq("id", imageId)
        .eq("vehicle_id", vehicleId);

      if (labelError) {
        console.error("[operations] failed to update vehicle image label", labelError);
        return { success: false, error: "Не удалось обновить подпись изображения." };
      }
    }

    if (setPrimary) {
      const { error: resetError } = await serviceClient
        .from("vehicle_images")
        .update({ is_primary: false })
        .eq("vehicle_id", vehicleId);

      if (resetError) {
        console.error("[operations] failed to reset vehicle image primary flags", resetError);
        return { success: false, error: "Не удалось обновить основное изображение." };
      }

      const { error: primaryError } = await serviceClient
        .from("vehicle_images")
        .update({ is_primary: true })
        .eq("vehicle_id", vehicleId)
        .eq("id", imageId);

      if (primaryError) {
        console.error("[operations] failed to set primary vehicle image", primaryError);
        return { success: false, error: "Не удалось назначить основное изображение." };
      }
    }

    if (nextLabel !== undefined || setPrimary) {
      for (const path of getWorkspacePaths("cars")) {
        revalidatePath(path);
      }
      revalidatePath(`/ops/cars/${slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while updating vehicle image metadata", error);
    return { success: false, error: "Произошла ошибка при обновлении изображения." };
  }
}

export async function deleteVehicleImage(
  input: DeleteVehicleImageInput,
): Promise<DeleteVehicleImageResult> {
  const parsed = deleteVehicleImageSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid vehicle image delete payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для удаления изображения." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { vehicleId, imageId, slug } = parsed.data;

  try {
    const serviceClient = await createSupabaseServiceClient();

    const { data: imageRecord, error: lookupError } = await serviceClient
      .from("vehicle_images")
      .select("id, storage_path")
      .eq("id", imageId)
      .eq("vehicle_id", vehicleId)
      .maybeSingle();

    if (lookupError) {
      console.error("[operations] failed to load vehicle image before deletion", lookupError);
      return { success: false, error: "Не удалось найти изображение автомобиля." };
    }

    if (!imageRecord) {
      return { success: false, error: "Изображение уже удалено или не найдено." };
    }

    const storagePath =
      typeof imageRecord.storage_path === "string" && imageRecord.storage_path.length > 0
        ? imageRecord.storage_path
        : null;

    if (storagePath) {
      const { error: storageError } = await serviceClient.storage
        .from(VEHICLE_IMAGE_BUCKET)
        .remove([storagePath]);

      if (storageError && !storageError.message?.toLowerCase().includes("not found")) {
        console.error("[operations] failed to remove vehicle image file", storageError);
        return { success: false, error: "Не удалось удалить файл изображения. Попробуйте позже." };
      }
    }

    const { error: deleteError } = await serviceClient
      .from("vehicle_images")
      .delete()
      .eq("id", imageId)
      .eq("vehicle_id", vehicleId);

    if (deleteError) {
      console.error("[operations] failed to delete vehicle image record", deleteError);
      return { success: false, error: "Не удалось удалить изображение из галереи." };
    }

    for (const path of getWorkspacePaths("cars")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/cars/${slug}`);

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while deleting vehicle image", error);
    return { success: false, error: "Произошла ошибка при удалении изображения." };
  }
}

export async function updateVehicleDocument(
  input: UpdateVehicleDocumentInput,
): Promise<UpdateVehicleDocumentResult> {
  const parsed = updateVehicleDocumentSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid vehicle document update payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для обновления документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { vehicleId, documentId, slug, title, type } = parsed.data;

  const normalizedType = type ? normalizeVehicleDocumentType(type) : undefined;

  if (type && !normalizedType) {
    return { success: false, error: "Выберите корректный тип документа." };
  }

  const updates: Record<string, unknown> = {};

  if (title !== undefined) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { success: false, error: "Название документа не может быть пустым." };
    }
    updates.title = trimmedTitle;
  }

  if (type !== undefined) {
    updates.document_type = normalizedType ?? type;
  }

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  try {
    const serviceClient = await createSupabaseServiceClient();

    const { error: updateError } = await serviceClient
      .from("vehicle_documents")
      .update(updates)
      .eq("id", documentId)
      .eq("vehicle_id", vehicleId);

    if (updateError) {
      console.error("[operations] failed to update vehicle document", updateError);
      return { success: false, error: "Не удалось сохранить изменения документа." };
    }

    for (const path of getWorkspacePaths("cars")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/cars/${slug}`);

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while updating vehicle document", error);
    return { success: false, error: "Произошла ошибка при обновлении документа." };
  }
}

export async function deleteVehicleDocument(
  input: DeleteVehicleDocumentInput,
): Promise<DeleteVehicleDocumentResult> {
  const parsed = deleteVehicleDocumentSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid vehicle document delete payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для удаления документа." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { vehicleId, documentId, slug } = parsed.data;

  try {
    const serviceClient = await createSupabaseServiceClient();

    const { data: documentRecord, error: lookupError } = await serviceClient
      .from("vehicle_documents")
      .select("id, storage_path")
      .eq("id", documentId)
      .eq("vehicle_id", vehicleId)
      .maybeSingle();

    if (lookupError) {
      console.error("[operations] failed to load vehicle document before deletion", lookupError);
      return { success: false, error: "Не удалось найти документ автомобиля." };
    }

    if (!documentRecord) {
      return { success: false, error: "Документ уже удалён или не найден." };
    }

    const storagePath =
      typeof documentRecord.storage_path === "string" && documentRecord.storage_path.length > 0
        ? documentRecord.storage_path
        : null;

    if (storagePath) {
      const { error: storageError } = await serviceClient.storage
        .from(VEHICLE_DOCUMENT_BUCKET)
        .remove([storagePath]);

      if (storageError && !storageError.message?.toLowerCase().includes("not found")) {
        console.error("[operations] failed to remove vehicle document file", storageError);
        return { success: false, error: "Не удалось удалить файл документа." };
      }
    }

    const { error: deleteError } = await serviceClient
      .from("vehicle_documents")
      .delete()
      .eq("id", documentId)
      .eq("vehicle_id", vehicleId);

    if (deleteError) {
      console.error("[operations] failed to delete vehicle document", deleteError);
      return { success: false, error: "Не удалось удалить запись документа." };
    }

    for (const path of getWorkspacePaths("cars")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/cars/${slug}`);

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while deleting vehicle document", error);
    return { success: false, error: "Произошла ошибка при удалении документа." };
  }
}

export async function verifyVehicleDeletion(
  input: DeleteOperationsCarInput,
): Promise<VerifyVehicleDeletionResult> {
  const parsed = deleteVehicleSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid vehicle deletion check payload", parsed.error.flatten());
    return { canDelete: false, reason: "Некорректные данные для проверки удаления." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { canDelete: false, reason: READ_ONLY_ACCESS_MESSAGE };
  }

  const { vehicleId } = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();

    const { count: dealsCount, error: dealsError } = await supabase
      .from("deals")
      .select("id", { head: true, count: "exact" })
      .eq("vehicle_id", vehicleId);

    if (dealsError) {
      console.error("[operations] failed to check vehicle deals", dealsError);
      return { canDelete: false, reason: "Не удалось проверить связанные сделки. Попробуйте позже." };
    }

    if ((dealsCount ?? 0) > 0) {
      return { canDelete: false, reason: "Удаление невозможно: автомобиль привязан к активным или историческим сделкам." };
    }

    return { canDelete: true };
  } catch (error) {
    console.error("[operations] unexpected error while checking vehicle deletion", error);
    return { canDelete: false, reason: "Произошла ошибка при проверке возможности удаления." };
  }
}

export async function deleteOperationsCar(
  input: DeleteOperationsCarInput,
): Promise<DeleteOperationsCarResult> {
  const parsed = deleteVehicleSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid vehicle delete payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для удаления автомобиля." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { vehicleId, slug } = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();

    const { count: dealsCount, error: dealsError } = await supabase
      .from("deals")
      .select("id", { head: true, count: "exact" })
      .eq("vehicle_id", vehicleId);

    if (dealsError) {
      console.error("[operations] failed to check vehicle deals before deletion", dealsError);
      return { success: false, error: "Не удалось проверить связанные сделки. Попробуйте позже." };
    }

    if ((dealsCount ?? 0) > 0) {
      return { success: false, error: "Нельзя удалить автомобиль с привязанными сделками." };
    }

    const { data: docs, error: docsError } = await supabase
      .from("vehicle_documents")
      .select("storage_path")
      .eq("vehicle_id", vehicleId);

    if (docsError) {
      console.warn("[operations] failed to load vehicle documents before deletion", docsError);
    }

    const storagePaths = (docs ?? [])
      .map((doc) => (typeof doc?.storage_path === "string" ? doc.storage_path : null))
      .filter((path): path is string => Boolean(path));

    const serviceClient = await createSupabaseServiceClient();

    if (storagePaths.length > 0) {
      const { error: storageError } = await serviceClient.storage
        .from(VEHICLE_DOCUMENT_BUCKET)
        .remove(storagePaths);

      if (storageError) {
        console.warn("[operations] failed to remove vehicle document files", storageError);
      }
    }

    const { error: deleteError } = await serviceClient
      .from("vehicles")
      .delete()
      .eq("id", vehicleId);

    if (deleteError) {
      console.error("[operations] failed to delete vehicle", deleteError);
      return { success: false, error: "Не удалось удалить автомобиль." };
    }

    for (const path of getWorkspacePaths("cars")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/cars/${slug}`);

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while deleting vehicle", error);
    return { success: false, error: "Произошла ошибка при удалении автомобиля." };
  }
}
