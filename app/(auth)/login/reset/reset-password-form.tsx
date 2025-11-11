"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Lock } from "lucide-react";

import {
  completePasswordResetAction,
} from "@/app/(auth)/actions";
import {
  INITIAL_AUTH_STATE,
  type AuthActionState,
} from "@/app/(auth)/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetPasswordFormProps = {
  identity?: string | null;
  nextPath?: string | null;
};

export function ResetPasswordForm({
  identity,
  nextPath,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    AuthActionState,
    FormData
  >(completePasswordResetAction, INITIAL_AUTH_STATE);
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");

  useEffect(() => {
    if (state.status === "success" && state.redirectPath) {
      const timeout = setTimeout(() => {
        router.push(state.redirectPath ?? "/login");
        router.refresh();
      }, 1200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label>Аккаунт</Label>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          {identity ?? "Неизвестно (откройте ссылку из письма ещё раз)"}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">Новый пароль</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <Input
            id="new-password"
            name="password"
            type="password"
            placeholder="Минимум 6 символов"
            className="pl-10"
            value={passwordValue}
            onChange={(event) => setPasswordValue(event.currentTarget.value)}
            minLength={6}
            required
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Повторите пароль</Label>
        <Input
          id="confirm-password"
          name="confirm"
          type="password"
          placeholder="Повторите новый пароль"
          value={confirmValue}
          onChange={(event) => setConfirmValue(event.currentTarget.value)}
          minLength={6}
          required
          disabled={pending}
        />
      </div>

      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      {state.message ? (
        <div
          className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${
            state.status === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {state.status === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{state.message}</span>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Обновляем..." : "Обновить пароль"}
      </Button>
    </form>
  );
}
