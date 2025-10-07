import type { ReactNode } from "react";

export default function ApplyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-10">
      {children}
    </div>
  );
}
