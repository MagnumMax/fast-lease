import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractRolesFromUserMetadata,
  normalizeRoleCode,
  resolvePrimaryRole,
} from "@/lib/auth/roles";
import type { AppRole, ProfileRecord, SessionUser } from "@/lib/auth/types";

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
  };
}

async function fetchRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("[auth] failed to load roles", error);
    return [];
  }

  const roles: AppRole[] = [];
  for (const row of data ?? []) {
    const role = normalizeRoleCode((row as { role: unknown }).role);
    if (role) {
      roles.push(role);
    }
  }

  return roles;
}

async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] failed to load profile", error);
    return null;
  }

  return normalizeProfile(data);
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
    return null;
  }

  // Getting session separately for additional information
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session ?? null;

  const metadataRoles = extractRolesFromUserMetadata(user);

  const [profile, rolesFromTable] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchRoles(supabase, user.id),
  ]);

  const roles = (rolesFromTable.length ? rolesFromTable : metadataRoles).filter(
    (role, index, array) => array.indexOf(role) === index,
  );
  const primaryRole = resolvePrimaryRole(
    roles.length ? roles : metadataRoles,
  );

  return {
    session,
    user,
    profile,
    roles,
    primaryRole,
  };
}
