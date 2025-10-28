"use client";

import { MoonStar, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";

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
    light: "Светлая",
    dark: "Тёмная",
    system: "Системная",
  };

  const effectiveThemeLabel = mounted
    ? titleMap[(resolvedTheme as ThemeOption) ?? "light"]
    : titleMap.light;

  const handleToggle = () => {
    if (!mounted) {
      return;
    }
    const currentIndex = themeOrder.indexOf(appliedTheme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(nextTheme);
  };

  const nextTheme = themeOrder[(themeOrder.indexOf(appliedTheme) + 1) % themeOrder.length];

  const icon =
    appliedTheme === "system" ? (
      <SunMoon className="h-5 w-5" aria-hidden="true" />
    ) : appliedTheme === "dark" ? (
      <MoonStar className="h-5 w-5" aria-hidden="true" />
    ) : (
      <Sun className="h-5 w-5" aria-hidden="true" />
    );

  return (
    <Button
      type="button"
      variant="ghost"
      size="default"
      disabled={!mounted}
      aria-label={`Переключить тему. Текущая тема: ${titleMap[appliedTheme]}. Активная тема: ${effectiveThemeLabel}.`}
      title={`${titleMap[appliedTheme]} • Следующая тема: ${titleMap[nextTheme]}`}
      onClick={handleToggle}
      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-slate-600 hover:border-brand-500 hover:text-brand-600 dark:text-slate-200 dark:hover:text-white"
      data-theme={appliedTheme}
    >
      {icon}
      <span className="font-medium">{titleMap[appliedTheme]}</span>
      <span className="sr-only">
        {`Текущая тема: ${titleMap[appliedTheme]}. Активная тема: ${effectiveThemeLabel}. Нажмите, чтобы выбрать ${titleMap[nextTheme]}.`}
      </span>
    </Button>
  );
}
