"use client";

import { MoonStar, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveTheme = mounted ? theme ?? resolvedTheme : "light";
  const isDark = effectiveTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-xl border border-border bg-card text-slate-600 hover:border-brand-500 hover:text-brand-600 dark:text-slate-300 dark:hover:text-white"
    >
      {mounted && isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <MoonStar className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  );
}
