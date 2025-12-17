"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileSearchResult = {
  id: string; // user_id
  full_name: string;
  phone: string | null;
  entity_type: string | null;
  email?: string;
};

export async function searchProfiles(
  query: string,
  roleFilter?: "buyer" | "seller" | "broker" | "all",
): Promise<ProfileSearchResult[]> {
  const supabase = await createSupabaseServerClient();

  let role: string | null = null;
  if (roleFilter === "buyer") role = "CLIENT";
  else if (roleFilter === "seller") role = "SELLER";
  else if (roleFilter === "broker") role = "BROKER";

  let dbQuery = supabase
    .from("profiles")
    .select(`
      user_id,
      full_name,
      phone,
      entity_type,
      user_roles!inner (
        role
      )
    `)
    .ilike("full_name", `%${query}%`)
    .limit(20);

  if (role) {
    dbQuery = dbQuery.eq("user_roles.role", role);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("[searchProfiles] error:", error);
    return [];
  }

  return data.map((p: any) => ({
    id: p.user_id,
    full_name: p.full_name,
    phone: p.phone,
    entity_type: p.entity_type,
  }));
}

export async function getProfile(userId: string): Promise<ProfileSearchResult | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone, entity_type")
    .eq("user_id", userId)
    .single();

  if (error) return null;

  return {
    id: data.user_id,
    full_name: data.full_name,
    phone: data.phone,
    entity_type: data.entity_type,
  };
}
