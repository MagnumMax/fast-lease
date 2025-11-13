"use server";

import { type AuthActionState } from "./action-state";
import { redirect } from "next/navigation";
import { logAuthEvent } from "@/lib/auth/logging";
import {
  normalizePortalCode,
  resolveDefaultRoleForPortal,
} from "@/lib/auth/portals";
import {
  ensureDefaultProfileAndRole,
  ensurePortalAccess,
  ensureRoleAssignment,
} from "@/lib/auth/role-management";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  inferPortalForEmail,
  resolvePortalFromAuthUser,
  resolveRedirectPathForPortal,
} from "@/lib/auth/portal-resolution";

function normalizeEmail(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function normalizeString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatAuthErrorMessage(error: unknown): string {
  if (!error) {
    return "Произошла неизвестная ошибка при обращении к Supabase.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Не удалось выполнить запрос. Попробуйте позже.";
}

function normalizeNextPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  try {
    const url = new URL(trimmed, "https://example.com");
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_VERCEL_URL ??
  "http://localhost:3000";

function resolveSiteUrl(path: string): string {
  try {
    const url = new URL(path, DEFAULT_SITE_URL);
    return url.toString();
  } catch {
    return DEFAULT_SITE_URL;
  }
}

async function touchLastLogin(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
) {
  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function passwordSignInAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;

  const email = normalizeEmail(formData.get("identity"));
  const password = normalizeString(formData.get("password"));
  const nextPath = normalizeNextPath(formData.get("next"));
  const portalOverride = normalizePortalCode(formData.get("portal"));
  const fallbackPortal = portalOverride ?? inferPortalForEmail(email);

  if (!email) {
    return {
      status: "error",
      message: "Введите корректный email адрес для входа.",
      errorCode: "invalid_identity",
    };
  }

  if (!password) {
    return {
      status: "error",
      message: "Введите пароль.",
      errorCode: "invalid_password",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await logAuthEvent({
      portal: fallbackPortal,
      identity: email,
      status: "failure",
      errorCode: "password_signin_failed",
      metadata: { message: error.message },
    });

    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "password_signin_failed",
      context: {
        identity: email,
        portal: fallbackPortal,
      },
    };
  }

  const user = data.user;
  if (!user) {
    await logAuthEvent({
      portal: fallbackPortal,
      identity: email,
      status: "failure",
      errorCode: "missing_user",
    });

    return {
      status: "error",
      message: "Supabase не вернул пользователя после входа.",
      errorCode: "missing_user",
      context: {
        identity: email,
        portal: fallbackPortal,
      },
    };
  }

  const userId = user.id;
  const portalResolution = resolvePortalFromAuthUser(user, email);
  const portal = portalOverride ?? portalResolution.portal;

  await ensureDefaultProfileAndRole(supabase, userId);

  const portalDefaultRole = resolveDefaultRoleForPortal(portal);
  if (portalDefaultRole) {
    await ensureRoleAssignment(userId, portalDefaultRole);
  } else {
    await ensureRoleAssignment(userId, null);
  }

  await ensurePortalAccess(userId, portal);
  await touchLastLogin(supabase, userId);

  const activeSession = data.session ?? (await supabase.auth.getSession()).data.session;
  if (!activeSession) {
    return {
      status: "error",
      message: "Сессия потеряна после аутентификации.",
      errorCode: "session_lost",
      context: {
        identity: email,
        portal,
      },
    };
  }

  const redirectPath = resolveRedirectPathForPortal(portal, {
    nextPath,
    preferredRole: portalResolution.preferredRole,
    roles: portalResolution.roles,
  });

  await logAuthEvent({
    portal,
    identity: email,
    status: "success",
    userId,
    roles: portalResolution.roles,
    metadata: {
      redirectPath,
    },
  });

  return {
    status: "success",
    redirectPath,
    context: {
      identity: email,
      portal,
    },
  };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signOut({
    scope: "global",
  });

  if (error) {
    console.error("[auth] signOut failed", error);
  }

  redirect("/login");
}

export async function autoPortalSignInAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  return passwordSignInAction(_prevState, formData);
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;

  const email = normalizeEmail(formData.get("identity"));
  if (!email) {
    return {
      status: "error",
      message: "Введите email, чтобы восстановить доступ.",
      errorCode: "invalid_identity",
    };
  }

  const portal = inferPortalForEmail(email);
  const supabase = await createSupabaseServerClient();
  const redirectTo = resolveSiteUrl("/auth/callback?next=/login/reset");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    await logAuthEvent({
      portal,
      identity: email,
      status: "failure",
      errorCode: "password_reset_request_failed",
      metadata: { message: error.message },
    });

    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "password_reset_request_failed",
    };
  }

  await logAuthEvent({
    portal,
    identity: email,
    status: "success",
    metadata: {
      action: "password_reset_requested",
    },
  });

  return {
    status: "success",
    message: "Мы отправили письмо с инструкциями по восстановлению пароля.",
  };
}

export async function completePasswordResetAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;

  const password = normalizeString(formData.get("password"));
  const confirm = normalizeString(formData.get("confirm"));
  const nextPath = normalizeNextPath(formData.get("next")) ?? "/login";

  if (!password || password.length < 6) {
    return {
      status: "error",
      message: "Пароль должен содержать минимум 6 символов.",
      errorCode: "invalid_password",
    };
  }

  if (password !== confirm) {
    return {
      status: "error",
      message: "Пароли не совпадают. Попробуйте ещё раз.",
      errorCode: "password_mismatch",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userEmail = userData.user?.email ?? undefined;

  if (!userData.user?.id) {
    return {
      status: "error",
      message: "Сессия не найдена. Запросите ссылку на восстановление ещё раз.",
      errorCode: "missing_user",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  const portal = userEmail ? inferPortalForEmail(userEmail) : "client";

  if (error) {
    await logAuthEvent({
      portal,
      identity: userEmail ?? "unknown",
      status: "failure",
      errorCode: "password_reset_failed",
      userId: userData.user.id,
      metadata: { message: error.message },
    });

    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "password_reset_failed",
    };
  }

  await logAuthEvent({
    portal,
    identity: userEmail ?? "unknown",
    status: "success",
    userId: userData.user.id,
    metadata: {
      action: "password_reset_completed",
    },
  });

  return {
    status: "success",
    message: "Пароль обновлён. Теперь войдите с новыми данными.",
    redirectPath: nextPath,
    context: {
      identity: userEmail,
    },
  };
}
