import type { ReactNode } from "react";

import { requirePortalSession } from "@/lib/auth/portal-session";

export default async function PartnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePortalSession("partner", "/partner/dashboard");
  return <div className="bg-background">{children}</div>;
}
