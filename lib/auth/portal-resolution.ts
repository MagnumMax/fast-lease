import type { User } from "@supabase/supabase-js";

import {
  extractRolesFromUserMetadata,
  resolveHomePath,
  resolvePrimaryRole,
  validateRolePath,
} from "@/lib/auth/roles";
import { resolvePortalForRole, resolvePortalHomePath } from "@/lib/auth/portals";
import type { AppRole, PortalCode } from "@/lib/auth/types";

type MinimalAuthUser = Pick<User, "email" | "app_metadata" | "user_metadata"> | null;

const DEFAULT_PORTAL: PortalCode = "client";

export function heuristicPortalsForEmail(email: string): PortalCode[] {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) {
    return [DEFAULT_PORTAL];
  }

  if (domain.endsWith("fastlease.ae")) {
    return ["app"];
  }

  if (domain.includes("investor")) {
    return ["investor"];
  }

  return [DEFAULT_PORTAL];
}

export function inferPortalForEmail(email: string): PortalCode {
  const candidates = heuristicPortalsForEmail(email);
  return candidates[0] ?? DEFAULT_PORTAL;
}

export function resolvePortalFromAuthUser(
  user: MinimalAuthUser,
  emailHint?: string | null,
): {
  portal: PortalCode;
  roles: AppRole[];
  preferredRole: AppRole | null;
} {
  const roles = extractRolesFromUserMetadata(user);
  const preferredRole = resolvePrimaryRole(roles);
  const fallbackEmail = emailHint ?? user?.email ?? "";

  const portal = preferredRole
    ? resolvePortalForRole(preferredRole)
    : inferPortalForEmail(fallbackEmail);

  return {
    portal,
    roles,
    preferredRole,
  };
}

type RedirectOptions = {
  nextPath?: string | null;
  preferredRole?: AppRole | null;
  roles?: AppRole[];
};

export function resolveRedirectPathForPortal(
  portal: PortalCode,
  options: RedirectOptions = {},
): string {
  const { nextPath, preferredRole, roles } = options;

  if (nextPath) {
    return nextPath;
  }

  if (preferredRole) {
    return validateRolePath(preferredRole);
  }

  if (roles && roles.length) {
    return resolveHomePath(roles, resolvePortalHomePath(portal));
  }

  return resolvePortalHomePath(portal);
}
