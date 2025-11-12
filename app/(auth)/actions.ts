"use server";

import {
  type AuthActionState,
  type DetectPortalState,
  INITIAL_DETECT_PORTAL_STATE,
} from "./action-state";
import { redirect } from "next/navigation";
import {
  resolveHomePath,
  validateRolePath,
} from "@/lib/auth/roles";
import { logAuthEvent } from "@/lib/auth/logging";
import {
  normalizePortalCode,
  resolveDefaultRoleForPortal,
  resolvePortalForRole,
  resolvePortalHomePath,
} from "@/lib/auth/portals";
import {
  ensureDefaultProfileAndRole,
  ensurePortalAccess,
  ensureRoleAssignment,
} from "@/lib/auth/role-management";
import { getSessionUser } from "@/lib/auth/session";
import type { AppRole, PortalCode } from "@/lib/auth/types";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { normalizeRoleCode } from "@/lib/auth/roles";
import { findSupabaseAuthUserByEmail } from "@/lib/supabase/admin-auth";

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

const PORTAL_PRIORITY: PortalCode[] = ["client", "investor", "partner", "app"];
const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_VERCEL_URL ??
  "http://localhost:3000";

function selectPreferredPortal(portals: PortalCode[]): PortalCode {
  if (!portals.length) {
    return "client";
  }

  for (const candidate of PORTAL_PRIORITY) {
    if (portals.includes(candidate)) {
      return candidate;
    }
  }

  return portals[0];
}

function heuristicPortalsForEmail(email: string): PortalCode[] {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain.endsWith("fastlease.ae")) {
    return ["app"];
  }

  if (domain.includes("investor")) {
    return ["investor"];
  }

  return ["client"];
}

function inferPortalForEmail(email: string): PortalCode {
  const candidates = heuristicPortalsForEmail(email);
  return candidates[0] ?? "client";
}

async function collectCandidatePortals(identity: string): Promise<PortalCode[]> {
  const candidatePortals = new Set<PortalCode>();

  let serviceClient: Awaited<ReturnType<typeof createSupabaseServiceClient>> | null =
    null;

  try {
    serviceClient = await createSupabaseServiceClient();
  } catch (error) {
    console.warn("[auth] Service client unavailable for portal detection", error);
  }

  if (serviceClient) {
    try {
      let authUser = null;
      try {
        authUser = await findSupabaseAuthUserByEmail(identity);
      } catch (error) {
        console.warn("[auth] listUsers failed during portal detection", error);
      }

      if (authUser) {
        const userId = authUser.id;

        const { data: portalRows } = await serviceClient
          .from("user_portals")
          .select("portal, status")
          .eq("user_id", userId);

        for (const row of portalRows ?? []) {
          const portal = normalizePortalCode((row as { portal: unknown }).portal);
          if (portal && row?.status !== "inactive") {
            candidatePortals.add(portal);
          }
        }

        if (!candidatePortals.size) {
          const { data: roleRows } = await serviceClient
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

          for (const row of roleRows ?? []) {
            const role = normalizeRoleCode((row as { role: unknown }).role);
            if (role) {
              candidatePortals.add(resolvePortalForRole(role));
            }
          }
        }
      }
    } catch (error) {
      console.warn("[auth] collectCandidatePortals failed", error);
    }
  }

  if (!candidatePortals.size) {
    heuristicPortalsForEmail(identity).forEach((portal) =>
      candidatePortals.add(portal),
    );
  }

  return Array.from(candidatePortals);
}

async function detectPortalForIdentity(identity: string) {
  const suggestions = await collectCandidatePortals(identity);
  if (!suggestions.length) {
    suggestions.push("client");
  }

  const portal = selectPreferredPortal(suggestions);
  const autoRedirect = suggestions.length === 1 && Boolean(portal);

  return {
    portal,
    suggestions,
    autoRedirect,
  };
}

function resolveSiteUrl(path: string): string {
  try {
    const url = new URL(path, DEFAULT_SITE_URL);
    return url.toString();
  } catch {
    return DEFAULT_SITE_URL;
  }
}

async function resolveRedirectPath(
  portal: PortalCode,
  preferredRole: AppRole | null,
  nextPath: string | null,
) {
  if (nextPath) {
    return nextPath;
  }

  if (preferredRole) {
    return validateRolePath(preferredRole);
  }

  const sessionUser = await getSessionUser();
  const roles = sessionUser?.roles ?? [];
  if (roles.length > 0) {
    return resolveHomePath(roles, resolvePortalHomePath(portal));
  }

  return resolvePortalHomePath(portal);
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
  const portal = normalizePortalCode(formData.get("portal"));
  const nextPath = normalizeNextPath(formData.get("next"));

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

  if (!portal) {
    return {
      status: "error",
      message: "Не удалось определить аудиторию входа.",
      errorCode: "invalid_portal",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await logAuthEvent({
      portal,
      identity: email,
      status: "failure",
      errorCode: "password_signin_failed",
      metadata: { message: error.message },
    });

    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "password_signin_failed",
    };
  }

  const user = data.user;
  if (!user) {
    await logAuthEvent({
      portal,
      identity: email,
      status: "failure",
      errorCode: "missing_user",
    });

    return {
      status: "error",
      message: "Supabase не вернул пользователя после входа.",
      errorCode: "missing_user",
    };
  }

  const userId = user.id;

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
    };
  }

  const sessionUser = await getSessionUser();
  const roles = sessionUser?.roles ?? [];
  const redirectPath = await resolveRedirectPath(
    portal,
    null,
    nextPath,
  );

  await logAuthEvent({
    portal,
    identity: email,
    status: "success",
    userId,
    roles,
    metadata: {
      redirectPath,
    },
  });

  return {
    status: "success",
    redirectPath,
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

export async function detectPortalAction(
  _prevState: DetectPortalState | undefined,
  formData: FormData,
): Promise<DetectPortalState> {
  void _prevState;

  const identity = normalizeEmail(formData.get("identity"));
  if (!identity) {
    return {
      status: "error",
      message: "Введите корректный email.",
    };
  }

  const detection = await detectPortalForIdentity(identity);

  return {
    status: "success",
    portal: detection.portal,
    suggestions: detection.suggestions,
    identity,
    autoRedirect: detection.autoRedirect,
  };
}

export async function autoPortalSignInAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;

  const email = normalizeEmail(formData.get("identity"));
  const password = normalizeString(formData.get("password"));
  const nextPath = normalizeNextPath(formData.get("next"));

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

  const detection = await detectPortalForIdentity(email);
  const portal = detection.portal;

  const passwordForm = new FormData();
  passwordForm.set("identity", email);
  passwordForm.set("password", password);
  passwordForm.set("portal", portal);
  if (nextPath) {
    passwordForm.set("next", nextPath);
  }

  const result = await passwordSignInAction(undefined, passwordForm);
  const context = {
    identity: email,
    portal,
  };

  if (result.status === "success") {
    const informativeMessage =
      detection.suggestions.length > 1
        ? "Email связан с несколькими кабинетами — мы автоматически выбрали подходящий кабинет."
        : result.message;

    return {
      ...result,
      message: informativeMessage,
      context,
    };
  }

  return {
    ...result,
    context: {
      ...(result.context ?? {}),
      ...context,
    },
  };
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
