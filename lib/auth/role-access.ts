import type { AppRole } from "./types";
import { WORKSPACE_SECTIONS, getWorkspacePaths } from "../workspace/routes";

type AccessSectionBase = {
  id: string;
  label: string;
  description: string;
  prefix: string;
  defaultRoles: readonly AppRole[];
};

const ACCESS_SECTION_DEFINITIONS = [
  // Client portal
  {
    id: "client_dashboard",
    label: "Dashboard",
    description: "Основной обзор покупателя.",
    prefix: "/client/dashboard",
    defaultRoles: ["CLIENT"],
  },
  {
    id: "client_vehicle",
    label: "Vehicle",
    description: "Информация об автомобиле покупателя.",
    prefix: "/client/vehicle",
    defaultRoles: ["CLIENT"],
  },
  {
    id: "client_invoices",
    label: "Invoices",
    description: "Счета и платежи покупателя.",
    prefix: "/client/invoices",
    defaultRoles: ["CLIENT"],
  },
  {
    id: "client_documents",
    label: "Documents",
    description: "Документы и файлы покупателя.",
    prefix: "/client/documents",
    defaultRoles: ["CLIENT"],
  },
  {
    id: "client_profile",
    label: "Profile",
    description: "Профиль и настройки покупателя.",
    prefix: "/client/profile",
    defaultRoles: ["CLIENT"],
  },
  {
    id: "client_referrals",
    label: "Referrals",
    description: "Реферальные программы покупателя.",
    prefix: "/client/referrals",
    defaultRoles: ["CLIENT"],
  },
  {
    id: "client_support",
    label: "Support",
    description: "Поддержка покупателя и обращения.",
    prefix: "/client/support",
    defaultRoles: ["CLIENT"],
  },
  {
    id: "client_all",
    label: "Other",
    description: "Прочие страницы покупательского кабинета.",
    prefix: "/client",
    defaultRoles: ["CLIENT"],
  },

  // Operations portal
  {
    id: "ops_dashboard",
    label: "Dashboard",
    description: "Главная панель операционного отдела.",
    prefix: "/ops/dashboard",
    defaultRoles: ["OP_MANAGER", "SUPPORT", "FINANCE", "TECH_SPECIALIST", "ADMIN"],
  },
  {
    id: "ops_all",
    label: "Other",
    description: "Прочие разделы операционной панели.",
    prefix: "/ops",
    defaultRoles: ["OP_MANAGER", "SUPPORT", "FINANCE", "TECH_SPECIALIST", "ADMIN"],
  },

  // Shared workspace (multi-role)
  {
    id: "workspace_tasks",
    label: "Tasks",
    description: "Общий канбан задач.",
    prefix: "/workspace/tasks",
    defaultRoles: ["OP_MANAGER", "SUPPORT", "FINANCE", "TECH_SPECIALIST", "RISK_MANAGER", "LEGAL", "ACCOUNTING", "ADMIN"],
  },
  {
    id: "workspace_deals",
    label: "Deals",
    description: "Общий список сделок.",
    prefix: "/workspace/deals",
    defaultRoles: ["OP_MANAGER", "SUPPORT", "FINANCE", "TECH_SPECIALIST", "RISK_MANAGER", "LEGAL", "ACCOUNTING", "ADMIN"],
  },
  {
    id: "workspace_clients",
    label: "Clients",
    description: "Каталог покупателей для всех ролей.",
    prefix: "/workspace/clients",
    defaultRoles: ["OP_MANAGER", "SUPPORT", "FINANCE", "TECH_SPECIALIST", "RISK_MANAGER", "LEGAL", "ACCOUNTING", "ADMIN"],
  },
  {
    id: "workspace_cars",
    label: "Cars",
    description: "Парк автомобилей для всех ролей.",
    prefix: "/workspace/cars",
    defaultRoles: ["OP_MANAGER", "SUPPORT", "FINANCE", "TECH_SPECIALIST", "RISK_MANAGER", "LEGAL", "ACCOUNTING", "ADMIN"],
  },
  {
    id: "workspace_all",
    label: "Workspace Other",
    description: "Прочие разделы workspace.",
    prefix: "/workspace",
    defaultRoles: ["OP_MANAGER", "SUPPORT", "FINANCE", "TECH_SPECIALIST", "RISK_MANAGER", "LEGAL", "ACCOUNTING", "ADMIN"],
  },

  // Finance portal
  {
    id: "finance_dashboard",
    label: "Finance Dashboard",
    description: "Главная панель финансового отдела.",
    prefix: "/finance/dashboard",
    defaultRoles: ["FINANCE", "ACCOUNTING", "ADMIN"],
  },
  {
    id: "finance_all",
    label: "Finance",
    description: "Прочие разделы финансового портала.",
    prefix: "/finance",
    defaultRoles: ["FINANCE", "ACCOUNTING", "ADMIN"],
  },

  // Support portal
  {
    id: "support_dashboard",
    label: "Support Dashboard",
    description: "Главная панель поддержки.",
    prefix: "/support/dashboard",
    defaultRoles: ["SUPPORT", "OP_MANAGER", "ADMIN"],
  },
  {
    id: "support_all",
    label: "Support",
    description: "Прочие разделы портала поддержки.",
    prefix: "/support",
    defaultRoles: ["SUPPORT", "OP_MANAGER", "ADMIN"],
  },

  // Technical specialists portal
  {
    id: "tech_dashboard",
    label: "Technical Dashboard",
    description: "Главная панель технического специалиста.",
    prefix: "/tech/dashboard",
    defaultRoles: ["TECH_SPECIALIST", "OP_MANAGER", "ADMIN"],
  },
  {
    id: "tech_all",
    label: "Technical",
    description: "Прочие разделы технического портала.",
    prefix: "/tech",
    defaultRoles: ["TECH_SPECIALIST", "OP_MANAGER", "ADMIN"],
  },

  // Risk management portal
  {
    id: "risk_dashboard",
    label: "Risk Dashboard",
    description: "Главная панель риск-менеджмента.",
    prefix: "/risk/dashboard",
    defaultRoles: ["RISK_MANAGER", "ADMIN"],
  },
  {
    id: "risk_all",
    label: "Risk",
    description: "Прочие разделы риск-портала.",
    prefix: "/risk",
    defaultRoles: ["RISK_MANAGER", "ADMIN"],
  },

  // Legal portal
  {
    id: "legal_dashboard",
    label: "Legal Dashboard",
    description: "Главная панель юридического отдела.",
    prefix: "/legal/dashboard",
    defaultRoles: ["LEGAL", "ADMIN"],
  },
  {
    id: "legal_all",
    label: "Legal",
    description: "Прочие разделы юридического портала.",
    prefix: "/legal",
    defaultRoles: ["LEGAL", "ADMIN"],
  },

  // Accounting portal
  {
    id: "accounting_dashboard",
    label: "Accounting Dashboard",
    description: "Главная панель бухгалтерии.",
    prefix: "/accounting/dashboard",
    defaultRoles: ["ACCOUNTING", "FINANCE", "ADMIN"],
  },
  {
    id: "accounting_all",
    label: "Accounting",
    description: "Прочие разделы портала бухгалтерии.",
    prefix: "/accounting",
    defaultRoles: ["ACCOUNTING", "FINANCE", "ADMIN"],
  },

  // Admin portal
  {
    id: "admin_bpm",
    label: "BPM",
    description: "Конфигурация процессов и workflow.",
    prefix: "/admin/bpm",
    defaultRoles: ["ADMIN"],
  },
  {
    id: "admin_users",
    label: "Users",
    description: "Управление пользователями и доступами.",
    prefix: "/admin/users",
    defaultRoles: ["ADMIN"],
  },
  {
    id: "admin_roles",
    label: "Roles",
    description: "Матрица ролей и разрешений.",
    prefix: "/admin/roles",
    defaultRoles: ["ADMIN"],
  },
  {
    id: "admin_integrations",
    label: "Integrations",
    description: "Интеграции и системные подключения.",
    prefix: "/admin/integrations",
    defaultRoles: ["ADMIN"],
  },
  {
    id: "admin_all",
    label: "Other",
    description: "Прочие страницы административного портала.",
    prefix: "/admin",
    defaultRoles: ["ADMIN"],
  },

  // Investor portal
  {
    id: "investor_dashboard",
    label: "Dashboard",
    description: "Сводка инвестора.",
    prefix: "/investor/dashboard",
    defaultRoles: ["INVESTOR", "ADMIN"],
  },
  {
    id: "investor_portfolio",
    label: "Portfolio",
    description: "Портфель и активы инвестора.",
    prefix: "/investor/portfolio",
    defaultRoles: ["INVESTOR", "ADMIN"],
  },
  {
    id: "investor_reports",
    label: "Reports",
    description: "Отчёты и KPI для инвесторов.",
    prefix: "/investor/reports",
    defaultRoles: ["INVESTOR", "ADMIN"],
  },
  {
    id: "investor_all",
    label: "Other",
    description: "Прочие разделы кабинета инвестора.",
    prefix: "/investor",
    defaultRoles: ["INVESTOR", "ADMIN"],
  },

  // Shared settings
  {
    id: "settings_all",
    label: "Settings",
    description: "Общие настройки и вспомогательные страницы.",
    prefix: "/settings",
    defaultRoles: ["CLIENT", "OP_MANAGER", "SUPPORT", "FINANCE", "TECH_SPECIALIST"],
  },
] as const satisfies ReadonlyArray<AccessSectionBase>;

export type AccessSection = (typeof ACCESS_SECTION_DEFINITIONS)[number]["id"];

const WORKSPACE_SECTION_PREFIXES = WORKSPACE_SECTIONS.flatMap((section) =>
  getWorkspacePaths(section).map((path) => ({
    prefix: path.toLowerCase(),
    sectionId: `workspace_${section}` as AccessSection,
  })),
).sort((a, b) => b.prefix.length - a.prefix.length);

export type AccessSectionDefinition = {
  id: AccessSection;
  label: string;
  description: string;
  prefix: string;
  defaultRoles: AppRole[];
};

export const ACCESS_SECTIONS: AccessSectionDefinition[] = ACCESS_SECTION_DEFINITIONS.map(
  (section) => ({
    ...section,
    defaultRoles: [...section.defaultRoles],
  }),
);

const SECTION_BY_ID = new Map<AccessSection, AccessSectionDefinition>(
  ACCESS_SECTIONS.map((section) => [section.id, section]),
);

const ACCESS_SECTIONS_BY_PREFIX = [...ACCESS_SECTIONS].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

export function isAccessSection(value: unknown): value is AccessSection {
  if (typeof value !== "string") return false;
  return SECTION_BY_ID.has(value as AccessSection);
}

export function getSectionDefinition(section: AccessSection): AccessSectionDefinition {
  const definition = SECTION_BY_ID.get(section);
  if (!definition) {
    throw new Error(`Unknown access section: ${section}`);
  }
  return definition;
}

export function resolveSectionForPath(pathname: string): AccessSection | null {
  const normalized = pathname.toLowerCase();
  const workspaceMatch = WORKSPACE_SECTION_PREFIXES.find((entry) =>
    normalized.startsWith(entry.prefix),
  );
  if (workspaceMatch) {
    return workspaceMatch.sectionId;
  }
  const match = ACCESS_SECTIONS_BY_PREFIX.find((section) =>
    normalized.startsWith(section.prefix),
  );
  return match?.id ?? null;
}

export function getDefaultRolesForSection(section: AccessSection): AppRole[] {
  return [...getSectionDefinition(section).defaultRoles];
}

export function getDefaultRolesForPath(pathname: string): AppRole[] | null {
  const section = resolveSectionForPath(pathname);
  if (!section) return null;
  return getDefaultRolesForSection(section);
}
