#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "deal-documents";
const AGGREGATED_FALLBACK_DIR = path.resolve("datasets");
const DEFAULT_LIMIT = Number.POSITIVE_INFINITY;

const INSURANCE_DOC_HINTS = [
  "insurance",
  "policy",
  "tax credit",
  "endorsement",
  "motor",
  "premium",
];

const PAYMENT_FREQUENCY_PATTERNS = [
  { regex: /(monthly|per month|every month)/i, value: "monthly" },
  { regex: /(quarterly|per quarter|every quarter)/i, value: "quarterly" },
  { regex: /(semi-annual|semiannual|twice a year|bi-annual|biannual)/i, value: "semiannual" },
  { regex: /(annual|yearly|per year)/i, value: "annual" },
];

function parseArgs(argv) {
  const options = {
    only: new Set(),
    limit: DEFAULT_LIMIT,
    dryRun: false,
    force: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--only" && argv[i + 1]) {
      argv[i + 1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => options.only.add(value));
      i += 1;
    } else if (arg === "--limit" && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      i += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/ingest_insurance_details_from_documents.mjs [options]\n\n` +
    `Options:\n` +
    `  --only <deal_id,...>   Process only listed deal IDs (comma-separated).\n` +
    `  --limit <n>            Max number of deals to process (default: all).\n` +
    `  --dry-run              Do not write to Supabase, just log actions.\n` +
    `  --force                Override existing insurance_details fields.\n` +
    `  -h, --help             Show this help.\n`);
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
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && value) {
        process.env[key.trim()] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function ensureSupabaseClient() {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.local)");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "insurance-ingest" } },
  });
}

function normalizePath(value) {
  return value?.replace(/^\/+/, "").replace(/\/+/g, "/") ?? null;
}

function aggregatedPathCandidates(dealId) {
  return [
    `${dealId}/aggregated.json`,
    `documents/${dealId}/aggregated.json`,
    `deals/${dealId}/aggregated.json`,
    `deals/documents/${dealId}/aggregated.json`,
    `deals/deals/${dealId}/aggregated.json`,
  ].map(normalizePath);
}

async function downloadAggregatedJson(supabase, dealId) {
  const candidates = aggregatedPathCandidates(dealId);
  for (const candidate of candidates) {
    const { data, error } = await supabase.storage.from(BUCKET).download(candidate);
    if (error) {
      continue;
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    try {
      const json = JSON.parse(buffer.toString("utf8"));
      return { json, path: candidate, source: "storage" };
    } catch (parseError) {
      console.warn(`⚠️ Invalid aggregated.json for ${dealId} (${candidate}): ${parseError.message}`);
    }
  }

  const localFallback = path.join(AGGREGATED_FALLBACK_DIR, `aggregated-${dealId}.json`);
  try {
    const buffer = await fs.readFile(localFallback, "utf8");
    const json = JSON.parse(buffer);
    console.warn(`⚠️ Using local aggregated file for ${dealId}`);
    return { json, path: localFallback, source: "local" };
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`⚠️ Failed to read local aggregated file for ${dealId}: ${error.message}`);
    }
  }

  return { error: new Error(`aggregated.json not found for ${dealId}`) };
}

function isInsuranceDocumentHint(value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return INSURANCE_DOC_HINTS.some((hint) => lower.includes(hint));
}

function classifyDocument(doc) {
  const typeText = [
    doc.analysis?.document_type,
    doc.analysis?.title,
    doc.filename,
    doc.drive_file_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/credit note|tax credit|endorsement|cancellation|refund/.test(typeText)) {
    return "credit";
  }
  if (/invoice|payment request|payment schedule|premium bill/.test(typeText)) {
    return "invoice";
  }
  if (/policy|insurance certificate|motor insurance/.test(typeText)) {
    return "policy";
  }
  if (isInsuranceDocumentHint(typeText)) {
    return "policy";
  }
  return "other";
}

function toNumber(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9,\.\-]/g, "").replace(/,(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return isoMatch[0];
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const reversed = trimmed.replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
  if (reversed !== trimmed) {
    const alt = new Date(reversed);
    if (!Number.isNaN(alt.getTime())) {
      return alt.toISOString().slice(0, 10);
    }
  }

  return null;
}

function pickFieldValue(analysis, matcher) {
  const fields = analysis?.fields ?? [];
  for (const field of fields) {
    if (!field?.key) continue;
    if (matcher.test(field.key)) {
      return field.value ?? null;
    }
  }
  return null;
}

function pickAmount(analysis, matcher) {
  const amounts = analysis?.amounts ?? [];
  for (const amount of amounts) {
    const haystack = `${amount.type ?? ""} ${amount.description ?? ""}`;
    if (matcher.test(haystack)) {
      return toNumber(amount.value);
    }
  }
  return null;
}

function pickDate(analysis, matcher) {
  const dates = analysis?.dates ?? [];
  for (const dateEntry of dates) {
    const haystack = `${dateEntry.type ?? ""} ${dateEntry.label ?? ""}`;
    if (matcher.test(haystack)) {
      return toIsoDate(dateEntry.date ?? dateEntry.value);
    }
  }
  return null;
}

function inferFrequencyFromText(...parts) {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (!text) return null;
  for (const matcher of PAYMENT_FREQUENCY_PATTERNS) {
    if (matcher.regex.test(text)) {
      return matcher.value;
    }
  }
  return null;
}

function mergeNotes(existing, addition) {
  const set = new Set((existing ? existing.split("\n") : []).map((entry) => entry.trim()).filter(Boolean));
  if (addition) {
    const trimmed = addition.trim();
    if (trimmed && !set.has(trimmed)) {
      set.add(trimmed);
    }
  }
  return Array.from(set).join("\n");
}

function extractInsuranceInfoFromDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return null;
  }

  const info = {
    provider: null,
    policyNumber: null,
    policyType: null,
    premiumAmount: null,
    paymentFrequency: null,
    nextPaymentDue: null,
    coverageStart: null,
    coverageEnd: null,
    deductible: null,
    lastPaymentStatus: null,
    lastPaymentDate: null,
    notes: null,
  };

  let hasSignal = false;

  for (const doc of documents) {
    if (!doc?.analysis) continue;
    const classification = classifyDocument(doc);
    if (classification === "other") continue;

    const analysis = doc.analysis;
    const textForFrequency = `${analysis.summary ?? ""} ${analysis.document_type ?? ""}`;
    const inferredFrequency = inferFrequencyFromText(textForFrequency, doc.filename);
    if (inferredFrequency && !info.paymentFrequency) {
      info.paymentFrequency = inferredFrequency;
    }

    if (classification === "policy") {
      hasSignal = true;
      if (!info.provider) {
        const insurerParty = (analysis.parties ?? []).find((party) => {
          const role = `${party.role ?? party.party_type ?? ""}`.toLowerCase();
          return /insur|underwrit|broker/.test(role);
        });
        info.provider = insurerParty?.name ?? null;
      }
      info.policyNumber = info.policyNumber ?? pickFieldValue(analysis, /policy/i);
      info.policyType = info.policyType ?? analysis.document_type ?? pickFieldValue(analysis, /coverage|type/i);
      info.premiumAmount = info.premiumAmount ?? pickAmount(analysis, /premium/i);
      info.deductible = info.deductible ?? pickAmount(analysis, /deductible|excess/i);
      info.coverageStart = info.coverageStart ?? pickDate(analysis, /policy|coverage|start/i);
      info.coverageEnd = info.coverageEnd ?? pickDate(analysis, /policy|coverage|end|expiry/i);
      if (!info.notes && analysis.summary) {
        info.notes = analysis.summary.trim();
      } else if (analysis.summary) {
        info.notes = mergeNotes(info.notes, analysis.summary);
      }
    }

    if (classification === "invoice") {
      hasSignal = true;
      info.nextPaymentDue = info.nextPaymentDue ?? pickDate(analysis, /due|payment/i);
      const invoiceAmount = pickAmount(analysis, /premium|insurance|total/i);
      info.premiumAmount = info.premiumAmount ?? invoiceAmount;
      info.lastPaymentStatus = info.lastPaymentStatus ?? "invoiced";
      const invoiceSummary = analysis.summary ?? `Invoice: ${doc.filename}`;
      info.notes = mergeNotes(info.notes, invoiceSummary);
    }

    if (classification === "credit") {
      hasSignal = true;
      const creditDate = pickDate(analysis, /effective|document|credit|refund/i);
      info.lastPaymentDate = info.lastPaymentDate ?? creditDate;
      info.lastPaymentStatus = info.lastPaymentStatus ?? (analysis.document_type?.toLowerCase().includes("cancellation") ? "cancelled" : "credited");
      info.notes = mergeNotes(info.notes, analysis.summary ?? `Credit note: ${doc.filename}`);
    }
  }

  if (!hasSignal) {
    return null;
  }

  return info;
}

function hasMeaningfulValue(value) {
  if (value == null) return false;
  if (typeof value === "string") {
    return value.trim().length > 0 && value.trim() !== "—";
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  return true;
}

function mergeInsuranceDetails(existing, nextInfo, { force }) {
  const target = existing && typeof existing === "object" ? { ...existing } : {};
  for (const [key, value] of Object.entries(nextInfo)) {
    if (!hasMeaningfulValue(value)) {
      continue;
    }
    const current = target[key];
    const shouldOverwrite = force || !hasMeaningfulValue(current);
    if (shouldOverwrite) {
      target[key] = value;
    }
  }
  return target;
}

async function fetchCandidateDeals(supabase, options) {
  let query = supabase
    .from("deal_documents")
    .select("id, deal_id, document_type, title")
    .or(
      [
        "document_type.ilike.%insurance%",
        "document_type.ilike.%policy%",
        "title.ilike.%insurance%",
        "title.ilike.%policy%",
      ].join(","),
    )
    .order("deal_id", { ascending: true });

  if (options.only.size > 0) {
    query = query.in("deal_id", Array.from(options.only));
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load candidate deal_documents: ${error.message}`);
  }

  const grouped = new Map();
  for (const row of data ?? []) {
    if (!row?.deal_id) continue;
    if (!grouped.has(row.deal_id)) {
      grouped.set(row.deal_id, []);
    }
    grouped.get(row.deal_id).push(row);
  }
  return grouped;
}

async function fetchExistingInsurance(supabase, dealIds) {
  const batches = [];
  const chunkSize = 50;
  const ids = Array.from(dealIds);
  for (let i = 0; i < ids.length; i += chunkSize) {
    batches.push(ids.slice(i, i + chunkSize));
  }

  const results = new Map();
  for (const batch of batches) {
    const { data, error } = await supabase
      .from("deals")
      .select("id, deal_number, insurance_details")
      .in("id", batch);
    if (error) {
      throw new Error(`Failed to load deals metadata: ${error.message}`);
    }
    for (const row of data ?? []) {
      results.set(row.id, {
        dealNumber: row.deal_number,
        insuranceDetails: row.insurance_details ?? null,
      });
    }
  }
  return results;
}

function hasAnyValue(object) {
  if (!object) return false;
  return Object.values(object).some((value) => hasMeaningfulValue(value));
}

async function updateDealInsurance(supabase, dealId, payload) {
  const { error } = await supabase
    .from("deals")
    .update({ insurance_details: payload })
    .eq("id", dealId);
  if (error) {
    throw new Error(`Failed to update deal ${dealId}: ${error.message}`);
  }
}

async function main() {
  const options = parseArgs(process.argv);
  const supabase = await ensureSupabaseClient();
  const candidateMap = await fetchCandidateDeals(supabase, options);

  if (candidateMap.size === 0) {
    console.log("No deal_documents with insurance hints were found.");
    return;
  }

  const limitedDealIds = Array.from(candidateMap.keys()).slice(0, options.limit);
  const metadataMap = await fetchExistingInsurance(supabase, limitedDealIds);

  const summary = {
    processed: 0,
    updated: 0,
    skipped: 0,
    failures: 0,
  };

  for (const dealId of limitedDealIds) {
    summary.processed += 1;
    const dealMeta = metadataMap.get(dealId);
    const label = dealMeta?.dealNumber ? `${dealMeta.dealNumber} (${dealId})` : dealId;
    console.log(`\n▶︎ Processing deal ${label}`);

    const aggregated = await downloadAggregatedJson(supabase, dealId);
    if (aggregated.error) {
      summary.skipped += 1;
      console.warn(`   ⚠️ ${aggregated.error.message}`);
      continue;
    }

    const documents = Array.isArray(aggregated.json?.documents) ? aggregated.json.documents : [];
    const insuranceDocs = documents.filter((doc) => isInsuranceDocumentHint(
      `${doc.analysis?.document_type ?? ""} ${doc.analysis?.title ?? ""} ${doc.filename ?? ""}`,
    ));

    const extracted = extractInsuranceInfoFromDocuments(insuranceDocs.length ? insuranceDocs : documents);
    if (!extracted || !hasAnyValue(extracted)) {
      summary.skipped += 1;
      console.log("   ℹ️ No insurance metadata extracted.");
      continue;
    }

    const merged = mergeInsuranceDetails(dealMeta?.insuranceDetails ?? null, extracted, { force: options.force });
    if (!hasAnyValue(merged)) {
      summary.skipped += 1;
      console.log("   ℹ️ Nothing to update after merge.");
      continue;
    }

    const changed = JSON.stringify(merged) !== JSON.stringify(dealMeta?.insuranceDetails ?? null);
    if (!changed) {
      summary.skipped += 1;
      console.log("   ℹ️ Insurance details already up to date.");
      continue;
    }

    if (options.dryRun) {
      summary.updated += 1;
      console.log("   ✅ Dry-run: would update with", merged);
      continue;
    }

    try {
      await updateDealInsurance(supabase, dealId, merged);
      summary.updated += 1;
      console.log("   ✅ Updated insurance_details", merged);
    } catch (error) {
      summary.failures += 1;
      console.error(`   ❌ Failed to update deal ${dealId}: ${error.message}`);
    }
  }

  console.log("\nSummary:");
  console.log(`  Processed: ${summary.processed}`);
  console.log(`  Updated:   ${summary.updated}`);
  console.log(`  Skipped:   ${summary.skipped}`);
  console.log(`  Failed:    ${summary.failures}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
