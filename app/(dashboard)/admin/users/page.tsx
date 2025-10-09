import { AdminUsersDirectory } from "@/app/(dashboard)/admin/users/_components/admin-users-directory";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminUserDirectory } from "@/lib/supabase/queries/admin";

export default async function AdminUsersPage() {
  const [directory, sessionUser] = await Promise.all([
    getAdminUserDirectory(),
    getSessionUser(),
  ]);

  const actorName =
    sessionUser?.profile?.full_name ??
    (typeof sessionUser?.user.email === "string" ? sessionUser.user.email : "Administrator");

  return (
    <AdminUsersDirectory
      initialUsers={directory.users}
      initialAuditLog={directory.auditLog}
      actorName={actorName}
    />
  );
}
