import { AdminBpmOverview } from "@/app/(dashboard)/admin/bpm/_components/admin-bpm-overview";
import { getAdminProcessCatalog } from "@/lib/supabase/queries/admin";

export default async function AdminBpmPage() {
  const catalog = await getAdminProcessCatalog();
  return (
    <AdminBpmOverview
      initialProcesses={catalog.processes}
      initialVersions={catalog.versions}
    />
  );
}
