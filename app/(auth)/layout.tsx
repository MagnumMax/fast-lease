import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-card/70 p-8 shadow-subtle backdrop-blur">
        {children}
      </div>
    </div>
  );
}
