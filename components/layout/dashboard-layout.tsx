"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Menu } from "lucide-react";

import { clientNav } from "@/lib/navigation";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { MobileNav } from "@/components/navigation/mobile-nav";

type DashboardLayoutProps = {
  navItems: NavItem[];
  children: React.ReactNode;
  brand?: {
    title: string;
    subtitle: string;
  };
};

const DEFAULT_BRAND = {
  title: "Fast Lease",
  subtitle: "Operations Center",
};

export function DashboardLayout({
  navItems,
  children,
  brand = DEFAULT_BRAND,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const activeItem =
    navItems.find((item) => pathname.startsWith(item.href)) ?? navItems[0];

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar" data-open={sidebarOpen}>
        <div className="dashboard-sidebar__brand">
          <span className="dashboard-sidebar__brand-badge">FL</span>
          <div>
            <p className="dashboard-sidebar__brand-meta">{brand.title}</p>
            <p className="dashboard-sidebar__brand-title">{brand.subtitle}</p>
          </div>
        </div>
        <nav className="dashboard-sidebar__nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("dashboard-sidebar__nav-link")}
                data-active={active}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-overlay bg-black/40 lg:hidden"
        />
      ) : null}

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header__left">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="dashboard-mobile-trigger lg:hidden"
              aria-label={sidebarOpen ? "Скрыть меню" : "Открыть меню"}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div className="dashboard-header__breadcrumbs">
              <span>{brand.title}</span>
              <span className="opacity-40">/</span>
              <span>{activeItem?.label ?? "Dashboard"}</span>
            </div>
            <div className="flex flex-col">
              <span className="dashboard-header__title">
                {activeItem?.label ?? "Dashboard"}
              </span>
              <span className="hidden text-sm text-muted-foreground sm:block">
                Данные соответствуют прототипу из /beta/
              </span>
            </div>
          </div>
          <div className="dashboard-header__actions">
            <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm sm:flex">
              <Input
                placeholder="Поиск по прототипу"
                className="h-9 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="dashboard-content">
          <div className="dashboard-content__inner">{children}</div>
        </main>
      </div>

      <MobileNav items={navItems} />
    </div>
  );
}

export function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout
      navItems={clientNav}
      brand={{ title: "Client", subtitle: "Fast Lease" }}
    >
      {children}
    </DashboardLayout>
  );
}
