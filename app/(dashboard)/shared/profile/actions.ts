"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const PROFILE_PATHS = [
  "/client/profile",
  "/ops/profile",
  "/admin/profile",
  "/finance/profile",
  "/support/profile",
  "/tech/profile",
  "/risk/profile",
  "/legal/profile",
  "/accounting/profile",
  "/investor/profile",
  "/partner/profile",
];

function revalidateAllProfilePages() {
  for (const path of PROFILE_PATHS) {
    revalidatePath(path);
  }
}

export async function updateProfileAction(
  _prev: { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> },
  formData: FormData,
): Promise<{ status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> }> {
  const fullName = typeof formData.get("fullName") === "string" ? (formData.get("fullName") as string).trim() : "";
  const phone = typeof formData.get("phone") === "string" ? (formData.get("phone") as string).trim() : "";
  const timezone = typeof formData.get("timezone") === "string" ? (formData.get("timezone") as string).trim() : "Asia/Dubai";

  if (!fullName) {
    return {
      status: "error",
      message: "Укажите полное имя",
      fieldErrors: { fullName: "Поле обязательно" },
    };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      status: "error",
      message: "Сессия не найдена. Выполните вход повторно.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      timezone,
    })
    .eq("user_id", session.user.id)
    .select("id")
    .single();

  if (error) {
    return {
      status: "error",
      message: error.message ?? "Не удалось обновить профиль",
    };
  }

  revalidateAllProfilePages();

  return {
    status: "success",
    message: "Профиль обновлен",
  };
}

export async function updateSecurityAction(
  _prev: { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> },
  formData: FormData,
): Promise<{ status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> }> {
  const currentPassword = typeof formData.get("currentPassword") === "string" ? (formData.get("currentPassword") as string).trim() : "";
  const newPassword = typeof formData.get("newPassword") === "string" ? (formData.get("newPassword") as string).trim() : "";

  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      status: "error",
      message: "Сессия не найдена. Выполните вход повторно.",
    };
  }

  if (newPassword && newPassword.length < 8) {
    return {
      status: "error",
      message: "Пароль должен содержать минимум 8 символов.",
      fieldErrors: { newPassword: "Минимум 8 символов" },
    };
  }

  if (newPassword) {
    if (!currentPassword) {
      return {
        status: "error",
        message: "Укажите текущий пароль для подтверждения.",
        fieldErrors: { currentPassword: "Введите текущий пароль" },
      };
    }

    const email = session.user.email;
    if (!email) {
      return {
        status: "error",
        message: "Email пользователя не найден. Обратитесь в поддержку.",
      };
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (reauthError) {
      return {
        status: "error",
        message: "Текущий пароль неверен.",
        fieldErrors: { currentPassword: "Неверный пароль" },
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return {
        status: "error",
        message: updateError.message ?? "Не удалось обновить пароль",
      };
    }
  }

  revalidateAllProfilePages();

  return {
    status: "success",
    message: newPassword ? "Пароль обновлен" : "Профиль безопасности без изменений",
  };
}
