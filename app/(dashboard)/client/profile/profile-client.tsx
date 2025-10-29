"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import {
  Activity,
  Check,
  FileText,
  MailCheck,
  Phone,
  Repeat,
} from "lucide-react";

import {
  toggleAutopayAction,
  updateProfileAction,
  updateSecurityAction,
} from "./actions";
import type { AppRole } from "@/lib/auth/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const INITIAL_PROFILE_STATE: ProfileActionState = {
  status: "idle",
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  icon: string;
};

type ProfileClientProps = {
  profile: {
    fullName: string;
    email: string;
    phone: string;
    timezone: string;
  };
  role: AppRole | null;
  autopayEnabled: boolean;
  notificationsPreference: string;
  activities: ActivityItem[];
};

const TIMEZONE_OPTIONS = [
  { label: "Dubai (UTC+4)", value: "Asia/Dubai" },
  { label: "Abu Dhabi (UTC+4)", value: "Asia/Dubai" },
  { label: "Riyadh (UTC+3)", value: "Asia/Riyadh" },
  { label: "Doha (UTC+3)", value: "Asia/Qatar" },
];

const NOTIFICATION_OPTIONS = [
  { value: "proactive", label: "Proactive (recommended)" },
  { value: "critical", label: "Critical only" },
  { value: "mute-email", label: "Disable email" },
];

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string) {
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function resolveIcon(icon: string) {
  switch (icon) {
    case "repeat":
      return Repeat;
    case "phone":
      return Phone;
    case "mail-check":
      return MailCheck;
    case "file-text":
      return FileText;
    default:
      return Activity;
  }
}

function Banner({ state }: { state: ProfileActionState }) {
  if (state.status === "idle" || !state.message) return null;
  const tone = state.status === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600";
  const Icon = state.status === "success" ? Check : Activity;

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${tone}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{state.message}</span>
    </div>
  );
}

export function ProfileClient({
  profile,
  role,
  autopayEnabled: initialAutopay,
  notificationsPreference,
  activities,
}: ProfileClientProps) {
  const [autopayEnabled, setAutopayEnabled] = useState(initialAutopay);
  const [autopayMessage, setAutopayMessage] = useState<string | null>(null);
  const [autopayPending, startAutopayTransition] = useTransition();

  const [profileState, submitProfile, profilePending] = useActionState(
    updateProfileAction,
    INITIAL_PROFILE_STATE,
  );
  const [securityState, submitSecurity, securityPending] = useActionState(
    updateSecurityAction,
    INITIAL_PROFILE_STATE,
  );

  const notificationState = useMemo(() => {
    const found = NOTIFICATION_OPTIONS.find(
      (option) => option.value === notificationsPreference,
    );
    return found ? found.value : "proactive";
  }, [notificationsPreference]);

  function toggleAutopay() {
    const next = !autopayEnabled;
    setAutopayEnabled(next);
    setAutopayMessage(next ? "Auto-payments enabled" : "Auto-payments disabled");
    startAutopayTransition(async () => {
      try {
        await toggleAutopayAction(next);
      } catch (error) {
        console.error("[profile] toggle autopay failed", error);
        setAutopayEnabled(!next);
        setAutopayMessage("Не удалось обновить автоплатежи");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitProfile} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={profile.fullName}
                    placeholder="Maxime Dupont"
                    required
                    disabled={profilePending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    defaultValue={profile.email}
                    readOnly
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={profile.phone}
                    placeholder="+971 50 000 00 00"
                    disabled={profilePending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    name="timezone"
                    defaultValue={profile.timezone}
                    disabled={profilePending}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Role</Label>
                  <div className="flex h-11 items-center justify-between rounded-xl border border-dashed border-border px-4 text-sm text-muted-foreground">
                    <span>{role ?? "client"}</span>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase tracking-[0.2em]">
                      read only
                    </span>
                  </div>
                </div>
              </div>

              <Banner state={profileState} />

              <div className="flex justify-end">
                <Button type="submit" disabled={profilePending} className="rounded-xl px-5">
                  {profilePending ? "Сохраняем..." : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitSecurity} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={securityPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  disabled={securityPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notifications">Notification settings</Label>
                <select
                  id="notifications"
                  name="notifications"
                  defaultValue={notificationState}
                  disabled={securityPending}
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {NOTIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <Banner state={securityState} />

              <div className="flex justify-between">
                <div className="text-xs text-muted-foreground">
                  MFA включается в настройках аккаунта после активации договора.
                </div>
                <Button type="submit" variant="outline" disabled={securityPending} className="rounded-xl px-5">
                  {securityPending ? "Обновляем..." : "Update password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Auto-payments
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-sm font-medium text-foreground">Automatic debits for active contracts.</p>
              <p>Статус: {autopayEnabled ? "enabled" : "disabled"}</p>
              {autopayMessage ? (
                <div className="text-xs text-brand-600">{autopayMessage}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={toggleAutopay}
              disabled={autopayPending}
              className={`relative inline-flex h-7 w-14 items-center rounded-full border border-border transition ${autopayEnabled ? "bg-brand-600" : "bg-muted"}`}
            >
              <span
                className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${autopayEnabled ? "translate-x-7" : ""}`}
              />
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Activity history
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.map((activity) => {
              const Icon = resolveIcon(activity.icon);
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {activity.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activity.description}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
