"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Mail } from "lucide-react";

import {
  requestPasswordResetAction,
} from "@/app/(auth)/actions";
import {
  INITIAL_AUTH_STATE,
  type AuthActionState,
} from "@/app/(auth)/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<
    AuthActionState,
    FormData
  >(requestPasswordResetAction, INITIAL_AUTH_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <Input
            id="reset-email"
            name="identity"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            className="pl-10"
            disabled={pending}
            required
          />
        </div>
      </div>

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
        {pending ? "Отправляем письмо..." : "Получить ссылку"}
      </Button>
    </form>
  );
}
