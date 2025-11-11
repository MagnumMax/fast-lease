import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { opsNav } from "@/lib/navigation";
import { filterNavItemsForRoles } from "@/lib/navigation/access";

export default async function OpsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await requirePortalSession("app", "/ops/dashboard");

  const profileFullName = sessionUser.profile?.full_name ?? null;
  const metadataFullName =
    typeof sessionUser.user.user_metadata?.full_name === "string"
      ? sessionUser.user.user_metadata.full_name
      : null;

  const fullName: string | null = profileFullName ?? metadataFullName ?? null;

  const email: string | null = sessionUser.user.email ?? null;
  const navItems = await filterNavItemsForRoles(opsNav, sessionUser.roles);

  return (
    <DashboardLayout
      navItems={navItems}
      brand={{ title: "Operations", subtitle: "Fast Lease" }}
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
