"use client";

import Link from "next/link";
import * as React from "react";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/lib/navigation";
import { publicNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { resolveNavIcon } from "@/components/navigation/nav-icon";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useActivePathname } from "@/components/navigation/use-active-pathname";

type PublicLayoutProps = {
  children: React.ReactNode;
  navItems?: NavItem[];
};

export function PublicLayout({
  children,
  navItems = publicNav,
}: PublicLayoutProps) {
  const { pathname, isActive } = useActivePathname("exact");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (pathname === "/") {
    return <AuthLayout>{children}</AuthLayout>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              FL
            </span>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold">Fast Lease</p>
              <p className="text-xs text-muted-foreground">Car Catalog</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              {navItems.map((item) => {
                const active = isActive(item.href, "exact");
                const Icon = resolveNavIcon(item.icon);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:text-foreground",
                      active && "bg-slate-900 text-white shadow-linear dark:bg-slate-800",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-2 pl-4 border-l">
              <ThemeToggle />
              <Button asChild variant="default" size="sm">
                <Link href="/">Sign in</Link>
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 mt-16 lg:hidden">
           <div 
             className="fixed inset-0 bg-black/80 backdrop-blur-sm"
             onClick={() => setIsMobileMenuOpen(false)}
           />
           <div className="fixed inset-x-0 top-0 z-50 bg-background border-b shadow-lg p-4 animate-in slide-in-from-top-5">
             <nav className="grid gap-2">
               {navItems.map((item) => {
                 const active = isActive(item.href, "exact");
                 const Icon = resolveNavIcon(item.icon);
                 return (
                   <Link
                     key={item.href}
                     href={item.href}
                     className={cn(
                       "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                       active
                         ? "bg-primary/10 text-primary"
                         : "hover:bg-accent hover:text-accent-foreground"
                     )}
                   >
                     <Icon className="h-5 w-5" />
                     {item.label}
                   </Link>
                 );
               })}
               <div className="my-2 border-t pt-4">
                 <Button asChild className="w-full justify-center">
                   <Link href="/">Sign in</Link>
                 </Button>
               </div>
             </nav>
           </div>
        </div>
      )}

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
