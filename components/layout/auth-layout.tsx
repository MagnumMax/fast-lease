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
  title = "Начните цифровой лизинг",
  caption = "Доступ к панели, сохраняющий все сценарии из прототипа `/beta/`",
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3 text-foreground">
          <span className="dashboard-sidebar__brand-badge h-11 w-11 bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            FL
          </span>
          <div className="leading-tight">
            <p className="text-xs uppercase tracking-[0.32em] text-muted">
              Fast Lease
            </p>
            <p className="text-sm font-semibold">Sign In</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link href="/apply/start">Оформить заявку</Link>
          </Button>
        </div>
      </header>
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 pb-12 pt-6 sm:px-6">
        <div className="absolute inset-x-0 top-0 mx-auto h-[420px] max-w-5xl rounded-[48px] bg-linear-radial opacity-40 blur-3xl" />
        <div className="relative z-10 grid w-full max-w-5xl gap-10 rounded-3xl border border-border bg-card px-6 py-8 shadow-outline backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:px-12 md:py-12">
          <div className="flex flex-col justify-center gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Digital Leasing
            </span>
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {caption}
            </p>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Перенос шрифтов, палитры и spacing 1-в-1 с `/beta/assets/style.css`
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Автоматическая поддержка светлой/темной темы — Linear Design System
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Supabase Auth будет подключён на этапе 4
              </div>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-outline backdrop-blur">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
