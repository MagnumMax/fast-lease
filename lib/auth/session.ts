import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractRolesFromUserMetadata,
  normalizeRoleCode,
  resolvePrimaryRole,
} from "@/lib/auth/roles";
import type {
  AppRole,
  PortalCode,
  ProfileRecord,
  SessionUser,
} from "@/lib/auth/types";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeProfile(
  row: Record<string, unknown> | null,
): ProfileRecord | null {
  if (!row) return null;
  const {
    id,
    user_id,
    status,
    full_name,
    first_name,
    last_name,
    phone,
    emirates_id,
    passport_number,
    nationality,
    residency_status,
    date_of_birth,
    address,
    employment_info,
    financial_profile,
    metadata,
    timezone,
    avatar_url,
    last_login_at,
    created_at,
    updated_at,
    source,
    entity_type,
    seller_details,
  } = row as ProfileRecord;

  return {
    id,
    user_id,
    status,
    full_name,
    first_name,
    last_name,
    phone,
    emirates_id,
    passport_number,
    nationality,
    residency_status,
    date_of_birth,
    address: (address as Record<string, unknown>) ?? {},
    employment_info: (employment_info as Record<string, unknown>) ?? {},
    financial_profile: (financial_profile as Record<string, unknown>) ?? {},
    metadata: (metadata as Record<string, unknown>) ?? {},
    timezone,
    avatar_url,
    last_login_at,
    created_at,
    updated_at,
    source,
    entity_type,
    seller_details: (seller_details as Record<string, unknown>) ?? null,
  };
}

type RoleEntry = {
  role: AppRole;
  isReadOnly: boolean;
};

async function fetchRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<RoleEntry[]> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role, metadata")
      .eq("user_id", userId);

    if (error) {
      const isRetryable =
        (error as { message?: string }).message?.includes("fetch failed") ||
        (error as { message?: string }).message?.includes("timeout") ||
        (error as { code?: string }).code === "500" ||
        (error as { code?: string }).code === "502" ||
        (error as { code?: string }).code === "503" ||
        (error as { code?: string }).code === "504";

      if (isRetryable && attempts < maxAttempts - 1) {
        console.warn(
          `[auth] fetchRoles failed (attempt ${attempts + 1}/${maxAttempts}), retrying...`,
          error,
        );
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
        continue;
      }

      console.error("[auth] failed to load roles", error);
      return [];
    }

    const roles: RoleEntry[] = [];
    for (const row of data ?? []) {
      const role = normalizeRoleCode((row as { role: unknown }).role);
      if (role) {
        const metadata = (row as { metadata?: Record<string, unknown> | null }).metadata;
        roles.push({
          role,
          isReadOnly: Boolean(metadata && metadata.read_only === true),
        });
      }
    }

    return roles;
  }

  return [];
}

async function fetchPortals(
  supabase: SupabaseClient,
  userId: string,
): Promise<PortalCode[]> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from("user_portals")
      .select("portal")
      .eq("user_id", userId);

    if (error) {
      const isRetryable =
        (error as { message?: string }).message?.includes("fetch failed") ||
        (error as { message?: string }).message?.includes("timeout") ||
        (error as { code?: string }).code === "500" ||
        (error as { code?: string }).code === "502" ||
        (error as { code?: string }).code === "503" ||
        (error as { code?: string }).code === "504";

      if (isRetryable && attempts < maxAttempts - 1) {
        console.warn(
          `[auth] fetchPortals failed (attempt ${attempts + 1}/${maxAttempts}), retrying...`,
          error,
        );
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
        continue;
      }

      console.error("[auth] failed to load portals", error);
      return [];
    }

    const portals: PortalCode[] = [];
    for (const row of data ?? []) {
      const portal = (row as { portal: PortalCode | null }).portal;
      if (portal) {
        portals.push(portal);
      }
    }

    return portals;
  }

  return [];
}

async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRecord | null> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      const isRetryable =
        (error as { message?: string }).message?.includes("fetch failed") ||
        (error as { message?: string }).message?.includes("timeout") ||
        (error as { code?: string }).code === "500" ||
        (error as { code?: string }).code === "502" ||
        (error as { code?: string }).code === "503" ||
        (error as { code?: string }).code === "504";

      if (isRetryable && attempts < maxAttempts - 1) {
        console.warn(
          `[auth] fetchProfile failed (attempt ${attempts + 1}/${maxAttempts}), retrying...`,
          error,
        );
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
        continue;
      }

      console.error("[auth] failed to load profile", error);
      return null;
    }

    return normalizeProfile(data);
  }

  return null;
}

/**
 * GETTING CURRENT USER INFORMATION
 *
 * Uses supabase.auth.getUser() instead of getSession() for security
 * getUser() authenticates data through Supabase Auth server
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();

  // Using getUser() instead of getSession() for security
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("[auth] failed to resolve user", userError);
    return null;
  }

  const user = userData.user;
  if (!user) {
    console.log("[auth] no user found in session");
    return null;
  }

  console.log("[auth] user found:", user.id, user.email);

  // Getting session separately for additional information
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session ?? null;

  console.log("[auth] session found:", !!session);

  const metadataRoles = extractRolesFromUserMetadata(user);

  console.log("[auth] metadata roles:", metadataRoles);

  const [profile, roleEntries, portals] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchRoles(supabase, user.id),
    fetchPortals(supabase, user.id),
  ]);

  console.log("[auth] profile loaded:", !!profile);
  console.log("[auth] role entries:", roleEntries);
  console.log("[auth] portals:", portals);

  const tableRoles = roleEntries.map((entry) => entry.role);
  const uniqueTableRoles = tableRoles.filter(
    (role, index, array) => array.indexOf(role) === index,
  );
  const tableReadOnlyRoles = roleEntries
    .filter((entry) => entry.isReadOnly)
    .map((entry) => entry.role);

  const rolesSource = uniqueTableRoles.length ? uniqueTableRoles : metadataRoles;
  const roles = rolesSource.filter((role, index, array) => array.indexOf(role) === index);
  const readOnlyRoles = uniqueTableRoles.length
    ? Array.from(new Set(tableReadOnlyRoles))
    : [];
  const primaryRole = resolvePrimaryRole(roles.length ? roles : metadataRoles);

  console.log("[auth] final roles:", roles, "primary:", primaryRole, "readOnly:", readOnlyRoles);

  return {
    session,
    portals,
    user,
    profile,
    roles,
    readOnlyRoles,
    primaryRole,
  };
}
