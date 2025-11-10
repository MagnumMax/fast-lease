#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const DATASETS_DIR = path.resolve("datasets");
const FILE_REGEX = /^aggregated-([0-9a-fA-F-]+)\.json$/;
const INSURANCE_REGEX = /(insurance|policy)/i;

async function listAggregatedFiles() {
  const entries = await fs.readdir(DATASETS_DIR);
  return entries.filter((name) => FILE_REGEX.test(name));
}

function toDealId(filename, json) {
  if (json?.deal_id) {
    return json.deal_id;
  }
  const match = filename.match(FILE_REGEX);
  return match ? match[1] : null;
}

function hasInsuranceKeyword(value) {
  if (!value) return false;
  return INSURANCE_REGEX.test(value);
}

function normalizeTimestamp(value) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

async function main() {
  const files = await listAggregatedFiles();
  const results = [];

  for (const filename of files) {
    const fullPath = path.join(DATASETS_DIR, filename);
    const content = await fs.readFile(fullPath, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️ Skipping ${filename}: ${error.message}`);
      continue;
    }

    const dealId = toDealId(filename, parsed);
    if (!dealId) {
      console.warn(`⚠️ Could not determine deal_id for ${filename}`);
      continue;
    }

    const documents = Array.isArray(parsed.documents) ? parsed.documents : [];
    for (const doc of documents) {
      const haystack = [doc.filename, doc.analysis?.document_type, doc.analysis?.title]
        .filter(Boolean)
        .join(" ");
      if (!hasInsuranceKeyword(haystack)) {
        continue;
      }

      const storagePath = doc.storage?.pdf ?? doc.storage?.json ?? null;
      if (!storagePath) {
        continue;
      }

      results.push({
        dealId,
        filename: doc.filename ?? null,
        storagePath,
        category: doc.storage?.category ?? null,
        title: doc.analysis?.title ?? doc.filename ?? "Insurance document",
        documentType: doc.analysis?.document_type ?? "insurance_policy",
        summary: doc.analysis?.summary ?? null,
        sizeBytes: doc.size_bytes ?? null,
        createdTime: normalizeTimestamp(doc.created_time ?? doc.modified_time ?? parsed.created_at ?? new Date()),
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
