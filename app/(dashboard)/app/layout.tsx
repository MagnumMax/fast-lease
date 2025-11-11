import type { ReactNode } from "react";

import { requirePortalSession } from "@/lib/auth/portal-session";

export default async function AppPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePortalSession("app", "/app/dashboard");
  return <div className="min-h-screen bg-background">{children}</div>;
}
