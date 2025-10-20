import { AppRole } from "@/lib/auth/types";
import {
  APP_ROLE_HOME_PATH as ROLE_HOME_PATH_DATA,
  APP_ROLE_PRIORITY as ROLE_PRIORITY_DATA,
} from "@/lib/data/app-roles";

export const APP_ROLE_PRIORITY = ROLE_PRIORITY_DATA;

/**
 * ROLE TO HOME PATH MAPPING
 *
 * Determines where user is redirected after login
 * based on their primary role
 */
export const APP_ROLE_HOME_PATH = ROLE_HOME_PATH_DATA;

type AccessRule = {
  test: (pathname: string) => boolean;
  allowed: AppRole[];
};

const ADMIN_OVERRIDES: AppRole[] = ["ADMIN"];

const accessRules: AccessRule[] = [
  {
    test: (pathname) => pathname.startsWith("/client"),
    allowed: ["CLIENT"],
  },
  {
    test: (pathname) => pathname.startsWith("/ops"),
    allowed: ["OP_MANAGER", "OPERATOR", "SUPPORT", "FINANCE", "ADMIN"],
  },
  {
    test: (pathname) => pathname.startsWith("/admin"),
    allowed: ["ADMIN"],
  },
  {
    test: (pathname) => pathname.startsWith("/investor"),
    allowed: ["INVESTOR", "ADMIN"],
  },
  {
    test: (pathname) => pathname.startsWith("/settings"),
    allowed: ["CLIENT", "OP_MANAGER", "OPERATOR", "SUPPORT", "FINANCE"],
  },
];

export function resolvePrimaryRole(roles: AppRole[]): AppRole | null {
  for (const role of APP_ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return roles[0] ?? null;
}

export function resolveHomePath(
  roles: AppRole[],
  fallback: string = "/",
): string {
  const primary = resolvePrimaryRole(roles);
  if (!primary) return fallback;

  return APP_ROLE_HOME_PATH[primary] ?? fallback;
}

export function allowedRolesForPath(pathname: string): AppRole[] | null {
  const normalized = pathname.toLowerCase();
  const match = accessRules.find((rule) => rule.test(normalized));
  if (!match) return null;
  return match.allowed;
}

export function isAccessAllowed(pathname: string, roles: AppRole[]): boolean {
  if (!roles.length) return false;
  if (roles.some((role) => ADMIN_OVERRIDES.includes(role))) {
    return true;
  }

  const allowed = allowedRolesForPath(pathname);
  if (!allowed) {
    return true;
  }

  return roles.some((role) => allowed.includes(role));
}

/**
 * VALIDATE PATH FOR ROLE
 *
 * Safe function to get correct path for role
 * Returns "/client/dashboard" as fallback for unknown roles
 */
export function validateRolePath(role: AppRole | null): string {
  if (!role) {
    console.error(`[ERROR] Role validation failed: role is null or undefined`);
    return "/client/dashboard";
  }

  const targetPath = APP_ROLE_HOME_PATH[role];
  if (!targetPath) {
    console.error(`[ERROR] Role validation failed: no path found for role ${role}`);
    return "/client/dashboard";
  }

  return targetPath;
}
