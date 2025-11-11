import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole, PortalCode } from "@/lib/auth/types";
import { APP_ROLE_PRIORITY, normalizeRoleCode } from "@/lib/auth/roles";
import {
  resolvePortalForRole,
  resolveDefaultRoleForPortal,
} from "@/lib/auth/portals";
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

  const defaultRole = resolveDefaultRoleForPortal("app") ?? "OP_MANAGER";

  const { error: roleError } = await serviceClient
    .from("user_roles")
    .upsert(
      {
        user_id: userId,
        role: defaultRole,
        portal: resolvePortalForRole(defaultRole),
      },
      { onConflict: "user_id,role,portal" },
    );

  if (roleError) {
    console.error("[auth] Failed to assign default role", roleError);
  }

  await upsertPortalAccess(serviceClient, userId, resolvePortalForRole(defaultRole));

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
        portal: resolvePortalForRole(role),
      },
      { onConflict: "user_id,role,portal" },
    );

  if (error) {
    console.error("[auth] Failed to assign role", { userId, role, error });
  }

  await upsertPortalAccess(serviceClientForRoles, userId, resolvePortalForRole(role));

  await syncUserRolesMetadata(serviceClientForRoles, userId);
}

async function upsertPortalAccess(
  serviceClient: SupabaseClient,
  userId: string,
  portal: PortalCode,
  status: string = "active",
) {
  const { error } = await serviceClient
    .from("user_portals")
    .upsert(
      {
        user_id: userId,
        portal,
        status,
      },
      { onConflict: "user_id,portal" },
    );

  if (error) {
    console.error("[auth] Failed to ensure portal access", {
      userId,
      portal,
      error,
    });
  }
}

export async function ensurePortalAccess(
  userId: string,
  portal: PortalCode,
  status: string = "active",
) {
  const serviceClient = await createSupabaseServiceClient();
  await upsertPortalAccess(serviceClient, userId, portal, status);
}
