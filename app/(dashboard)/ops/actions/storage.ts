"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getMutationSessionUser } from "@/lib/auth/guards";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";
import { sanitizeFileName } from "@/lib/documents/upload";

const ALLOWED_BUCKETS = new Set([
  "deal-documents",
  "profile-documents",
  "vehicle-documents",
  "vehicle-images",
]);

export type GetSignedUploadUrlResult =
  | { success: true; url: string; path: string; token: string }
  | { success: false; error: string; code?: string };

export async function getSignedUploadUrlAction(input: {
  bucket: string;
  path: string;
}): Promise<GetSignedUploadUrlResult> {
  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { success: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  const { bucket, path } = input;

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return { success: false, error: "Invalid bucket" };
  }

  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[storage] failed to create signed upload url", error);
    return { 
      success: false, 
      error: error?.message || "Не удалось получить ссылку для загрузки",
      code: error?.name
    };
  }

  return { success: true, url: data.signedUrl, path: data.path, token: data.token };
}
