"use server";

import { redirect } from "next/navigation";

import type { AuthError } from "@supabase/supabase-js";

import { type AuthActionState } from "./action-state";
import { resolveHomePath } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

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

async function ensureProfileAndRoles(
  userId: string,
  fullName: string | null,
  marketingOptIn: boolean,
) {
  const service = await createSupabaseServiceClient();

  const safeFullName = fullName?.trim() || null;

  const { error: profileError } = await service
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        full_name: safeFullName,
        marketing_opt_in: marketingOptIn,
        status: "pending",
      },
      { onConflict: "user_id" },
    );

  if (profileError) {
    console.error("[auth] Failed to upsert profile", profileError);
  }

  const { error: roleError } = await service
    .from("user_roles")
    .upsert(
      {
        user_id: userId,
        role: "client",
      },
      { onConflict: "user_id,role" },
    );

  if (roleError) {
    console.error("[auth] Failed to assign default role", roleError);
  }
}

async function resolveRedirectPathWithRoles() {
  const sessionUser = await getSessionUser();
  const redirectPath = resolveHomePath(sessionUser?.roles ?? [], "/");
  return {
    redirectPath,
    roles: sessionUser?.roles ?? [],
  };
}

function shouldRetryWithMFA(error: AuthError | null): boolean {
  if (!error || typeof error.message !== "string") {
    return false;
  }

  const normalized = error.message.toLowerCase();
  return (
    normalized.includes("mfa required") ||
    normalized.includes("factor required") ||
    normalized.includes("verify a factor")
  );
}

function shouldRedirectToVerification(error: AuthError | null): boolean {
  if (!error) return false;
  if (error.status && error.status >= 300 && error.status < 400) return true;
  if (typeof error.message !== "string") return false;

  const normalized = error.message.toLowerCase();
  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("signup confirmation required")
  );
}

export async function signInWithPasswordAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const email = normalizeEmail(formData.get("email"));
  const password = normalizeString(formData.get("password"));

  if (!email || !password) {
    return {
      status: "error",
      message: "Укажите email и пароль.",
      errorCode: "missing_credentials",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (shouldRedirectToVerification(error)) {
      return {
        status: "needs_verification",
        message:
          "Подтвердите email, чтобы завершить вход. Мы отправили письмо повторно.",
        errorCode: "email_not_confirmed",
      };
    }

    if (shouldRetryWithMFA(error)) {
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) {
        return {
          status: "error",
          message: formatAuthErrorMessage(factorsError),
          errorCode: "mfa_factors_failed",
        };
      }

      const totpFactor = factors?.totp?.[0];
      if (totpFactor) {
        const { data: challenge, error: challengeError } =
          await supabase.auth.mfa.challenge({
            factorId: totpFactor.id,
          });

        if (challengeError || !challenge?.id) {
          return {
            status: "error",
            message: formatAuthErrorMessage(challengeError),
            errorCode: "mfa_challenge_failed",
          };
        }

        return {
          status: "mfa_required",
          message: "Требуется подтверждение через MFA. Введите код из приложения.",
          mfa: {
            type: "totp",
            factorId: totpFactor.id,
            challengeId: challenge.id,
          },
        };
      }
    }

    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "sign_in_failed",
    };
  }

  if (!data.session) {
    return {
      status: "error",
      message: "Supabase вернул пустую сессию. Проверьте реквизиты.",
      errorCode: "missing_session",
    };
  }

  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("user_id", data.session.user.id);

  const { redirectPath } = await resolveRedirectPathWithRoles();

  return {
    status: "success",
    redirectPath,
  };
}

export async function completeMfaChallengeAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const factorId = normalizeString(formData.get("factorId"));
  const challengeId = normalizeString(formData.get("challengeId"));
  const code = normalizeString(formData.get("code"));

  if (!factorId || !challengeId || !code) {
    return {
      status: "error",
      message: "Введите код MFA.",
      errorCode: "missing_mfa_code",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });

  if (error) {
    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "mfa_verify_failed",
      mfa: {
        type: "totp",
        factorId,
        challengeId,
      },
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      status: "error",
      message: "Supabase не вернул сессию после MFA. Повторите попытку.",
      errorCode: "missing_session",
      mfa: {
        type: "totp",
        factorId,
        challengeId,
      },
    };
  }

  const { redirectPath } = await resolveRedirectPathWithRoles();

  return {
    status: "success",
    redirectPath,
  };
}

export async function sendSmsOtpAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const phone = sanitizePhone(formData.get("phone"));
  if (!phone) {
    return {
      status: "error",
      message: "Укажите номер телефона в международном формате.",
      errorCode: "missing_phone",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: false,
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

  return {
    status: "mfa_required",
    message: "Мы отправили код в SMS. Введите его ниже.",
    mfa: {
      type: "sms",
      phone,
    },
  };
}

export async function verifySmsOtpAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const phone = sanitizePhone(formData.get("phone"));
  const token = normalizeString(formData.get("token"));

  if (!phone || !token) {
    return {
      status: "error",
      message: "Введите код из SMS и подтвердите номер.",
      errorCode: "missing_sms_code",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "sms_verify_failed",
      mfa: {
        type: "sms",
        phone,
      },
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      status: "error",
      message: "Supabase не вернул сессию после проверки кода.",
      errorCode: "missing_session",
      mfa: {
        type: "sms",
        phone,
      },
    };
  }

  const { redirectPath } = await resolveRedirectPathWithRoles();

  return {
    status: "success",
    redirectPath,
  };
}

export async function signUpAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const fullName = normalizeString(formData.get("fullName"));
  const email = normalizeEmail(formData.get("email"));
  const password = normalizeString(formData.get("password"));
  const marketingOptIn = formData.get("marketing") === "on";

  if (!fullName || !email || !password) {
    return {
      status: "error",
      message: "Заполните имя, email и пароль.",
      errorCode: "missing_signup_fields",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: formatAuthErrorMessage(error),
      errorCode: "sign_up_failed",
    };
  }

  if (data.user) {
    await ensureProfileAndRoles(data.user.id, fullName, marketingOptIn);
  }

  return {
    status: "needs_verification",
    message:
      "Аккаунт создан. Подтвердите email, чтобы войти в личный кабинет.",
  };
}

export async function signInWithOAuthAction(provider: "google" | "apple") {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      scopes:
        provider === "google" ? "email profile openid" : "name email",
    },
  });

  if (error) {
    return {
      status: "error",
      message: formatAuthErrorMessage(error),
    } satisfies AuthActionState;
  }

  if (data.url) {
    redirect(data.url);
  }

  return {
    status: "error",
    message:
      "Supabase не вернул redirect URL. Проверьте настройки OAuth провайдера.",
  } satisfies AuthActionState;
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
