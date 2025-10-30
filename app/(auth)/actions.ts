"use server";

import { type AuthActionState } from "./action-state";
import {
  normalizeRoleCode,
  resolveHomePath,
  validateRolePath,
} from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import type { AppRole } from "@/lib/auth/types";
import {
  ensureDefaultProfileAndRole,
  ensureRoleAssignment,
} from "@/lib/auth/role-management";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

type Identity =
  | { type: "email"; value: string }
  | { type: "phone"; value: string };

const QUICK_LOGIN_PASSWORD =
  process.env.AUTH_QUICK_LOGIN_PASSWORD ??
  process.env.QUICK_LOGIN_PASSWORD ??
  "fastlease";

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

async function ensureUserWithQuickPassword(
  service: Awaited<ReturnType<typeof createSupabaseServiceClient>>,
  email: string,
  password: string,
): Promise<User> {
  const normalizedEmail = email.toLowerCase();
  const { data: listData, error: listError } = await service.auth.admin.listUsers({
    perPage: 100,
  });

  if (listError) {
    throw listError;
  }

  const existingUser =
    listData?.users?.find(
      (user) =>
        typeof user.email === "string" &&
        user.email.toLowerCase() === normalizedEmail,
    ) ?? null;

  if (!existingUser) {
    const { data: createdData, error: createError } =
      await service.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
      });

    if (createError || !createdData?.user) {
      throw createError ?? new Error("createUser did not return user");
    }

    return createdData.user;
  }

  const { data: updatedData, error: updateError } =
    await service.auth.admin.updateUserById(existingUser.id, {
      email_confirm: true,
      password,
    });

  if (updateError) {
    throw updateError;
  }

  return updatedData?.user ?? existingUser;
}

async function quickPasswordSignIn(
  identity: Identity & { type: "email" },
  preferredRole: AppRole | null,
): Promise<AuthActionState> {
  const password = QUICK_LOGIN_PASSWORD;

  const service = await createSupabaseServiceClient();
  const supabase = await createSupabaseServerClient();

  let user: User;
  try {
    user = await ensureUserWithQuickPassword(service, identity.value, password);
  } catch (error) {
    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "quick_login_user_setup_failed",
    };
  }

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: identity.value,
      password,
    });

  if (signInError || !signInData.session || !signInData.user) {
    return {
      status: "error",
      message: formatAuthErrorMessage(signInError ?? "Не удалось создать сессию."),
      errorCode: "quick_login_sign_in_failed",
    };
  }

  const userId = signInData.user.id ?? user.id;

  await ensureDefaultProfileAndRole(supabase, userId);
  await ensureRoleAssignment(userId, preferredRole);

  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("user_id", userId);

  const { redirectPath } = await resolveRedirectPathWithPreferredRole(
    preferredRole,
  );

  return {
    status: "success",
    redirectPath,
  };
}

function normalizeRole(value: FormDataEntryValue | null): AppRole | null {
  if (typeof value !== "string") return null;
  return normalizeRoleCode(value);
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
  await ensureRoleAssignment(userData.user.id, preferredRole);

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
  if (!identity || identity.type !== "email") {
    return {
      status: "error",
      message: "Введите корректный email адрес для входа.",
      errorCode: "invalid_identity",
    };
  }

  return quickPasswordSignIn(identity, preferredRole);
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
  await ensureRoleAssignment(userData.user.id, preferredRole);

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
