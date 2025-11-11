import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { clientNav } from "@/lib/navigation";
import { filterNavItemsForRoles } from "@/lib/navigation/access";

export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await requirePortalSession("client", "/client/dashboard");

  const profileFullName = sessionUser.profile?.full_name ?? null;
  const metadataFullName =
    typeof sessionUser.user.user_metadata?.full_name === "string"
      ? sessionUser.user.user_metadata.full_name
      : null;

  const fullName: string | null = profileFullName ?? metadataFullName ?? null;

  const email: string | null = sessionUser.user.email ?? null;
  const navItems = await filterNavItemsForRoles(clientNav, sessionUser.roles);

  return (
    <DashboardLayout
      navItems={navItems}
      brand={{ title: "Client", subtitle: "Fast Lease" }}
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
