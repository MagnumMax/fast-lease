"use client";

import { MoonStar, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { cn } from "@/lib/utils";

type ThemeOption = "light" | "dark" | "system";
const themeOrder: ThemeOption[] = ["light", "dark", "system"];

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const appliedTheme: ThemeOption = mounted
    ? (theme === undefined ? "system" : (theme as ThemeOption))
    : "system";

  const titleMap: Record<ThemeOption, string> = {
    light: "Light",
    dark: "Dark",
    system: "System",
  };

  const effectiveThemeLabel = mounted
    ? titleMap[(resolvedTheme as ThemeOption) ?? "light"]
    : titleMap.light;

  const handleToggle = () => {
    const currentIndex = themeOrder.indexOf(appliedTheme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(nextTheme);
  };

  const isLightActive = appliedTheme === "light";
  const isDarkActive = appliedTheme === "dark";
  const isSystemActive = appliedTheme === "system";

  const getSegmentClass = (active: boolean) =>
    active
      ? "bg-[color:var(--primary-soft-bg)] text-[color:var(--primary)] border border-[color:var(--primary-soft-border)] shadow-sm"
      : "bg-transparent text-[color:var(--text-soft)] hover:bg-[color:var(--surface-subtle)] border-transparent";

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-1 py-1 backdrop-blur segmented"
      aria-label={`Switch theme. Current: ${titleMap[appliedTheme]}. Active: ${effectiveThemeLabel}.`}
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors",
          getSegmentClass(isLightActive),
        )}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors",
          getSegmentClass(isDarkActive),
        )}
      >
        <MoonStar className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors",
          getSegmentClass(isSystemActive),
        )}
      >
        <SunMoon className="h-4 w-4" />
      </button>
    </div>
  );
}
