import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSessionUser } from "@/lib/auth/session";
import { opsNav } from "@/lib/navigation";

export default async function OpsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/ops/dashboard");
  }

  const fullName =
    sessionUser.profile?.full_name ??
    (sessionUser.user.user_metadata?.full_name as string | undefined) ??
    null;

  return (
    <DashboardLayout
      navItems={opsNav}
      brand={{ title: "Operations", subtitle: "Fast Lease" }}
      user={{
        fullName,
        email: sessionUser.user.email,
        primaryRole: sessionUser.primaryRole,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
