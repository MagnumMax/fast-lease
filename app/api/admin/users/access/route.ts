import { NextResponse } from "next/server";

import type { AdminUserStatus } from "@/lib/data/admin/users";
import { normalizeRoleCode } from "@/lib/auth/roles";
import type { AppRole, PortalCode } from "@/lib/auth/types";
import { getSessionUser } from "@/lib/auth/session";
import { syncUserRolesMetadata } from "@/lib/auth/role-management";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logPortalAdminAction } from "@/lib/auth/portal-admin";
import { resolvePortalForRole } from "@/lib/auth/portals";
import { canMutateSessionUser } from "@/lib/auth/guards";

const ALLOWED_STATUSES: AdminUserStatus[] = [
  "active",
  "inactive",
  "suspended",
  "pending",
  "archived",
];

type UpdateAccessPayload = {
  userId: string;
  status: AdminUserStatus;
  roles: unknown;
  portals?: PortalAssignmentPayload[];
};

type SanitizedRoleAssignment = {
  role: AppRole;
  readOnly: boolean;
};

type PortalAssignmentPayload = {
  portal: string;
  status?: string;
};

function sanitizeStatus(value: unknown): AdminUserStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();

  const match = ALLOWED_STATUSES.find(
    (status) => status.toLowerCase() === normalized,
  );

  return match ?? null;
}

function sanitizeRoles(values: unknown): SanitizedRoleAssignment[] {
  if (!Array.isArray(values)) return [];
  const normalized: SanitizedRoleAssignment[] = [];

  for (const entry of values) {
    if (typeof entry === "string") {
      const role = normalizeRoleCode(entry);
      if (role) {
        normalized.push({ role, readOnly: false });
      }
      continue;
    }

    if (entry && typeof entry === "object") {
      const record = entry as { role?: unknown; code?: unknown; readOnly?: unknown };
      const roleCandidate = record.role ?? record.code;
      const role = normalizeRoleCode(roleCandidate);
      if (role) {
        normalized.push({ role, readOnly: record.readOnly === true });
      }
    }
  }

  const seen = new Set<AppRole>();
  return normalized.filter((assignment) => {
    if (seen.has(assignment.role)) {
      return false;
    }
    seen.add(assignment.role);
    return true;
  });
}

function sanitizePortals(values: unknown): { portal: PortalCode; status: string }[] {
  if (!Array.isArray(values)) return [];
  const sanitized: { portal: PortalCode; status: string }[] = [];

  for (const entry of values) {
    if (!entry || typeof entry !== "object") continue;
    const portalValue = (entry as PortalAssignmentPayload).portal;
    if (typeof portalValue !== "string") continue;
    const normalizedPortal = portalValue.trim().toLowerCase() as PortalCode;
    if (!["app", "client", "investor", "partner"].includes(normalizedPortal)) continue;

    const statusValue = (entry as PortalAssignmentPayload).status;
    const normalizedStatus =
      typeof statusValue === "string" && statusValue.toLowerCase() === "inactive"
        ? "inactive"
        : "active";

    sanitized.push({
      portal: normalizedPortal,
      status: normalizedStatus,
    });
  }

  return sanitized;
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }

    if (!canMutateSessionUser(sessionUser)) {
      return NextResponse.json({ error: "Ваш доступ только для чтения." }, { status: 403 });
    }

    const payload = (await request.json()) as Partial<UpdateAccessPayload>;
    const targetUserId = typeof payload.userId === "string" ? payload.userId : "";
    const status = sanitizeStatus(payload.status);
    const roles = sanitizeRoles(payload.roles);
    const portalAssignments = sanitizePortals(payload.portals);

    if (!targetUserId) {
      return NextResponse.json({ error: "Не указан пользователь." }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: "Недопустимый статус." }, { status: 400 });
    }

    if (!roles.length) {
      return NextResponse.json({ error: "Назначьте минимум одну роль." }, { status: 400 });
    }

    const serviceClient = await createSupabaseServiceClient();

    const { data: profileRow, error: profileError } = await serviceClient
      .from("profiles")
      .select("user_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (profileError) {
      console.error("[admin] Failed to load profile for access update", profileError);
      return NextResponse.json(
        { error: "Не удалось загрузить профиль пользователя." },
        { status: 500 },
      );
    }

    if (!profileRow) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    const { error: profileUpdateError } = await serviceClient
      .from("profiles")
      .update({ status })
      .eq("user_id", targetUserId);

    if (profileUpdateError) {
      console.error("[admin] Failed to update profile status", profileUpdateError);
      return NextResponse.json(
        { error: "Не удалось обновить статус пользователя." },
        { status: 500 },
      );
    }

    const { error: deleteError } = await serviceClient
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId);

    if (deleteError) {
      console.error("[admin] Failed to clear user roles", deleteError);
      return NextResponse.json(
        { error: "Не удалось сбросить старые роли." },
        { status: 500 },
      );
    }

    const { error: insertError } = await serviceClient
      .from("user_roles")
      .upsert(
        roles.map((assignment) => ({
          user_id: targetUserId,
          role: assignment.role,
          portal: resolvePortalForRole(assignment.role),
          assigned_by: sessionUser.user.id,
          metadata: {
            read_only: assignment.readOnly,
          },
        })),
        { onConflict: "user_id,role,portal" },
      );

    if (insertError) {
      console.error("[admin] Failed to assign roles", insertError);
      return NextResponse.json(
        { error: "Не удалось назначить роли." },
        { status: 500 },
      );
    }

    if (portalAssignments.length) {
      for (const assignment of portalAssignments) {
        const state = assignment.status === "inactive" ? "inactive" : "active";
        const { error: portalUpsertError } = await serviceClient
          .from("user_portals")
          .upsert(
            {
              user_id: targetUserId,
              portal: assignment.portal,
              status: state,
            },
            { onConflict: "user_id,portal" },
          );
        if (portalUpsertError) {
          console.error("[admin] Failed to update portal access", portalUpsertError);
        }
      }
    }

    await syncUserRolesMetadata(serviceClient, targetUserId);

    const { data: updatedPortals } = await serviceClient
      .from("user_portals")
      .select("portal, status, last_access_at")
      .eq("user_id", targetUserId);

    await logPortalAdminAction({
      actorUserId: sessionUser.user.id,
      targetUserId,
      action: "update_access",
      metadata: {
        status,
        roles: roles.map((assignment) => ({
          role: assignment.role,
          readOnly: assignment.readOnly,
        })),
        portals: updatedPortals ?? [],
      },
    });

    return NextResponse.json({
      ok: true,
      status,
      roles: roles.map((assignment) => ({
        role: assignment.role,
        readOnly: assignment.readOnly,
      })),
      portals: updatedPortals ?? [],
    });
  } catch (error) {
    console.error("[admin] Access update failed", error);
    return NextResponse.json(
      { error: "Не удалось обновить доступ. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
