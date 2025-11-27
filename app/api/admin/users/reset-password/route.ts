import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { canMutateSessionUser } from "@/lib/auth/guards";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logPortalAdminAction } from "@/lib/auth/portal-admin";
import { generateRandomPassword } from "@/lib/auth/passwords";

const payloadSchema = z.object({
  userId: z.string().min(1, "Укажите пользователя"),
});

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }

    if (!canMutateSessionUser(sessionUser)) {
      return NextResponse.json({ error: "Ваш доступ только для чтения." }, { status: 403 });
    }

    const rawPayload = await request.json();
    const parsed = payloadSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Некорректные данные запроса.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

    const { userId } = parsed.data;
    const serviceClient = await createSupabaseServiceClient();

    const { data: authUser, error: lookupError } = await serviceClient.auth.admin.getUserById(userId);

    if (lookupError) {
      console.warn("[admin-users] Failed to load auth user before password reset", lookupError);
    }

    if (!authUser?.user) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    const newPassword = generateRandomPassword();

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(userId, {
      password: newPassword,
      email_confirm: true,
    });

    if (updateError) {
      console.error("[admin-users] Failed to reset password", updateError);
      return NextResponse.json(
        { error: "Не удалось сбросить пароль. Попробуйте ещё раз." },
        { status: 500 },
      );
    }

    await logPortalAdminAction({
      actorUserId: sessionUser.user.id,
      targetUserId: userId,
      action: "reset_password",
      metadata: {
        method: "admin_portal",
        actor_email: sessionUser.user.email,
      },
    });

    return NextResponse.json({ ok: true, temporaryPassword: newPassword });
  } catch (error) {
    console.error("[admin-users] password reset crashed", error);
    return NextResponse.json(
      { error: "Не удалось сбросить пароль. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
