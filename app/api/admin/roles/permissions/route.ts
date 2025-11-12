import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { canMutateSessionUser } from "@/lib/auth/guards";
import { normalizeRoleCode } from "@/lib/auth/roles";
import { isAccessSection } from "@/lib/auth/role-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UpdatePayload =
  | {
      section: string;
      role: string;
      allowed: boolean;
    }
  | {
      section: string;
      action: "reset";
    };

function normalizeSection(value: unknown) {
  if (!isAccessSection(value)) {
    return null;
  }
  return value;
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

    const body = (await request.json()) as UpdatePayload;
    const section = normalizeSection(body.section);

    if (!section) {
      return NextResponse.json({ error: "Неизвестный раздел доступа." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    if (!section.startsWith("workspace_")) {
      return NextResponse.json(
        { error: "Эта секция не поддерживает ручные изменения." },
        { status: 400 },
      );
    }

    if ("action" in body) {
      if (body.action !== "reset") {
        return NextResponse.json({ error: "Неизвестное действие." }, { status: 400 });
      }

      const { error } = await supabase
        .from("role_access_rules")
        .delete()
        .eq("section", section);

      if (error) {
        console.error("[admin] Failed to reset role access section", { section, error });
        return NextResponse.json(
          { error: "Не удалось сбросить права для секции." },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, section, hasOverride: false });
    }

    const role = normalizeRoleCode(body.role);
    if (!role) {
      return NextResponse.json({ error: "Недопустимая роль." }, { status: 400 });
    }

    if (typeof body.allowed !== "boolean") {
      return NextResponse.json({ error: "Укажите состояние разрешения." }, { status: 400 });
    }

    const { error } = await supabase
      .from("role_access_rules")
      .upsert(
        {
          section,
          role,
          allowed: body.allowed,
        },
        { onConflict: "role,section" },
      );

    if (error) {
      console.error("[admin] Failed to update role access rule", { section, role, error });
      return NextResponse.json(
        { error: "Не удалось сохранить настройки доступа." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, section, role, allowed: body.allowed });
  } catch (error) {
    console.error("[admin] Role permission update failed", error);
    return NextResponse.json(
      { error: "Не удалось обновить права доступа." },
      { status: 500 },
    );
  }
}
