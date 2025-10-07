import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNav } from "@/lib/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout
      navItems={adminNav}
      brand={{ title: "Admin", subtitle: "Fast Lease" }}
    >
      {children}
    </DashboardLayout>
  );
}
