import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AccessControlProvider } from "@/components/providers/access-control-provider";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { resolveProfileHrefForRole, workspaceNav } from "@/lib/navigation";
import { filterNavItemsForRoles } from "@/lib/navigation/access";
import { canMutateSessionUser } from "@/lib/auth/guards";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await requirePortalSession("app", "/workspace/tasks");

  const profileFullName = sessionUser.profile?.full_name ?? null;
  const metadataFullName =
    typeof sessionUser.user.user_metadata?.full_name === "string"
      ? sessionUser.user.user_metadata.full_name
      : null;

  const fullName: string | null = profileFullName ?? metadataFullName ?? null;
  const email: string | null = sessionUser.user.email ?? null;
  const navItems = await filterNavItemsForRoles(workspaceNav, sessionUser.roles);

  const actorCanMutate = canMutateSessionUser(sessionUser);

  return (
    <AccessControlProvider
      canMutate={actorCanMutate}
      readOnlyRoles={sessionUser.readOnlyRoles}
    >
      <DashboardLayout
        navItems={navItems}
        brand={{ title: "Workspace", subtitle: "Shared" }}
        user={{
          fullName,
          email,
          primaryRole: sessionUser.primaryRole,
        }}
        profileHref={resolveProfileHrefForRole(sessionUser.primaryRole)}
      >
        {children}
      </DashboardLayout>
    </AccessControlProvider>
  );
}
