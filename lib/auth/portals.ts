import type { AppRole, PortalCode } from "@/lib/auth/types";

export type PortalDefinition = {
  code: PortalCode;
  label: string;
  description: string;
  loginPath: string;
  homePath: string;
  allowedRoles: AppRole[];
  defaultRole?: AppRole | null;
};

export const PORTAL_CODES: PortalCode[] = [
  "app",
  "investor",
  "client",
  "partner",
];

export const PORTAL_DEFINITIONS: Record<PortalCode, PortalDefinition> = {
  app: {
    code: "app",
    label: "Рабочее место команды",
    description:
      "Доступ для внутренних ролей: операции, финансы, риск и поддержка.",
    loginPath: "/login",
    homePath: "/app/dashboard",
    allowedRoles: [
      "ADMIN",
      "OP_MANAGER",
      "SUPPORT",
      "FINANCE",
      "TECH_SPECIALIST",
      "RISK_MANAGER",
      "LEGAL",
      "ACCOUNTING",
    ],
    defaultRole: "OP_MANAGER",
  },
  investor: {
    code: "investor",
    label: "Инвесторский кабинет",
    description: "Отчёты, портфель, выплаты и документы для инвесторов.",
    loginPath: "/login",
    homePath: "/investor/dashboard",
    allowedRoles: ["INVESTOR"],
    defaultRole: "INVESTOR",
  },
  client: {
    code: "client",
    label: "Кабинет покупателя",
    description: "Платежи, документы, поддержка и статус лизинга.",
    loginPath: "/login",
    homePath: "/client/dashboard",
    allowedRoles: ["CLIENT"],
    defaultRole: "CLIENT",
  },
  partner: {
    code: "partner",
    label: "Партнёрский портал",
    description: "Поставщики, сервисы и подрядчики Fast Lease.",
    loginPath: "/login",
    homePath: "/partner/dashboard",
    allowedRoles: [],
    defaultRole: null,
  },
};

const ROLE_TO_PORTAL: Record<AppRole, PortalCode> = {
  ADMIN: "app",
  OP_MANAGER: "app",
  SUPPORT: "app",
  FINANCE: "app",
  TECH_SPECIALIST: "app",
  RISK_MANAGER: "app",
  LEGAL: "app",
  ACCOUNTING: "app",
  INVESTOR: "investor",
  CLIENT: "client",
};

export function normalizePortalCode(value: unknown): PortalCode | null {
  if (typeof value !== "string") return null;
  const lowered = value.trim().toLowerCase();
  return (PORTAL_CODES.find((code) => code === lowered) as PortalCode | undefined) ?? null;
}

export function resolvePortalForRole(role: AppRole | null): PortalCode {
  if (!role) {
    return "app";
  }

  return ROLE_TO_PORTAL[role] ?? "app";
}

export function getPortalDefinition(code: PortalCode): PortalDefinition {
  return PORTAL_DEFINITIONS[code];
}

export function resolvePortalHomePath(portal: PortalCode): string {
  return PORTAL_DEFINITIONS[portal]?.homePath ?? "/client/dashboard";
}

export function resolveDefaultRoleForPortal(portal: PortalCode): AppRole | null {
  return PORTAL_DEFINITIONS[portal]?.defaultRole ?? null;
}

export function listPortalCards(): PortalDefinition[] {
  return PORTAL_CODES.map((code) => PORTAL_DEFINITIONS[code]);
}

export function assertPortalAccess(
  roles: AppRole[],
  portal: PortalCode,
): boolean {
  const allowedRoles = PORTAL_DEFINITIONS[portal]?.allowedRoles ?? [];
  if (!allowedRoles.length) {
    return true;
  }

  return roles.some((role) => allowedRoles.includes(role));
}
