import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveHomePath } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function fetchRoles(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .returns<{ role: AppRole | null }[]>();

  if (error) {
    console.error("[auth] failed to fetch roles in callback", error);
    return [];
  }

  return (data ?? [])
    .map((row) => row.role)
    .filter((role): role is AppRole => Boolean(role));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth] exchange code failed", error);
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let roles: AppRole[] = [];
  if (session) {
    roles = await fetchRoles(supabase, session.user.id);
  }

  const redirectPath = next || resolveHomePath(roles, "/client/dashboard");
  const redirectUrl = new URL(redirectPath, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
