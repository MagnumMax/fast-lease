"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { ChevronDown, Menu } from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import type { AppRole } from "@/lib/auth/types";
import { clientNav } from "@/lib/navigation";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  const profileMenuId = React.useId();
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  const activeItem =
    navItems.find((item) => pathname.startsWith(item.href)) ?? navItems[0];

  React.useEffect(() => {
    setSidebarOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

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
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
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
            <div className="flex flex-col">
              <h1 className="dashboard-header__title">
                {activeItem?.label ?? "Dashboard"}
              </h1>
            </div>
          </div>
          <div className="dashboard-header__actions">
            <div className="relative" ref={profileMenuRef}>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                className="flex h-auto items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-controls={profileMenuId}
              >
                <div className="hidden text-left md:block">
                  <p className="font-semibold leading-tight">
                    {user?.fullName ?? "Profile"}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {user?.primaryRole ?? "guest"}
                  </p>
                </div>
                <span className="text-sm font-semibold md:hidden">
                  {user?.fullName?.split(" ")[0] ?? "Profile"}
                </span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              {profileMenuOpen ? (
                <div
                  id={profileMenuId}
                  role="menu"
                  aria-label="User menu"
                  className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-card p-3 text-sm shadow-lg"
                >
                  <div className="border-b border-border pb-3">
                    <p className="font-semibold leading-tight">
                      {user?.fullName ?? user?.email ?? "No name"}
                    </p>
                    {user?.email ? (
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    ) : null}
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {user?.primaryRole ?? "guest"}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">Theme</span>
                    <ThemeToggle />
                  </div>
                  <form action={signOutAction} className="mt-3">
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-lg"
                    >
                      Sign out
                    </Button>
                  </form>
                </div>
              ) : null}
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
