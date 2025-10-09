import { createSupabaseServiceClient } from "@/lib/supabase/server";

type SignedUrlOptions = {
  bucket: string;
  path: string | null | undefined;
  expiresIn?: number;
};

const DEFAULT_EXPIRATION = 60 * 60; // 1 hour

export async function createSignedStorageUrl({
  bucket,
  path,
  expiresIn = DEFAULT_EXPIRATION,
}: SignedUrlOptions): Promise<string | null> {
  if (!path) {
    return null;
  }

  try {
    const supabase = await createSupabaseServiceClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn, { download: true });

    if (error) {
      console.error("[storage] failed to create signed url", { bucket, path, error });
      return null;
    }

    return data?.signedUrl ?? null;
  } catch (error) {
    console.error("[storage] unexpected error generating signed url", error);
    return null;
  }
}
