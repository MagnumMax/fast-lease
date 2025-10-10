import type { ReactNode } from "react";

import { ApplicationFormProvider } from "./_components/application-form-context";
import { ApplicationProgress } from "./_components/application-progress";

export default function ApplyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ApplicationFormProvider>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-10">
        <ApplicationProgress />
        {children}
      </div>
    </ApplicationFormProvider>
  );
}
