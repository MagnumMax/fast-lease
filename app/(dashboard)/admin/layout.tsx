import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSessionUser } from "@/lib/auth/session";
import { adminNav } from "@/lib/navigation";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/admin/bpm");
  }

  const fullName =
    sessionUser.profile?.full_name ??
    (sessionUser.user.user_metadata?.full_name as string | undefined) ??
    null;

  return (
    <DashboardLayout
      navItems={adminNav}
      brand={{ title: "Admin", subtitle: "Fast Lease" }}
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
