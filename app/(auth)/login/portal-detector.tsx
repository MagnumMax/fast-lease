"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { autoPortalSignInAction } from "@/app/(auth)/actions";
import {
  INITIAL_AUTH_STATE,
  type AuthActionState,
} from "@/app/(auth)/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PortalDetector() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    AuthActionState,
    FormData
  >(autoPortalSignInAction, INITIAL_AUTH_STATE);

  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.status === "success") {
      const identity = state.context?.identity?.toLowerCase();
      const isAdminIdentity = identity === "admin@fastlease.ae";
      const fallbackRedirect =
        state.context?.portal === "app" && isAdminIdentity
          ? "/admin/dashboard"
          : undefined;

      const target = state.redirectPath ?? fallbackRedirect;
      if (target) {
        router.replace(target);
      }
    }
  }, [state, router]);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const emailHasError = emailTouched && !isValidEmail(emailValue);
  const passwordHasError = passwordTouched && passwordValue.trim().length < 6;

  const disableSubmit =
    pending || !isValidEmail(emailValue) || passwordValue.trim().length < 6;

  const buttonLabel = pending ? "Signing in..." : "Sign in";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!isValidEmail(emailValue) || passwordValue.trim().length < 6) {
      event.preventDefault();
    }
  };

  return (
    <>
      <form action={formAction} className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label
            htmlFor="login-identity"
            className="text-sm font-semibold normal-case tracking-normal text-muted-foreground"
          >
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input
              id="login-identity"
              name="identity"
              type="email"
              placeholder="you@example.com"
              autoComplete="username"
              className="rounded-2xl border-border bg-surface-subtle pl-10 text-base text-foreground shadow-sm focus-visible:ring-brand-500"
              value={emailValue}
              onChange={(event) => setEmailValue(event.currentTarget.value)}
              onBlur={() => setEmailTouched(true)}
              disabled={pending}
            />
          </div>
          <FieldMessage
            intent={emailHasError ? "error" : "muted"}
            message={emailHasError ? "Enter a valid business email address." : undefined}
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="login-password"
            className="text-sm font-semibold normal-case tracking-normal text-muted-foreground"
          >
            Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="rounded-2xl border-border bg-surface-subtle pl-10 text-base text-foreground shadow-sm focus-visible:ring-brand-500"
              value={passwordValue}
              onChange={(event) => setPasswordValue(event.currentTarget.value)}
              onBlur={() => setPasswordTouched(true)}
              disabled={pending}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldMessage
            intent={passwordHasError ? "error" : "muted"}
            message={passwordHasError ? "Password must be at least 6 characters." : undefined}
          />
        </div>

        <Button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-background hover:bg-foreground/90 disabled:bg-foreground disabled:text-background"
          disabled={disableSubmit}
        >
          {buttonLabel}
        </Button>
      </form>

      <MessageBanner state={state} />
    </>
  );
}

function MessageBanner({ state }: { state: AuthActionState }) {
  if (!state.message || state.status === "idle") return null;

  const tone =
    state.status === "success"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "bg-red-500/10 text-red-600 dark:text-red-300";
  const Icon = state.status === "success" ? Check : AlertCircle;

  return (
    <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${tone}`}>
      <Icon className="h-4 w-4" />
      <span>{state.message}</span>
    </div>
  );
}

type FieldMessageProps = {
  intent?: "error" | "muted";
  message?: string;
};

function FieldMessage({ intent = "muted", message }: FieldMessageProps) {
  if (!message) return null;
  return (
    <p
      className={cn(
        "text-sm",
        intent === "error"
          ? "text-red-600 dark:text-red-300"
          : "text-muted-foreground"
      )}
    >
      {message}
    </p>
  );
}
