"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, Loader2, Lock, LogIn, Phone, UserPlus } from "lucide-react";

import {
  completeMfaChallengeAction,
  sendSmsOtpAction,
  signInWithOAuthAction,
  signInWithPasswordAction,
  signUpAction as registerAccountAction,
  verifySmsOtpAction,
} from "@/app/(auth)/actions";
import {
  INITIAL_AUTH_STATE,
  type AuthActionState,
  type MFAContext,
} from "@/app/(auth)/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthTab = "sign-in" | "sign-up";
type SignInMode = "password" | "sms";

const ROLE_PRESETS = {
  client: {
    label: "Клиент",
    email: "client@fastlease.io",
    password: "client123",
  },
  investor: {
    label: "Инвестор",
    email: "investor@fastlease.io",
    password: "investor123",
  },
  ops: {
    label: "Операционный менеджер",
    email: "ops.manager@fastlease.io",
    password: "ops123",
  },
  admin: {
    label: "Администратор",
    email: "admin@fastlease.io",
    password: "admin123",
  },
} as const;

type RoleKey = keyof typeof ROLE_PRESETS;

const DEFAULT_PHONE_PLACEHOLDER = "+971500000000";

function MessageBanner({ state }: { state: AuthActionState }) {
  if (state.status === "idle") return null;
  if (!state.message) return null;

  const tone =
    state.status === "success" || state.status === "needs_verification"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/10"
      : state.status === "mfa_required"
        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 dark:bg-indigo-500/10"
        : "bg-red-500/10 text-red-600 dark:text-red-400 dark:bg-red-500/10";

  const icon =
    state.status === "success" || state.status === "needs_verification" ? (
      <Check className="h-4 w-4" aria-hidden="true" />
    ) : state.status === "mfa_required" ? (
      <Lock className="h-4 w-4" aria-hidden="true" />
    ) : (
      <Lock className="h-4 w-4" aria-hidden="true" />
    );

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${tone}`}
    >
      {icon}
      <span>{state.message}</span>
    </div>
  );
}

type AuthCardProps = {
  initialTab?: AuthTab;
};

export function AuthCard({ initialTab = "sign-in" }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [mode, setMode] = useState<SignInMode>("password");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [mfaContext, setMfaContext] = useState<MFAContext | null>(null);
  const [pendingOAuth, startOAuthTransition] = useTransition();

  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPasswordAction,
    INITIAL_AUTH_STATE,
  );
  const [mfaState, mfaAction, mfaPending] = useActionState(
    completeMfaChallengeAction,
    INITIAL_AUTH_STATE,
  );
  const [smsState, smsAction, smsPending] = useActionState(
    sendSmsOtpAction,
    INITIAL_AUTH_STATE,
  );
  const [smsVerifyState, smsVerifyAction, smsVerifyPending] = useActionState(
    verifySmsOtpAction,
    INITIAL_AUTH_STATE,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    registerAccountAction,
    INITIAL_AUTH_STATE,
  );

  useEffect(() => {
    const requestedTab = searchParams?.get("tab");
    if (!requestedTab) return;
    const normalized = requestedTab.toLowerCase();
    if (normalized === "register" || normalized === "sign-up") {
      setActiveTab("sign-up");
    } else if (normalized === "sign-in" || normalized === "login") {
      setActiveTab("sign-in");
    }
  }, [searchParams]);

  useEffect(() => {
    const successfulState = [signInState, mfaState, smsVerifyState].find(
      (state) => state.status === "success" && state.redirectPath,
    );
    if (successfulState?.redirectPath) {
      router.push(successfulState.redirectPath);
      router.refresh();
    }
  }, [router, signInState, mfaState, smsVerifyState]);

  useEffect(() => {
    if (signInState.status === "mfa_required" && signInState.mfa) {
      setMfaContext(signInState.mfa);
    }
  }, [signInState]);

  useEffect(() => {
    if (smsState.status === "mfa_required" && smsState.mfa) {
      setMode("sms");
      setMfaContext(smsState.mfa);
    }
  }, [smsState]);

  useEffect(() => {
    if (mfaState.status === "error" && mfaState.mfa) {
      setMfaContext(mfaState.mfa);
    } else if (mfaState.status === "success") {
      setMfaContext(null);
    }
  }, [mfaState]);

  useEffect(() => {
    if (signUpState.status === "needs_verification") {
      setActiveTab("sign-in");
    }
  }, [signUpState]);

  const anyPending =
    signInPending ||
    mfaPending ||
    smsPending ||
    smsVerifyPending ||
    signUpPending ||
    pendingOAuth;

  const sharedDisabled = anyPending;

  const signInBanners: AuthActionState[] = [];
  if (mode === "sms") {
    if (smsState.status !== "idle") signInBanners.push(smsState);
    if (smsVerifyState.status !== "idle") signInBanners.push(smsVerifyState);
  } else {
    if (signInState.status !== "idle") signInBanners.push(signInState);
    if (mfaState.status !== "idle") signInBanners.push(mfaState);
  }

  function handleRoleChange(
    value: string,
    emailInput: HTMLInputElement | null,
    passwordInput: HTMLInputElement | null,
  ) {
    const preset = ROLE_PRESETS[value as RoleKey];
    if (preset) {
      if (emailInput) {
        emailInput.value = preset.email;
      }
      if (passwordInput) {
        passwordInput.value = preset.password;
      }
    } else if (emailInput && passwordInput) {
      emailInput.value = "";
      passwordInput.value = "";
    }
  }

  function renderSignInForm() {
    return (
      <form
        action={
          mfaContext?.type === "totp"
            ? mfaAction
            : mode === "sms"
              ? mfaContext?.type === "sms"
                ? smsVerifyAction
                : smsAction
              : signInAction
        }
        className="space-y-5"
      >
        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-1 text-xs font-medium text-muted-foreground">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 transition ${
                mode === "password"
                  ? "bg-background text-foreground shadow-sm"
                  : ""
              }`}
              onClick={() => {
                setMode("password");
                setMfaContext(null);
              }}
            >
              Пароль
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 transition ${
                mode === "sms"
                  ? "bg-background text-foreground shadow-sm"
                  : ""
              }`}
              onClick={() => {
                setMode("sms");
                setMfaContext(null);
              }}
            >
              SMS
            </button>
          </div>

          {mode === "password" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="role-select" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Быстрый доступ
                </Label>
                <select
                  id="role-select"
                  name="rolePreset"
                  defaultValue=""
                  disabled={sharedDisabled}
                  className="w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  onChange={(event) => {
                    const form = event.currentTarget.form;
                    if (!form) return;
                    const emailInput = form.querySelector<HTMLInputElement>(
                      'input[name="email"]',
                    );
                    const passwordInput = form.querySelector<HTMLInputElement>(
                      'input[name="password"]',
                    );
                    handleRoleChange(event.currentTarget.value, emailInput, passwordInput);
                  }}
                >
                  <option value="">Выберите роль</option>
                  {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jan.kowalski@example.com"
                  autoComplete="email"
                  required
                  disabled={sharedDisabled}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label htmlFor="password">Пароль</Label>
                  <a
                    className="text-brand-600 hover:text-brand-500"
                    href="/reset-password"
                  >
                    Забыли пароль?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    disabled={sharedDisabled}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {mfaContext?.type === "totp" ? (
                <div className="space-y-2">
                  <Label htmlFor="code">Код MFA</Label>
                  <div className="grid gap-2">
                    <Input
                      id="code"
                      name="code"
                      inputMode="numeric"
                      placeholder="Введите код из приложения"
                      disabled={mfaPending}
                      autoFocus
                    />
                    <input type="hidden" name="factorId" value={mfaContext.factorId} />
                    <input
                      type="hidden"
                      name="challengeId"
                      value={mfaContext.challengeId}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder={DEFAULT_PHONE_PLACEHOLDER}
                    autoComplete="tel"
                    disabled={sharedDisabled}
                    className="pl-10"
                    required
                  />
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              {mfaContext?.type === "sms" ? (
                <div className="space-y-2">
                  <Label htmlFor="token">Код в SMS</Label>
                  <Input
                    id="token"
                    name="token"
                    inputMode="numeric"
                    pattern="\d{4,8}"
                    placeholder="Например, 123456"
                    disabled={sharedDisabled}
                    required
                  />
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="grid gap-2">
          {signInBanners.map((state, index) => (
            <MessageBanner key={index} state={state} />
          ))}
        </div>

        <Button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          disabled={sharedDisabled}
        >
          {anyPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Выполняем запрос
            </>
          ) : mfaContext ? (
            <>
              <Lock className="h-4 w-4" aria-hidden="true" />
              Подтвердить
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Войти
            </>
          )}
        </Button>

        {mode === "password" && !mfaContext ? (
          <div className="grid gap-2 text-xs text-muted-foreground">
            <p>Или продолжить через</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={sharedDisabled}
                onClick={() =>
                  startOAuthTransition(async () => {
                    await signInWithOAuthAction("google");
                  })
                }
              >
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={sharedDisabled}
                onClick={() =>
                  startOAuthTransition(async () => {
                    await signInWithOAuthAction("apple");
                  })
                }
              >
                Apple
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    );
  }

  function renderSignUpForm() {
    return (
      <form action={signUpAction} className="space-y-4">
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor="fullName">Полное имя</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Maxime Dupont"
              autoComplete="name"
              required
              disabled={sharedDisabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signUpEmail">Email</Label>
            <Input
              id="signUpEmail"
              name="email"
              type="email"
              placeholder="jan.kowalski@example.com"
              autoComplete="email"
              required
              disabled={sharedDisabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signUpPassword">Пароль</Label>
            <Input
              id="signUpPassword"
              name="password"
              type="password"
              placeholder="Не менее 8 символов"
              minLength={8}
              required
              disabled={sharedDisabled}
            />
            <p className="text-xs text-muted-foreground">
              Минимум 8 символов, одна цифра и одна буква.
            </p>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 text-xs md:text-sm">
            <input
              type="checkbox"
              name="marketing"
              className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
              defaultChecked
              disabled={sharedDisabled}
            />
            <span>
              Получать продуктивные инсайты и чек-листы по ускорению одобрения
              лизинга.
            </span>
          </label>
        </div>

        <MessageBanner state={signUpState} />

        <Button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          disabled={sharedDisabled}
        >
          {signUpPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Создаем аккаунт
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Зарегистрироваться
            </>
          )}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-1 text-sm font-medium text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            setActiveTab("sign-in");
            setMode("password");
            setMfaContext(null);
          }}
          className={`flex-1 rounded-lg px-4 py-2 transition ${
            activeTab === "sign-in" ? "bg-background text-foreground shadow-sm" : ""
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("sign-up");
            setMfaContext(null);
          }}
          className={`flex-1 rounded-lg px-4 py-2 transition ${
            activeTab === "sign-up" ? "bg-background text-foreground shadow-sm" : ""
          }`}
        >
          Регистрация
        </button>
      </div>

      {activeTab === "sign-in" ? renderSignInForm() : renderSignUpForm()}

      {activeTab === "sign-in" ? (
        <p className="text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <button
            type="button"
            className="font-medium text-brand-600 hover:text-brand-500"
            onClick={() => setActiveTab("sign-up")}
          >
            Создайте его
          </button>
        </p>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <button
            type="button"
            className="font-medium text-brand-600 hover:text-brand-500"
            onClick={() => setActiveTab("sign-in")}
          >
            Войдите
          </button>
        </p>
      )}
    </div>
  );
}
