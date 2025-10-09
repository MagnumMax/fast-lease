import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getInvestorReports } from "@/lib/supabase/queries/investor";

import { InvestorReportScreen } from "./report-screen";

export default function InvestorReportsPage() {
  return <AsyncInvestorReportsPage />;
}

async function AsyncInvestorReportsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/investor/reports");
  }

  const snapshot = await getInvestorReports(sessionUser.user.id);

  return <InvestorReportScreen snapshot={snapshot} />;
}
