"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { OPS_VEHICLE_STATUS_META, type OpsCarRecord } from "@/lib/supabase/queries/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspacePaths } from "@/lib/workspace/routes";

const inputSchema = z.object({
  name: z.string().min(1),
  vin: z.string().min(1),
  year: z.string().optional(),
  type: z.string().optional(),
  price: z.string().optional(),
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

const updateVehicleSchema = z.object({
  vehicleId: z.string().uuid(),
  slug: z.string().min(1),
  vin: z.string().min(3),
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
  purchasePrice: z.string().optional(),
  currentValue: z.string().optional(),
  residualValue: z.string().optional(),
  features: z.string().optional(),
  telematics: z
    .object({
      odometer: z.string().optional(),
      batteryHealth: z.string().optional(),
      fuelLevel: z.string().optional(),
      location: z
        .array(z.object({ key: z.string().optional(), value: z.string().optional() }))
        .optional(),
      tirePressure: z
        .array(z.object({ key: z.string().optional(), value: z.string().optional() }))
        .optional(),
    })
    .optional(),
});

type CreateOperationsCarInput = z.infer<typeof inputSchema>;

export type CreateOperationsCarResult =
  | { data: OpsCarRecord; error?: undefined }
  | { data?: undefined; error: string };

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseYear(value?: string) {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1900) return null;
  return parsed;
}

function parseCurrency(value?: string) {
  if (!value) return null;
  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
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

function buildKeyValue(entries?: Array<{ key?: string | null; value?: string | null }>) {
  const record: Record<string, string | number> = {};
  if (!entries) {
    return record;
  }
  for (const entry of entries) {
    const key = entry.key?.trim();
    if (!key) continue;
    const valueRaw = entry.value?.trim();
    if (!valueRaw) continue;
    const numeric = parseDecimal(valueRaw);
    if (numeric != null) {
      record[key] = numeric;
    } else {
      record[key] = valueRaw;
    }
  }
  return record;
}

export async function createOperationsCar(
  input: CreateOperationsCarInput,
): Promise<CreateOperationsCarResult> {
  const parsed = inputSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Введите корректные данные автомобиля." };
  }

  const { name, vin, year, type, price, mileage } = parsed.data;
  const normalizedName = name.trim().replace(/\s+/g, " ");
  const [make, ...rest] = normalizedName.split(" ");
  const model = rest.join(" ") || make;
  const normalizedVin = vin.trim().toUpperCase();

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        vin: normalizedVin,
        make,
        model,
        year: parseYear(year),
        body_type: type?.trim() || null,
        current_value: parseCurrency(price),
        mileage: parseMileage(mileage),
        status: "available",
      })
      .select("id, vin, make, model, variant, year, body_type, current_value, mileage")
      .single();

    if (error) {
      console.error("[operations] failed to insert vehicle", error);
      return { error: "Не удалось сохранить автомобиль." };
    }

    for (const path of getWorkspacePaths("cars")) {
      revalidatePath(path);
    }

    const detailSlug = toSlug(normalizedName) || toSlug(normalizedVin) || "vehicle";
    const statusMeta = OPS_VEHICLE_STATUS_META.available;
    const priceValue = data.current_value != null ? Number(data.current_value) : null;
    const mileageValue = data.mileage != null ? Number(data.mileage) : null;
    const formatted: OpsCarRecord = {
      id: data.id ?? `${normalizedVin}`,
      vin: data.vin ?? normalizedVin,
      name: `${data.make ?? make} ${data.model ?? model}`.trim(),
      make: data.make ?? make,
      model: data.model ?? model,
      variant: data.variant ?? null,
      year: data.year ?? parseYear(year) ?? null,
      bodyType: (data.body_type as string) ?? type ?? null,
      status: "available",
      statusLabel: statusMeta.label,
      statusTone: statusMeta.tone,
      price: priceValue != null
        ? `AED ${priceValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
        : price || "—",
      priceValue,
      mileage: mileageValue != null
        ? `${mileageValue.toLocaleString("en-US", { maximumFractionDigits: 0 })} km`
        : mileage || "0 km",
      mileageValue,
      activeDealNumber: null,
      activeDealStatus: null,
      activeDealStatusLabel: null,
      activeDealStatusTone: null,
      activeDealHref: null,
      detailHref: `/ops/cars/${detailSlug}`,
      type: (data.body_type as string) ?? type ?? "—",
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

  const {
    vehicleId,
    slug,
    vin,
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
    purchasePrice,
    currentValue,
    residualValue,
    features,
    telematics,
  } = parsed.data;

  const normalizedVin = vin.trim().toUpperCase();
  const normalizedMake = make.trim();
  const normalizedModel = model.trim();
  const vehicleSlug = toSlug(`${normalizedMake} ${normalizedModel}`) || slug;

  const telematicsLocationPayload = buildKeyValue(telematics?.location);
  const telematicsTirePayload = buildKeyValue(telematics?.tirePressure);

  const featureLines = features
    ? features
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [];

  const vehicleUpdatePayload = {
    vin: normalizedVin,
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
    purchase_price: parseCurrency(purchasePrice),
    current_value: parseCurrency(currentValue),
    residual_value: parseCurrency(residualValue),
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

    const telematicsPayload = {
      vehicle_id: vehicleId,
      odometer: parseMileage(telematics?.odometer),
      battery_health: parseDecimal(telematics?.batteryHealth),
      fuel_level: parseDecimal(telematics?.fuelLevel),
      tire_pressure: Object.keys(telematicsTirePayload).length > 0 ? telematicsTirePayload : null,
      location: Object.keys(telematicsLocationPayload).length > 0 ? telematicsLocationPayload : null,
      last_reported_at: telematics?.odometer || telematics?.batteryHealth || telematics?.fuelLevel
        ? new Date().toISOString()
        : null,
    };

    const shouldUpdateTelematics =
      telematicsPayload.odometer != null ||
      telematicsPayload.battery_health != null ||
      telematicsPayload.fuel_level != null ||
      (telematicsPayload.tire_pressure != null && Object.keys(telematicsPayload.tire_pressure).length > 0) ||
      (telematicsPayload.location != null && Object.keys(telematicsPayload.location).length > 0);

    if (shouldUpdateTelematics) {
      if (!telematicsPayload.last_reported_at) {
        telematicsPayload.last_reported_at = new Date().toISOString();
      }
      const { error: telematicsError } = await supabase
        .from("vehicle_telematics")
        .upsert(telematicsPayload, { onConflict: "vehicle_id" });

      if (telematicsError) {
        console.error("[operations] failed to upsert vehicle telematics", telematicsError);
        return { success: false, error: "Не удалось сохранить данные телематики." };
      }
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
