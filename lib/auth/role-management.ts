import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/lib/auth/types";
import { APP_ROLE_PRIORITY, normalizeRoleCode } from "@/lib/auth/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function syncUserRolesMetadata(
  serviceClient: SupabaseClient,
  userId: string,
) {
  const { data: rolesRows, error: rolesError } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    console.error("[auth] Failed to load roles for metadata sync", {
      userId,
      error: rolesError,
    });
    return;
  }

  const uniqueRoles = new Set<AppRole>();
  for (const row of rolesRows ?? []) {
    const role = normalizeRoleCode((row as { role: unknown }).role);
    if (role) {
      uniqueRoles.add(role);
    }
  }

  const roles = Array.from(uniqueRoles).sort(
    (a, b) => APP_ROLE_PRIORITY.indexOf(a) - APP_ROLE_PRIORITY.indexOf(b),
  );
  const primaryRole = roles[0] ?? null;

  if (!roles.length && !primaryRole) {
    return;
  }

  const { data: userData, error: fetchUserError } =
    await serviceClient.auth.admin.getUserById(userId);

  if (fetchUserError || !userData?.user) {
    console.error("[auth] Failed to load user for metadata sync", {
      userId,
      error: fetchUserError,
    });
    return;
  }

  const existingAppMetadata =
    (userData.user.app_metadata as Record<string, unknown> | null) ?? {};
  const existingUserMetadata =
    (userData.user.user_metadata as Record<string, unknown> | null) ?? {};

  const updatedAppMetadata = {
    ...existingAppMetadata,
    roles,
    primary_role: primaryRole,
  } satisfies Record<string, unknown>;

  const updatedUserMetadata = {
    ...existingUserMetadata,
    roles,
    primary_role: primaryRole,
  } satisfies Record<string, unknown>;

  const { error: updateError } = await serviceClient.auth.admin.updateUserById(
    userId,
    {
      app_metadata: updatedAppMetadata,
      user_metadata: updatedUserMetadata,
    },
  );

  if (updateError) {
    console.error("[auth] Failed to sync user metadata with roles", {
      userId,
      error: updateError,
    });
  }
}

export async function ensureDefaultProfileAndRole(
  supabase: SupabaseClient,
  userId: string,
) {
  const serviceClient = await createSupabaseServiceClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        full_name: null,
        status: "pending",
      },
      { onConflict: "user_id" },
    );

  if (profileError) {
    console.error("[auth] Failed to upsert profile", profileError);
  }

  const { error: roleError } = await serviceClient
    .from("user_roles")
    .upsert(
      {
        user_id: userId,
        role: "CLIENT",
      },
      { onConflict: "user_id,role" },
    );

  if (roleError) {
    console.error("[auth] Failed to assign default role", roleError);
  }

  await syncUserRolesMetadata(serviceClient, userId);
}

export async function ensureRoleAssignment(
  userId: string,
  role: AppRole | null,
) {
  const serviceClientForRoles = await createSupabaseServiceClient();

  if (!role) {
    await syncUserRolesMetadata(serviceClientForRoles, userId);
    return;
  }

  const { error } = await serviceClientForRoles
    .from("user_roles")
    .upsert(
      {
        user_id: userId,
        role,
      },
      { onConflict: "user_id,role" },
    );

  if (error) {
    console.error("[auth] Failed to assign role", { userId, role, error });
  }

  await syncUserRolesMetadata(serviceClientForRoles, userId);
}
