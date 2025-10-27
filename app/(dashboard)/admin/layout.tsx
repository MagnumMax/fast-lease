import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSessionUser } from "@/lib/auth/session";
import { adminNav } from "@/lib/navigation";
import { filterNavItemsForRoles } from "@/lib/navigation/access";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/admin/dashboard");
  }

  const profileFullName = sessionUser.profile?.full_name ?? null;
  const metadataFullName =
    typeof sessionUser.user.user_metadata?.full_name === "string"
      ? sessionUser.user.user_metadata.full_name
      : null;

  const fullName: string | null = profileFullName ?? metadataFullName ?? null;

  const email: string | null = sessionUser.user.email ?? null;
  const navItems = await filterNavItemsForRoles(adminNav, sessionUser.roles);

  return (
    <DashboardLayout
      navItems={navItems}
      brand={{ title: "Admin", subtitle: "Fast Lease" }}
      user={{
        fullName,
        email,
        primaryRole: sessionUser.primaryRole,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
