import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { clientNav } from "@/lib/navigation";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout
      navItems={clientNav}
      brand={{ title: "Client", subtitle: "Fast Lease" }}
    >
      {children}
    </DashboardLayout>
  );
}
