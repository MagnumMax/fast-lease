"use server";

import { type AuthActionState } from "./action-state";
import { APP_ROLE_PRIORITY, APP_ROLE_HOME_PATH, resolveHomePath, validateRolePath } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import type { AppRole } from "@/lib/auth/types";

type Identity =
  | { type: "email"; value: string }
  | { type: "phone"; value: string };

function normalizeEmail(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizePhone(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^\d+]/g, "");
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

function resolveIdentity(
  value: FormDataEntryValue | null,
): Identity | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;

  if (normalized.includes("@")) {
    const email = normalizeEmail(normalized);
    if (!email) return null;
    return { type: "email", value: email };
  }

  const sanitized = sanitizePhone(normalized);
  if (!sanitized) return null;
  const phone = sanitized.startsWith("+") ? sanitized : `+${sanitized}`;
  if (phone.length < 6) return null;
  return { type: "phone", value: phone };
}

function formatIdentityForDisplay(identity: Identity): string {
  if (identity.type === "email") {
    const [localPart, domain] = identity.value.split("@");
    if (!domain) return identity.value;
    if (localPart.length <= 2) {
      return `${localPart[0] ?? ""}***@${domain}`;
    }
    return `${localPart[0]}***${localPart.at(-1)}@${domain}`;
  }

  const lead = identity.value.slice(0, 4);
  const tail = identity.value.slice(-2);
  return `${lead}***${tail}`;
}

function normalizeRole(value: FormDataEntryValue | null): AppRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  const match = APP_ROLE_PRIORITY.find((role) => role === normalized);
  return match ?? null;
}

async function ensureDefaultProfileAndRole(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  // Используем service client для операций с ролями
  const serviceClient = await createSupabaseServiceClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        full_name: null,
        marketing_opt_in: false,
        status: "pending",
      },
      { onConflict: "user_id" },
    );

  if (profileError) {
    console.error("[auth] Failed to upsert profile", profileError);
  }

  // Используем service client для записи ролей (обходит RLS)
  const { error: roleError } = await serviceClient
    .from("user_roles")
    .upsert(
      {
        user_id: userId,
        role: "CLIENT",
      },
      { onConflict: "user_id,role" },
    );

  if (roleError) {
    console.error("[auth] Failed to assign default role", roleError);
  }
}

async function ensureRoleAssignment(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string, role: AppRole | null) {
  if (!role) return;

  // Используем service client для записи ролей (обходит RLS)
  const serviceClientForRoles = await createSupabaseServiceClient();
  const { error } = await serviceClientForRoles
    .from("user_roles")
    .upsert(
      {
        user_id: userId,
        role,
      },
      { onConflict: "user_id,role" },
    );

  if (error) {
    console.error("[auth] Failed to assign role", { userId, role, error });
  }
}

async function resolveRedirectPathWithPreferredRole(
  preferredRole: AppRole | null,
) {
  const sessionUser = await getSessionUser();
  const roles = sessionUser?.roles ?? [];

  // Если пользователь выбрал конкретную роль, всегда перенаправляем в соответствующий кабинет
  if (preferredRole) {
    return {
      redirectPath: validateRolePath(preferredRole),
      roles,
    };
  }

  // Если у пользователя есть роли, используем основную роль
  if (roles.length > 0) {
    return {
      redirectPath: resolveHomePath(roles, "/"),
      roles,
    };
  }

  // Если нет ролей и не выбрана конкретная роль, перенаправляем на главную
  return {
    redirectPath: "/",
    roles,
  };
}

async function devMagicLinkSignIn(
  email: string,
  preferredRole: AppRole | null,
): Promise<AuthActionState> {
  if (!email) {
    return {
      status: "error",
      message: "Не удалось выполнить вход через пресет. Не указан email.",
      errorCode: "missing_dev_email",
    };
  }

  const service = await createSupabaseServiceClient();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (error) {
    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "dev_generate_link_failed",
    };
  }

  const otp = data?.properties?.email_otp;
  if (!otp) {
    return {
      status: "error",
      message:
        "Supabase не вернул OTP для пресета. Проверьте настройки magic link.",
      errorCode: "missing_dev_otp",
    };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });

  if (verifyError) {
    return {
      status: "error",
      message: formatAuthErrorMessage(verifyError),
      errorCode: "dev_verify_failed",
    };
  }

  // Используем getUser() вместо getSession() для безопасности
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      status: "error",
      message: "Supabase не вернул пользователя после входа через пресет.",
      errorCode: "dev_missing_user",
    };
  }

  await ensureDefaultProfileAndRole(supabase, userData.user.id);
  await ensureRoleAssignment(supabase, userData.user.id, preferredRole);

  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("user_id", userData.user.id);

  // Проверяем сессию ПЕРЕД вызовом resolveRedirectPathWithPreferredRole
  const { data: sessionCheck } = await supabase.auth.getSession();
  console.log("[DEBUG] sessionCheck before redirect:", {
    hasSession: !!sessionCheck.session,
    userId: sessionCheck.session?.user?.id
  });

  const { redirectPath } = await resolveRedirectPathWithPreferredRole(
    preferredRole,
  );

  return {
    status: "success",
    redirectPath,
  };
}

export async function requestOtpAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;

  const identity = resolveIdentity(formData.get("identity"));
  const preferredRole = normalizeRole(formData.get("targetRole"));
  if (!identity) {
    return {
      status: "error",
      message: "Введите корректный телефон или email.",
      errorCode: "invalid_identity",
    };
  }

  const devBypassRequested =
    process.env.NODE_ENV !== "production" &&
    normalizeString(formData.get("devBypass")) === "true";

  if (devBypassRequested && identity.type === "email") {
    const devResult = await devMagicLinkSignIn(identity.value, preferredRole);
    if (devResult.status === "success" || devResult.status === "error") {
      return devResult;
    }
  }

  const supabase = await createSupabaseServerClient();

  if (identity.type === "email") {
    const emailRedirectTo =
      process.env.NEXT_PUBLIC_SITE_URL &&
      `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email: identity.value,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: emailRedirectTo || undefined,
      },
    });

    if (error) {
      return {
        status: "error",
        message: formatAuthErrorMessage(error),
        errorCode: "otp_request_failed",
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithOtp({
      phone: identity.value,
      options: {
        shouldCreateUser: true,
        channel: "sms",
      },
    });

    if (error) {
      return {
        status: "error",
        message: formatAuthErrorMessage(error),
        errorCode: "otp_request_failed",
      };
    }
  }

  const displayIdentity = formatIdentityForDisplay(identity);

  return {
    status: "otp_requested",
    message:
      identity.type === "email"
        ? `Мы отправили код на ${displayIdentity}.`
        : `Мы отправили код в SMS на ${displayIdentity}.`,
    context: {
      identity: identity.value,
      identityType: identity.type,
      displayIdentity,
      targetRole: preferredRole ?? "",
    },
  };
}

export async function verifyOtpAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;

  const identity = resolveIdentity(formData.get("identity"));
  const token = normalizeString(formData.get("token"));
  const preferredRole = normalizeRole(formData.get("targetRole"));

  if (!identity || !token) {
    return {
      status: "error",
      message: "Введите код подтверждения и реквизиты.",
      errorCode: "missing_otp",
    };
  }

  const supabase = await createSupabaseServerClient();

  const verifyPayload =
    identity.type === "email"
      ? { email: identity.value, token, type: "email" as const }
      : { phone: identity.value, token, type: "sms" as const };

  const { error } = await supabase.auth.verifyOtp(verifyPayload);

  if (error) {
    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "otp_verify_failed",
    };
  }

  // Используем getUser() вместо getSession() для безопасности
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      status: "error",
      message: "Supabase не вернул пользователя после проверки кода.",
      errorCode: "missing_user",
    };
  }

  await ensureDefaultProfileAndRole(supabase, userData.user.id);
  await ensureRoleAssignment(supabase, userData.user.id, preferredRole);

  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("user_id", userData.user.id);

  // Проверяем сессию ПЕРЕД вызовом resolveRedirectPathWithPreferredRole
  const { data: sessionCheck } = await supabase.auth.getSession();
  console.log("[DEBUG] sessionCheck before redirect:", {
    hasSession: !!sessionCheck.session,
    userId: sessionCheck.session?.user?.id
  });

  if (!sessionCheck.session) {
    console.error("[ERROR] Session lost after authentication!");
    return {
      status: "error",
      message: "Сессия потеряна после аутентификации",
      errorCode: "session_lost",
    };
  }

  const { redirectPath } = await resolveRedirectPathWithPreferredRole(
    preferredRole,
  );

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
}
