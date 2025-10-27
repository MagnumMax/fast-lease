import { NextResponse } from "next/server";

import type { AdminUserStatus } from "@/lib/data/admin/users";
import { normalizeRoleCode } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/auth/types";
import { getSessionUser } from "@/lib/auth/session";
import { syncUserRolesMetadata } from "@/lib/auth/role-management";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

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
  roles: string[];
};

function sanitizeStatus(value: unknown): AdminUserStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();

  const match = ALLOWED_STATUSES.find(
    (status) => status.toLowerCase() === normalized,
  );

  return match ?? null;
}

function sanitizeRoles(values: unknown): AppRole[] {
  if (!Array.isArray(values)) return [];
  const normalized = new Set<AppRole>();

  for (const entry of values) {
    const role = normalizeRoleCode(entry);
    if (role) {
      normalized.add(role);
    }
  }

  return Array.from(normalized);
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }

    const payload = (await request.json()) as Partial<UpdateAccessPayload>;
    const targetUserId = typeof payload.userId === "string" ? payload.userId : "";
    const status = sanitizeStatus(payload.status);
    const roles = sanitizeRoles(payload.roles);

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
        roles.map((role) => ({
          user_id: targetUserId,
          role,
          assigned_by: sessionUser.user.id,
        })),
        { onConflict: "user_id,role" },
      );

    if (insertError) {
      console.error("[admin] Failed to assign roles", insertError);
      return NextResponse.json(
        { error: "Не удалось назначить роли." },
        { status: 500 },
      );
    }

    await syncUserRolesMetadata(serviceClient, targetUserId);

    return NextResponse.json({ ok: true, status, roles });
  } catch (error) {
    console.error("[admin] Access update failed", error);
    return NextResponse.json(
      { error: "Не удалось обновить доступ. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
