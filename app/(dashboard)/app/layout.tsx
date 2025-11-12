import type { ReactNode } from "react";

import { AccessControlProvider } from "@/components/providers/access-control-provider";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { canMutateSessionUser } from "@/lib/auth/guards";

export default async function AppPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await requirePortalSession("app", "/app/dashboard");
  const actorCanMutate = canMutateSessionUser(sessionUser);

  return (
    <AccessControlProvider
      canMutate={actorCanMutate}
      readOnlyRoles={sessionUser.readOnlyRoles}
    >
      <div className="min-h-screen bg-background">{children}</div>
    </AccessControlProvider>
  );
}
