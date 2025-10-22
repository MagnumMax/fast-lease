import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseServerClientOptions = {
  cookieStore?: Awaited<ReturnType<typeof cookies>>;
};

// Лог для диагностики проблемы с клиентским/серверным контекстом
const LOG_PREFIX = "[SERVER-CLIENT]";

async function resolveCookieStore(
  provided?: SupabaseServerClientOptions["cookieStore"],
) {
  if (provided) {
    return provided;
  }

  return cookies();
}

export async function createSupabaseServerClient(
  options: SupabaseServerClientOptions = {},
) {
  const cookieStore = await resolveCookieStore(options.cookieStore);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase server client is missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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

export async function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase service client is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll() {
        return [];
      },
    },
  });
}
