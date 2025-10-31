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

  // Ищем существующего пользователя через Admin API
  let existingUser: User | undefined;
  try {
    const { data: listData } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });
    existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    );
  } catch {
    // Если не удалось получить список, продолжаем с попыткой создания пользователя
    existingUser = undefined;
  }

  if (existingUser) {
    // Обновляем существующего пользователя
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

  // Создаем нового пользователя
  const { data: createdData, error: createError } =
    await service.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      password,
    });

  if (createError) {
    // Если пользователь уже существует, продолжим без ошибки
    const message = typeof createError?.message === "string" ? createError.message.toLowerCase() : "";
    if (createError.status === 409 || message.includes("already") || message.includes("exists")) {
      // Возвращаем заглушку; фактически она не будет использоваться далее
      return { id: "00000000-0000-0000-0000-000000000000" } as unknown as User;
    }
    throw createError;
  }

  if (!createdData?.user) {
    throw new Error("createUser did not return user");
  }

  return createdData.user;
}

async function quickPasswordSignIn(
  identity: Identity & { type: "email" },
  preferredRole: AppRole | null,
): Promise<AuthActionState> {
  const password = QUICK_LOGIN_PASSWORD;

  const service = await createSupabaseServiceClient();
  const supabase = await createSupabaseServerClient();

  try {
    await ensureUserWithQuickPassword(service, identity.value, password);
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

  const userId = signInData.user.id;

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


export async function requestOtpAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;

  const identity = resolveIdentity(formData.get("identity"));
  const preferredRole = normalizeRole(formData.get("targetRole"));
  if (!identity || identity.type !== "email") {
    console.log("[LOGIN ERROR] Неверный email адрес", { identity: formData.get("identity") });
    return {
      status: "error",
      message: "Введите корректный email адрес для входа.",
      errorCode: "invalid_identity",
    };
  }

  console.log("[LOGIN] Запуск быстрого входа по паролю", { email: identity.value, role: preferredRole });
  try {
    const result = await quickPasswordSignIn(identity, preferredRole);
    if (result.status === "success") {
      console.log("[LOGIN SUCCESS] Успешный вход", { email: identity.value, role: preferredRole, redirectPath: result.redirectPath });
    } else {
      console.log("[LOGIN ERROR] Ошибка аутентификации", { email: identity.value, role: preferredRole, errorCode: result.errorCode, message: result.message });
    }
    return result;
  } catch (error) {
    console.error("[LOGIN ERROR] Неожиданная ошибка в requestOtpAction", error);
    return {
      status: "error",
      message: "Произошла неожиданная ошибка при входе.",
      errorCode: "unexpected_error",
    };
  }
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
