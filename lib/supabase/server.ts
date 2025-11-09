import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseServerClientOptions = {
  cookieStore?: Awaited<ReturnType<typeof cookies>>;
};

// Лог для диагностики проблемы с клиентским/серверным контекстом
const LOG_PREFIX = "[SERVER-CLIENT]";

type ResolvedEnvVar = {
  key: string;
  value: string;
};

async function resolveCookieStore(
  provided?: SupabaseServerClientOptions["cookieStore"],
) {
  if (provided) {
    return provided;
  }

  return cookies();
}

function resolveEnvVariable(...keys: string[]): ResolvedEnvVar | null {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) {
      return { key, value };
    }
  }

  return null;
}

export async function createSupabaseServerClient(
  options: SupabaseServerClientOptions = {},
) {
  const cookieStore = await resolveCookieStore(options.cookieStore);

  const supabaseUrlVar = resolveEnvVariable(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  );
  const supabaseAnonKeyVar = resolveEnvVariable(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  );

  console.log(
    `${LOG_PREFIX} Server client URL env key:`,
    supabaseUrlVar?.key ?? "missing",
  );
  console.log(
    `${LOG_PREFIX} Server client anon key env key:`,
    supabaseAnonKeyVar?.key ?? "missing",
  );

  if (!supabaseUrlVar || !supabaseAnonKeyVar) {
    throw new Error(
      "Supabase server client is missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient(supabaseUrlVar.value, supabaseAnonKeyVar.value, {
    cookies: {
      getAll() {
        return cookieStore
          .getAll()
          .map(({ name, value }) => ({ name, value }));
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* cookies() is read-only in edge/server components */
          }
        }
      },
    },
  });
}

export async function createSupabaseServiceClient(): Promise<SupabaseClient> {
  const supabaseUrlVar = resolveEnvVariable(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  );
  const serviceRoleKeyVar = resolveEnvVariable(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET",
  );

  console.log(
    `${LOG_PREFIX} Service client URL env key:`,
    supabaseUrlVar?.key ?? "missing",
  );

  if (!supabaseUrlVar || !serviceRoleKeyVar) {
    throw new Error(
      "Supabase service client is missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET).",
    );
  }

  return createServerClient(supabaseUrlVar.value, serviceRoleKeyVar.value, {
    cookies: {
      getAll() {
        return [];
      },
    },
  });
}
