import type { ReactNode } from "react";

import { AccessControlProvider } from "@/components/providers/access-control-provider";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { canMutateSessionUser } from "@/lib/auth/guards";

export default async function PartnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await requirePortalSession("partner", "/partner/dashboard");
  const actorCanMutate = canMutateSessionUser(sessionUser);

  return (
    <AccessControlProvider
      canMutate={actorCanMutate}
      readOnlyRoles={sessionUser.readOnlyRoles}
    >
      <div className="bg-background">{children}</div>
    </AccessControlProvider>
  );
}
