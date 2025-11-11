import Link from "next/link";

import { ResetPasswordForm } from "./reset-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Смена пароля — Fast Lease",
};

export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const identity = data.user?.email ?? null;

  return (
    <div className="mx-auto max-w-xl space-y-8 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-300">
          Обновление пароля
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Установите новый пароль
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Придумайте надёжный пароль (минимум 6 символов). После сохранения мы перенаправим вас к форме входа.
        </p>
      </div>

      <ResetPasswordForm identity={identity} nextPath="/login" />

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Если ссылка устарела,{" "}
        <Link
          href="/login/forgot"
          className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white"
        >
          запросите новую
        </Link>
        .
      </p>
    </div>
  );
}
