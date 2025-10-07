import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col gap-10 bg-background px-6 py-12 md:px-12 lg:px-16">
      {children}
    </main>
  );
}
