"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const INITIAL_PROFILE_STATE: ProfileActionState = {
  status: "idle",
};

function ensureString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const fullName = ensureString(formData.get("fullName"));
  const phone = ensureString(formData.get("phone"));
  const timezone = ensureString(formData.get("timezone")) || "Asia/Dubai";
  const marketingOptIn = formData.get("marketing") === "on";

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
      marketing_opt_in: marketingOptIn,
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

  revalidatePath("/client/profile");

  return {
    status: "success",
    message: "Профиль обновлен",
  };
}

export async function updateSecurityAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const currentPassword = ensureString(formData.get("currentPassword"));
  const newPassword = ensureString(formData.get("newPassword"));
  const notifications = ensureString(formData.get("notifications")) || "proactive";

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

  const { data: profileData, error: metadataLoadError } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (metadataLoadError) {
    return {
      status: "error",
      message: metadataLoadError.message ?? "Не удалось загрузить профиль",
    };
  }

  const metadata = (profileData?.metadata as Record<string, unknown>) ?? {};
  metadata.notifications_preference = notifications;

  const { error: metadataUpdateError } = await supabase
    .from("profiles")
    .update({ metadata })
    .eq("user_id", session.user.id)
    .select("id")
    .single();

  if (metadataUpdateError) {
    return {
      status: "error",
      message: metadataUpdateError.message ?? "Ошибка обновления настроек",
    };
  }

  revalidatePath("/client/profile");

  return {
    status: "success",
    message: newPassword
      ? "Пароль и уведомления обновлены"
      : "Настройки уведомлений обновлены",
  };
}

export async function toggleAutopayAction(enabled: boolean) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Сессия не найдена");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const metadata = (data?.metadata as Record<string, unknown>) ?? {};
  metadata.autopay_enabled = enabled;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ metadata })
    .eq("user_id", session.user.id);

  if (updateError) {
    throw updateError;
  }

  revalidatePath("/client/profile");
  return enabled;
}
