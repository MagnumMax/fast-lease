import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logPortalAdminAction } from "@/lib/auth/portal-admin";
import { APP_ROLE_CODES } from "@/lib/data/app-roles";
import type { AppRole, PortalCode } from "@/lib/auth/types";
import { resolvePortalForRole } from "@/lib/auth/portals";
import { ensureRoleAssignment } from "@/lib/auth/role-management";
import type { AdminUserStatus } from "@/lib/data/admin/users";
import { findSupabaseAuthUserByEmail } from "@/lib/supabase/admin-auth";
import {
  AdminCreateUserSchema,
  type AdminCreateUserInput,
} from "@/lib/validation/admin-users";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function generateRandomPassword() {
  return randomBytes(18).toString("base64url");
}

function isValidRole(value: string): value is AppRole {
  return (APP_ROLE_CODES as string[]).includes(value);
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }

    const rawPayload = await request.json();
    const parsed = AdminCreateUserSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      console.warn("[admin-users] Create payload failed validation", {
        fieldErrors,
      });
      return NextResponse.json(
        {
          error: "Некорректные данные запроса.",
          fieldErrors,
        },
        { status: 400 },
      );
    }

    const payload: AdminCreateUserInput = parsed.data;
    const normalizedEmail = normalizeEmail(payload.email);
    const normalizedRole = payload.role.trim().toUpperCase();

    if (!isValidRole(normalizedRole)) {
      return NextResponse.json({ error: "Недопустимая роль пользователя." }, { status: 400 });
    }

    const serviceClient = await createSupabaseServiceClient();

    let existingUser: Awaited<ReturnType<typeof findSupabaseAuthUserByEmail>> | null = null;
    try {
      existingUser = await findSupabaseAuthUserByEmail(normalizedEmail);
    } catch (error) {
      console.error("[admin-users] Failed to look up Supabase auth user", error);
      return NextResponse.json(
        { error: "Не удалось проверить существование пользователя." },
        { status: 500 },
      );
    }

    let newUserId: string | null = existingUser?.id ?? null;
    let inviteLink: string | null = null;
    let temporaryPassword: string | null = null;
    let generatedPassword: string | null = null;
    const status: AdminUserStatus = payload.sendInvite ? "pending" : "active";
    const wasNewlyCreated = !existingUser;

    if (!newUserId) {
      generatedPassword = generateRandomPassword();
      temporaryPassword = payload.sendInvite ? null : generatedPassword;

      const { data: createResult, error: createError } =
        await serviceClient.auth.admin.createUser({
          email: normalizedEmail,
          password: generatedPassword,
          email_confirm: !payload.sendInvite,
          user_metadata: {
            full_name: payload.fullName,
            invited_via: "admin_portal",
          },
          app_metadata: {
            roles: [normalizedRole],
            primary_role: normalizedRole,
          },
        });

      if (createError || !createResult?.user?.id) {
        console.error("[admin-users] Failed to create auth user", createError);
        return NextResponse.json(
          { error: "Не удалось создать пользователя в Supabase." },
          { status: 500 },
        );
      }

      newUserId = createResult.user.id;
    } else if (!payload.sendInvite) {
      generatedPassword = generateRandomPassword();
      temporaryPassword = generatedPassword;
      const { error: passwordResetError } = await serviceClient.auth.admin.updateUserById(
        newUserId,
        {
          password: generatedPassword,
          email_confirm: true,
        },
      );

      if (passwordResetError) {
        console.warn("[admin-users] Failed to update password for existing user", passwordResetError);
      }
    }

    if (!newUserId) {
      return NextResponse.json(
        { error: "Не удалось определить пользователя Supabase." },
        { status: 500 },
      );
    }

    if (payload.sendInvite) {
      if (wasNewlyCreated) {
        const { data: inviteData, error: inviteError } =
          await serviceClient.auth.admin.generateLink({
            type: "invite",
            email: normalizedEmail,
          });

        if (inviteError) {
          console.warn("[admin-users] Failed to generate invite link", inviteError);
        } else {
          inviteLink = inviteData?.properties?.action_link ?? null;
        }
      } else {
        const { data: magicData, error: magicError } =
          await serviceClient.auth.admin.generateLink({
            type: "magiclink",
            email: normalizedEmail,
          });

        if (magicError) {
          console.warn("[admin-users] Failed to generate magic link for existing user", magicError);
        } else {
          inviteLink = magicData?.properties?.action_link ?? null;
        }
      }
    }

    const { error: profileError } = await serviceClient
      .from("profiles")
      .upsert(
        {
          user_id: newUserId,
          full_name: payload.fullName,
          status,
          metadata: {
            created_via: "admin_portal",
            invited_by: sessionUser.user.id,
          },
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      console.error("[admin-users] Failed to upsert profile", profileError);
    }

    await ensureRoleAssignment(newUserId, normalizedRole);

    const portal: PortalCode = resolvePortalForRole(normalizedRole);

    await logPortalAdminAction({
      actorUserId: sessionUser.user.id,
      targetUserId: newUserId,
      action: "create_user",
      metadata: {
        role: normalizedRole,
        portal,
        status,
        sendInvite: payload.sendInvite,
      },
    });

    return NextResponse.json({
      ok: true,
      userId: newUserId,
      status,
      portal,
      inviteLink,
      temporaryPassword,
    });
  } catch (error) {
    console.error("[admin-users] create user crashed", error);
    return NextResponse.json(
      { error: "Не удалось создать пользователя. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
