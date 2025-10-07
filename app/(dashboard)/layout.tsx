import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Sidebar/Header placeholders will be mounted once migrated from /beta. */}
      <div className="flex-1 bg-background/95 px-4 py-6 lg:px-10">
        {children}
      </div>
    </div>
  );
}
