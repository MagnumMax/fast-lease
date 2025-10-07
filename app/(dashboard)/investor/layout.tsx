import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { investorNav } from "@/lib/navigation";

export default function InvestorLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout
      navItems={investorNav}
      brand={{ title: "Investor", subtitle: "Fast Lease" }}
    >
      {children}
    </DashboardLayout>
  );
}
