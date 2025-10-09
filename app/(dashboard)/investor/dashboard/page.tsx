import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getInvestorDashboardSnapshot } from "@/lib/supabase/queries/investor";

import { InvestorDashboardScreen } from "./dashboard-screen";

export default function InvestorDashboardPage() {
  return <AsyncInvestorDashboardPage />;
}

async function AsyncInvestorDashboardPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/investor/dashboard");
  }

  const snapshot = await getInvestorDashboardSnapshot(sessionUser.user.id);

  return <InvestorDashboardScreen snapshot={snapshot} />;
}
