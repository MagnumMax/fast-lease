import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

export default async function ApplyProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/apply/start");
  }

  return <>{children}</>;
}
