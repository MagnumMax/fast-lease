import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/ssr";

import { resolveHomePath } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/auth/types";

async function fetchRoles(
  supabase: ReturnType<typeof createRouteHandlerClient<unknown>>,
  userId: string,
): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("[auth] failed to fetch roles in callback", error);
    return [];
  }

  return (data ?? [])
    .map((row) => row.role)
    .filter(Boolean) as AppRole[];
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  const supabase = createRouteHandlerClient({ cookies });

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
