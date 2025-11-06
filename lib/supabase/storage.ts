import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

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
  const normalizedPath = typeof path === "string" ? path.trim().replace(/^\/+/, "") : "";

  if (!normalizedPath) {
    console.warn("[storage] skipping signed url: empty path", { bucket, path });
    return null;
  }

  const attempts: Array<{
    label: "service" | "server";
    factory: () => Promise<SupabaseClient>;
  }> = [
    {
      label: "service",
      factory: () => createSupabaseServiceClient(),
    },
    {
      label: "server",
      factory: () => createSupabaseServerClient(),
    },
  ];

  for (const attempt of attempts) {
    let client: SupabaseClient;
    try {
      client = await attempt.factory();
    } catch (factoryError) {
      console.warn("[storage] unable to create", attempt.label, "supabase client for signed url", {
        bucket,
        path: normalizedPath,
        error: factoryError,
      });
      continue;
    }

    try {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(normalizedPath, expiresIn, { download: true });

      if (error) {
        const normalizedError = error as {
          status?: number;
          statusCode?: string | number;
          message?: string;
        };
        const statusCodeValue = normalizedError.statusCode ?? normalizedError.status;
        const statusCode = typeof statusCodeValue === "string"
          ? Number(statusCodeValue)
          : Number(statusCodeValue ?? NaN);
        const isNotFound =
          statusCode === 404 ||
          /not found/i.test(normalizedError.message ?? "") ||
          /object .+ does not exist/i.test(normalizedError.message ?? "");

        if (isNotFound) {
          console.warn("[storage] object not found, returning null URL", {
            bucket,
            path: normalizedPath,
          });
          return null;
        }

        console.error("[storage] failed to create signed url", {
          bucket,
          path: normalizedPath,
          error,
          clientType: attempt.label,
        });
        continue;
      }

      if (data?.signedUrl) {
        return data.signedUrl;
      }

      console.warn("[storage] createSignedUrl returned empty data", {
        bucket,
        path: normalizedPath,
        clientType: attempt.label,
      });
    } catch (error) {
      console.error("[storage] unexpected error generating signed url", {
        bucket,
        path: normalizedPath,
        error,
        clientType: attempt.label,
      });
    }
  }

  return null;
}
