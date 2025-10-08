import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isAccessAllowed, resolveHomePath } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/auth/types";

const AUTH_ROUTES = ["/login", "/register", "/auth/callback"];
const PROTECTED_PREFIXES = ["/client", "/ops", "/admin", "/investor"];

async function loadUserRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("[middleware] Failed to load user roles", error);
    return [];
  }

  return (data ?? [])
    .map((row) => row.role)
    .filter(Boolean) as AppRole[];
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function needsProtection(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function createSupabaseMiddlewareClient(
  req: NextRequest,
  res: NextResponse,
): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase middleware client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          try {
            res.cookies.set({ name, value, ...options });
          } catch {
            /* ignore read-only cookies */
          }
        });
      },
    },
  });
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return res;
  }

  const supabase = createSupabaseMiddlewareClient(req, res);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    if (needsProtection(pathname)) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return res;
  }

  const roles = await loadUserRoles(supabase, session.user.id);

  if (isAuthRoute(pathname) && roles.length) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = resolveHomePath(roles, "/");
    redirectUrl.searchParams.delete("next");
    return NextResponse.redirect(redirectUrl);
  }

  if (needsProtection(pathname)) {
    if (!isAccessAllowed(pathname, roles)) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = resolveHomePath(roles, "/");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
