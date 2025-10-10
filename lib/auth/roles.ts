import { AppRole } from "@/lib/auth/types";
export const APP_ROLE_PRIORITY: AppRole[] = [
  "admin",
  "ops_manager",
  "operator",
  "finance",
  "support",
  "investor",
  "client",
];

/**
 * СООТВЕТСТВИЕ РОЛЕЙ И ДОМАШНИХ ПУТЕЙ
 *
 * Определяет, куда перенаправляется пользователь после логина
 * в зависимости от его основной роли
 */
export const APP_ROLE_HOME_PATH: Record<AppRole, string> = {
  admin: "/admin/bpm",
  ops_manager: "/ops/dashboard",
  operator: "/ops/dashboard",
  finance: "/ops/deals",
  support: "/ops/tasks",
  investor: "/investor/dashboard",
  client: "/client/dashboard",
};

type AccessRule = {
  test: (pathname: string) => boolean;
  allowed: AppRole[];
};

const ADMIN_OVERRIDES: AppRole[] = ["admin"];

const accessRules: AccessRule[] = [
  {
    test: (pathname) => pathname.startsWith("/client"),
    allowed: ["client"],
  },
  {
    test: (pathname) => pathname.startsWith("/ops"),
    allowed: ["ops_manager", "operator", "support", "finance", "admin"],
  },
  {
    test: (pathname) => pathname.startsWith("/admin"),
    allowed: ["admin"],
  },
  {
    test: (pathname) => pathname.startsWith("/investor"),
    allowed: ["investor", "admin"],
  },
  {
    test: (pathname) => pathname.startsWith("/settings"),
    allowed: ["client", "ops_manager", "operator", "support", "finance"],
  },
];

export function resolvePrimaryRole(roles: AppRole[]): AppRole | null {
  for (const role of APP_ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return roles[0] ?? null;
}

export function resolveHomePath(
  roles: AppRole[],
  fallback: string = "/",
): string {
  const primary = resolvePrimaryRole(roles);
  if (!primary) return fallback;

  return APP_ROLE_HOME_PATH[primary] ?? fallback;
}

export function allowedRolesForPath(pathname: string): AppRole[] | null {
  const normalized = pathname.toLowerCase();
  const match = accessRules.find((rule) => rule.test(normalized));
  if (!match) return null;
  return match.allowed;
}

export function isAccessAllowed(pathname: string, roles: AppRole[]): boolean {
  if (!roles.length) return false;
  if (roles.some((role) => ADMIN_OVERRIDES.includes(role))) {
    return true;
  }

  const allowed = allowedRolesForPath(pathname);
  if (!allowed) {
    return true;
  }

  return roles.some((role) => allowed.includes(role));
}

/**
 * ВАЛИДАЦИЯ ПУТИ ДЛЯ РОЛИ
 *
 * Безопасная функция для получения корректного пути для роли
 * Возвращает "/client/dashboard" как fallback для неизвестных ролей
 */
export function validateRolePath(role: AppRole | null): string {
  if (!role) {
    console.error(`[ERROR] Role validation failed: role is null or undefined`);
    return "/client/dashboard";
  }

  const targetPath = APP_ROLE_HOME_PATH[role];
  if (!targetPath) {
    console.error(`[ERROR] Role validation failed: no path found for role ${role}`);
    return "/client/dashboard";
  }

  return targetPath;
}
