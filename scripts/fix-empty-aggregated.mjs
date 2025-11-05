#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";

const UUID_NAMESPACE = uuidv5.URL;
const CONFIG_PATH = "configs/drive_ingest.yaml";
const DEALS_BUCKET = "deal-documents";
const LOCAL_DATASETS_DIR = path.resolve("datasets");
const LOCAL_DEALS_ROOT = path.resolve("datasets/deals");

function parseCliArgs(argv) {
  const options = {
    only: new Set(),
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--only") {
      const value = argv[i + 1];
      if (value) {
        value.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => options.only.add(item));
      }
      i += 1;
    } else if (arg === "--force") {
      options.force = true;
    }
  }

  return options;
}

async function loadEnvFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8").catch(() => null);
  if (!raw) return;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    let value = rest.join("=");
    if (!value) continue;
    value = value.trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key.trim()] = value;
  }
}

async function buildSupabaseClient() {
  await loadEnvFile(path.resolve(".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, serviceKey, {
    global: {
      headers: {
        "X-Client-Info": "fix-empty-aggregated",
      },
    },
  });
}

async function listLocalDealFolders() {
  const entries = await fs.readdir(LOCAL_DEALS_ROOT, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(`Local deals root not found: ${LOCAL_DEALS_ROOT}`);
    }
    throw error;
  });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function resolveDealId(folderName) {
  return uuidv5(folderName, UUID_NAMESPACE);
}

function aggregatedPathCandidates(dealId) {
  const candidates = new Set([
    `${dealId}/aggregated.json`,
    `documents/${dealId}/aggregated.json`,
    `deals/${dealId}/aggregated.json`,
    `deals/documents/${dealId}/aggregated.json`,
    `deals/deals/${dealId}/aggregated.json`,
    `deals/deals/documents/${dealId}/aggregated.json`,
  ]);
  return Array.from(candidates);
}

async function downloadAggregatedJson(supabase, dealId) {
  const candidatePaths = aggregatedPathCandidates(dealId);
  for (const storagePath of candidatePaths) {
    const { data, error } = await supabase.storage.from(DEALS_BUCKET).download(storagePath);
    if (error) {
      continue;
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    try {
      const json = JSON.parse(buffer.toString("utf8"));
      return { json, buffer, storagePath };
    } catch (parseError) {
      return { error: new Error(`Invalid JSON at ${storagePath}: ${parseError.message}`) };
    }
  }
  return { error: new Error("aggregated.json not found in storage") };
}

function hasGeminiPayload(json) {
  if (!json || typeof json !== "object") return false;
  const gemini = json.gemini;
  if (!gemini || typeof gemini !== "object") return false;
  return Object.keys(gemini).length > 0;
}

function hasVehicleVin(json) {
  const gemini = json?.gemini;
  if (!gemini || typeof gemini !== "object") return false;
  const vehicle = gemini.vehicle;
  if (!vehicle || typeof vehicle !== "object") return false;
  return Boolean(vehicle.vin || vehicle.chassis_number);
}

async function ensureAggregatedRemoved(supabase, dealId, { maxAttempts = 3, existingPath } = {}) {
  const pathSet = new Set(aggregatedPathCandidates(dealId));
  if (existingPath) {
    pathSet.add(existingPath);
  }
  const paths = Array.from(pathSet);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { error } = await supabase.storage.from(DEALS_BUCKET).remove(paths);
    if (error) {
      console.warn(`⚠️ Attempt ${attempt}: failed to remove aggregated variants for ${dealId}: ${error.message}`);
    }

    let stillExists = false;
    for (const path of paths) {
      const { error: downloadError } = await supabase.storage.from(DEALS_BUCKET).download(path);
      if (!downloadError) {
        stillExists = true;
        break;
      }
    }

    if (!stillExists) {
      return;
    }

    console.warn(`⚠️ aggregated.json still present for ${dealId}, retrying removal (attempt ${attempt}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw new Error(`Failed to remove aggregated.json for ${dealId} after ${maxAttempts} attempts`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
    child.on("error", reject);
  });
}

async function saveAggregatedLocally(dealId, buffer) {
  await fs.mkdir(LOCAL_DATASETS_DIR, { recursive: true });
  const localPath = path.join(LOCAL_DATASETS_DIR, `aggregated-${dealId}.json`);
  await fs.writeFile(localPath, buffer);
  return localPath;
}

async function detectDealsNeedingRegeneration(supabase, folderNames, { force = false, filters = new Set() } = {}) {
  const needsRegeneration = [];
  for (const folderName of folderNames) {
    const dealId = resolveDealId(folderName);
    const inFilter = filters.size === 0 || filters.has(folderName) || filters.has(dealId);
    if (!inFilter) {
      continue;
    }

    const result = await downloadAggregatedJson(supabase, dealId);
    if (result.error) {
      needsRegeneration.push({ dealId, folderName, reason: result.error.message });
      continue;
    }
    if (force) {
      needsRegeneration.push({ dealId, folderName, reason: "force reprocessing requested", storagePath: result.storagePath });
      continue;
    }
    if (!hasGeminiPayload(result.json)) {
      needsRegeneration.push({ dealId, folderName, reason: "missing gemini payload", storagePath: result.storagePath });
      continue;
    }
    if (!hasVehicleVin(result.json)) {
      needsRegeneration.push({ dealId, folderName, reason: "missing vehicle VIN", storagePath: result.storagePath });
    }
  }
  return needsRegeneration;
}

async function regenerateDeal({ dealId, folderName, storagePath }, supabase, { maxAttempts = 3 } = {}) {
  console.info(`\n🚧 Processing deal ${dealId} (${folderName})`);

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (attempt > 1) {
        console.info(`🔁 Retry ${attempt}/${maxAttempts} for ${dealId}`);
      }

      await ensureAggregatedRemoved(supabase, dealId, { maxAttempts: 5, existingPath: storagePath });

      await runCommand(process.execPath, [
        "scripts/ingest_local_deals.mjs",
        "--config",
        CONFIG_PATH,
        "--only",
        folderName,
      ], {
        env: {
          ...process.env,
          INGEST_CHUNK_SIZE: process.env.INGEST_CHUNK_SIZE ?? "2",
          INGEST_MAX_OUTPUT_TOKENS: process.env.INGEST_MAX_OUTPUT_TOKENS ?? "6000",
        },
        cwd: process.cwd(),
      });

      const regenerated = await downloadAggregatedJson(supabase, dealId);
      if (regenerated.error) {
        throw new Error(`Failed to download regenerated aggregated.json: ${regenerated.error.message}`);
      }
      if (!hasGeminiPayload(regenerated.json)) {
        throw new Error("Regenerated aggregated.json still missing gemini payload");
      }
      if (!hasVehicleVin(regenerated.json)) {
        throw new Error("Regenerated aggregated.json missing vehicle VIN");
      }

      const localPath = await saveAggregatedLocally(dealId, regenerated.buffer);

      await runCommand(process.execPath, [
        "scripts/import_deal_from_aggregated.mjs",
        "--file",
        localPath,
        "--apply",
      ], { env: process.env, cwd: process.cwd() });

      return { localPath };
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed for ${dealId}: ${error.message}`);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  throw lastError ?? new Error(`Failed to regenerate deal ${dealId}`);
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const supabase = await buildSupabaseClient();

  const folderNames = await listLocalDealFolders();
  if (folderNames.length === 0) {
    console.info("No local deal folders found.");
    return;
  }

  const targetFolders = options.only.size
    ? folderNames.filter((name) => options.only.has(name) || options.only.has(resolveDealId(name)))
    : folderNames;

  console.info(`📂 Detected ${targetFolders.length} local deal folders${options.only.size ? " (filtered)" : ""}`);

  const candidates = await detectDealsNeedingRegeneration(supabase, targetFolders, {
    force: options.force,
    filters: options.only,
  });

  if (candidates.length === 0) {
    console.info("✅ All aggregated.json files contain gemini payload with VIN. Nothing to do.");
    return;
  }

  console.info(`🛠️ Deals requiring regeneration: ${candidates.length}`);
  for (const { dealId, folderName, reason } of candidates) {
    console.info(`   - ${dealId} (${folderName}) → ${reason}`);
  }

  const summary = {
    processed: [],
    failed: [],
    skipped: [],
  };

  for (const candidate of candidates) {
    if (candidate.reason && candidate.reason.includes("VIN")) {
      summary.skipped.push({ ...candidate, reason: candidate.reason });
      console.warn(`⏭️ Skipping ${candidate.dealId} (${candidate.folderName}) — ${candidate.reason}`);
      continue;
    }
    try {
      const result = await regenerateDeal(candidate, supabase);
      summary.processed.push({ ...candidate, localPath: result.localPath });
      console.info(`✅ Completed regeneration for ${candidate.dealId}`);
    } catch (error) {
      summary.failed.push({ ...candidate, error: error.message });
      console.error(`❌ Failed to regenerate ${candidate.dealId}: ${error.message}`);
    }
  }

  console.info("\n📊 Regeneration summary:");
  console.info(`   ✅ Successful: ${summary.processed.length}`);
  console.info(`   ❌ Failed: ${summary.failed.length}`);
  console.info(`   ⏭️ Skipped: ${summary.skipped.length}`);

  if (summary.processed.length > 0) {
    console.info("\n   Updated deals:");
    for (const item of summary.processed) {
      console.info(`      • ${item.dealId} (${item.folderName}) → ${path.relative(process.cwd(), item.localPath)}`);
    }
  }

  if (summary.skipped.length > 0) {
    console.info("\n   Skipped deals:");
    for (const item of summary.skipped) {
      console.info(`      • ${item.dealId} (${item.folderName}) → ${item.reason}`);
    }
  }

  if (summary.failed.length > 0) {
    console.info("\n   Failed deals:");
    for (const item of summary.failed) {
      console.info(`      • ${item.dealId} (${item.folderName}) → ${item.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
