import { AdminIntegrationsDashboard } from "@/app/(dashboard)/admin/integrations/_components/admin-integrations-dashboard";
import { getAdminIntegrationSnapshot } from "@/lib/supabase/queries/admin";

export default async function AdminIntegrationsPage() {
  const snapshot = await getAdminIntegrationSnapshot();
  return (
    <AdminIntegrationsDashboard
      initialIntegrations={snapshot.integrations}
      initialLogs={snapshot.logs}
    />
  );
}
