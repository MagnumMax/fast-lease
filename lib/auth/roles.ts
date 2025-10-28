import { AppRole } from "../auth/types";
import {
  APP_ROLE_HOME_PATH as ROLE_HOME_PATH_DATA,
  APP_ROLE_PRIORITY as ROLE_PRIORITY_DATA,
} from "../data/app-roles";
import { getDefaultRolesForPath } from "./role-access";

export const APP_ROLE_PRIORITY = ROLE_PRIORITY_DATA;

const KNOWN_ROLES = new Set<AppRole>(APP_ROLE_PRIORITY);

/**
 * ROLE TO HOME PATH MAPPING
 *
 * Determines where user is redirected after login
 * based on their primary role
 */
export const APP_ROLE_HOME_PATH = ROLE_HOME_PATH_DATA;

export function normalizeRoleCode(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return KNOWN_ROLES.has(normalized as AppRole)
    ? (normalized as AppRole)
    : null;
}

function appendRolesFromSource(source: unknown, target: Set<AppRole>) {
  if (!source) return;

  if (Array.isArray(source)) {
    for (const item of source) {
      const role = normalizeRoleCode(item);
      if (role) {
        target.add(role);
      }
    }
    return;
  }

  if (typeof source === "string") {
    const role = normalizeRoleCode(source);
    if (role) {
      target.add(role);
    }
    return;
  }

  if (typeof source === "object") {
    const record = source as Record<string, unknown>;
    appendRolesFromSource(record.roles, target);
    appendRolesFromSource(record.primary_role, target);
    appendRolesFromSource(record.primaryRole, target);
  }
}

export function extractRolesFromUserMetadata(
  user: { app_metadata?: unknown; user_metadata?: unknown } | null,
): AppRole[] {
  if (!user) return [];

  const roles = new Set<AppRole>();
  appendRolesFromSource(user.app_metadata, roles);
  appendRolesFromSource(user.user_metadata, roles);

  return Array.from(roles).sort(
    (a, b) => APP_ROLE_PRIORITY.indexOf(a) - APP_ROLE_PRIORITY.indexOf(b),
  );
}

const ADMIN_OVERRIDES: AppRole[] = ["ADMIN"];

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
  return getDefaultRolesForPath(pathname);
}

export function isAccessAllowed(
  pathname: string,
  roles: AppRole[],
  customAllowed?: AppRole[] | null,
): boolean {
  if (!roles.length) return false;
  if (roles.some((role) => ADMIN_OVERRIDES.includes(role))) {
    return true;
  }

  const allowed = customAllowed ?? allowedRolesForPath(pathname);
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
