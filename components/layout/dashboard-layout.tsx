"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Menu } from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import type { AppRole } from "@/lib/auth/types";
import { clientNav } from "@/lib/navigation";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { resolveNavIcon } from "@/components/navigation/nav-icon";

type DashboardLayoutProps = {
  navItems: NavItem[];
  children: React.ReactNode;
  brand?: {
    title: string;
    subtitle: string;
  };
  user?: {
    fullName: string | null;
    email: string | null;
    primaryRole: AppRole | null;
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
  user,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const sidebarId = React.useId();
  const searchInputId = React.useId();

  const activeItem =
    navItems.find((item) => pathname.startsWith(item.href)) ?? navItems[0];

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-shell">
      <aside
        id={sidebarId}
        className="dashboard-sidebar"
        data-open={sidebarOpen}
      >
        <div className="dashboard-sidebar__brand">
          <span className="dashboard-sidebar__brand-badge">FL</span>
          <div>
            <p className="dashboard-sidebar__brand-meta">{brand.title}</p>
            <p className="dashboard-sidebar__brand-title">{brand.subtitle}</p>
          </div>
        </div>
        <nav className="dashboard-sidebar__nav">
          {navItems.map((item) => {
            const Icon = resolveNavIcon(item.icon);
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
              aria-label={sidebarOpen ? "Hide menu" : "Open menu"}
              aria-expanded={sidebarOpen}
              aria-controls={sidebarId}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <nav
              className="dashboard-header__breadcrumbs"
              aria-label="Breadcrumbs"
            >
              <ol className="flex list-none items-center gap-2">
                <li>{brand.title}</li>
                <li aria-hidden="true" className="opacity-40">
                  /
                </li>
                <li aria-current="page">
                  {activeItem?.label ?? "Dashboard"}
                </li>
              </ol>
            </nav>
            <div className="flex flex-col">
              <h1 className="dashboard-header__title">
                {activeItem?.label ?? "Dashboard"}
              </h1>
            </div>
          </div>
          <div className="dashboard-header__actions">
            <form
              role="search"
              className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm sm:flex"
              onSubmit={(event) => event.preventDefault()}
            >
              <label htmlFor={searchInputId} className="sr-only">
                Dashboard search
              </label>
              <Input
                id={searchInputId}
                type="search"
                placeholder="Search dashboard"
                className="h-9 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                aria-describedby={`${searchInputId}-hint`}
              />
              <span id={`${searchInputId}-hint`} className="sr-only">
                Search function is under development
              </span>
            </form>
            <ThemeToggle />
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm">
              <div className="hidden text-right md:block">
                <p className="font-semibold leading-tight">
                  {user?.fullName ?? user?.email ?? "No name"}
                </p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {user?.primaryRole ?? "guest"}
                </p>
              </div>
              <form action={signOutAction}>
                <Button type="submit" size="sm" variant="outline" className="rounded-lg">
                  Sign out
                </Button>
              </form>
            </div>
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
