#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";

const UUID_NAMESPACE = uuidv5.URL;
const CONFIG_PATH = "configs/drive_ingest.yaml";
const DEALS_BUCKET = "deals";
const LOCAL_DATASETS_DIR = path.resolve("datasets");
const LOCAL_DEALS_ROOT = path.resolve("datasets/deals");

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
  return [
    `${dealId}/aggregated.json`,
    `/${dealId}/aggregated.json`,
    `documents/${dealId}/aggregated.json`,
    `/documents/${dealId}/aggregated.json`,
    `deals/${dealId}/aggregated.json`,
    `/deals/${dealId}/aggregated.json`,
    `deals/documents/${dealId}/aggregated.json`,
    `/deals/documents/${dealId}/aggregated.json`,
    `deals/deals/${dealId}/aggregated.json`,
    `deals/deals/documents/${dealId}/aggregated.json`,
  ];
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

async function removeExistingAggregated(supabase, dealId) {
  const paths = aggregatedPathCandidates(dealId);
  const { error } = await supabase.storage.from(DEALS_BUCKET).remove(paths);
  if (error) {
    console.warn(`⚠️ Failed to remove existing aggregated.json variants for ${dealId}: ${error.message}`);
  }
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

async function detectDealsNeedingRegeneration(supabase, folderNames) {
  const needsRegeneration = [];
  for (const folderName of folderNames) {
    const dealId = resolveDealId(folderName);
    const result = await downloadAggregatedJson(supabase, dealId);
    if (result.error) {
      needsRegeneration.push({ dealId, folderName, reason: result.error.message });
      continue;
    }
    if (!hasGeminiPayload(result.json)) {
      needsRegeneration.push({ dealId, folderName, reason: "missing gemini payload" });
      continue;
    }
    if (!hasVehicleVin(result.json)) {
      needsRegeneration.push({ dealId, folderName, reason: "missing vehicle VIN" });
    }
  }
  return needsRegeneration;
}

async function regenerateDeal({ dealId, folderName }, supabase) {
  console.info(`\n🚧 Processing deal ${dealId} (${folderName})`);

  await removeExistingAggregated(supabase, dealId);

  await runCommand(process.execPath, [
    "scripts/ingest_local_deals.mjs",
    "--config",
    CONFIG_PATH,
    "--only",
    folderName,
  ], { env: process.env, cwd: process.cwd() });

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
}

async function main() {
  const supabase = await buildSupabaseClient();

  const folderNames = await listLocalDealFolders();
  if (folderNames.length === 0) {
    console.info("No local deal folders found.");
    return;
  }

  console.info(`📂 Detected ${folderNames.length} local deal folders`);

  const candidates = await detectDealsNeedingRegeneration(supabase, folderNames);

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
  };

  for (const candidate of candidates) {
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

  if (summary.processed.length > 0) {
    console.info("\n   Updated deals:");
    for (const item of summary.processed) {
      console.info(`      • ${item.dealId} (${item.folderName}) → ${path.relative(process.cwd(), item.localPath)}`);
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
