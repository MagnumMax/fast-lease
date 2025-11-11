import type { ReactNode } from "react";

import { requirePortalSession } from "@/lib/auth/portal-session";

export default async function ApplyProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePortalSession("client", "/apply/start");

  return <>{children}</>;
}
