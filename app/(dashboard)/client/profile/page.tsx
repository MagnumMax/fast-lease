import { redirect } from "next/navigation";

import { ProfileClient } from "./profile-client";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  icon: string;
};

function fallbackActivities(): ActivityItem[] {
  return [
    {
      id: "sample-1",
      title: "Автоплатежи включены",
      description: "Auto-payments enabled for deal FL-2025-1042",
      createdAt: new Date().toISOString(),
      icon: "repeat",
    },
    {
      id: "sample-2",
      title: "Телефон обновлен",
      description: "Phone number updated",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      icon: "phone",
    },
    {
      id: "sample-3",
      title: "Email подтвержден",
      description: "Email confirmed",
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      icon: "mail-check",
    },
  ];
}

export default async function ClientProfilePage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/client/profile");
  }

  const supabase = await createSupabaseServerClient();

  const { data: events } = await supabase
    .from("deal_events")
    .select("id,event_type,payload,created_at,deals!inner(deal_number)")
    .eq("deals.client_id", sessionUser.user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const activities: ActivityItem[] = (events ?? []).map((event) => {
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const message =
      typeof payload.description === "string"
        ? payload.description
        : typeof payload.message === "string"
          ? payload.message
          : event.event_type.replace(/_/g, " ");
    const title =
      typeof payload.title === "string"
        ? payload.title
        : event.event_type.replace(/_/g, " ");

    const icon =
      typeof payload.icon === "string" && payload.icon.length
        ? payload.icon
        : event.event_type.includes("payment")
          ? "credit-card"
          : event.event_type.includes("document")
            ? "file-text"
            : "activity";

    return {
      id: event.id,
      title,
      description: message,
      createdAt: event.created_at,
      icon,
    };
  });

  const currentProfile = sessionUser.profile;

  const autopayEnabled = Boolean(
    currentProfile?.metadata?.autopay_enabled ?? false,
  );

  const notificationsPreference = String(
    currentProfile?.metadata?.notifications_preference ?? "proactive",
  );

  return (
    <ProfileClient
      profile={{
        fullName: currentProfile?.full_name ?? "",
        email: sessionUser.user.email ?? "",
        phone: currentProfile?.phone ?? "",
        timezone: currentProfile?.timezone ?? "Asia/Dubai",
      }}
      role={sessionUser.primaryRole}
      autopayEnabled={autopayEnabled}
      notificationsPreference={notificationsPreference}
      activities={activities.length ? activities : fallbackActivities()}
    />
  );
}
