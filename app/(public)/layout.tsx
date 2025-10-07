import type { ReactNode } from "react";

import { PublicLayout as PublicShell } from "@/components/layout/public-layout";

export default function PublicGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
