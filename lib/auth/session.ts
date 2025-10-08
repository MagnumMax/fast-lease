import { cookies } from "next/headers";

import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { resolvePrimaryRole } from "@/lib/auth/roles";
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
    marketing_opt_in,
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
    marketing_opt_in: Boolean(marketing_opt_in),
    timezone,
    avatar_url,
    last_login_at,
    created_at,
    updated_at,
  };
}

async function fetchRoles(
  supabase: SupabaseClient,
  session: Session,
): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id);

  if (error) {
    console.error("[auth] failed to load roles", error);
    return [];
  }

  return (data ?? [])
    .map((row) => row.role)
    .filter(Boolean) as AppRole[];
}

async function fetchProfile(
  supabase: SupabaseClient,
  session: Session,
): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("[auth] failed to load profile", error);
    return null;
  }

  return normalizeProfile(data);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient({
    cookieStore: cookies(),
  });

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("[auth] failed to resolve session", error);
    return null;
  }

  if (!session) {
    return null;
  }

  const [profile, roles] = await Promise.all([
    fetchProfile(supabase, session),
    fetchRoles(supabase, session),
  ]);

  return {
    session,
    user: session.user,
    profile,
    roles,
    primaryRole: resolvePrimaryRole(roles),
  };
}
