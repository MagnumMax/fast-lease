import { AdminRolePermissions } from "@/app/(dashboard)/admin/roles/_components/admin-role-permissions";
import { getRoleAccessMatrix } from "@/lib/supabase/queries/role-access";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const matrix = await getRoleAccessMatrix();
  return <AdminRolePermissions matrix={matrix} />;
}
