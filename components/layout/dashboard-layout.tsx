"use client";

import Link from "next/link";
import * as React from "react";
import { 
  CircleUserRound, 
  Menu, 
  Bell, 
  Search, 
  LogOut, 
  Settings, 
  User,
  PanelLeftClose
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
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
import { DashboardProvider, useDashboard } from "@/components/providers/dashboard-context";

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

function DashboardHeader({
  sidebarOpen,
  setSidebarOpen,
  brand,
  sidebarId,
  activeItem,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  brand: { title: string; subtitle: string };
  sidebarId: string;
  activeItem: NavItem | undefined;
}) {
  const { searchQuery, setSearchQuery, headerActions } = useDashboard();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-[var(--header)] backdrop-blur px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="lg:hidden"
          aria-label={sidebarOpen ? "Hide menu" : "Open menu"}
          aria-expanded={sidebarOpen}
          aria-controls={sidebarId}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            FL
          </div>
          <div className="ml-2">
            <h1 className="text-sm md:text-lg font-semibold tracking-tight truncate max-w-[120px] md:max-w-none">{activeItem?.label}</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-2 md:px-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground md:top-2.5 md:h-4 md:w-4 top-3 h-5 w-5" />
          <Input
            type="search"
            placeholder="Поиск..."
            className="h-10 w-full bg-background pl-10 md:h-9 md:pl-8 md:w-[300px] lg:w-[400px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {headerActions}
        <Button variant="ghost" size="icon" className="text-muted-foreground h-10 w-10 md:h-9 md:w-9">
          <Bell className="h-6 w-6 md:h-5 md:w-5" />
          <span className="sr-only">Уведомления</span>
        </Button>
      </div>
    </header>
  );
}

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
  
  const activeItem = React.useMemo(
    () => navItems.find((item) => isActive(item.href)) ?? navItems[0],
    [navItems, isActive],
  );

  React.useEffect(() => {
    setSidebarOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  const normalizedFullName = user?.fullName?.trim() || null;
  const dropdownName = normalizedFullName ?? user?.email ?? "No name";
  const showEmailInMenu = Boolean(user?.email && normalizedFullName);
  const primaryRole = user?.primaryRole ?? null;
  const roleLabel = primaryRole
    ? ROLE_DISPLAY_LABELS[primaryRole] ?? primaryRole
    : "Guest";

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        {/* Header - Full Width */}
        <DashboardHeader
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          brand={brand}
          sidebarId={sidebarId}
          activeItem={activeItem}
        />

        <div className="flex flex-1 items-start">

        {/* Desktop Sidebar - Collapsible on Hover */}
        <aside className="group fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-16 flex-col border-r bg-[var(--sidebar)] transition-[width] duration-300 hover:w-64 lg:flex shadow-lg hover:shadow-xl">
          <nav className="flex-1 flex flex-col gap-1 p-2">
            {navItems.map((item) => {
              const Icon = resolveNavIcon(item.icon);
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors overflow-hidden whitespace-nowrap",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  )}
                  data-active={active}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 px-2 h-12">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <CircleUserRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col items-start overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="text-sm font-medium leading-none truncate w-[140px]">{dropdownName}</span>
                    <span className="text-xs text-muted-foreground truncate w-[140px]">{roleLabel}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-56 ml-2" sideOffset={10}>
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{dropdownName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {profileHref && (
                  <DropdownMenuItem asChild>
                    <Link href={profileHref} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Профиль</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="justify-between" onSelect={(e) => e.preventDefault()}>
                  <div className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Тема</span>
                  </div>
                  <ThemeToggle />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction} className="w-full">
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Выйти</span>
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-background p-4 shadow-lg flex flex-col pt-safe-top pb-safe-bottom pl-safe-left">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xl font-bold tracking-tight">{brand.title}</span>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-10 w-10">
                  <PanelLeftClose className="h-6 w-6" />
                </Button>
              </div>
              <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = resolveNavIcon(item.icon);
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="h-6 w-6" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="absolute bottom-4 left-4 right-4">
                 <div className="flex items-center gap-3 rounded-md border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <CircleUserRound className="h-6 w-6 text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="truncate text-sm font-medium">{dropdownName}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                 </div>
                 <div className="mt-2 grid grid-cols-2 gap-2">
                    <form action={signOutAction}>
                       <Button variant="outline" size="sm" className="w-full">
                         <LogOut className="mr-2 h-4 w-4" /> Выйти
                       </Button>
                    </form>
                    <div className="flex justify-center">
                        <ThemeToggle />
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300 ease-in-out p-4 md:p-6 lg:ml-16",
        )}>
           <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
            <ReadOnlyBanner />
            {children}
           </div>
        </main>
        </div>
      </div>
    </DashboardProvider>
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
