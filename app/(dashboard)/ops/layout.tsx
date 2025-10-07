import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { opsNav } from "@/lib/navigation";

export default function OpsLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout
      navItems={opsNav}
      brand={{ title: "Operations", subtitle: "Fast Lease" }}
    >
      {children}
    </DashboardLayout>
  );
}
