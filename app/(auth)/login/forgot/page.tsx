import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Восстановление доступа — Fast Lease",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-300">
          Восстановление доступа
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Забылся пароль?
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Введите корпоративный email — мы отправим ссылку для установки нового пароля.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Вспомнили пароль?{" "}
        <Link
          href="/login"
          className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white"
        >
          Вернуться ко входу
        </Link>
      </p>
    </div>
  );
}
