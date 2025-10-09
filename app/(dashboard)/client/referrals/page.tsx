import { redirect } from "next/navigation";

import { ReferralOverviewClient } from "./referral-client";
import { getSessionUser } from "@/lib/auth/session";
import { getClientPortalSnapshot } from "@/lib/supabase/queries/client-portal";

export default async function ClientReferralsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?next=/client/referrals");
  }

  const snapshot = await getClientPortalSnapshot(sessionUser.user.id);
  const referral = snapshot.referral;

  const clicks = referral
    ? referral.events.filter((event) => event.eventType === "click").length
    : 0;
  const applications = referral
    ? referral.events.filter((event) => event.eventType === "application").length
    : 0;
  const deals = referral ? referral.deals.length : 0;

  return (
    <ReferralOverviewClient
      code={referral?.code ?? "—"}
      shareUrl={referral?.shareUrl}
      stats={{
        clicks,
        applications,
        deals,
      }}
      deals={referral?.deals ?? []}
      rewards={referral?.rewards ?? []}
    />
  );
}
