"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { ThemeToggle } from "@/components/system/theme-toggle";

type AuthLayoutProps = {
  children: ReactNode;
  title?: string;
  caption?: string;
};

export function AuthLayout({
  children,
  title = "Welcome to Fast Lease",
  caption = "Manage contracts, payments and support in a unified personal account.",
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-slate-950 text-slate-100 lg:flex">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1600&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" />
        </div>
        <div className="relative z-10 flex flex-1 flex-col justify-between px-12 py-12">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em]">
              Fast Lease Ecosystem
            </span>
            <h1 className="max-w-lg text-4xl font-semibold leading-tight">
              {title}
            </h1>
            <p className="max-w-md text-lg text-slate-200/90">{caption}</p>
          </div>
          <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-300/80">
              Interesting Facts
            </p>
            <p className="mt-3 text-lg font-medium">
              Fast Lease helps get approval faster and control
              all leasing stages in one place.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                90% of applications approved within 24 hours of submission
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Transparent payment schedule and reminders in personal account
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Personal manager helps at every step of the deal
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border/80 px-6 py-6">
          <Link href="/" className="flex items-center gap-3 text-foreground">
            <span className="dashboard-sidebar__brand-badge h-11 w-11 bg-foreground text-background">
              FL
            </span>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.32em] text-muted">
                Fast Lease
              </p>
              <p className="text-sm font-semibold">Portal</p>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="space-y-6 rounded-[32px] border border-border bg-card p-10 text-foreground shadow-2xl ring-1 ring-[color:var(--surface-subtle)]">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
