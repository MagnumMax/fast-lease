"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/system/theme-toggle";

type AuthLayoutProps = {
  children: ReactNode;
  title?: string;
  caption?: string;
};

export function AuthLayout({
  children,
  title = "Добро пожаловать в Fast Lease",
  caption = "Управляйте договорами, платежами и поддержкой в едином личном кабинете.",
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
              Интересные факты
            </p>
            <p className="mt-3 text-lg font-medium">
              Fast Lease помогает быстрее получать одобрение и контролировать
              все этапы лизинга в одном месте.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                90% заявок одобряем в течение 24 часов после подачи
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Прозрачный график платежей и напоминания в личном кабинете
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Личный менеджер помогает на каждом шаге сделки
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border/80 px-6 py-6">
          <Link href="/" className="flex items-center gap-3 text-foreground">
            <span className="dashboard-sidebar__brand-badge h-11 w-11 bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              FL
            </span>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.32em] text-muted">
                Fast Lease
              </p>
              <p className="text-sm font-semibold">Unified Portal</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="rounded-xl border border-border bg-card px-4">
              <Link href="/apply/start" className="flex items-center gap-2 text-sm">
                <span>Оформить заявку</span>
              </Link>
            </Button>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="space-y-4 rounded-3xl border border-border bg-card/60 p-8 shadow-outline backdrop-blur">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
