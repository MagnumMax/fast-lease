
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowTaskDefinition, WorkflowTaskSchema } from "./types";

interface ProfileDocument {
  id: string;
  document_type: string;
  storage_path: string;
  title: string;
  mime_type: string;
  file_size: number;
}

interface ProfileData {
  id: string; // profile PK
  user_id: string;
  metadata: Record<string, unknown>;
  seller_details: Record<string, unknown>;
}

export class ProfileSyncService {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Pre-fills a task payload with data from the buyer/seller profile
   * based on the task definition's `save_to_buyer_profile` or `save_to_seller_profile` lists.
   */
  async prefillTask(
    dealId: string,
    taskDefinition: WorkflowTaskDefinition,
  ): Promise<Record<string, unknown>> {
    const schema = taskDefinition.schema;
    if (!schema) return {};

    const buyerFields = schema.save_to_buyer_profile || [];
    const sellerFields = schema.save_to_seller_profile || [];

    if (buyerFields.length === 0 && sellerFields.length === 0) {
      return {};
    }

    const { data: deal, error: dealError } = await this.client
      .from("deals")
      .select("client_id, seller_id")
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      console.error("[ProfileSync] Failed to load deal", dealError);
      return {};
    }

    const prefilledData: Record<string, unknown> = {};

    if (buyerFields.length > 0 && deal.client_id) {
      await this.enrichFromProfile(
        deal.client_id,
        buyerFields,
        prefilledData,
        "buyer"
      );
    }

    if (sellerFields.length > 0 && deal.seller_id) {
      await this.enrichFromProfile(
        deal.seller_id,
        sellerFields,
        prefilledData,
        "seller"
      );
    }

    return prefilledData;
  }

  /**
   * Saves task payload data back to the buyer/seller profile
   * based on the task definition's `save_to...` lists.
   */
  async saveTaskDataToProfile(
    dealId: string,
    taskPayload: Record<string, unknown>,
    taskSchema: WorkflowTaskSchema,
  ): Promise<void> {
    const buyerFields = taskSchema.save_to_buyer_profile || [];
    const sellerFields = taskSchema.save_to_seller_profile || [];

    if (buyerFields.length === 0 && sellerFields.length === 0) {
      return;
    }

    const { data: deal, error: dealError } = await this.client
      .from("deals")
      .select("client_id, seller_id")
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      console.error("[ProfileSync] Failed to load deal for save", dealError);
      return;
    }

    const fieldsBranch = (taskPayload.fields as Record<string, unknown>) || {};
    const schemaFields = taskSchema.fields || [];

    if (buyerFields.length > 0 && deal.client_id) {
      await this.saveToProfile(
        deal.client_id,
        buyerFields,
        fieldsBranch,
        schemaFields,
        "buyer"
      );
    }

    if (sellerFields.length > 0 && deal.seller_id) {
      await this.saveToProfile(
        deal.seller_id,
        sellerFields,
        fieldsBranch,
        schemaFields,
        "seller"
      );
    }
  }

  // --- Private Helpers ---

  private async enrichFromProfile(
    userId: string,
    targetFields: string[],
    acc: Record<string, unknown>,
    role: "buyer" | "seller"
  ) {
    // 1. Get Profile
    const { data: profile, error: profileError } = await this.client
      .from("profiles")
      .select("id, metadata, seller_details")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.warn(`[ProfileSync] Profile not found for ${role} (user_id: ${userId})`);
      return;
    }

    // 2. Get Documents
    const { data: documents, error: docsError } = await this.client
      .from("profile_documents")
      .select("*")
      .eq("profile_id", profile.id);

    if (docsError) {
      console.warn(`[ProfileSync] Failed to load docs for ${role}`, docsError);
    }

    const docsMap = new Map<string, ProfileDocument>();
    if (documents) {
      for (const doc of documents) {
        // We use document_type as key.
        // If multiple docs have same type, we take the latest (or just one).
        docsMap.set(doc.document_type, doc as ProfileDocument);
      }
    }

    const sourceData = role === "buyer" ? (profile.metadata as Record<string, unknown>) : (profile.seller_details as Record<string, unknown>);

    for (const fieldId of targetFields) {
      // Is it a document?
      // We assume if it's in the profile_documents map (by checking fieldId against document_type), it's a doc.
      // BUT, the fieldId in task (e.g. 'doc_passport') might match document_type 'doc_passport'.
      // OR, the task field is a text field.

      // Strategy:
      // 1. Check if we have a document with this type.
      // 2. If yes, populate the file field structure.
      // 3. If no, check metadata/seller_details for the value.

      if (docsMap.has(fieldId)) {
        const doc = docsMap.get(fieldId)!;
        acc[fieldId] = {
          path: doc.storage_path,
          name: doc.title || doc.storage_path.split("/").pop(),
          type: doc.mime_type,
          size: doc.file_size,
        };
      } else if (sourceData && sourceData[fieldId] !== undefined) {
        acc[fieldId] = sourceData[fieldId];
      }
    }
  }

  private async saveToProfile(
    userId: string,
    targetFields: string[],
    payload: Record<string, unknown>,
    schemaFields: WorkflowTaskSchema["fields"],
    role: "buyer" | "seller"
  ) {
    // 1. Get Profile
    const { data: profile, error: profileError } = await this.client
      .from("profiles")
      .select("id, metadata, seller_details")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error(`[ProfileSync] Profile not found for save ${role}`, profileError);
      return;
    }

    const updates: Record<string, unknown> = {};
    const textDataKey = role === "buyer" ? "metadata" : "seller_details";
    const currentTextData = (profile[textDataKey] as Record<string, unknown>) || {};
    let textDataChanged = false;

    for (const fieldId of targetFields) {
      const value = payload[fieldId];
      if (value === undefined || value === null) continue;

      // Find field definition to know type
      const fieldDef = schemaFields.find((f) => f.id === fieldId);
      const isFile = fieldDef?.type === "file";
      // Fallback: check if value looks like a file object
      const valueIsFile =
        typeof value === "object" &&
        value !== null &&
        "path" in value &&
        "type" in value;

      if (isFile || valueIsFile) {
        // Handle Document
        const fileData = value as { path: string; name: string; type: string; size: number };
        const docType = fieldDef?.document_type || fieldId; // Use document_type from schema or fieldId
        
        await this.upsertProfileDocument(profile.id, docType, fileData, fieldDef?.label || fieldId);
      } else {
        // Handle Text
        if (currentTextData[fieldId] !== value) {
          currentTextData[fieldId] = value;
          textDataChanged = true;
        }
      }
    }

    // Save text updates
    if (textDataChanged) {
      await this.client
        .from("profiles")
        .update({ [textDataKey]: currentTextData })
        .eq("id", profile.id);
    }
  }

  private async upsertProfileDocument(
    profileId: string,
    documentType: string,
    fileData: { path: string; name: string; type: string; size: number },
    title: string
  ) {
    // Check existing
    const { data: existing } = await this.client
      .from("profile_documents")
      .select("id")
      .eq("profile_id", profileId)
      .eq("document_type", documentType)
      .maybeSingle();

    if (existing) {
      // Update
      await this.client
        .from("profile_documents")
        .update({
          storage_path: fileData.path,
          title: title,
          mime_type: fileData.type,
          file_size: fileData.size,
          uploaded_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Insert
      await this.client.from("profile_documents").insert({
        profile_id: profileId,
        document_type: documentType,
        storage_path: fileData.path,
        title: title,
        mime_type: fileData.type,
        file_size: fileData.size,
        status: "verified", // Auto-verify from workflow? Or 'pending'? Let's assume verified if coming from workflow completion.
        uploaded_by: null, // System
      });
    }
  }
}
