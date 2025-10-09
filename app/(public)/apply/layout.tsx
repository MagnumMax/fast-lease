import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

import { ApplicationFormProvider } from "./_components/application-form-context";
import { ApplicationProgress } from "./_components/application-progress";

export default async function ApplyLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/apply/start");
  }

  return (
    <ApplicationFormProvider>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-10">
        <ApplicationProgress />
        {children}
      </div>
    </ApplicationFormProvider>
  );
}
