import { AdminUsersDirectory } from "@/app/(dashboard)/admin/users/_components/admin-users-directory";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { getAdminUserDirectory } from "@/lib/supabase/queries/admin";
import { canMutateSessionUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function SettingsUsersPage() {
  const sessionUser = await requirePortalSession("app", "/settings/users");
  const directory = await getAdminUserDirectory();

  const actorName =
    sessionUser.profile?.full_name ??
    sessionUser.user.email ??
    "Portal Administrator";

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Settings
        </p>
        <h1 className="text-3xl font-semibold text-foreground">
          Roles & Portals
        </h1>
        <p className="text-sm text-muted-foreground">
          Управляйте доступом сотрудников и внешних кабинетов из единого интерфейса.
        </p>
      </div>
      <AdminUsersDirectory
        initialUsers={directory.users}
        initialAuditLog={directory.auditLog}
        actorName={actorName}
        actorId={sessionUser.user.id}
        actorCanMutate={canMutateSessionUser(sessionUser)}
      />
    </div>
  );
}
