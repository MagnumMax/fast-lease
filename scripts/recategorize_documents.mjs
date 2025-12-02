#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";

const UUID_NAMESPACE = uuidv5.URL;
const BUCKET = "deal-documents";
const LOCAL_DATASETS_DIR = path.resolve("datasets");
const LOCAL_DEALS_ROOT = path.resolve("datasets/deals");

const DOCUMENT_CATEGORY_KEYWORDS = {
  client: [
    "passport",
    "emirates id",
    "emirates_id",
    "emirates-id",
    "emiratesid",
    "client id",
    "clientid",
    "driver",
    "license",
    "driving",
    "customer",
    "buyer id",
    "personal",
    "residence",
    "contact",
  ],
  vehicle: [
    "mulkia",
    "vehicle information",
    "vehicle inspection",
    "inspection",
    "passing",
    "gps",
    "registration",
    "license plate",
    "plate",
    "insurance",
    "valuation",
    "certificate",
    "vin",
    "chassis",
    "odometer",
    "service",
    "maintenance",
  ],
  deal: [
    "agreement",
    "contract",
    "schedule",
    "invoice",
    "quotation",
    "addendum",
    "authorization",
    "purchase",
    "loan",
    "term sheet",
    "payment",
    "offer",
  ],
};

function categorizeDocument({ documentType, title, filename }) {
  const source = `${documentType ?? ""} ${title ?? ""} ${filename ?? ""}`.toLowerCase();
  const matches = (category) => DOCUMENT_CATEGORY_KEYWORDS[category].some((keyword) => source.includes(keyword));
  if (matches("client")) return "client";
  if (matches("vehicle")) return "vehicle";
  if (matches("deal")) return "deal";
  if (source.includes("vehicle")) return "vehicle";
  if (source.includes("client")) return "client";
  return "deal";
}

function slugify(filename) {
  return (filename ?? "document").replace(/[^0-9a-zA-Z]+/g, "_") || "document";
}

function normalizeStoragePath(storagePath) {
  if (!storagePath) return null;
  return storagePath.replace(/^\/+/, "").replace(/\/+$/g, "").replace(/\/+/g, "/");
}

async function loadEnv(file = ".env.local") {
  try {
    const content = await fs.readFile(path.resolve(file), "utf8");
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
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function parseArgs(argv) {
  const options = {
    only: new Set(),
    dryRun: false,
    skipImport: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--only") {
      const value = argv[i + 1];
      if (value) {
        value.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => options.only.add(item));
      }
      i += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--skip-import") {
      options.skipImport = true;
    }
  }
  return options;
}

async function createSupabaseClient() {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "recategorize-documents" } },
  });
}

function resolveDealId(folderName) {
  return uuidv5(folderName, UUID_NAMESPACE);
}

function aggregatedPathCandidates(dealId) {
  return [
    `${dealId}/aggregated.json`,
    `documents/${dealId}/aggregated.json`,
    `deals/${dealId}/aggregated.json`,
    `deals/documents/${dealId}/aggregated.json`,
    `deals/deals/${dealId}/aggregated.json`,
    `deals/deals/documents/${dealId}/aggregated.json`,
  ];
}

async function downloadAggregatedJson(supabase, dealId) {
  const candidates = aggregatedPathCandidates(dealId);
  for (const candidate of candidates) {
    const normalized = normalizeStoragePath(candidate);
    const { data, error } = await supabase.storage.from(BUCKET).download(normalized);
    if (error) continue;
    const buffer = Buffer.from(await data.arrayBuffer());
    try {
      const json = JSON.parse(buffer.toString("utf8"));
      return { json, buffer, path: normalized };
    } catch (parseError) {
      return { error: new Error(`Invalid aggregated.json (${normalized}): ${parseError.message}`) };
    }
  }
  const localPath = path.join(LOCAL_DATASETS_DIR, `aggregated-${dealId}.json`);
  try {
    const buffer = await fs.readFile(localPath);
    const json = JSON.parse(buffer.toString("utf8"));
    console.warn(`⚠️ Using local aggregated file for ${dealId}`);
    return { json, buffer, path: `deals/${dealId}/aggregated.json`, source: "local", localPath };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { error: new Error("aggregated.json not found in storage or local datasets") };
    }
    throw error;
  }
}

async function removeAggregatedJson(supabase, dealId) {
  const normalized = aggregatedPathCandidates(dealId).map(normalizeStoragePath);
  const { error } = await supabase.storage.from(BUCKET).remove(normalized);
  if (error && !error.message?.includes("not found")) {
    console.warn(`⚠️ Failed to remove aggregated.json variants for ${dealId}: ${error.message}`);
  }
}

async function moveObject(supabase, fromCandidates, toPath, { dryRun }) {
  const to = normalizeStoragePath(toPath);
  const tried = new Set();
  for (const candidate of fromCandidates) {
    const from = normalizeStoragePath(candidate);
    if (!from || tried.has(from) || from === to) {
      continue;
    }
    tried.add(from);
    if (dryRun) {
      console.info(`DRY-RUN: would move ${from} -> ${to}`);
      return { moved: true };
    }
    await supabase.storage.from(BUCKET).remove([to]);
    const { error } = await supabase.storage.from(BUCKET).move(from, to);
    if (error) {
      if (error.message?.toLowerCase().includes("not found")) {
        continue;
      }
      throw new Error(`Failed to move ${from} -> ${to}: ${error.message}`);
    }
    return { moved: true };
  }
  return { moved: false };
}

async function runImport(localPath, { dryRun }) {
  if (dryRun) {
    console.info(`DRY-RUN: would import ${localPath}`);
    return;
  }
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      "scripts/import_deal_from_aggregated.mjs",
      "--file",
      localPath,
      "--apply",
    ], { stdio: "inherit", env: process.env, cwd: process.cwd() });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`import_deal_from_aggregated failed with code ${code}`));
    });
    child.on("error", reject);
  });
}

function hasVehicleVin(json) {
  const vehicle = json?.gemini?.vehicle;
  if (!vehicle || typeof vehicle !== "object") return false;
  return Boolean(vehicle.vin || vehicle.chassis_number);
}

async function ensureLocalDir() {
  await fs.mkdir(LOCAL_DATASETS_DIR, { recursive: true });
}

async function recategorizeDeal({ dealId, folderName }, supabase, { dryRun, skipImport }) {
  console.info(`\n🚧 Recategorizing documents for deal ${dealId} (${folderName})`);
  const aggregated = await downloadAggregatedJson(supabase, dealId);
  if (aggregated.error) {
    throw aggregated.error;
  }
  const json = aggregated.json;
  let updated = false;

  for (const doc of json.documents ?? []) {
    const category = categorizeDocument({
      documentType: doc.analysis?.document_type,
      title: doc.analysis?.title,
      filename: doc.filename,
    });
    const slug = slugify(doc.filename ?? doc.drive_file_id ?? "document");
    const expectedPdf = `${dealId}/${category}/${slug}.pdf`;
    const expectedJson = `${dealId}/${category}/${slug}.json`;

    const currentPdf = normalizeStoragePath(doc.storage?.pdf);
    const currentJson = normalizeStoragePath(doc.storage?.json);

    const pdfCandidates = new Set();
    const jsonCandidates = new Set();

    if (currentPdf && currentPdf !== normalizeStoragePath(expectedPdf)) {
      pdfCandidates.add(currentPdf);
      pdfCandidates.add(currentPdf.replace(/^deal-documents\//, ""));
      pdfCandidates.add(currentPdf.replace(/^deals\//, ""));
      pdfCandidates.add(currentPdf.replace(/^deals\/documents\//, ""));
      pdfCandidates.add(currentPdf.replace(/^documents\//, ""));
      pdfCandidates.add(currentPdf.replace(/^deals\/deals\//, ""));
      pdfCandidates.add(currentPdf.replace(/^deals\/deals\/documents\//, ""));
      pdfCandidates.add(`${dealId}/${slug}.pdf`);
      pdfCandidates.add(`documents/${dealId}/${slug}.pdf`);
      pdfCandidates.add(`deals/${dealId}/${slug}.pdf`);
      pdfCandidates.add(`deals/${dealId}/documents/${slug}.pdf`);
    }

    if (currentJson && currentJson !== normalizeStoragePath(expectedJson)) {
      jsonCandidates.add(currentJson);
      jsonCandidates.add(currentJson.replace(/^deal-documents\//, ""));
      jsonCandidates.add(currentJson.replace(/^deals\//, ""));
      jsonCandidates.add(currentJson.replace(/^deals\/documents\//, ""));
      jsonCandidates.add(currentJson.replace(/^documents\//, ""));
      jsonCandidates.add(currentJson.replace(/^deals\/deals\//, ""));
      jsonCandidates.add(currentJson.replace(/^deals\/deals\/documents\//, ""));
      jsonCandidates.add(`${dealId}/${slug}.json`);
      jsonCandidates.add(`documents/${dealId}/${slug}.json`);
      jsonCandidates.add(`deals/${dealId}/${slug}.json`);
      jsonCandidates.add(`deals/${dealId}/documents/${slug}.json`);
    }

    doc.storage = doc.storage ?? {};

    if (doc.category !== category) {
      doc.category = category;
      updated = true;
    }
    if (doc.storage?.category !== category) {
      doc.storage = { ...doc.storage, category };
      updated = true;
    }

    let pdfUpdated = false;
    if (pdfCandidates.size > 0) {
      const { moved } = await moveObject(supabase, pdfCandidates, expectedPdf, { dryRun });
      if (moved) {
        doc.storage.pdf = expectedPdf;
        updated = true;
        pdfUpdated = true;
      }
    }
    if (!pdfUpdated && currentPdf) {
      doc.storage.pdf = currentPdf;
    }

    let jsonUpdated = false;
    if (jsonCandidates.size > 0) {
      const { moved } = await moveObject(supabase, jsonCandidates, expectedJson, { dryRun });
      if (moved) {
        doc.storage.json = expectedJson;
        updated = true;
        jsonUpdated = true;
      }
    }
    if (!jsonUpdated && currentJson) {
      doc.storage.json = currentJson;
    }
  }

  const normalizedBasePrefix = `${dealId}`;
  const aggregatedPath = `${dealId}/aggregated.json`;
  if (json.storage?.base_prefix !== normalizedBasePrefix) {
    json.storage = {
      ...(json.storage ?? {}),
      base_prefix: normalizedBasePrefix,
      bucket: BUCKET,
      aggregated_json: aggregatedPath,
    };
    updated = true;
  } else if (json.storage) {
    json.storage.aggregated_json = aggregatedPath;
    json.storage.bucket = BUCKET;
  }

  if (!updated) {
    console.info(`ℹ️ Deal ${dealId} already categorized. Nothing to update.`);
    if (!skipImport && hasVehicleVin(json) && !dryRun) {
      await ensureLocalDir();
      const localPath = path.join(LOCAL_DATASETS_DIR, `aggregated-${dealId}.json`);
      await fs.writeFile(localPath, JSON.stringify(json, null, 2));
      await runImport(localPath, { dryRun });
    }
    return;
  }

  console.info(`🔄 Uploading updated aggregated.json for ${dealId}`);
  const payload = Buffer.from(JSON.stringify(json, null, 2), "utf8");

  if (!dryRun) {
    await removeAggregatedJson(supabase, dealId);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(normalizeStoragePath(aggregatedPath), payload, { contentType: "application/json", upsert: true });
    if (uploadError) {
      throw new Error(`Failed to upload aggregated.json for ${dealId}: ${uploadError.message}`);
    }
  }

  await ensureLocalDir();
  const localPath = path.join(LOCAL_DATASETS_DIR, `aggregated-${dealId}.json`);
  await fs.writeFile(localPath, JSON.stringify(json, null, 2));

  if (!skipImport && hasVehicleVin(json)) {
    await runImport(localPath, { dryRun });
  } else if (!hasVehicleVin(json)) {
    console.warn(`⚠️ Deal ${dealId} missing vehicle VIN. Skipping import.`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = await createSupabaseClient();

  const dirEntries = await fs.readdir(LOCAL_DEALS_ROOT, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(`Local deals root not found: ${LOCAL_DEALS_ROOT}`);
    }
    throw error;
  });

  const folders = dirEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const targets = folders.filter((name) => {
    if (options.only.size === 0) return true;
    const dealId = resolveDealId(name);
    return options.only.has(name) || options.only.has(dealId);
  });

  if (targets.length === 0) {
    console.info("No matching folders found.");
    return;
  }

  console.info(`📂 Recategorizing ${targets.length} deal folders${options.dryRun ? " (dry-run)" : ""}`);

  const summary = {
    processed: [],
    failed: [],
    skipped: [],
  };

  for (const folderName of targets) {
    const dealId = resolveDealId(folderName);
    try {
      await recategorizeDeal({ dealId, folderName }, supabase, options);
      summary.processed.push({ dealId, folderName });
    } catch (error) {
      summary.failed.push({ dealId, folderName, error: error.message });
      console.error(`❌ Failed to recategorize ${dealId}: ${error.message}`);
    }
  }

  console.info("\n📊 Recategorization summary:");
  console.info(`   ✅ Successful: ${summary.processed.length}`);
  console.info(`   ❌ Failed: ${summary.failed.length}`);
  console.info(`   ⏭️ Skipped: ${summary.skipped.length}`);

  if (summary.failed.length > 0) {
    for (const item of summary.failed) {
      console.info(`   • ${item.dealId} (${item.folderName}) → ${item.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
