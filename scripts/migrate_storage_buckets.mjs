#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

async function loadEnv(filePath = ".env.local") {
  try {
    const content = await fs.readFile(path.resolve(filePath), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!key) continue;
      let value = rest.join("=").trim();
      if (!value) continue;
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key.trim()] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function normalizeStoragePath(p) {
  if (!p) return null;
  return p.replace(/^\/+/, "").replace(/\/+$/g, "").replace(/\/+/g, "/");
}

async function createSupabaseClient() {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "migrate-storage-buckets" } },
  });
}

async function ensureBucketExists(supabase, bucket, options = {}) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (data?.some((item) => item.name === bucket)) return;
  const { error: createError } = await supabase.storage.createBucket(bucket, options);
  if (createError && !createError.message?.toLowerCase().includes("already exists")) {
    throw createError;
  }
}

async function downloadObject(supabase, bucket, storagePath) {
  const pathNormalized = normalizeStoragePath(storagePath);
  if (!pathNormalized) return null;
  const { data, error } = await supabase.storage.from(bucket).download(pathNormalized);
  if (error) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  return { buffer, contentType: data.type || undefined };
}

async function uploadObject(supabase, bucket, storagePath, buffer, contentType) {
  const pathNormalized = normalizeStoragePath(storagePath);
  if (!pathNormalized) throw new Error("Invalid target path");
  const { error } = await supabase.storage
    .from(bucket)
    .upload(pathNormalized, buffer, { contentType, upsert: true });
  if (error) throw error;
}

async function removeObject(supabase, bucket, storagePath) {
  const pathNormalized = normalizeStoragePath(storagePath);
  if (!pathNormalized) return;
  await supabase.storage.from(bucket).remove([pathNormalized]);
}

const PRIVATE_DOCUMENT_BUCKET_OPTIONS = {
  public: false,
  fileSizeLimit: 52_428_800, // 50 MB
  allowedMimeTypes: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

function splitStoragePath(storagePath) {
  const normalized = normalizeStoragePath(storagePath);
  if (!normalized) {
    return { dir: "", name: "" };
  }
  const idx = normalized.lastIndexOf("/");
  if (idx === -1) {
    return { dir: "", name: normalized };
  }
  return {
    dir: normalized.slice(0, idx),
    name: normalized.slice(idx + 1),
  };
}

async function objectExists(supabase, bucket, storagePath) {
  const normalized = normalizeStoragePath(storagePath);
  if (!normalized) return false;
  const { dir, name } = splitStoragePath(normalized);
  try {
    const { data } = await supabase.storage
      .from(bucket)
      .list(dir, { limit: 1000, search: name });
    return data?.some((item) => item.name === name) ?? false;
  } catch (error) {
    const message = String(error?.message ?? "").toLowerCase();
    if (message.includes("not found")) {
      return false;
    }
    throw error;
  }
}

async function fetchAllRows({ supabase, table, columns, orderBy = "id" }) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (orderBy) {
      query = query.order(orderBy, { ascending: true, nullsFirst: true });
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += data.length;
  }

  return rows;
}

async function migrateDocumentTable({
  supabase,
  table,
  targetBucket,
  orderColumn = "uploaded_at",
  fallbackBuckets = ["deal-documents"],
  dryRun = false,
  keepSource = false,
  label = table,
}) {
  await ensureBucketExists(supabase, targetBucket, PRIVATE_DOCUMENT_BUCKET_OPTIONS);

  console.info(`\n📂 Migrating ${label} → bucket "${targetBucket}"`);

  const rows = await fetchAllRows({
    supabase,
    table,
    columns: "id, storage_path",
    orderBy: orderColumn,
  });

  console.info(`   найдено записей: ${rows.length}`);

  let migrated = 0;
  let alreadyPresent = 0;
  let skipped = 0;
  let missing = 0;
  let removed = 0;
  let errors = 0;

  for (const row of rows) {
    const storagePath = normalizeStoragePath(row.storage_path);
    if (!storagePath) {
      skipped += 1;
      continue;
    }

    let existsInTarget = false;
    try {
      existsInTarget = await objectExists(supabase, targetBucket, storagePath);
    } catch (error) {
      errors += 1;
      console.error(`❌ [${label}] failed to check target for ${storagePath}:`, error.message ?? error);
      continue;
    }

    if (existsInTarget) {
      alreadyPresent += 1;
      if (!keepSource) {
        for (const bucket of fallbackBuckets) {
          if (bucket === targetBucket) continue;
          try {
            const existsInSource = await objectExists(supabase, bucket, storagePath);
            if (!existsInSource) continue;
            if (dryRun) {
              console.info(`DRY-RUN: would remove ${bucket}/${storagePath}`);
            } else {
              await removeObject(supabase, bucket, storagePath);
            }
            removed += 1;
          } catch (error) {
            errors += 1;
            console.error(`❌ [${label}] failed to cleanup ${bucket}/${storagePath}:`, error.message ?? error);
          }
        }
      }
      continue;
    }

    let download = null;
    let sourceBucket = null;
    for (const bucket of fallbackBuckets) {
      if (bucket === targetBucket) continue;
      download = await downloadObject(supabase, bucket, storagePath);
      if (download) {
        sourceBucket = bucket;
        break;
      }
    }

    if (!download) {
      missing += 1;
      console.warn(`⚠️ [${label}] file not found in source buckets for path: ${storagePath}`);
      continue;
    }

    if (dryRun) {
      console.info(`DRY-RUN: would copy ${sourceBucket}/${storagePath} -> ${targetBucket}/${storagePath}`);
      migrated += 1;
      continue;
    }

    try {
      await uploadObject(supabase, targetBucket, storagePath, download.buffer, download.contentType);
      migrated += 1;
    } catch (error) {
      errors += 1;
      console.error(`❌ [${label}] failed to upload to ${targetBucket}/${storagePath}:`, error.message ?? error);
      continue;
    }

    if (!keepSource && sourceBucket) {
      try {
        await removeObject(supabase, sourceBucket, storagePath);
        removed += 1;
      } catch (error) {
        errors += 1;
        console.error(`❌ [${label}] failed to remove ${sourceBucket}/${storagePath}:`, error.message ?? error);
      }
    }
  }

  console.info(`   перенесено: ${migrated}`);
  console.info(`   уже в целевом бакете: ${alreadyPresent}`);
  console.info(`   пропущено (нет пути): ${skipped}`);
  console.info(`   не найдено в исходных бакетах: ${missing}`);
  if (!keepSource) {
    console.info(`   удалено из исходных бакетов: ${removed}`);
  }
  if (errors > 0) {
    console.info(`   ошибок: ${errors}`);
  }
}

async function migrateVehicleDocumentObjects({ supabase, dryRun = false, keepSource = false }) {
  await migrateDocumentTable({
    supabase,
    table: "vehicle_documents",
    targetBucket: "vehicle-documents",
    orderColumn: "uploaded_at",
    fallbackBuckets: ["deal-documents", "documents"],
    dryRun,
    keepSource,
    label: "vehicle_documents",
  });
}

async function migrateClientDocumentObjects({ supabase, dryRun = false, keepSource = false }) {
  await migrateDocumentTable({
    supabase,
    table: "client_documents",
    targetBucket: "client-documents",
    orderColumn: "uploaded_at",
    fallbackBuckets: ["deal-documents", "documents"],
    dryRun,
    keepSource,
    label: "client_documents",
  });
}

async function migrateDealDocuments({ supabase, aggregatedFiles, dryRun = false }) {
  const legacyPrefixes = [
    (dealId, fileName) => `${dealId}/${fileName}`,
    (dealId, fileName) => `${dealId}/${fileName}`.replace(/^\/+/, ""),
    (dealId, fileName) => `deals/${dealId}/${fileName}`,
    (dealId, fileName) => `deals/documents/${dealId}/${fileName}`,
    (dealId, fileName) => `deals/deals/${dealId}/${fileName}`,
    (dealId, fileName) => `deals/deals/documents/${dealId}/${fileName}`,
  ];

  let migrated = 0;
  let skippedExisting = 0;
  let notFound = 0;
  let errors = 0;

  for (const filePath of aggregatedFiles) {
    const raw = await fs.readFile(filePath, "utf8");
    const aggregated = JSON.parse(raw);
    const dealId = aggregated.deal_id;
    if (!dealId) {
      console.warn(`⚠️ aggregated file ${filePath} missing deal_id`);
      continue;
    }

    const documents = aggregated.documents ?? [];
    for (const doc of documents) {
      const targets = [
        { path: doc.storage?.pdf ?? null, mime: "application/pdf" },
        { path: doc.storage?.json ?? null, mime: "application/json" },
      ];

      for (const target of targets) {
        if (!target.path) continue;
        const normalizedTarget = normalizeStoragePath(target.path);
        if (!normalizedTarget) continue;

        if (!dryRun) {
          const { data: existing, error: headError } = await supabase.storage
            .from("deal-documents")
            .list(path.dirname(normalizedTarget), { limit: 100, search: path.basename(normalizedTarget) });
          if (!headError && existing?.some((item) => item.name === path.basename(normalizedTarget))) {
            skippedExisting += 1;
            continue;
          }
        }

        const fileName = path.basename(normalizedTarget);
        let sourceBuffer = null;
        let sourcePathUsed = null;

        for (const builder of legacyPrefixes) {
          const candidate = builder(dealId, fileName);
          const download = await downloadObject(supabase, "deals", candidate);
          if (download) {
            sourceBuffer = download;
            sourcePathUsed = candidate;
            break;
          }
        }

        if (!sourceBuffer) {
          notFound += 1;
          console.warn(`⚠️ legacy deal file not found for ${dealId} -> ${fileName}`);
          continue;
        }

        if (dryRun) {
          console.info(`DRY-RUN: would copy deals/${sourcePathUsed} -> deal-documents/${normalizedTarget}`);
          migrated += 1;
          continue;
        }

        try {
          await uploadObject(supabase, "deal-documents", normalizedTarget, sourceBuffer.buffer, sourceBuffer.contentType);
          await removeObject(supabase, "deals", sourcePathUsed);
          migrated += 1;
        } catch (error) {
          errors += 1;
          console.error(`❌ Failed to migrate ${sourcePathUsed} -> ${normalizedTarget}:`, error.message ?? error);
        }
      }
    }

    if (!dryRun) {
      const aggregatedPath = `${dealId}/aggregated.json`;
      try {
        await uploadObject(
          supabase,
          "deal-documents",
          aggregatedPath,
          Buffer.from(JSON.stringify(aggregated, null, 2), "utf8"),
          "application/json",
        );
      } catch (error) {
        console.error(`❌ Failed to upload aggregated for ${dealId}:`, error.message ?? error);
      }
    }
  }

  console.info("📦 Deal documents migration summary:");
  console.info(`   migrated: ${migrated}`);
  console.info(`   skipped (already existed): ${skippedExisting}`);
  console.info(`   not found: ${notFound}`);
  if (errors > 0) {
    console.info(`   errors: ${errors}`);
  }
}

async function migrateContracts({ supabase, dryRun = false }) {
  let migrated = 0;
  let errors = 0;

  const { data: contractFolders } = await supabase.storage.from("documents").list("contracts", { limit: 1000 });
  for (const folder of contractFolders ?? []) {
    if (!folder.name) continue;
    const { data: files } = await supabase.storage.from("documents").list(`contracts/${folder.name}`, { limit: 1000 });
    for (const file of files ?? []) {
      if (!file.name) continue;
      const sourcePath = `contracts/${folder.name}/${file.name}`;
      const targetPath = `contracts/${folder.name}/${file.name}`;
      const download = await downloadObject(supabase, "documents", sourcePath);
      if (!download) {
        console.warn(`⚠️ Contract file missing: ${sourcePath}`);
        continue;
      }
      if (dryRun) {
        console.info(`DRY-RUN: would copy documents/${sourcePath} -> deal-documents/${targetPath}`);
        migrated += 1;
        continue;
      }
      try {
        await uploadObject(supabase, "deal-documents", targetPath, download.buffer, download.contentType);
        await removeObject(supabase, "documents", sourcePath);
        migrated += 1;
      } catch (error) {
        errors += 1;
        console.error(`❌ Failed to migrate contract ${sourcePath}:`, error.message ?? error);
      }
    }
  }

  console.info("📑 Contracts migration summary:");
  console.info(`   migrated: ${migrated}`);
  if (errors > 0) {
    console.info(`   errors: ${errors}`);
  }
}

async function migratePortfolioReports({ supabase, dryRun = false }) {
  await ensureBucketExists(supabase, "investor-reports", { public: false });

  const { data: files } = await supabase.storage.from("documents").list("portfolio", { limit: 1000 });
  let migrated = 0;
  for (const file of files ?? []) {
    if (!file.name) continue;
    const sourcePath = `portfolio/${file.name}`;
    const targetPath = `portfolio/${file.name}`;
    const download = await downloadObject(supabase, "documents", sourcePath);
    if (!download) {
      console.warn(`⚠️ Portfolio file missing: ${sourcePath}`);
      continue;
    }
    if (dryRun) {
      console.info(`DRY-RUN: would copy documents/${sourcePath} -> investor-reports/${targetPath}`);
      migrated += 1;
      continue;
    }
    await uploadObject(supabase, "investor-reports", targetPath, download.buffer, download.contentType);
    await removeObject(supabase, "documents", sourcePath);
    migrated += 1;
  }

  console.info("📈 Portfolio reports migration summary:");
  console.info(`   migrated: ${migrated}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const argSet = new Set(argv);
  const dryRun = argSet.has("--dry-run");
  const keepSource = argSet.has("--keep-source");
  const skipVehicles = argSet.has("--skip-vehicles");
  const skipClients = argSet.has("--skip-clients");
  const runLegacy = argSet.has("--legacy");

  const supabase = await createSupabaseClient();

  console.info(dryRun ? "🔎 Dry-run migration" : "🚚 Starting storage migration");

  if (!skipVehicles) {
    await migrateVehicleDocumentObjects({ supabase, dryRun, keepSource });
  } else {
    console.info("⏭️ Skipping vehicle_documents (flag --skip-vehicles)");
  }

  if (!skipClients) {
    await migrateClientDocumentObjects({ supabase, dryRun, keepSource });
  } else {
    console.info("⏭️ Skipping client_documents (flag --skip-clients)");
  }

  if (runLegacy) {
    await ensureBucketExists(supabase, "deal-documents", { public: false });
    let aggregatedFiles = [];
    try {
      aggregatedFiles = (await fs.readdir("datasets"))
        .filter((name) => name.startsWith("aggregated-") && name.endsWith(".json"))
        .map((name) => path.join("datasets", name));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    if (aggregatedFiles.length === 0) {
      console.info("ℹ️ Legacy aggregated datasets not found, skipping deal documents migration");
    } else {
      await migrateDealDocuments({ supabase, aggregatedFiles, dryRun });
    }

    await migrateContracts({ supabase, dryRun });
    await migratePortfolioReports({ supabase, dryRun });
  } else {
    console.info("⏭️ Skipping legacy migrations (use --legacy to enable)");
  }

  console.info("✅ Migration process finished");
}

main().catch((error) => {
  console.error("❌ Migration failed", error);
  process.exitCode = 1;
});
