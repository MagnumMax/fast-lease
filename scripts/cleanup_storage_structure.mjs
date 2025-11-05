#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import yaml from "yaml";

// Load environment variables from .env.local
async function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const envVars = envContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => {
        const [key, ...valueParts] = line.split('=');
        let value = valueParts.join('=').trim();
        
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        return {
          key: key?.trim(),
          value: value
        };
      })
      .filter(({ key, value }) => key && value);

    for (const { key, value } of envVars) {
      process.env[key] = value;
    }
    console.log(`🔧 Loaded ${envVars.length} environment variables from .env.local`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`⚠️ Failed to load .env.local: ${error.message}`);
    }
  }
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
        "X-Client-Info": "storage-cleanup-script",
      },
    },
  });
}

async function cleanupStorageStructure() {
  console.info(`🧹 Starting storage structure cleanup...`);

  // Load config
  const configPath = "configs/drive_ingest.yaml";
  const configRaw = await fs.readFile(configPath, "utf-8");
  const config = yaml.parse(configRaw);
  const bucket = config.supabase.storage_bucket ?? "deal-documents";

  const supabase = createSupabaseClient(config.supabase);

  try {
    // Check for files in duplicated structure
    const { data: duplicatedFiles, error: listError } = await supabase.storage
      .from(bucket)
      .list('deals/deals/documents', { limit: 1000, offset: 0 });

    if (listError) {
      console.info(`ℹ️ No files found in 'deals/deals/documents' (may not exist)`);
      return;
    }

    if (!duplicatedFiles || duplicatedFiles.length === 0) {
      console.info(`✅ No duplicated files found in 'deals/deals/documents'`);
      return;
    }

    console.info(`📁 Found ${duplicatedFiles.length} files in duplicated structure`);

    // List all duplicated files
    for (const file of duplicatedFiles) {
      const sourcePath = `deals/deals/documents/${file.name}`;
      
      try {
        // Download file from source
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(sourcePath);

        if (downloadError) {
          console.warn(`⚠️ Failed to download ${sourcePath}: ${downloadError.message}`);
          continue;
        }

        // Upload to correct location
        const correctPath = `documents/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(correctPath, fileData, { upsert: true });

        if (uploadError) {
          console.warn(`⚠️ Failed to upload to ${correctPath}: ${uploadError.message}`);
          continue;
        }

        console.info(`✅ Migrated: ${file.name}`);

        // Delete original file
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([sourcePath]);

        if (deleteError) {
          console.warn(`⚠️ Failed to delete ${sourcePath}: ${deleteError.message}`);
        } else {
          console.info(`🗑️ Deleted: ${sourcePath}`);
        }

      } catch (error) {
        console.warn(`⚠️ Failed to process ${file.name}: ${error.message}`);
      }
    }

    // Try to remove the empty duplicated folder
    try {
      const { error: removeFolderError } = await supabase.storage
        .from(bucket)
        .remove(['deals/deals/']);
      
      if (removeFolderError) {
        console.warn(`⚠️ Failed to remove empty folder 'deals/deals/': ${removeFolderError.message}`);
      } else {
        console.info(`🗑️ Removed empty folder: deals/deals/`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to remove folder: ${error.message}`);
    }

    console.info(`✅ Storage structure cleanup completed!`);

  } catch (error) {
    console.error(`❌ Cleanup failed: ${error.message}`);
  }
}

// Load environment variables before anything else
await loadEnv();

cleanupStorageStructure().catch((error) => {
  console.error("Storage cleanup failed", error);
  process.exitCode = 1;
});
