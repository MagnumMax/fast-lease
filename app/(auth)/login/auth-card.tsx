"use client";

import React, { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, LogIn } from "lucide-react";

import { requestOtpAction } from "@/app/(auth)/actions";
import {
  INITIAL_AUTH_STATE,
  type AuthActionState,
} from "@/app/(auth)/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeRoleCode, validateRolePath } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/auth/types";
import {
  APP_ROLE_LOGIN_PRESETS,
  type AppRoleLoginPreset,
} from "@/lib/data/app-roles";

type LoginPresetRole = (typeof APP_ROLE_LOGIN_PRESETS)[number]["role"];

const LOGIN_PRESETS: AppRoleLoginPreset[] = APP_ROLE_LOGIN_PRESETS;
const IDENTITY_PLACEHOLDER =
  LOGIN_PRESETS.length > 0
    ? `${LOGIN_PRESETS[0]?.identity ?? "client@fastlease.io"}`
    : "client@fastlease.io";

function MessageBanner({ state }: { state: AuthActionState }) {
  if (state.status === "idle" || !state.message) return null;

  let tone =
    "bg-slate-500/10 text-slate-600 dark:text-slate-300 dark:bg-slate-500/10";
  let icon: React.ReactElement = <LogIn className="h-4 w-4" aria-hidden="true" />;

  switch (state.status) {
    case "success":
      tone =
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/10";
      icon = <Check className="h-4 w-4" aria-hidden="true" />;
      break;
    case "error":
    default:
      tone =
        "bg-red-500/10 text-red-600 dark:text-red-400 dark:bg-red-500/10";
      icon = <AlertCircle className="h-4 w-4" aria-hidden="true" />;
      break;
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${tone}`}
    >
      {icon}
      <span>{state.message}</span>
    </div>
  );
}

function normalizeRole(value: string | undefined): AppRole | null {
  if (!value) return null;
  return normalizeRoleCode(value);
}

export function AuthCard() {
  const router = useRouter();

  const [identityValue, setIdentityValue] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<LoginPresetRole | "">(
    "",
  );

  const [state, formAction, pending] = useActionState(
    requestOtpAction,
    INITIAL_AUTH_STATE,
  );

  const activePreset = useMemo(() => {
    if (!selectedPreset) return null;
    return (
      LOGIN_PRESETS.find((preset) => preset.role === selectedPreset) ?? null
    );
  }, [selectedPreset]);

  const targetRoleValue = activePreset?.role ?? "";
  const submitDisabled = pending || identityValue.trim().length === 0;

  useEffect(() => {
    if (state.status !== "success" || !state.redirectPath) {
      return;
    }

    let finalRedirectPath = state.redirectPath;
    if (finalRedirectPath === "/") {
      const normalizedRole = normalizeRole(targetRoleValue);
      finalRedirectPath = validateRolePath(normalizedRole);
    }

    if (finalRedirectPath && finalRedirectPath !== "/") {
      router.push(finalRedirectPath);
      router.refresh();
    }
  }, [router, state, targetRoleValue]);

  const banners =
    state.status === "idle" || !state.message ? [] : [state];

  function handlePresetChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.currentTarget.value as LoginPresetRole | "";
    if (!value) {
      setSelectedPreset("");
      setIdentityValue("");
      return;
    }

    const preset = LOGIN_PRESETS.find((item) => item.role === value);
    if (!preset) return;

    setSelectedPreset(preset.role);
    setIdentityValue(preset.identity);
  }

  function handleIdentityChange(event: React.ChangeEvent<HTMLInputElement>) {
    setIdentityValue(event.currentTarget.value);
    if (selectedPreset) {
      setSelectedPreset("");
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-3">
        <div className="space-y-2">
          <Label
            htmlFor="role-select"
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground"
          >
            Быстрый доступ
          </Label>
          <select
            id="role-select"
            name="rolePreset"
            value={selectedPreset}
            disabled={pending}
            className="w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            onChange={handlePresetChange}
          >
            <option value="">Выберите роль</option>
            {LOGIN_PRESETS.map((preset) => (
              <option key={preset.role} value={preset.role}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="identity">Email</Label>
          <Input
            id="identity"
            name="identity"
            type="email"
            placeholder={IDENTITY_PLACEHOLDER}
            autoComplete="username"
            value={identityValue}
            onChange={handleIdentityChange}
            disabled={pending}
          />
        </div>

        <input type="hidden" name="targetRole" value={targetRoleValue} />
      </div>

      <div className="grid gap-2">
        {banners.map((banner, index) => (
          <MessageBanner
            key={`${banner.status}-${index}-${banner.errorCode ?? "state"}`}
            state={banner}
          />
        ))}
      </div>

      <Button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        disabled={submitDisabled}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Выполняем вход
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Войти
          </>
        )}
      </Button>
    </form>
  );
}

