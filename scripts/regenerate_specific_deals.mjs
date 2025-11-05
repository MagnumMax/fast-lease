#!/usr/bin/env node
import fs from "node:fs/promises";
import process from "node:process";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import yaml from "yaml";

const MAX_OUTPUT_TOKENS_LIMIT = 8192;
const RETRY_PROMPT_SUFFIX = `\n\nЕсли предыдущая попытка не удалась или ответ получился слишком длинным,` +
  `\nповтори ответ, строго соблюдая формат JSON без дополнительных пояснений.`;
const GEMINI_DEBUG_SNIPPET_LENGTH = Math.max(
  200,
  Number.parseInt(process.env.GEMINI_DEBUG_SNIPPET ?? "800", 10) || 800,
);

// Вспомогательные функции из ingest_local_deals.mjs
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
        "X-Client-Info": "regenerate-aggregated-script",
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
  return pathKey;
}

async function downloadFromStorage(supabase, bucket, pathKey) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(pathKey);
  if (error) {
    throw error;
  }
  return data;
}

async function getStorageFiles(supabase, bucket, folderPrefix) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folderPrefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error) {
    throw error;
  }

  return data.filter(item => item.name.toLowerCase().endsWith('.pdf'));
}

async function checkAggregatedJson(supabase, bucket, aggregatedPath) {
  try {
    const data = await downloadFromStorage(supabase, bucket, aggregatedPath);
    const content = await data.text();
    const json = JSON.parse(content);

    // Check if there's a gemini_error
    if (json.gemini_error) {
      return { exists: true, valid: false, error: json.gemini_error };
    }

    return { exists: true, valid: true, data: json };
  } catch (error) {
    return { exists: false, valid: false, error: error.message };
  }
}

async function regenerateAggregatedJson({
  dealId,
  config,
  supabase,
  model,
  generationConfig,
  bucket,
  prefix,
}) {
  const startTime = Date.now();
  console.info(`📁 Starting regeneration for deal: ${dealId}`);

  const storageBasePrefix = `${prefix}/${dealId}`;
  const aggregatedPath = `${storageBasePrefix}/aggregated.json`;

  // Check if aggregated.json exists and is valid
  const aggregatedCheck = await checkAggregatedJson(supabase, bucket, aggregatedPath);

  if (aggregatedCheck.exists && aggregatedCheck.valid) {
    console.info(`⏭️ Skipping deal ${dealId} — aggregated.json exists and is valid.`);
    return { skipped: true, reason: 'valid aggregated.json exists' };
  }

  if (aggregatedCheck.exists && !aggregatedCheck.valid) {
    console.info(`🔄 Regenerating deal ${dealId} — aggregated.json exists but has error: ${aggregatedCheck.error}`);
  } else {
    console.info(`🆕 Creating deal ${dealId} — aggregated.json does not exist`);
  }

  // Get list of PDF files in the folder
  const pdfFiles = await getStorageFiles(supabase, bucket, storageBasePrefix);

  if (pdfFiles.length === 0) {
    console.info(`📁 Deal ${dealId} has no PDF files, skipping.`);
    return { skipped: true, reason: 'no PDF files' };
  }

  console.info(`📄 Found ${pdfFiles.length} PDF files in deal ${dealId}`);

  const documents = [];
  let successCount = 0;
  let errorCount = 0;

  for (const file of pdfFiles) {
    const fileStartTime = Date.now();
    console.info(`🔍 Processing file: ${file.name}`);

    const pdfPath = `${storageBasePrefix}/${file.name}`;
    const buffer = await downloadFromStorage(supabase, bucket, pdfPath);

    const prompt = (config.gemini.document_prompt_template ?? "")
      .replace("{deal_folder}", dealId)
      .replace("{document_name}", file.name)
      .replace("{created_time}", file.created_at || new Date().toISOString())
      .replace("{modified_time}", file.updated_at || new Date().toISOString());

    const recognition = await recognizeDocument({
      model,
      prompt,
      buffer,
      generationConfig,
      filename: file.name,
    });

    const processingTime = Date.now() - fileStartTime;
    const fieldsCount = recognition.data?.fields?.length || 0;

    if (recognition.error) {
      errorCount++;
      console.error(`❌ Failed to analyze ${file.name}: ${recognition.error} (${processingTime}ms)`);
    } else {
      successCount++;
      console.info(`✅ Successfully analyzed ${file.name} (${fieldsCount} fields, ${processingTime}ms)`);

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

    const slug = file.name.replace(/[^0-9a-zA-Z]+/g, "_") || "document";
    const jsonKey = `${storageBasePrefix}/${slug}.json`;

    const jsonPayload = {
      source: {
        filename: file.name,
        size_bytes: file.metadata?.size || 0,
        created_time: file.created_at || new Date().toISOString(),
        modified_time: file.updated_at || new Date().toISOString(),
        storage_path: pdfPath,
      },
      recognition: recognition.data,
      recognition_error: recognition.error,
      recognition_raw: recognition.raw,
      recognition_debug: recognition.diagnostics,
    };

    try {
      await uploadToStorage(
        supabase,
        bucket,
        jsonKey,
        Buffer.from(JSON.stringify(jsonPayload, null, 2), "utf-8"),
        "application/json",
      );
    } catch (error) {
      console.warn(`⚠️ Failed to upload JSON ${jsonKey}: ${error.message}`);
    }

    documents.push({
      drive_file_id: file.name,
      filename: file.name,
      size_bytes: file.metadata?.size || 0,
      created_time: file.created_at || new Date().toISOString(),
      modified_time: file.updated_at || new Date().toISOString(),
      analysis: recognition.data,
      analysis_error: recognition.error,
      analysis_raw: recognition.raw,
      analysis_debug: recognition.diagnostics,
      storage: {
        bucket,
        pdf: pdfPath,
        json: jsonKey,
      },
    });
  }

  console.info(`📊 Starting aggregate analysis for ${dealId}...`);

  // Chunking implementation to handle large document sets
  const CHUNK_SIZE = 4; // Process 4 documents at a time to stay within token limits
  const documentChunks = [];
  for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
    documentChunks.push(documents.slice(i, i + CHUNK_SIZE));
  }

  console.info(`📦 Split ${documents.length} documents into ${documentChunks.length} chunks of max ${CHUNK_SIZE} documents each`);

  let chunkResults = [];
  let chunkIndex = 0;

  for (const chunk of documentChunks) {
    chunkIndex++;
    console.info(`🔄 Processing chunk ${chunkIndex}/${documentChunks.length} (${chunk.length} documents)`);

    const chunkSummary = chunk
      .map((doc) => `- ${doc.filename} (size=${doc.size_bytes})`)
      .join("\n");

    const chunkAnalysis = chunk
      .map((doc) => JSON.stringify({ filename: doc.filename, recognition: doc.analysis }, null, 2))
      .join("\n");

    const chunkPrompt = (config.gemini.prompt_template ?? "")
      .replace("{deal_folder}", dealId)
      .replace("{documents_summary}", chunkSummary)
      .replace("{documents_analysis}", chunkAnalysis);

    const systemInstruction = config.gemini.system_instruction
      ? `${config.gemini.system_instruction.trim()}\n\n`
      : "";
    const fullChunkPrompt = `${systemInstruction}${chunkPrompt}`.trim();

    let chunkGemini = null;
    let chunkError = null;
    let chunkRaw = null;
    let chunkDiagnostics = null;

    if (fullChunkPrompt.length === 0) {
      chunkError = "missing chunk aggregate prompt";
      console.error(`❌ Chunk ${chunkIndex} analysis failed: ${chunkError}`);
    } else {
      const chunkAttempts = [
        {
          prompt: fullChunkPrompt,
          generationConfig: generationConfig ? { ...generationConfig } : undefined,
        },
        {
          prompt: `${fullChunkPrompt}${RETRY_PROMPT_SUFFIX}`,
          generationConfig: buildRetryGenerationConfig(generationConfig ? { ...generationConfig } : undefined),
        },
      ].filter((attempt) => attempt.prompt && attempt.prompt.trim().length > 0);

      for (let attemptIndex = 0; attemptIndex < chunkAttempts.length; attemptIndex += 1) {
        const attempt = chunkAttempts[attemptIndex];
        const { rawText, diagnostics, error } = await sendGeminiRequest({
          model,
          parts: [{ text: attempt.prompt }],
          generationConfig: attempt.generationConfig ?? generationConfig,
          label: `chunk ${chunkIndex} ${dealId} [attempt ${attemptIndex + 1}]`,
        });

        chunkRaw = rawText;
        chunkDiagnostics = diagnostics;
        chunkError = error;

        if (error && !rawText) {
          console.warn(
            `[Gemini] chunk ${chunkIndex} ${dealId}: attempt ${attemptIndex + 1} error — ${error}`,
          );
          if (diagnostics) {
            logGeminiDebug(`chunk ${chunkIndex} ${dealId} [attempt ${attemptIndex + 1}]`, rawText, diagnostics);
          }
        }

        if (rawText) {
          try {
            chunkGemini = parseJsonResponse(rawText, `chunk ${chunkIndex} ${dealId}`);
            chunkError = null;
            console.info(`✅ Chunk ${chunkIndex} analysis completed for ${dealId}`);
            break;
          } catch (parseError) {
            chunkError = parseError.message;
            console.warn(
              `[Gemini] chunk ${chunkIndex} ${dealId}: parse error on attempt ${attemptIndex + 1}: ${parseError.message}`,
            );
            logGeminiDebug(`chunk ${chunkIndex} ${dealId} [attempt ${attemptIndex + 1}]`, rawText, diagnostics);
          }
        }

        if (!shouldRetryResponse({
          error: chunkError,
          diagnostics,
          attemptIndex,
          attemptsTotal: chunkAttempts.length,
        })) {
          if (chunkError) {
            console.error(`❌ Chunk ${chunkIndex} analysis failed for ${dealId}: ${chunkError}`);
          }
          break;
        }
      }
    }

    chunkResults.push({
      chunkIndex,
      documents: chunk.map(doc => doc.filename),
      result: chunkGemini,
      error: chunkError,
      raw: chunkRaw,
      diagnostics: chunkDiagnostics,
    });
  }

  // Now aggregate the chunk results into final result
  console.info(`🔀 Aggregating ${chunkResults.length} chunk results into final analysis...`);

  const successfulChunks = chunkResults.filter(cr => cr.result && !cr.error);
  const failedChunks = chunkResults.filter(cr => cr.error);

  if (failedChunks.length > 0) {
    console.warn(`⚠️ ${failedChunks.length} chunks failed, proceeding with ${successfulChunks.length} successful chunks`);
  }

  let aggregatedGemini = null;
  let aggregatedError = null;
  let aggregatedRaw = null;
  let aggregatedDiagnostics = null;

  if (successfulChunks.length === 0) {
    aggregatedError = "all chunks failed";
    console.error(`❌ Final aggregate analysis failed: ${aggregatedError}`);
  } else if (successfulChunks.length === 1) {
    // Only one chunk, use it directly
    const singleChunk = successfulChunks[0];
    aggregatedGemini = singleChunk.result;
    aggregatedRaw = singleChunk.raw;
    aggregatedDiagnostics = singleChunk.diagnostics;
    console.info(`✅ Final aggregate analysis completed (single chunk)`);
  } else {
    // Multiple chunks - aggregate them
    const chunksSummary = successfulChunks
      .map((cr) => `- Chunk ${cr.chunkIndex}: ${cr.documents.join(', ')}`)
      .join("\n");

    const chunksAnalysis = successfulChunks
      .map((cr) => JSON.stringify({
        chunk_index: cr.chunkIndex,
        documents: cr.documents,
        analysis: cr.result
      }, null, 2))
      .join("\n");

    const finalAggregatePrompt = `You are an assistant that combines multiple chunk analyses into a final comprehensive leasing data aggregation for the FastLease platform.

Use the provided chunk summaries and analyses to create a single, complete JSON response matching the original schema. Cross-reference and merge data from all chunks to fill in gaps and resolve conflicts.

${config.gemini.system_instruction || ""}

Deal folder: ${dealId}
Chunk summaries:
${chunksSummary}
Chunk analyses (JSON):
${chunksAnalysis}

Respond strictly with valid JSON matching the comprehensive schema. Do not include explanations or markdown.`;

    const finalAttempts = [
      {
        prompt: finalAggregatePrompt,
        generationConfig: generationConfig ? { ...generationConfig } : undefined,
      },
      {
        prompt: `${finalAggregatePrompt}${RETRY_PROMPT_SUFFIX}`,
        generationConfig: buildRetryGenerationConfig(generationConfig ? { ...generationConfig } : undefined),
      },
    ].filter((attempt) => attempt.prompt && attempt.prompt.trim().length > 0);

    for (let attemptIndex = 0; attemptIndex < finalAttempts.length; attemptIndex += 1) {
      const attempt = finalAttempts[attemptIndex];
      const { rawText, diagnostics, error } = await sendGeminiRequest({
        model,
        parts: [{ text: attempt.prompt }],
        generationConfig: attempt.generationConfig ?? generationConfig,
        label: `final aggregate ${dealId} [attempt ${attemptIndex + 1}]`,
      });

      aggregatedRaw = rawText;
      aggregatedDiagnostics = diagnostics;
      aggregatedError = error;

      if (error && !rawText) {
        console.warn(
          `[Gemini] final aggregate ${dealId}: attempt ${attemptIndex + 1} error — ${error}`,
        );
        if (diagnostics) {
          logGeminiDebug(`final aggregate ${dealId} [attempt ${attemptIndex + 1}]`, rawText, diagnostics);
        }
      }

      if (rawText) {
        try {
          aggregatedGemini = parseJsonResponse(rawText, `final aggregate ${dealId}`);
          aggregatedError = null;
          console.info(`✅ Final aggregate analysis completed for ${dealId}`);
          break;
        } catch (parseError) {
          aggregatedError = parseError.message;
          console.warn(
            `[Gemini] final aggregate ${dealId}: parse error on attempt ${attemptIndex + 1}: ${parseError.message}`,
          );
          logGeminiDebug(`final aggregate ${dealId} [attempt ${attemptIndex + 1}]`, rawText, diagnostics);
        }
      }

      if (!shouldRetryResponse({
        error: aggregatedError,
        diagnostics,
        attemptIndex,
        attemptsTotal: finalAttempts.length,
      })) {
        if (aggregatedError) {
          console.error(`❌ Final aggregate analysis failed for ${dealId}: ${aggregatedError}`);
        }
        break;
      }
    }
  }

  const aggregatedPayload = {
    deal_id: dealId,
    folder: {
      storage_prefix: storageBasePrefix,
    },
    documents,
    gemini: aggregatedGemini,
    gemini_error: aggregatedError,
    gemini_raw: aggregatedRaw,
    gemini_debug: aggregatedDiagnostics,
    storage: {
      bucket,
      base_prefix: storageBasePrefix,
      aggregated_json: aggregatedPath,
    },
    regenerated_at: new Date().toISOString(),
  };

  try {
    await uploadToStorage(
      supabase,
      bucket,
      aggregatedPath,
      Buffer.from(JSON.stringify(aggregatedPayload, null, 2), "utf-8"),
      "application/json",
    );
  } catch (error) {
    console.warn(`⚠️ Failed to upload aggregated JSON ${aggregatedPath}: ${error.message}`);
  }

  const totalTime = Date.now() - startTime;
  const totalFields = documents.reduce((sum, doc) => sum + (doc.analysis?.fields?.length || 0), 0);

  console.info(`✅ Completed regeneration for deal ${dealId}`);
  console.info(`📊 Statistics: ${successCount} successful, ${errorCount} failed, ${totalFields} total fields, ${totalTime}ms total`);

  // Extract and display aggregated key data
  if (aggregatedGemini) {
    const vin = aggregatedGemini.vehicle?.vin || aggregatedGemini.vehicle?.chassis_number;
    const clientName = aggregatedGemini.client?.name || aggregatedGemini.client?.full_name;
    const dealAmount = aggregatedGemini.deal?.total_amount;

    if (vin) console.info(`🚗 Deal VIN: ${vin}`);
    if (clientName) console.info(`👤 Deal Client: ${clientName}`);
    if (dealAmount) console.info(`💰 Deal Amount: ${dealAmount}`);
  }

  return {
    success: !aggregatedError,
    dealId,
    documentsCount: documents.length,
    successCount,
    errorCount,
    totalFields,
    processingTime: totalTime,
    error: aggregatedError,
  };
}

async function run() {
  const overallStartTime = Date.now();
  console.info(`🚀 Starting specific aggregated.json regeneration...`);

  const config = await loadConfig("configs/drive_ingest.yaml");

  const bucket = config.supabase.storage_bucket ?? "deal-documents";
  const prefix = config.supabase.storage_prefix ?? "";

  const geminiKeyEnv = config.gemini.api_key_env ?? "GEMINI_API_KEY";
  const geminiApiKey = process.env[geminiKeyEnv];
  if (!geminiApiKey) {
    throw new Error(`${geminiKeyEnv} environment variable is required`);
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

  // Known deals with errors from our previous analysis
  const dealsWithErrors = [
    '38321982-db01-5eb8-bee2-f2706489e5b9', // Error: Unterminated string in JSON
    '656473fe-df3a-580d-9645-2845e59c3a12'  // Error: Unexpected end of JSON input
  ];

  console.info(`📂 Found ${dealsWithErrors.length} deals with gemini errors to regenerate:`);
  dealsWithErrors.forEach(dealId => {
    console.info(`   - ${dealId}`);
  });

  let totalDeals = 0;
  let processedDeals = 0;
  let skippedDeals = 0;
  let successfulRegenerations = 0;
  let failedRegenerations = 0;
  let totalDocuments = 0;
  let totalSuccessfulDocuments = 0;
  let totalFailedDocuments = 0;
  let totalFields = 0;

  for (const dealId of dealsWithErrors) {
    totalDeals++;

    try {
      const result = await regenerateAggregatedJson({
        dealId,
        config,
        supabase,
        model,
        generationConfig,
        bucket,
        prefix,
      });

      if (result.skipped) {
        skippedDeals++;
        console.info(`⏭️ Skipped deal ${dealId}: ${result.reason}`);
      } else {
        processedDeals++;
        totalDocuments += result.documentsCount;
        totalSuccessfulDocuments += result.successCount;
        totalFailedDocuments += result.errorCount;
        totalFields += result.totalFields;

        if (result.success) {
          successfulRegenerations++;
          console.info(`✅ Successfully regenerated deal ${dealId}`);
        } else {
          failedRegenerations++;
          console.error(`❌ Failed to regenerate deal ${dealId}: ${result.error}`);
        }
      }
    } catch (error) {
      failedRegenerations++;
      console.error(`❌ Error processing deal ${dealId}: ${error.message}`);
    }
  }

  const overallTime = Date.now() - overallStartTime;
  console.info(`🎉 Specific aggregated.json regeneration completed!`);
  console.info(`📊 Final Report:`);
  console.info(`   📂 Total deals with errors: ${dealsWithErrors.length}`);
  console.info(`   📂 Deals processed: ${processedDeals}/${totalDeals}`);
  console.info(`   ⏭️ Deals skipped: ${skippedDeals}`);
  console.info(`   ✅ Successful regenerations: ${successfulRegenerations}`);
  console.info(`   ❌ Failed regenerations: ${failedRegenerations}`);
  console.info(`   📄 Total documents processed: ${totalDocuments}`);
  console.info(`   ✅ Successful document analyses: ${totalSuccessfulDocuments}`);
  console.info(`   ❌ Failed document analyses: ${totalFailedDocuments}`);
  console.info(`   📋 Total fields extracted: ${totalFields}`);
  console.info(`   ⏱️ Total processing time: ${overallTime}ms`);

  // Summary for completion
  const report = {
    totalDealErrors: dealsWithErrors.length,
    processedDeals,
    skippedDeals,
    successfulRegenerations,
    failedRegenerations,
    totalDocuments,
    successfulDocuments: totalSuccessfulDocuments,
    failedDocuments: totalFailedDocuments,
    totalFields,
    totalTime: overallTime,
    dealsWithErrors,
  };

  return report;
}

run().catch((error) => {
  console.error("Regeneration failed", error);
  process.exitCode = 1;
});
