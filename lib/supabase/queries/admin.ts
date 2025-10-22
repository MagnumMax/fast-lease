import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

import {
  ADMIN_AUDIT_LOG_FALLBACK,
  ADMIN_USERS_FALLBACK,
  type AdminAuditLogEntry,
  type AdminUserRecord,
  type AdminUserStatus,
} from "@/lib/data/admin/users";
import {
  ADMIN_PROCESSES_FALLBACK,
  ADMIN_PROCESS_VERSIONS_FALLBACK,
  type AdminProcessRecord,
  type AdminProcessVersion,
} from "@/lib/data/admin/bpm";
import {
  ADMIN_INTEGRATION_LOGS_FALLBACK,
  ADMIN_INTEGRATIONS_FALLBACK,
  type AdminIntegrationLogEntry,
  type AdminIntegrationRecord,
} from "@/lib/data/admin/integrations";
import type { AppRole } from "@/lib/auth/types";

type ProfileRow = {
  id: string;
  user_id: string;
  status: string;
  full_name: string | null;
  phone: string | null;
  metadata: Record<string, unknown> | null;
  last_login_at: string | null;
};

type UserRoleRow = {
  user_id: string;
  role: AppRole;
  assigned_at: string;
  metadata: Record<string, unknown> | null;
};

type AuthUserRow = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown> | null;
  last_sign_in_at: string | null;
  created_at: string;
};

const STATUS_SAFE_VALUES: AdminUserStatus[] = ["active", "pending", "suspended", "archived"];

function normaliseStatus(status: string | null | undefined): AdminUserStatus {
  if (!status) return "pending";
  return STATUS_SAFE_VALUES.includes(status as AdminUserStatus)
    ? (status as AdminUserStatus)
    : "pending";
}

function createUserRecord(
  profile: ProfileRow,
  authUser: AuthUserRow | null,
  roles: UserRoleRow[],
): AdminUserRecord {
  const primaryEmail =
    authUser?.email ??
    (typeof profile.metadata?.email === "string" ? (profile.metadata.email as string) : "");

  const roleSet = new Set<AppRole>();
  for (const roleEntry of roles) {
    if (roleEntry.role) {
      roleSet.add(roleEntry.role);
    }
  }

  let invitationSentAt: string | null = null;
  if (profile.status === "pending") {
    const invitedRole = roles.at(-1);
    invitationSentAt = invitedRole?.assigned_at ?? authUser?.created_at ?? null;
  }

  return {
    id: profile.id,
    name: profile.full_name ?? primaryEmail ?? "—",
    fullName: profile.full_name ?? primaryEmail ?? "—",
    email: primaryEmail ?? "—",
    role: Array.from(roleSet)[0] ?? "CLIENT",
    roles: Array.from(roleSet),
    status: normaliseStatus(profile.status),
    lastLogin: profile.last_login_at ?? authUser?.last_sign_in_at ?? "—",
    lastLoginAt: profile.last_login_at ?? authUser?.last_sign_in_at ?? null,
    invitationSentAt,
    createdAt: authUser?.created_at ?? new Date().toISOString(),
  };
}

export type AdminUserDirectory = {
  users: AdminUserRecord[];
  auditLog: AdminAuditLogEntry[];
};

export async function getAdminUserDirectory(): Promise<AdminUserDirectory> {
  try {
    const supabase = await createSupabaseServerClient();

    const [profilesResult, rolesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_id, status, full_name, phone, metadata, last_login_at")
        .order("full_name", { ascending: true })
        .returns<ProfileRow[]>(),
      supabase
        .from("user_roles")
        .select("user_id, role, assigned_at, metadata")
        .order("assigned_at", { ascending: true })
        .returns<UserRoleRow[]>(),
    ]);

    if (profilesResult.error) {
      console.warn("[admin] Failed to load profiles, falling back to static data", profilesResult.error);
      throw profilesResult.error;
    }

    if (rolesResult.error) {
      console.warn("[admin] Failed to load user roles, falling back to static data", rolesResult.error);
      throw rolesResult.error;
    }

    const profiles = profilesResult.data ?? [];
    const roles = rolesResult.data ?? [];

    let authUsers: AuthUserRow[] = [];

    const hasServiceRoleKey =
      typeof process !== "undefined" &&
      typeof process.env?.SUPABASE_SERVICE_ROLE_KEY === "string" &&
      process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0;

    if (!hasServiceRoleKey) {
      console.warn("[admin] Skipping auth directory enrichment – SUPABASE_SERVICE_ROLE_KEY is not configured.");
    } else {
      try {
        const serviceClient = await createSupabaseServiceClient();
        const { data, error } = await serviceClient.auth.admin.listUsers({ perPage: 200 });
        if (error) {
          console.warn("[admin] Failed to list auth users, continuing without email enrichment", error);
        } else {
          authUsers =
            data?.users?.map((user) => {
              const email =
                typeof user.email === "string" && user.email.length > 0 ? user.email : null;
              const lastSignIn =
                typeof user.last_sign_in_at === "string" ? user.last_sign_in_at : null;
              const metadata =
                user.user_metadata && typeof user.user_metadata === "object"
                  ? (user.user_metadata as Record<string, unknown>)
                  : null;

              return {
                id: user.id,
                email,
                user_metadata: metadata,
                last_sign_in_at: lastSignIn,
                created_at: user.created_at,
              };
            }) ?? [];
        }
      } catch (serviceError) {
        console.warn("[admin] Service client unavailable, skipping email enrichment", serviceError);
      }
    }

    const roleMap = roles.reduce<Record<string, UserRoleRow[]>>((acc, role) => {
      if (!acc[role.user_id]) {
        acc[role.user_id] = [];
      }
      acc[role.user_id].push(role);
      return acc;
    }, {});

    const authUserMap = authUsers.reduce<Record<string, AuthUserRow>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const enrichedUsers = profiles.map((profile) => {
      const roleEntries = roleMap[profile.user_id] ?? [];
      const authUser = authUserMap[profile.user_id] ?? null;
      return createUserRecord(profile, authUser, roleEntries);
    });

    const auditLog = ADMIN_AUDIT_LOG_FALLBACK;

    if (!enrichedUsers.length) {
      return {
        users: ADMIN_USERS_FALLBACK,
        auditLog,
      };
    }

    return {
      users: enrichedUsers,
      auditLog,
    };
  } catch (error) {
    console.error("[admin] Unable to load user directory, using fallback data", error);
    return {
      users: ADMIN_USERS_FALLBACK,
      auditLog: ADMIN_AUDIT_LOG_FALLBACK,
    };
  }
}

export type AdminProcessCatalog = {
  processes: AdminProcessRecord[];
  versions: AdminProcessVersion[];
};

export async function getAdminProcessCatalog(): Promise<AdminProcessCatalog> {
  try {
    // TODO: Replace with Supabase-backed BPM storage once migrations are ready.
    return {
      processes: ADMIN_PROCESSES_FALLBACK,
      versions: ADMIN_PROCESS_VERSIONS_FALLBACK,
    };
  } catch (error) {
    console.error("[admin] Unable to load BPM catalog", error);
    return {
      processes: ADMIN_PROCESSES_FALLBACK,
      versions: ADMIN_PROCESS_VERSIONS_FALLBACK,
    };
  }
}

export type AdminIntegrationSnapshot = {
  integrations: AdminIntegrationRecord[];
  logs: AdminIntegrationLogEntry[];
};

export async function getAdminIntegrationSnapshot(): Promise<AdminIntegrationSnapshot> {
  try {
    // TODO: Replace with Supabase-backed integrations monitor once telemetry tables are available.
    return {
      integrations: ADMIN_INTEGRATIONS_FALLBACK,
      logs: ADMIN_INTEGRATION_LOGS_FALLBACK,
    };
  } catch (error) {
    console.error("[admin] Unable to load integration snapshot", error);
    return {
      integrations: ADMIN_INTEGRATIONS_FALLBACK,
      logs: ADMIN_INTEGRATION_LOGS_FALLBACK,
    };
  }
}
