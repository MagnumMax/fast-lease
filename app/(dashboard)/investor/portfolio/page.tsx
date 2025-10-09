import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getInvestorPortfolio } from "@/lib/supabase/queries/investor";

import { InvestorPortfolioScreen } from "./portfolio-screen";

export default function InvestorPortfolioPage() {
  return <AsyncInvestorPortfolioPage />;
}

async function AsyncInvestorPortfolioPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/investor/portfolio");
  }

  const snapshot = await getInvestorPortfolio(sessionUser.user.id);

  return <InvestorPortfolioScreen snapshot={snapshot} />;
}
