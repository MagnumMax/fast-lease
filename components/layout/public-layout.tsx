"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/navigation";
import { publicNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { resolveNavIcon } from "@/components/navigation/nav-icon";

type PublicLayoutProps = {
  children: React.ReactNode;
  navItems?: NavItem[];
};

export function PublicLayout({
  children,
  navItems = publicNav,
}: PublicLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="public-header">
        <div className="public-header__inner">
          <Link href="/" className="public-header__brand">
            <span className="public-header__brand-badge">FL</span>
            <div>
              <p className="public-header__brand-meta">Fast Lease</p>
              <p className="public-header__brand-title">Car Catalog</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-4 text-sm font-medium text-muted-foreground lg:flex">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = resolveNavIcon(item.icon);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:text-foreground",
                      active && "bg-slate-900 text-white shadow-linear",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
            <Button asChild variant="brand">
              <Link href="/login">Войти</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
