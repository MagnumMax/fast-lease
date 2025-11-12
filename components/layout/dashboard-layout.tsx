"use client";

import Link from "next/link";
import * as React from "react";
import { CircleUserRound, Menu } from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import type { AppRole } from "@/lib/auth/types";
import {
  APP_ROLE_LABELS,
  APP_ROLE_LOGIN_PRESETS,
} from "@/lib/data/app-roles";
import { clientNav } from "@/lib/navigation";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { resolveNavIcon } from "@/components/navigation/nav-icon";
import { useActivePathname } from "@/components/navigation/use-active-pathname";
import { ReadOnlyBanner } from "@/components/providers/access-control-provider";

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
  profileHref?: string;
};

const DEFAULT_BRAND = {
  title: "Fast Lease",
  subtitle: "Operations Center",
};

const ROLE_DISPLAY_LABELS: Record<AppRole, string> = {
  ...APP_ROLE_LABELS,
  ...APP_ROLE_LOGIN_PRESETS.reduce(
    (acc, preset) => {
      acc[preset.role] = preset.label;
      return acc;
    },
    {} as Partial<Record<AppRole, string>>,
  ),
} as Record<AppRole, string>;

export function DashboardLayout({
  navItems,
  children,
  brand = DEFAULT_BRAND,
  user,
  profileHref,
}: DashboardLayoutProps) {
  const { pathname, isActive } = useActivePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const sidebarId = React.useId();
  const profileMenuId = React.useId();
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  const activeItem = React.useMemo(
    () => navItems.find((item) => isActive(item.href)) ?? navItems[0],
    [navItems, isActive],
  );

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

  const normalizedFullName = user?.fullName?.trim() || null;
  const dropdownName = normalizedFullName ?? user?.email ?? "No name";
  const showEmailInMenu = Boolean(user?.email && normalizedFullName);
  const primaryRole = user?.primaryRole ?? null;
  const roleLabel = primaryRole
    ? ROLE_DISPLAY_LABELS[primaryRole] ?? primaryRole
    : "Guest";

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
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("dashboard-sidebar__nav-link")}
                data-active={active}
                aria-current={active ? "page" : undefined}
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
          <div className="dashboard-header__actions" ref={profileMenuRef}>
            <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <DropdownMenuTrigger
                asChild
                id={profileMenuId}
                aria-label="User menu"
              >
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="dashboard-header__profile-trigger"
                  aria-expanded={profileMenuOpen}
                  aria-controls={profileMenuId ? `${profileMenuId}-menu` : undefined}
                >
                  <CircleUserRound className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Профиль пользователя</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                id={profileMenuId ? `${profileMenuId}-menu` : undefined}
                align="end"
                side="bottom"
                sideOffset={12}
                className="w-64"
              >
                <DropdownMenuLabel className="flex flex-col gap-0.5 text-left">
                  <span className="font-semibold leading-tight">{dropdownName}</span>
                  {showEmailInMenu ? (
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  ) : null}
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {roleLabel}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {profileHref ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={profileHref}>Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem asChild className="justify-between">
                  <div className="flex w-full items-center justify-between">
                    <span>Theme</span>
                    <ThemeToggle />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full text-left">
                      Sign out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="dashboard-content">
          <div className="dashboard-content__inner">
            <ReadOnlyBanner />
            {children}
          </div>
        </main>
      </div>
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
