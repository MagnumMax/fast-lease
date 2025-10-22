"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { OpsCarRecord } from "@/lib/supabase/queries/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  name: z.string().min(1),
  vin: z.string().min(1),
  year: z.string().optional(),
  type: z.string().optional(),
  price: z.string().optional(),
  mileage: z.string().optional(),
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
      .select("vin, make, model, year, body_type, current_value, mileage")
      .single();

    if (error) {
      console.error("[operations] failed to insert vehicle", error);
      return { error: "Не удалось сохранить автомобиль." };
    }

    revalidatePath("/ops/cars");

    const formatted: OpsCarRecord = {
      vin: data.vin ?? normalizedVin,
      name: `${data.make ?? make} ${data.model ?? model}`.trim(),
      year: data.year ?? parseYear(year) ?? new Date().getFullYear(),
      type: (data.body_type as string) ?? type ?? "Luxury SUV",
      price: data.current_value
        ? `AED ${Number(data.current_value).toLocaleString("en-US")}`
        : price || "—",
      mileage:
        data.mileage != null
          ? `${Number(data.mileage).toLocaleString("en-US")} km`
          : mileage || "0 km",
      battery: "100%",
      detailHref: `/ops/cars/${toSlug(normalizedName) || "vehicle"}`,
    };

    return { data: formatted };
  } catch (error) {
    console.error("[operations] unexpected error while creating vehicle", error);
    return { error: "Произошла ошибка при добавлении автомобиля." };
  }
}
