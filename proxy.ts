import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractRolesFromUserMetadata,
  isAccessAllowed,
  normalizeRoleCode,
  resolveHomePath,
} from "./lib/auth/roles";
import {
  getDefaultRolesForSection,
  resolveSectionForPath,
  type AccessSection,
} from "./lib/auth/role-access";
import type { AppRole } from "./lib/auth/types";
const AUTH_ROUTES = ["/login", "/register", "/auth/callback"];

/**
 * ЗАЩИЩЕННЫЕ ПРЕФИКСЫ ПУТЕЙ
 * Доступ к этим разделам контролируется на основе ролей пользователя
 */
const PROTECTED_PREFIXES = [
  "/client",
  "/ops",
  "/admin",
  "/investor",
  "/finance",
  "/support",
  "/tech",
  "/risk",
  "/legal",
  "/accounting",
  "/workspace",
  "/settings",
];

type SectionOverrideResult = {
  roles: AppRole[];
  hasOverride: boolean;
};

async function loadSectionOverride(
  supabase: SupabaseClient,
  section: AccessSection,
): Promise<SectionOverrideResult> {
  const defaultRoles = getDefaultRolesForSection(section);
  const allowedRoles = new Set(defaultRoles);
  const { data, error } = await supabase
    .from("role_access_rules")
    .select("role, allowed")
    .eq("section", section);

  if (error) {
    console.error("[proxy] Failed to load role access overrides", { section, error });
    return { roles: defaultRoles, hasOverride: false };
  }

  if (!data || data.length === 0) {
    return { roles: defaultRoles, hasOverride: false };
  }

  for (const row of data as { role: unknown; allowed: boolean }[]) {
    const normalizedRole = normalizeRoleCode(row.role);
    if (normalizedRole) {
      if (row.allowed) {
        allowedRoles.add(normalizedRole);
      } else {
        allowedRoles.delete(normalizedRole);
      }
    }
  }

  return { roles: Array.from(allowedRoles), hasOverride: true };
}

async function loadUserRoles(
  supabase: SupabaseClient,
  userId: string,
  fallbackUser?: { app_metadata?: unknown; user_metadata?: unknown },
): Promise<AppRole[]> {
  console.log("[proxy] Loading roles for user:", userId);
  const { data: rolesData, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const metadataFallback = extractRolesFromUserMetadata(fallbackUser ?? null);

  if (error) {
    console.error("[proxy] Failed to load user roles", error);
    if (metadataFallback.length) {
      console.log("[proxy] Using metadata roles fallback", metadataFallback);
    }
    return metadataFallback;
  }

  console.log("[proxy] Raw roles data:", rolesData);
  const roles: AppRole[] = [];
  for (const row of rolesData ?? []) {
    const role = normalizeRoleCode((row as { role: unknown }).role);
    if (role) {
      roles.push(role);
    }
  }

  if (!roles.length && metadataFallback.length) {
    console.log("[proxy] Roles empty, using metadata fallback", metadataFallback);
    return metadataFallback;
  }

  console.log("[proxy] Processed roles:", roles);
  return roles;
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function needsProtection(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function createSupabaseProxyClient(
  req: NextRequest,
  res: NextResponse,
): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase proxy client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
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

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  console.log("[proxy] Processing request for:", pathname);
  console.log("[proxy] Is auth route:", isAuthRoute(pathname));
  console.log("[proxy] Needs protection:", needsProtection(pathname));

  if (pathname.startsWith("/beta/assets/")) {
    console.log("[proxy] Serving beta asset:", pathname);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return res;
  }

  // Для публичных маршрутов пропускаем обращение к Supabase
  if (!needsProtection(pathname) && !isAuthRoute(pathname)) {
    return res;
  }

  // Only hit Supabase for protected routes; skip on auth routes to reduce noisy fetch errors when offline.
  if (needsProtection(pathname)) {
    console.log("[proxy] Creating Supabase client for protected route");
    const supabase = createSupabaseProxyClient(req, res);

    // Используем getUser() вместо getSession() для безопасности
    console.log("[proxy] Calling supabase.auth.getUser()");
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error("[proxy] Auth error:", userError);
    } else {
      console.log("[proxy] User data:", userData.user ? "present" : "null");
    }

    if (userError || !userData.user) {
      console.log("[proxy] No user found, redirecting to login");
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    console.log("[proxy] Loading user roles for user:", userData.user.id);
    const roles = await loadUserRoles(supabase, userData.user.id, userData.user);
    console.log("[proxy] User roles:", roles);

    const section = resolveSectionForPath(pathname);
    let customAllowed: AppRole[] | null = null;
    if (section) {
      const override = await loadSectionOverride(supabase, section);
      if (override.hasOverride) {
        customAllowed = override.roles;
        console.log("[proxy] Using override access for section", section, override.roles);
      }
    }

    console.log("[proxy] Checking access for path:", pathname, "with roles:", roles);
    if (!isAccessAllowed(pathname, roles, customAllowed)) {
      console.log("[proxy] Access denied, redirecting to home path");
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = resolveHomePath(roles, "/");
      console.log("[proxy] Redirecting to:", redirectUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    console.log("[proxy] Access granted, proceeding");
    return res;
  }

  // Auth routes (/login, /register, /auth/callback) are public and should not call Supabase here.
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
