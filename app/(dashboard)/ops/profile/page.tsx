import { ProfileClient } from "@/app/(dashboard)/shared/profile/profile-client";
import { loadProfilePageData } from "@/app/(dashboard)/shared/profile/profile-data";
import { requirePortalSession } from "@/lib/auth/portal-session";

export default async function OpsProfilePage() {
  const sessionUser = await requirePortalSession("app", "/ops/profile");
  const viewModel = await loadProfilePageData(sessionUser);

  return <ProfileClient {...viewModel} />;
}
