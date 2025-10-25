"use client";

import React, { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Lock, LogIn } from "lucide-react";

import { requestOtpAction, verifyOtpAction } from "@/app/(auth)/actions";
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
  APP_ROLE_DEFAULT_PHONES,
  APP_ROLE_LOGIN_PRESETS,
  type AppRoleLoginPreset,
} from "@/lib/data/app-roles";

type Stage = "request" | "verify";
const LOGIN_PRESETS: AppRoleLoginPreset[] = APP_ROLE_LOGIN_PRESETS;

type LoginPresetRole = (typeof LOGIN_PRESETS)[number]["role"];

const DEFAULT_PHONE_PLACEHOLDER =
  APP_ROLE_DEFAULT_PHONES.CLIENT ?? "+971500000000";
const IDENTITY_PLACEHOLDER = LOGIN_PRESETS.length
  ? `${LOGIN_PRESETS[0]?.identity ?? "client@fastlease.io"} или ${DEFAULT_PHONE_PLACEHOLDER}`
  : `client@fastlease.io или ${DEFAULT_PHONE_PLACEHOLDER}`;

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
    case "otp_requested":
      tone =
        "bg-brand-500/10 text-brand-600 dark:text-brand-400 dark:bg-brand-500/10";
      icon = <Lock className="h-4 w-4" aria-hidden="true" />;
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

type PendingIdentity = {
  identity: string;
  identityType: "email" | "phone";
  displayIdentity: string;
  targetRole: AppRole | null;
};

function normalizeRole(value: string | undefined): AppRole | null {
  if (!value) return null;
  return normalizeRoleCode(value);
}

export function AuthCard() {
  const router = useRouter();
  const isProduction = process.env.NODE_ENV === "production";

  const [stage, setStage] = useState<Stage>("request");
  const [identityValue, setIdentityValue] = useState<string>("");
  const [otpValue, setOtpValue] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<LoginPresetRole | "">("");
  const [pendingIdentity, setPendingIdentity] = useState<PendingIdentity | null>(
    null,
  );
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);

  const [requestState, requestAction, requestPending] = useActionState(
    requestOtpAction,
    INITIAL_AUTH_STATE,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyOtpAction,
    INITIAL_AUTH_STATE,
  );

  useEffect(() => {
    if (requestState.status !== "otp_requested") return;

    const contextIdentity = requestState.context?.identity ?? identityValue.trim();
    if (!contextIdentity) return;

    const identityType =
      (requestState.context?.identityType as "email" | "phone") ??
      (contextIdentity.includes("@") ? "email" : "phone");
    const contextRole = normalizeRole(
      requestState.context?.targetRole as string | undefined,
    );

    setPendingIdentity({
      identity: contextIdentity,
      identityType,
      displayIdentity:
        requestState.context?.displayIdentity ?? contextIdentity,
      targetRole: contextRole,
    });
    setPendingRole(contextRole);
    setStage("verify");
    setOtpValue("");
  }, [identityValue, requestState]);

  const anyPending = requestPending || verifyPending;
  const sharedDisabled = anyPending;

  const presetForDev = useMemo(() => {
    if (!selectedPreset) return null;
    return LOGIN_PRESETS.find((preset) => preset.role === selectedPreset) ?? null;
  }, [selectedPreset]);

  const devPresetForBypass =
    !isProduction && stage === "request" ? presetForDev : null;

  const presetRole = presetForDev?.role ?? null;
  const activeRole =
    stage === "verify"
      ? pendingRole ?? pendingIdentity?.targetRole ?? presetRole
      : presetRole;
  const targetRoleValue = activeRole ?? "";

  useEffect(() => {
    const successfulState = [verifyState, requestState].find(
      (state) => state.status === "success",
    );

    if (!successfulState || !successfulState.redirectPath) {
      return;
    }

    console.log("[DEBUG] successfulState.redirectPath:", successfulState.redirectPath);
    console.log("[DEBUG] targetRoleValue:", targetRoleValue);

    // Если redirectPath равен "/", используем fallback для роли
    let finalRedirectPath = successfulState.redirectPath;
    if (successfulState.redirectPath === "/") {
      const normalizedRole = normalizeRole(targetRoleValue);
      finalRedirectPath = validateRolePath(normalizedRole);
    }

    console.log("[DEBUG] finalRedirectPath:", finalRedirectPath);

    if (finalRedirectPath && finalRedirectPath !== "/") {
      router.push(finalRedirectPath);
      router.refresh();
    }
  }, [router, requestState, targetRoleValue, verifyState]);

  useEffect(() => {
    if (stage !== "verify" || !pendingIdentity) return;

    const normalize = (value: string) => value.replace(/\s+/g, "").toLowerCase();
    if (normalize(identityValue) !== normalize(pendingIdentity.identity)) {
      setStage("request");
      setPendingIdentity(null);
      setPendingRole(null);
      setOtpValue("");
    }
  }, [identityValue, pendingIdentity, stage]);

  const banners = useMemo(() => {
    const activeStates =
      stage === "verify"
        ? [requestState, verifyState]
        : [requestState];
    return activeStates.filter(
      (state) => state.status !== "idle" && state.status !== "success",
    );
  }, [requestState, verifyState, stage]);

  function handlePresetChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.currentTarget.value;
    const selectedRole = value as AppRole;

    if (!value) {
      setSelectedPreset("");
      setIdentityValue("");
      setStage("request");
      setPendingIdentity(null);
      setPendingRole(null);
      setOtpValue("");
      return;
    }

    const preset = LOGIN_PRESETS.find((item) => item.role === selectedRole);
    if (!preset) return;

    setSelectedPreset(preset.role);
    setIdentityValue(preset.identity);
    setStage("request");
    setPendingIdentity(null);
    setPendingRole(preset.role);
    setOtpValue("");
  }

  function handleIdentityChange(event: React.ChangeEvent<HTMLInputElement>) {
    setIdentityValue(event.currentTarget.value);
    if (selectedPreset) {
      setSelectedPreset("");
    }
  }

  function handleOtpChange(event: React.ChangeEvent<HTMLInputElement>) {
    setOtpValue(event.currentTarget.value);
  }

  const submitDisabled =
    sharedDisabled ||
    (stage === "request"
      ? identityValue.trim().length === 0
      : identityValue.trim().length === 0 || otpValue.trim().length === 0);

  return (
    <form
      action={stage === "verify" ? verifyAction : requestAction}
      className="space-y-6"
    >
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
            disabled={sharedDisabled}
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
          <Label htmlFor="identity">Телефон или Email</Label>
          <Input
            id="identity"
            name="identity"
            type="text"
            placeholder={IDENTITY_PLACEHOLDER}
            autoComplete="username"
            value={identityValue}
            onChange={handleIdentityChange}
            disabled={sharedDisabled}
          />
        </div>

        {stage === "verify" ? (
          <div className="space-y-2">
            <Label htmlFor="otp">Код подтверждения</Label>
            <Input
              id="otp"
              name="token"
              type="text"
              inputMode="numeric"
              pattern="\d{4,8}"
              placeholder="Например, 123456"
              autoComplete="one-time-code"
              autoFocus
              value={otpValue}
              onChange={handleOtpChange}
              disabled={sharedDisabled}
            />
            {pendingIdentity?.displayIdentity ? (
              <p className="text-xs text-muted-foreground">
                Код отправлен на {pendingIdentity.displayIdentity}.
              </p>
            ) : null}
          </div>
        ) : null}

        <input type="hidden" name="targetRole" value={targetRoleValue} />
        {devPresetForBypass ? (
          <input type="hidden" name="devBypass" value="true" />
        ) : null}
      </div>

      <div className="grid gap-2">
        {banners.map((state, index) => (
          <MessageBanner
            key={`${state.status}-${index}-${state.errorCode ?? "state"}`}
            state={state}
          />
        ))}
      </div>

      <Button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        disabled={submitDisabled}
      >
        {anyPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Выполняем запрос
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
