"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";

export type PathMatchStrategy = "exact" | "startsWith";

const trimTrailingSlash = (value: string): string => {
  if (value.length > 1 && value.endsWith("/")) {
    return value.replace(/\/+(?=$)/, "");
  }
  return value;
};

export function useActivePathname(defaultStrategy: PathMatchStrategy = "startsWith") {
  const rawPathname = usePathname();
  const pathname = trimTrailingSlash(rawPathname ?? "/");

  const isActive = useCallback(
    (href: string, overrideStrategy?: PathMatchStrategy) => {
      const strategy = overrideStrategy ?? defaultStrategy;
      const normalizedTarget = trimTrailingSlash(href || "/");

      if (strategy === "exact") {
        return pathname === normalizedTarget;
      }

      if (normalizedTarget === "/") {
        return pathname === "/";
      }

      return (
        pathname === normalizedTarget || pathname.startsWith(`${normalizedTarget}/`)
      );
    },
    [pathname, defaultStrategy],
  );

  return {
    pathname,
    isActive,
  };
}
