"use client";

import Link from "next/link";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { resolveNavIcon } from "@/components/navigation/nav-icon";
import { useActivePathname } from "@/components/navigation/use-active-pathname";

type MobileNavProps = {
  items: NavItem[];
  className?: string;
};

export function MobileNav({ items, className }: MobileNavProps) {
  const { isActive } = useActivePathname();

  if (!items.length) return null;

  return (
    <nav className={cn("mobile-bottom-nav lg:hidden", className)}>
      <div className="mobile-bottom-nav__container">
        {items.slice(0, 5).map((item) => {
          const Icon = resolveNavIcon(item.icon);
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-bottom-nav__item", {
                "text-brand-600": active,
              })}
              data-active={active}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="mobile-bottom-nav__icon" aria-hidden="true" />
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
