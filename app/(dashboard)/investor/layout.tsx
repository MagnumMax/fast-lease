import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSessionUser } from "@/lib/auth/session";
import { investorNav } from "@/lib/navigation";
import { filterNavItemsForRoles } from "@/lib/navigation/access";

export default async function InvestorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/investor/dashboard");
  }

  const profileFullName = sessionUser.profile?.full_name ?? null;
  const metadataFullName =
    typeof sessionUser.user.user_metadata?.full_name === "string"
      ? sessionUser.user.user_metadata.full_name
      : null;

  const fullName: string | null = profileFullName ?? metadataFullName ?? null;

  const email: string | null = sessionUser.user.email ?? null;
  const navItems = await filterNavItemsForRoles(investorNav, sessionUser.roles);

  return (
    <DashboardLayout
      navItems={navItems}
      brand={{ title: "Investor", subtitle: "Fast Lease" }}
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
