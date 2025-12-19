"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";

export type ProfileSearchResult = {
  id: string; // user_id
  full_name: string;
  phone: string | null;
  entity_type: string | null;
  email?: string;
};

export type ProfileDocumentWithUrl = {
  id: string;
  document_type: string | null;
  title: string | null;
  status: string | null;
  storage_path: string | null;
  metadata?: Record<string, unknown> | null;
  signedUrl: string | null;
  uploaded_at?: string | null;
};

export type ProfileSummaryPayload = {
  name: string | null;
  entityType: string | null;
  email: string | null;
  phone: string | null;
  documents: ProfileDocumentWithUrl[];
};

export async function getProfileSummary(userId: string): Promise<ProfileSummaryPayload | null> {
  const supabase = await createSupabaseServerClient();
  
  // 1. Get Profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, entity_type, metadata")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    console.error("[getProfileSummary] Profile fetch error:", profileError);
    return null;
  }

  // Extract email from metadata
  let email: string | null = null;
  if (profile.metadata && typeof profile.metadata === "object" && profile.metadata !== null && "email" in profile.metadata) {
     email = (profile.metadata as { email?: string }).email ?? null;
  }
  
  // 2. Get Documents
  const { data: docs, error: docsError } = await supabase
    .from("profile_documents")
    .select("id, document_type, title, status, storage_path, metadata, uploaded_at")
    .eq("profile_id", profile.id);

  if (docsError) {
     console.error("[getProfileSummary] Docs fetch error:", docsError);
  }

  const documents: ProfileDocumentWithUrl[] = [];
  if (docs) {
     for (const doc of docs) {
        let signedUrl: string | null = null;
        if (doc.storage_path) {
           // Try common buckets
           const buckets = ["profile-documents", "client-documents", "deal-documents"];
           // Check metadata for bucket hint
           const meta = doc.metadata as any;
           if (meta?.bucket) buckets.unshift(meta.bucket);
           
           for (const bucket of Array.from(new Set(buckets))) {
              signedUrl = await createSignedStorageUrl({ bucket, path: doc.storage_path });
              if (signedUrl) break;
           }
        }
        
        documents.push({
           id: doc.id,
           document_type: doc.document_type,
           title: doc.title,
           status: doc.status,
           storage_path: doc.storage_path,
           metadata: doc.metadata as any,
           signedUrl,
           uploaded_at: doc.uploaded_at
        });
     }
  }

  return {
    name: profile.full_name,
    entityType: profile.entity_type,
    email,
    phone: profile.phone,
    documents
  };
}

export async function searchProfiles(
  query: string,
  roleFilter?: "buyer" | "seller" | "broker" | "all",
): Promise<ProfileSearchResult[]> {
  const supabase = await createSupabaseServerClient();

  let role: string | null = null;
  if (roleFilter === "buyer") role = "CLIENT";
  else if (roleFilter === "seller") role = "SELLER";
  else if (roleFilter === "broker") role = "BROKER";

  let dbQuery = supabase
    .from("profiles")
    .select(`
      user_id,
      full_name,
      phone,
      entity_type,
      user_roles!inner (
        role
      )
    `)
    .ilike("full_name", `%${query}%`)
    .limit(20);

  if (role) {
    dbQuery = dbQuery.eq("user_roles.role", role);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("[searchProfiles] error:", error);
    return [];
  }

  return data.map((p: any) => ({
    id: p.user_id,
    full_name: p.full_name,
    phone: p.phone,
    entity_type: p.entity_type,
  }));
}

export async function getProfile(userId: string): Promise<ProfileSearchResult | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone, entity_type")
    .eq("user_id", userId)
    .single();

  if (error) return null;

  return {
    id: data.user_id,
    full_name: data.full_name,
    phone: data.phone,
    entity_type: data.entity_type,
  };
}
