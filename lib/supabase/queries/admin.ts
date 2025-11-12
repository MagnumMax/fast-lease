import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  listSupabaseAuthUsers,
  type SupabaseAdminUser,
} from "@/lib/supabase/admin-auth";

import {
  ADMIN_AUDIT_LOG_FALLBACK,
  ADMIN_USERS_FALLBACK,
  type AdminAuditLogEntry,
  type AdminUserRecord,
  type AdminUserStatus,
  type LoginEventSummary,
  type PortalAccessSummary,
  type RoleAssignmentRecord,
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
import type { AppRole, PortalCode } from "@/lib/auth/types";
import { resolvePortalForRole } from "@/lib/auth/portals";

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
  portal: PortalCode | null;
  assigned_at: string;
};

type AuthUserRow = SupabaseAdminUser;

type PortalRow = {
  user_id: string;
  portal: PortalCode;
  status: string;
  last_access_at: string | null;
};

type LoginEventRow = {
  user_id: string | null;
  portal: PortalCode | null;
  status: "success" | "failure";
  occurred_at: string;
  error_code: string | null;
};

type PortalAuditRow = {
  id: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
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
  portals: PortalAccessSummary[],
  loginEvents: LoginEventSummary[],
): AdminUserRecord {
  const userId = profile.user_id ?? profile.id;
  const primaryEmail =
    authUser?.email ??
    (typeof profile.metadata?.email === "string" ? (profile.metadata.email as string) : "");

  const roleSet = new Set<AppRole>();
  const roleAssignments: RoleAssignmentRecord[] = [];
  for (const roleEntry of roles) {
    if (roleEntry.role) {
      roleSet.add(roleEntry.role);
      roleAssignments.push({
        role: roleEntry.role,
        portal: roleEntry.portal ?? resolvePortalForRole(roleEntry.role),
      });
    }
  }

  let invitationSentAt: string | null = null;
  if (profile.status === "pending") {
    const invitedRole = roles.at(-1);
    invitationSentAt = invitedRole?.assigned_at ?? authUser?.created_at ?? null;
  }

  return {
    id: userId,
    name: profile.full_name ?? primaryEmail ?? "—",
    fullName: profile.full_name ?? primaryEmail ?? "—",
    email: primaryEmail ?? "—",
    role: Array.from(roleSet)[0] ?? "CLIENT",
    roles: Array.from(roleSet),
    roleAssignments,
    portals,
    loginEvents,
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
        .from("view_portal_roles")
        .select("user_id, role, portal, assigned_at")
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
    const profileIds = profiles.map((profile) => profile.user_id);

    const [portalsResult, loginEventsResult, adminAuditResult] = await Promise.all([
      profileIds.length
        ? supabase
            .from("user_portals")
            .select("user_id, portal, status, last_access_at")
            .in("user_id", profileIds)
            .returns<PortalRow[]>()
        : Promise.resolve({ data: [] as PortalRow[], error: null }),
      profileIds.length
        ? supabase
            .from("auth_login_events")
            .select("user_id, portal, status, occurred_at, error_code")
            .in("user_id", profileIds)
            .order("occurred_at", { ascending: false })
            .limit(Math.max(profileIds.length * 5, 200))
            .returns<LoginEventRow[]>()
        : Promise.resolve({ data: [] as LoginEventRow[], error: null }),
      supabase
        .from("admin_portal_audit")
        .select("id, actor_user_id, target_user_id, action, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<PortalAuditRow[]>(),
    ]);

    if (portalsResult.error) {
      console.warn("[admin] Failed to load portal assignments", portalsResult.error);
    }

    if (loginEventsResult.error) {
      console.warn("[admin] Failed to load login events", loginEventsResult.error);
    }

    if (adminAuditResult.error) {
      console.warn("[admin] Failed to load admin portal audit log", adminAuditResult.error);
    }

    let authUsers: AuthUserRow[] = [];

    const hasServiceRoleKey =
      typeof process !== "undefined" &&
      typeof process.env?.SUPABASE_SERVICE_ROLE_KEY === "string" &&
      process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0;

    if (!hasServiceRoleKey) {
      console.warn(
        "[admin] Skipping auth directory enrichment – SUPABASE_SERVICE_ROLE_KEY is not configured.",
      );
    } else {
      try {
        authUsers = await listSupabaseAuthUsers({ perPage: 30, maxPages: 80 });
      } catch (serviceError) {
        console.warn(
          "[admin] Service client unavailable, skipping email enrichment",
          serviceError,
        );
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

    const portalMap = (portalsResult.data ?? []).reduce<
      Record<string, PortalAccessSummary[]>
    >((acc, row) => {
      if (!acc[row.user_id]) {
        acc[row.user_id] = [];
      }
      acc[row.user_id].push({
        portal: row.portal,
        status: row.status,
        lastAccessAt: row.last_access_at,
      });
      return acc;
    }, {});

    const loginMap = new Map<string, LoginEventSummary[]>();
    for (const event of loginEventsResult.data ?? []) {
      if (!event.user_id || !event.portal) continue;
      const existing = loginMap.get(event.user_id) ?? [];
      if (existing.length >= 5) continue;
      existing.push({
        portal: event.portal,
        status: event.status,
        occurredAt: event.occurred_at,
        errorCode: event.error_code,
      });
      loginMap.set(event.user_id, existing);
    }

    const enrichedUsers = profiles.map((profile) => {
      const roleEntries = roleMap[profile.user_id] ?? [];
      const authUser = authUserMap[profile.user_id] ?? null;
      const portalSummaries = portalMap[profile.user_id] ?? [];
      const loginEvents = loginMap.get(profile.user_id) ?? [];
      return createUserRecord(
        profile,
        authUser,
        roleEntries,
        portalSummaries,
        loginEvents,
      );
    });

    const auditLog =
      adminAuditResult.data?.map<AdminAuditLogEntry>((entry) => ({
        id: entry.id,
        userId: entry.target_user_id ?? "unknown",
        actor: entry.actor_user_id ?? "system",
        target: entry.target_user_id ?? "unknown",
        action: entry.action,
        timestamp: entry.created_at,
        occurredAt: entry.created_at,
        details: JSON.stringify(entry.metadata ?? {}),
      })) ?? ADMIN_AUDIT_LOG_FALLBACK;

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
