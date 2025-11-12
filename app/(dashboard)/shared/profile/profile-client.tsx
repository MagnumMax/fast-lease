"use client";

import { useActionState } from "react";
import { Activity, Check } from "lucide-react";

import { updateProfileAction, updateSecurityAction } from "./actions";
import type { ProfilePageViewModel } from "./profile-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProfileActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const INITIAL_PROFILE_STATE: ProfileActionState = {
  status: "idle",
};

type ProfileClientProps = ProfilePageViewModel;

const TIMEZONE_GROUPS = [
  {
    label: "Americas",
    options: [
      { label: "American Samoa (UTC−11)", value: "Pacific/Pago_Pago" },
      { label: "Honolulu (UTC−10)", value: "Pacific/Honolulu" },
      { label: "Anchorage (UTC−9)", value: "America/Anchorage" },
      { label: "Los Angeles (UTC−8)", value: "America/Los_Angeles" },
      { label: "Denver (UTC−7)", value: "America/Denver" },
      { label: "Chicago (UTC−6)", value: "America/Chicago" },
      { label: "New York (UTC−5)", value: "America/New_York" },
      { label: "Santiago (UTC−4)", value: "America/Santiago" },
      { label: "São Paulo (UTC−3)", value: "America/Sao_Paulo" },
    ],
  },
  {
    label: "Europe & Africa",
    options: [
      { label: "Azores (UTC−1)", value: "Atlantic/Azores" },
      { label: "UTC", value: "UTC" },
      { label: "London (UTC+0)", value: "Europe/London" },
      { label: "Paris (UTC+1)", value: "Europe/Paris" },
      { label: "Cairo (UTC+2)", value: "Africa/Cairo" },
    ],
  },
  {
    label: "Middle East & Central Asia",
    options: [
      { label: "Riyadh (UTC+3)", value: "Asia/Riyadh" },
      { label: "Dubai (UTC+4)", value: "Asia/Dubai" },
      { label: "Tashkent (UTC+5)", value: "Asia/Tashkent" },
    ],
  },
  {
    label: "South & East Asia",
    options: [
      { label: "Dhaka (UTC+6)", value: "Asia/Dhaka" },
      { label: "Bangkok (UTC+7)", value: "Asia/Bangkok" },
      { label: "Singapore (UTC+8)", value: "Asia/Singapore" },
      { label: "Tokyo (UTC+9)", value: "Asia/Tokyo" },
    ],
  },
  {
    label: "Oceania",
    options: [
      { label: "Brisbane (UTC+10)", value: "Australia/Brisbane" },
      { label: "Sydney (UTC+11)", value: "Australia/Sydney" },
      { label: "Auckland (UTC+12)", value: "Pacific/Auckland" },
      { label: "Nuku'alofa (UTC+13)", value: "Pacific/Tongatapu" },
      { label: "Kiritimati (UTC+14)", value: "Pacific/Kiritimati" },
    ],
  },
];

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

export function ProfileClient({ profile }: ProfileClientProps) {
  const [profileState, submitProfile, profilePending] = useActionState(
    updateProfileAction,
    INITIAL_PROFILE_STATE,
  );
  const [securityState, submitSecurity, securityPending] = useActionState(
    updateSecurityAction,
    INITIAL_PROFILE_STATE,
  );

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
                  <Select name="timezone" defaultValue={profile.timezone} disabled={profilePending}>
                    <SelectTrigger id="timezone" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {TIMEZONE_GROUPS.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
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

    </div>
  );
}
