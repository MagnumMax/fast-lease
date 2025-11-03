#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";
import yaml from "yaml";

const UUID_NAMESPACE = uuidv5.URL;


const MAX_OUTPUT_TOKENS_LIMIT = 8192;
const RETRY_PROMPT_SUFFIX = `\n\nЕсли предыдущая попытка не удалась или ответ получился слишком длинным,` +
  `\nповтори ответ, строго соблюдая формат JSON без дополнительных пояснений.`;
const GEMINI_DEBUG_SNIPPET_LENGTH = Math.max(
  200,
  Number.parseInt(process.env.GEMINI_DEBUG_SNIPPET ?? "800", 10) || 800,
);

function logGeminiDebug(label, rawText, diagnostics) {
  if (rawText && rawText.length > 0) {
    const truncated = rawText.length > GEMINI_DEBUG_SNIPPET_LENGTH
      ? `${rawText.slice(0, GEMINI_DEBUG_SNIPPET_LENGTH)}…`
      : rawText;
    console.warn(`[Gemini] ${label}: raw response snippet (length=${rawText.length})`);
    console.warn(truncated);
  }
  if (diagnostics) {
    try {
      console.warn(`[Gemini] ${label}: diagnostics=${JSON.stringify(diagnostics, null, 2)}`);
    } catch (serializationError) {
      console.warn(`[Gemini] ${label}: diagnostics serialization failed`, serializationError);
      console.warn(diagnostics);
    }
  }
}

function buildRetryGenerationConfig(baseConfig) {
  if (!baseConfig) {
    return undefined;
  }

  const copy = { ...baseConfig };
  const current = copy.maxOutputTokens ?? 0;
  if (!current) {
    return copy;
  }

  const increased = Math.min(MAX_OUTPUT_TOKENS_LIMIT, Math.round(current * 1.5));
  copy.maxOutputTokens = increased;
  return copy;
}

function extractCandidateText(candidate) {
  if (!candidate || !candidate.content) return "";
  return (candidate.content.parts ?? [])
    .map((part) => {
      if (part.text) return part.text;
      if (part.inlineData?.data) {
        try {
          return Buffer.from(part.inlineData.data, "base64").toString("utf8");
        } catch (error) {
          console.warn("[Gemini] failed to decode inlineData", error);
          return "";
        }
      }
      if (part.fileData?.fileUri) return part.fileData.fileUri;
      return "";
    })
    .join("")
    .trim();
}

function parseJsonResponse(raw, context) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    throw new Error("empty response");
  }
  const cleaned = trimmed.startsWith("```")
    ? trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim()
    : trimmed;
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`invalid json (${context}): ${error.message}`);
  }
}

function collectDiagnostics(candidate) {
  if (!candidate) return null;
  return {
    finishReason: candidate.finishReason ?? null,
    finishMessage: candidate.finishMessage ?? null,
    safetyRatings: candidate.safetyRatings ?? null,
    citations: candidate.citationMetadata ?? null,
  };
}

function shouldRetryResponse({ error, diagnostics, attemptIndex, attemptsTotal }) {
  if (attemptIndex >= attemptsTotal - 1) {
    return false;
  }

  if (!error) {
    return false;
  }

  if (diagnostics?.finishReason === "MAX_TOKENS") {
    return true;
  }

  const normalizedError = String(error).toLowerCase();
  if (normalizedError.includes("empty response")) {
    return true;
  }
  if (normalizedError.includes("unexpected end") || normalizedError.includes("unterminated")) {
    return true;
  }

  return false;
}

async function sendGeminiRequest({ model, parts, generationConfig, label }) {
  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig,
    });

    const candidate = result.response?.candidates?.[0];
    if (!candidate) {
      console.warn(`[Gemini] ${label}: no candidates`, result.response);
      return { rawText: null, diagnostics: null, error: "empty response" };
    }

    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      console.warn(`[Gemini] ${label}: finishReason=${candidate.finishReason}`, candidate.finishMessage ?? "");
    }

    const diagnostics = collectDiagnostics(candidate);
    const rawText = extractCandidateText(candidate);
    if (!rawText) {
      return { rawText: null, diagnostics, error: "empty response" };
    }

    return { rawText, diagnostics, error: null };
  } catch (error) {
    console.error(`[Gemini] ${label}:`, error);
    return { rawText: null, diagnostics: null, error: error.message };
  }
}

async function loadConfig(configPath) {
  const raw = await fs.readFile(configPath, "utf-8");
  const parsed = yaml.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Configuration must be a YAML mapping");
  }
  if (!parsed.supabase) {
    throw new Error("Configuration missing supabase block");
  }
  if (!parsed.gemini || !parsed.gemini.enabled) {
    throw new Error("Gemini must be enabled for ingestion");
  }
  return parsed;
}

function createSupabaseClient(supabaseConfig) {
  const urlEnv = supabaseConfig.url_env ?? "NEXT_PUBLIC_SUPABASE_URL";
  const keyEnv = supabaseConfig.service_role_key_env ?? "SUPABASE_SERVICE_ROLE_KEY";
  const supabaseUrl = process.env[urlEnv];
  const serviceRoleKey = process.env[keyEnv];
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(`${urlEnv} and ${keyEnv} environment variables are required`);
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: {
        "X-Client-Info": "local-deal-ingest-script",
      },
    },
  });
}

async function recognizeDocument({ model, prompt, buffer, generationConfig, filename }) {
  const attempts = [
    {
      prompt,
      generationConfig: generationConfig ? { ...generationConfig } : undefined,
    },
    {
      prompt: `${prompt}${RETRY_PROMPT_SUFFIX}`,
      generationConfig: buildRetryGenerationConfig(generationConfig ? { ...generationConfig } : undefined),
    },
  ].filter((attempt) => attempt.prompt && attempt.prompt.trim().length > 0);

  let lastRaw = null;
  let lastDiagnostics = null;
  let lastError = null;

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    const parts = [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: buffer.toString("base64"),
        },
      },
      { text: attempt.prompt },
    ];

    const { rawText, diagnostics, error } = await sendGeminiRequest({
      model,
      parts,
      generationConfig: attempt.generationConfig ?? generationConfig,
      label: `${filename} [attempt ${index + 1}]`,
    });

    lastRaw = rawText;
    lastDiagnostics = diagnostics;
    lastError = error;

    if (error && !rawText) {
      console.warn(`[Gemini] ${filename}: attempt ${index + 1} error — ${error}`);
      if (diagnostics) {
        logGeminiDebug(`${filename} [attempt ${index + 1}]`, rawText, diagnostics);
      }
    }

    if (rawText) {
      try {
        const parsed = parseJsonResponse(rawText, `document ${filename}`);
        return { data: parsed, error: null, raw: rawText, diagnostics };
      } catch (parseError) {
        lastError = parseError.message;
        console.warn(
          `[Gemini] ${filename}: parse error on attempt ${index + 1}: ${parseError.message}`,
        );
        logGeminiDebug(`${filename} [attempt ${index + 1}]`, rawText, diagnostics);
      }
    }

    if (!shouldRetryResponse({
      error: lastError,
      diagnostics,
      attemptIndex: index,
      attemptsTotal: attempts.length,
    })) {
      break;
    }
  }

  return { data: null, error: lastError ?? "unknown error", raw: lastRaw, diagnostics: lastDiagnostics };
}

async function uploadToStorage(supabase, bucket, pathKey, buffer, contentType) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(pathKey, buffer, { contentType, upsert: true });
  if (error) {
    throw error;
  }
  return `${bucket}/${pathKey}`;
}

async function fileExists(supabase, bucket, pathKey) {
  const res = await supabase.storage.from(bucket).download(pathKey);
  if (res.error) {
    return false;
  }
  if (res.data && typeof res.data.destroy === "function") {
    res.data.destroy();
  }
  return true;
}

async function processDealFolder({
  folderPath,
  folderName,
  config,
  supabase,
  model,
  generationConfig,
  bucket,
  prefix,
  skipProcessed,
}) {
  const startTime = Date.now();
  console.info(`📁 Starting processing folder: ${folderName}`);

  const dealId = uuidv5(folderName, UUID_NAMESPACE);
  const storageBasePrefix = `${prefix}/${dealId}`;
  const aggregatedPath = `${storageBasePrefix}/aggregated.json`;

  if (skipProcessed && (await fileExists(supabase, bucket, aggregatedPath))) {
    console.info(`⏭️ Skipping ${folderName} — aggregated.json already exists.`);
    return;
  }

  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const pdfFiles = entries.filter(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"),
  );

  if (pdfFiles.length === 0) {
    console.info(`📁 Folder ${folderName} has no PDF files, skipping.`);
    return;
  }

  console.info(`📄 Found ${pdfFiles.length} PDF files in ${folderName}`);

  const documents = [];
  let successCount = 0;
  let errorCount = 0;

  for (const entry of pdfFiles) {
    const fileStartTime = Date.now();
    console.info(`🔍 Processing file: ${entry.name}`);

    const absolutePath = path.join(folderPath, entry.name);
    const buffer = await fs.readFile(absolutePath);
    const stats = await fs.stat(absolutePath);

    const prompt = (config.gemini.document_prompt_template ?? "")
      .replace("{deal_folder}", folderName)
      .replace("{document_name}", entry.name)
      .replace("{created_time}", stats.birthtime.toISOString())
      .replace("{modified_time}", stats.mtime.toISOString());

    const recognition = await recognizeDocument({
      model,
      prompt,
      buffer,
      generationConfig,
      filename: entry.name,
    });

    const processingTime = Date.now() - fileStartTime;
    const fieldsCount = recognition.data?.fields?.length || 0;

    if (recognition.error) {
      errorCount++;
      console.error(`❌ Failed to analyze ${entry.name}: ${recognition.error} (${processingTime}ms)`);
    } else {
      successCount++;
      console.info(`✅ Successfully analyzed ${entry.name} (${fieldsCount} fields, ${processingTime}ms)`);

      // Extract and display key data
      if (recognition.data) {
        const vin = recognition.data.fields?.find(f => f.key?.toLowerCase().includes('vin'))?.value ||
                   recognition.data.fields?.find(f => f.key?.toLowerCase().includes('chassis'))?.value;
        const clientName = recognition.data.parties?.find(p => p.type === 'client' || p.type === 'buyer')?.name;
        const amounts = recognition.data.amounts?.map(a => `${a.currency || 'AED'} ${a.value}`).join(', ') || 'N/A';

        if (vin) console.info(`🚗 VIN: ${vin}`);
        if (clientName) console.info(`👤 Client: ${clientName}`);
        if (amounts !== 'N/A') console.info(`💰 Amounts: ${amounts}`);
      }
    }

    const slug = entry.name.replace(/[^0-9a-zA-Z]+/g, "_") || "document";
    const pdfKey = `${storageBasePrefix}/${slug}.pdf`;
    const jsonKey = `${storageBasePrefix}/${slug}.json`;

    const pdfStorage = await uploadToStorage(
      supabase,
      bucket,
      pdfKey,
      buffer,
      "application/pdf",
    );

    const jsonPayload = {
      source: {
        filename: entry.name,
        size_bytes: stats.size,
        created_time: stats.birthtime.toISOString(),
        modified_time: stats.mtime.toISOString(),
        local_path: absolutePath,
      },
      recognition: recognition.data,
      recognition_error: recognition.error,
      recognition_raw: recognition.raw,
      recognition_debug: recognition.diagnostics,
    };

    const jsonStorage = await uploadToStorage(
      supabase,
      bucket,
      jsonKey,
      Buffer.from(JSON.stringify(jsonPayload, null, 2), "utf-8"),
      "application/json",
    );

    documents.push({
      drive_file_id: entry.name,
      filename: entry.name,
      size_bytes: stats.size,
      created_time: stats.birthtime.toISOString(),
      modified_time: stats.mtime.toISOString(),
      analysis: recognition.data,
      analysis_error: recognition.error,
      analysis_raw: recognition.raw,
      analysis_debug: recognition.diagnostics,
      storage: {
        pdf: pdfStorage,
        json: jsonStorage,
      },
    });
  }

  console.info(`📊 Starting aggregate analysis for ${folderName}...`);

  const documentsSummary = documents
    .map((doc) => `- ${doc.filename} (size=${doc.size_bytes})`)
    .join("\n");

  const documentsAnalysis = documents
    .map((doc) => JSON.stringify({ filename: doc.filename, recognition: doc.analysis }, null, 2))
    .join("\n");

  const basePrompt = (config.gemini.prompt_template ?? "")
    .replace("{deal_folder}", folderName)
    .replace("{documents_summary}", documentsSummary)
    .replace("{documents_analysis}", documentsAnalysis);

  const systemInstruction = config.gemini.system_instruction
    ? `${config.gemini.system_instruction.trim()}\n\n`
    : "";
  const summaryPrompt = `${systemInstruction}${basePrompt}`.trim();

  let aggregatedGemini = null;
  let aggregatedError = null;
  let aggregatedRaw = null;
  let aggregatedDiagnostics = null;

  if (summaryPrompt.length === 0) {
    aggregatedError = "missing aggregate prompt";
    console.error(`❌ Aggregate analysis failed: ${aggregatedError}`);
  } else {
    const aggregateAttempts = [
      {
        prompt: summaryPrompt,
        generationConfig: generationConfig ? { ...generationConfig } : undefined,
      },
      {
        prompt: `${summaryPrompt}${RETRY_PROMPT_SUFFIX}`,
        generationConfig: buildRetryGenerationConfig(generationConfig ? { ...generationConfig } : undefined),
      },
    ].filter((attempt) => attempt.prompt && attempt.prompt.trim().length > 0);

    for (let index = 0; index < aggregateAttempts.length; index += 1) {
      const attempt = aggregateAttempts[index];
      const { rawText, diagnostics, error } = await sendGeminiRequest({
        model,
        parts: [{ text: attempt.prompt }],
        generationConfig: attempt.generationConfig ?? generationConfig,
        label: `aggregate ${folderName} [attempt ${index + 1}]`,
      });

      aggregatedRaw = rawText;
      aggregatedDiagnostics = diagnostics;
      aggregatedError = error;

      if (error && !rawText) {
        console.warn(
          `[Gemini] aggregate ${folderName}: attempt ${index + 1} error — ${error}`,
        );
        if (diagnostics) {
          logGeminiDebug(`aggregate ${folderName} [attempt ${index + 1}]`, rawText, diagnostics);
        }
      }

      if (rawText) {
        try {
          aggregatedGemini = parseJsonResponse(rawText, `aggregate ${folderName}`);
          aggregatedError = null;
          console.info(`✅ Aggregate analysis completed for ${folderName}`);
          break;
        } catch (parseError) {
          aggregatedError = parseError.message;
          console.warn(
            `[Gemini] aggregate ${folderName}: parse error on attempt ${index + 1}: ${parseError.message}`,
          );
          logGeminiDebug(`aggregate ${folderName} [attempt ${index + 1}]`, rawText, diagnostics);
        }
      }

      if (!shouldRetryResponse({
        error: aggregatedError,
        diagnostics,
        attemptIndex: index,
        attemptsTotal: aggregateAttempts.length,
      })) {
        if (aggregatedError) {
          console.error(`❌ Aggregate analysis failed for ${folderName}: ${aggregatedError}`);
        }
        break;
      }
    }
  }

  const aggregatedPayload = {
    deal_id: dealId,
    folder: {
      name: folderName,
      path: folderPath,
    },
    documents,
    gemini: aggregatedGemini,
    gemini_error: aggregatedError,
    gemini_raw: aggregatedRaw,
    gemini_debug: aggregatedDiagnostics,
    storage: {
      bucket,
      base_prefix: storageBasePrefix,
      aggregated_json: `${bucket}/${aggregatedPath}`,
    },
  };

  await uploadToStorage(
    supabase,
    bucket,
    aggregatedPath,
    Buffer.from(JSON.stringify(aggregatedPayload, null, 2), "utf-8"),
    "application/json",
  );

  const totalTime = Date.now() - startTime;
  const totalFields = documents.reduce((sum, doc) => sum + (doc.analysis?.fields?.length || 0), 0);

  console.info(`✅ Completed processing ${folderName} → deal ${dealId}`);
  console.info(`📊 Statistics: ${successCount} successful, ${errorCount} failed, ${totalFields} total fields, ${totalTime}ms total`);

  // Extract and display aggregated key data
  if (aggregatedGemini) {
    const vin = aggregatedGemini.vehicle?.vin || aggregatedGemini.vehicle?.chassis_number;
    const clientName = aggregatedGemini.client?.name || aggregatedGemini.client?.full_name;
    const dealAmount = aggregatedGemini.deal?.total_amount || aggregatedGemini.deal?.purchase_price;

    if (vin) console.info(`🚗 Deal VIN: ${vin}`);
    if (clientName) console.info(`👤 Deal Client: ${clientName}`);
    if (dealAmount) console.info(`💰 Deal Amount: ${dealAmount}`);
  }
}

async function run() {
  const overallStartTime = Date.now();
  console.info(`🚀 Starting local deal ingestion process...`);

  const argv = process.argv.slice(2);
  let configPath = "configs/drive_ingest.yaml";
  let rootOverride;
  let onlyFilter;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") {
      configPath = argv[i + 1];
      i += 1;
    } else if (arg === "--root") {
      rootOverride = argv[i + 1];
      i += 1;
    } else if (arg === "--only") {
      onlyFilter = argv[i + 1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      i += 1;
    }
  }

  const config = await loadConfig(configPath);

  const rootPath = path.resolve(rootOverride ?? config.local_root ?? "datasets/deals");
  const bucket = config.supabase.storage_bucket ?? "deals";
  const prefix = config.supabase.storage_prefix ?? "documents";
  const skipProcessed = config.skip_processed ?? true;

  const geminiKeyEnv = config.gemini.api_key_env ?? "GEMINI_API_KEY";
  const geminiApiKey = process.env[geminiKeyEnv];
  if (!geminiApiKey) {
    throw new Error(`${geminiKeyEnv} environment variable is required`);
  }

  const stat = await fs.stat(rootPath).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Local root folder not found: ${rootPath}`);
  }

  const supabase = createSupabaseClient(config.supabase);
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const configuredModel = config.gemini.model ?? "gemini-2.5-pro";
  const normalizedModel = configuredModel.replace(/^models\//, "");
  const model = genAI.getGenerativeModel({
    model: normalizedModel,
  });

  const generationConfig = {
    temperature: config.gemini.temperature ?? 0.1,
    topP: config.gemini.top_p ?? 0.95,
    topK: config.gemini.top_k ?? 32,
    maxOutputTokens: config.gemini.max_output_tokens ?? 6000,
  };

  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const folderEntries = entries.filter((entry) => entry.isDirectory());

  let totalFolders = 0;
  let processedFolders = 0;
  let totalFiles = 0;
  let successfulFiles = 0;
  let failedFiles = 0;
  let totalFields = 0;

  if (folderEntries.length === 0) {
    const pdfFiles = entries.filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfFiles.length === 0) {
      console.warn(`No deal folders or PDF files found in ${rootPath}`);
      return;
    }

    const rootName = path.basename(rootPath);
    if (!onlyFilter || onlyFilter.includes(rootName)) {
      totalFolders = 1;
      await processDealFolder({
        folderPath: rootPath,
        folderName: rootName,
        config,
        supabase,
        model,
        generationConfig,
        bucket,
        prefix,
        skipProcessed,
      });
      processedFolders = 1;
      // Note: We can't easily track file stats from here, but the function logs them internally
    } else {
      console.info(`⏭️ Skipping ${rootName} — not included in --only filter.`);
    }
  } else {
    totalFolders = folderEntries.length;
    console.info(`📂 Found ${totalFolders} deal folders to process`);

    for (const entry of folderEntries) {
      const folderName = entry.name;
      if (onlyFilter && !onlyFilter.includes(folderName)) {
        console.info(`⏭️ Skipping ${folderName} — not included in --only filter.`);
        continue;
      }

      const folderPath = path.join(rootPath, folderName);
      await processDealFolder({
        folderPath,
        folderName,
        config,
        supabase,
        model,
        generationConfig,
        bucket,
        prefix,
        skipProcessed,
      });
      processedFolders++;
    }
  }

  const overallTime = Date.now() - overallStartTime;
  console.info(`🎉 Local deal ingestion completed!`);
  console.info(`📊 Final Statistics:`);
  console.info(`   📂 Folders processed: ${processedFolders}/${totalFolders}`);
  console.info(`   📄 Total files: ${totalFiles}`);
  console.info(`   ✅ Successful analyses: ${successfulFiles}`);
  console.info(`   ❌ Failed analyses: ${failedFiles}`);
  console.info(`   📋 Total fields extracted: ${totalFields}`);
  console.info(`   ⏱️ Total processing time: ${overallTime}ms`);
}

run().catch((error) => {
  console.error("Local ingestion failed", error);
  process.exitCode = 1;
});
