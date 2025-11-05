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
        "X-Client-Info": "storage-migration-script",
      },
    },
  });
}

async function migrateToFlatStructure() {
  console.info(`🔄 Starting migration from 'deals/documents/' to flat structure...`);

  // Load config
  const configPath = "configs/drive_ingest.yaml";
  const configRaw = await fs.readFile(configPath, "utf-8");
  const config = yaml.parse(configRaw);
  const bucket = config.supabase.storage_bucket ?? "deals";

  const supabase = createSupabaseClient(config.supabase);

  try {
    // Get all deal folders in old structure
    const { data: dealFolders, error: listError } = await supabase.storage
      .from(bucket)
      .list('deals/documents', { limit: 1000, offset: 0 });

    if (listError) {
      console.warn(`⚠️ Could not list old structure: ${listError.message}`);
      return;
    }

    if (!dealFolders || dealFolders.length === 0) {
      console.info(`ℹ️ No deal folders found in 'deals/documents/'`);
      return;
    }

    console.info(`📁 Found ${dealFolders.length} deal folders in old structure`);

    let migratedFolders = 0;
    let migratedFiles = 0;

    for (const dealFolder of dealFolders) {
      if (!dealFolder.name) continue;
      
      const oldDealPath = `deals/documents/${dealFolder.name}`;
      
      try {
        // Get files in this deal folder
        const { data: dealFiles, error: dealListError } = await supabase.storage
          .from(bucket)
          .list(oldDealPath, { limit: 1000, offset: 0 });

        if (dealListError) {
          console.warn(`⚠️ Could not list ${oldDealPath}: ${dealListError.message}`);
          continue;
        }

        if (!dealFiles || dealFiles.length === 0) {
          console.warn(`⚠️ Empty deal folder: ${oldDealPath}`);
          continue;
        }

        console.info(`📂 Processing deal folder: ${dealFolder.name} (${dealFiles.length} files)`);

        // Migrate each file in the deal folder
        for (const file of dealFiles) {
          const sourcePath = `${oldDealPath}/${file.name}`;
          const destPath = `${dealFolder.name}/${file.name}`;

          try {
            // Download file from old location
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(bucket)
              .download(sourcePath);

            if (downloadError) {
              console.warn(`⚠️ Failed to download ${sourcePath}: ${downloadError.message}`);
              continue;
            }

            // Upload to new location (directly under bucket, no 'deals/' prefix)
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(destPath, fileData, { upsert: true });

            if (uploadError) {
              console.warn(`⚠️ Failed to upload ${destPath}: ${uploadError.message}`);
              continue;
            }

            console.info(`✅ Migrated: ${file.name}`);
            migratedFiles++;
          } catch (error) {
            console.warn(`⚠️ Failed to migrate ${file.name}: ${error.message}`);
          }
        }

        // Delete old deal folder after migration
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([`${oldDealPath}/`]);

        if (deleteError) {
          console.warn(`⚠️ Failed to delete old folder ${oldDealPath}: ${deleteError.message}`);
        } else {
          console.info(`🗑️ Deleted old folder: ${oldDealPath}`);
        }

        migratedFolders++;
      } catch (error) {
        console.warn(`⚠️ Failed to process deal folder ${dealFolder.name}: ${error.message}`);
      }
    }

    console.info(`✅ Migration completed!`);
    console.info(`📊 Statistics: ${migratedFolders} folders, ${migratedFiles} files migrated`);
    console.info(`🆕 New structure: {deal_id}/{files}`);

    // Remove empty 'deals/documents' folder if it exists
    try {
      const { error: removeDocsError } = await supabase.storage
        .from(bucket)
        .remove(['deals/documents/']);
      
      if (removeDocsError) {
        console.warn(`⚠️ Could not remove empty 'deals/documents/' folder: ${removeDocsError.message}`);
      } else {
        console.info(`🗑️ Removed empty folder: deals/documents/`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to remove empty folder: ${error.message}`);
    }

  } catch (error) {
    console.error(`❌ Migration failed: ${error.message}`);
  }
}

// Load environment variables before anything else
await loadEnv();

migrateToFlatStructure().catch((error) => {
  console.error("Storage migration failed", error);
  process.exitCode = 1;
});