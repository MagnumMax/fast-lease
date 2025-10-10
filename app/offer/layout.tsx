import type { ReactNode } from "react";

import { ApplicationFormProvider } from "@/app/(public)/apply/_components/application-form-context";

export default function OfferLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ApplicationFormProvider>{children}</ApplicationFormProvider>;
}
