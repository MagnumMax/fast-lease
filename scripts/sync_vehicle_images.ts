import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const USER_AGENT = "fast-lease-image-sync/1.0 (+mailto:care@fastlease.ae)";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type VehicleRecord = {
  id: string;
  make: string | null;
  model: string | null;
  variant: string | null;
  year: number | null;
};

type WikipediaSummary = {
  originalimage?: { source?: string };
  thumbnail?: { source?: string };
};

function normalizeQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSlug(parts: Array<string | null | undefined>): string {
  const raw = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) =>
      part
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase(),
    )
    .filter(Boolean);
  return raw.join("-");
}

async function fetchWikipediaImage(query: string): Promise<{ url: string; buffer: Buffer }> {
  const slug = query.replace(/\s+/g, "_");
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;

  const summaryResponse = await fetch(summaryUrl, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!summaryResponse.ok) {
    throw new Error(`Wikipedia summary request failed (${summaryResponse.status} ${summaryResponse.statusText})`);
  }
  const summary = (await summaryResponse.json()) as WikipediaSummary;
  const imageUrl = summary.originalimage?.source ?? summary.thumbnail?.source;
  if (!imageUrl) {
    throw new Error("No image URL returned in Wikipedia summary response.");
  }

  const imageResponse = await fetch(imageUrl, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!imageResponse.ok) {
    throw new Error(`Image download failed (${imageResponse.status} ${imageResponse.statusText})`);
  }
  const arrayBuffer = await imageResponse.arrayBuffer();
  return { url: imageUrl, buffer: Buffer.from(arrayBuffer) };
}

async function ensureBucketExists(bucketId: string): Promise<void> {
  const { data, error: getError } = await supabase.storage.getBucket(bucketId);
  if (data) {
    console.log(`[storage] Bucket '${bucketId}' exists.`);
    return;
  }

  if (getError && (getError.status === 404 || /not found/i.test(getError.message ?? ""))) {
    console.log(`[storage] Bucket '${bucketId}' not found, attempting to create...`);
    const { error: createError } = await supabase.storage.createBucket(bucketId, {
      public: true,
      fileSizeLimit: 20 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (createError) {
      throw createError;
    }
    console.log(`[storage] Bucket '${bucketId}' created.`);
  } else if (getError) {
    throw getError;
  }
}

async function upsertVehicleImage(vehicleId: string, storagePath: string, metadata: Record<string, unknown>) {
  const { data: existing, error: selectError } = await supabase
    .from("vehicle_images")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("is_primary", true)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("vehicle_images")
      .update({
        storage_path: storagePath,
        label: "Exterior",
        metadata,
      })
      .eq("id", existing.id);
    if (updateError) {
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabase.from("vehicle_images").insert({
      vehicle_id: vehicleId,
      storage_path: storagePath,
      label: "Exterior",
      is_primary: true,
      sort_order: 1,
      metadata,
    });
    if (insertError) {
      throw insertError;
    }
  }
}

async function syncVehicleImages() {
  await ensureBucketExists("vehicles");

  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("id, make, model, variant, year")
    .order("make", { ascending: true });

  if (error) {
    throw error;
  }

  if (!vehicles || vehicles.length === 0) {
    console.log("No vehicles found.");
    return;
  }

  for (const vehicle of vehicles as VehicleRecord[]) {
    const displayName = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
    const queryParts = [vehicle.make ?? "", vehicle.model ?? ""];
    if (vehicle.variant) {
      queryParts.push(vehicle.variant);
    }
    if (vehicle.year) {
      queryParts.push(String(vehicle.year));
    }

    const query = normalizeQuery(queryParts.join(" "));
    if (!query) {
      console.warn(`[skip] Vehicle ${vehicle.id} has insufficient data for query.`);
      continue;
    }

    console.log(`[fetch] ${displayName} -> "${query}"`);

    try {
      const { url, buffer } = await fetchWikipediaImage(query);
      const slug = buildSlug([vehicle.make, vehicle.model, vehicle.variant]) || vehicle.id;
      const objectPath = `${slug}/hero.jpg`;
      const storagePath = `vehicles/${objectPath}`;

      console.log(`[upload] Uploading ${displayName} to storage path ${storagePath}`);

      const { error: uploadError } = await supabase.storage
        .from("vehicles")
        .upload(objectPath, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      await upsertVehicleImage(vehicle.id, storagePath, {
        source: "wikipedia",
        fetchedAt: new Date().toISOString(),
        imageUrl: url,
        query,
      });

      console.log(`[done] Stored image for ${displayName}`);
    } catch (err) {
      console.error(`[error] Failed processing vehicle ${displayName}:`, err);
    }
  }
}

syncVehicleImages()
  .then(() => {
    console.log("Vehicle image sync completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Vehicle image sync failed.", err);
    process.exit(1);
  });
