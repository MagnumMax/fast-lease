
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEAL_DOCUMENT_BUCKET = "deal-documents";
const CLIENT_DOCUMENT_BUCKET = "client-documents";

import { TASK_DOCUMENT_MAPPING } from "../lib/constants/task-documents";

// Configuration for document migration based on task types
// const TASK_DOCUMENT_MAPPING: Record<string, string[]> = { ... } - Moved to lib/constants/task-documents.ts

async function getProfileId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();
  
  if (error || !data) {
    console.warn(`Could not find profile for user_id ${userId}:`, error?.message);
    return null;
  }
  return data.id;
}

async function migrateDocs(dealId: string, clientUserId: string, sellerUserId?: string) {
  console.log(`Starting migration for Deal: ${dealId}`);
  
  // Resolve User IDs to Profile IDs
  const clientProfileId = await getProfileId(clientUserId);
  if (!clientProfileId) {
    console.error(`Skipping deal ${dealId} - could not resolve client profile ID for user ${clientUserId}`);
    return;
  }
  console.log(`Target Client (Buyer): ${clientUserId} -> Profile: ${clientProfileId}`);

  let sellerProfileId: string | undefined;
  if (sellerUserId) {
    const pid = await getProfileId(sellerUserId);
    if (pid) {
      sellerProfileId = pid;
      console.log(`Target Seller: ${sellerUserId} -> Profile: ${sellerProfileId}`);
    } else {
      console.warn(`Could not resolve seller profile ID for user ${sellerUserId}`);
    }
  }

  // 1. Cleanup existing migrated documents for this deal in profile_documents
  // Note: We delete by source_deal_id metadata to be safe
  
  console.log("Cleaning up previously migrated documents...");
  const { error: deleteClientError } = await supabase
    .from("profile_documents")
    .delete()
    .eq("profile_id", clientProfileId)
    .contains("metadata", { source_deal_id: dealId });
  
  if (deleteClientError) console.error("Error cleaning client docs:", deleteClientError);

  if (sellerProfileId) {
     const { error: deleteSellerError } = await supabase
      .from("profile_documents")
      .delete()
      .eq("profile_id", sellerProfileId)
      .contains("metadata", { source_deal_id: dealId });
     if (deleteSellerError) console.error("Error cleaning seller docs:", deleteSellerError);
  }

  // 2. Fetch completed tasks to determine which docs to migrate
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("type, payload")
    .eq("deal_id", dealId)
    .eq("status", "DONE");

  if (tasksError || !tasks) {
    console.error("Error fetching tasks:", tasksError);
    return;
  }

  // 3. Fetch all deal documents to map paths to files
  const { data: dealDocs, error: docsError } = await supabase
    .from("deal_documents")
    .select("*")
    .eq("deal_id", dealId);

  if (docsError || !dealDocs) {
    console.error("Error fetching deal docs:", docsError);
    return;
  }

  // Map storage_path -> document record for quick lookup
  const docMap = new Map<string, any>();
  dealDocs.forEach(d => {
    if (d.storage_path) docMap.set(d.storage_path, d);
  });

  // 4. Process tasks
  for (const task of tasks) {
    const fieldsOfInterest = TASK_DOCUMENT_MAPPING[task.type];
    if (!fieldsOfInterest) continue;

    const isBuyerTask = task.type.startsWith("COLLECT_BUYER");
    const isSellerTask = task.type.startsWith("COLLECT_SELLER");
    
    const targetProfileId = isBuyerTask ? clientProfileId : (isSellerTask ? sellerProfileId : null);

    if (!targetProfileId) {
      console.warn(`Skipping task ${task.type} - no target profile (Seller might be missing or unresolved).`);
      continue;
    }

    console.log(`Processing task: ${task.type} -> Target Profile: ${targetProfileId}`);

    const payload = task.payload as any;
    const taskFields = payload.fields || {};

    for (const fieldKey of fieldsOfInterest) {
      const filePath = taskFields[fieldKey];
      if (!filePath || typeof filePath !== 'string') continue;

      const doc = docMap.get(filePath);
      if (!doc) {
        console.warn(`Document not found for field ${fieldKey} (path: ${filePath})`);
        continue;
      }

      console.log(`Migrating ${fieldKey} (${doc.title}) to ${isBuyerTask ? 'Buyer' : 'Seller'}...`);

      try {
        // a. Download
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(DEAL_DOCUMENT_BUCKET)
          .download(doc.storage_path);

        if (downloadError || !fileData) {
          console.error(`Error downloading ${doc.storage_path}:`, downloadError);
          continue;
        }

        // b. Upload to Client/Seller Bucket (same bucket "client-documents", different folder/owner)
        // Note: We use profile_id for folder structure to keep it consistent with new schema
        const fileName = doc.storage_path.split('/').pop() || `doc-${doc.id}`;
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const clientStoragePath = `${targetProfileId}/${randomUUID()}-${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from(CLIENT_DOCUMENT_BUCKET)
          .upload(clientStoragePath, fileData, {
            contentType: doc.mime_type || undefined,
            upsert: false
          });

        if (uploadError) {
          console.error(`Error uploading to target bucket:`, uploadError);
          continue;
        }

        // c. Insert record
        const { error: insertError } = await supabase
          .from("profile_documents")
          .insert({
            profile_id: targetProfileId,
            document_type: doc.document_type || "other",
            document_category: "required", 
            title: doc.title,
            storage_path: clientStoragePath,
            mime_type: doc.mime_type,
            file_size: doc.file_size,
            status: "uploaded",
            metadata: {
              ...doc.metadata,
              bucket: CLIENT_DOCUMENT_BUCKET, 
              source_deal_id: dealId,
              source_task_type: task.type,
              source_field_key: fieldKey,
              migrated_at: new Date().toISOString(),
              migration_script: "migrate_deal_docs_to_client_v2"
            },
            uploaded_by: doc.uploaded_by
          });

        if (insertError) {
          console.error(`Error inserting record:`, insertError);
        } else {
          console.log(`Successfully migrated: ${doc.title}`);
        }

      } catch (err) {
        console.error(`Error processing ${fieldKey}:`, err);
      }
    }
  }
  
  // 5. Also migrate Signed Contracts to Buyer (always useful)
  // User didn't explicitly forbid this, but gave a strict list.
  // "For the document set, it is necessary to bind to documents in tasks with such types... Depending on the type"
  // This sounds restrictive. "Only these".
  // BUT previously I migrated contracts.
  // The user said: "collect documents from there and upload... ONLY first say what types".
  // Then "here are the docs to display... and delete what you uploaded and reload by new rules".
  // This implies strict adherence to the list for the "Collected" docs.
  // But what about the signed contracts?
  // Usually a client profile needs their contracts.
  // However, the user's list for `COLLECT_BUYER_DOCS_*` does NOT include contracts.
  // Contracts are in `DOC_SIGNING` task or `contracts.signedUploaded`.
  // If I strictly follow "bind to documents in tasks with such types", I should NOT migrate contracts unless they are in the list.
  // The user list for Seller has `doc_quotation`.
  // I will strictly follow the provided list for now. If contracts are missing, user will ask.
  
  console.log("Migration completed.");
}

// Get args
const args = process.argv.slice(2);
const dealIdArg = args[0];
const clientIdArg = args[1];
const sellerIdArg = args[2]; // Optional

if (dealIdArg === "all") {
  (async () => {
    console.log("Fetching all deals...");
    const { data: deals, error } = await supabase
      .from("deals")
      .select("id, client_id, seller_id");

    if (error || !deals) {
      console.error("Error fetching deals:", error);
      process.exit(1);
    }

    console.log(`Found ${deals.length} deals. Starting migration...`);

    for (const deal of deals) {
      if (!deal.client_id) {
        console.warn(`Skipping deal ${deal.id} - no client_id`);
        continue;
      }
      await migrateDocs(deal.id, deal.client_id, deal.seller_id);
    }

    console.log("All migrations completed.");
  })();
} else if (!dealIdArg || !clientIdArg) {
  console.log("Usage:");
  console.log("  Single deal: tsx scripts/migrate_deal_docs_to_client.ts <dealId> <clientId> [sellerId]");
  console.log("  All deals:   tsx scripts/migrate_deal_docs_to_client.ts all");
} else {
  migrateDocs(dealIdArg, clientIdArg, sellerIdArg);
}
