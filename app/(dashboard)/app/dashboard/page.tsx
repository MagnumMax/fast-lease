import { redirect } from "next/navigation";

export default function AppPortalDashboardRedirect() {
  redirect("/ops/dashboard");
}
