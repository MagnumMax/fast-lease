import type { WorkspaceRole } from "@/lib/workspace/routes";
import type { AppRole } from "@/lib/auth/types";

export type NavItem = {
  label: string;
  href: string;
  icon:
    | "ActivitySquare"
    | "Briefcase"
    | "Car"
    | "ChartLine"
    | "CreditCard"
    | "FileText"
    | "GaugeCircle"
    | "HelpCircle"
    | "Home"
    | "KanbanSquare"
    | "LayoutDashboard"
    | "LifeBuoy"
    | "ListChecks"
    | "MenuSquare"
    | "PieChart"
    | "Plug"
    | "Settings"
    | "Shield"
    | "Sparkles"
    | "UserCircle"
    | "Users"
    | "Workflow";
};

export const publicNav: NavItem[] = [
  { label: "Catalog", href: "/", icon: "Home" },
  { label: "Pricing", href: "/pricing", icon: "GaugeCircle" },
  { label: "Support", href: "/support", icon: "LifeBuoy" },
  { label: "FAQ", href: "/faq", icon: "HelpCircle" },
  { label: "Leasing", href: "/apply/start", icon: "Sparkles" },
];

const workspaceNavItems: NavItem[] = [
  { label: "Tasks", href: "/workspace/tasks", icon: "ListChecks" },
  { label: "Deals", href: "/workspace/deals", icon: "KanbanSquare" },
  { label: "Clients", href: "/workspace/clients", icon: "Users" },
  { label: "Sellers", href: "/workspace/sellers", icon: "UserCircle" },
  { label: "Brokers", href: "/workspace/brokers", icon: "Briefcase" },
  { label: "Cars", href: "/workspace/cars", icon: "Car" },
];

export const workspaceNav: NavItem[] = workspaceNavItems;

function createRoleWorkspaceNav(role: WorkspaceRole): NavItem[] {
  return workspaceNavItems.map((item) => ({
    ...item,
    href: item.href.replace(/^\/workspace/, `/${role}`),
  }));
}

export const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/client/dashboard", icon: "LayoutDashboard" },
  { label: "My Vehicle", href: "/client/vehicle", icon: "Car" },
  { label: "Payments", href: "/client/invoices", icon: "CreditCard" },
  { label: "Documents", href: "/client/documents", icon: "FileText" },
  { label: "Referrals", href: "/client/referrals", icon: "Users" },
  { label: "Support", href: "/client/support", icon: "LifeBuoy" },
];

export const opsNav: NavItem[] = [
  { label: "Dashboard", href: "/ops/dashboard", icon: "ActivitySquare" },
  ...createRoleWorkspaceNav("ops"),
];

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard" },
  ...createRoleWorkspaceNav("admin"),
  { label: "BPMN Processes", href: "/admin/bpm", icon: "Workflow" },
  { label: "Users & Portals", href: "/settings/users", icon: "Users" },
  { label: "Roles", href: "/admin/roles", icon: "Shield" },
  { label: "Integrations", href: "/admin/integrations", icon: "Plug" },
];

export const financeNav: NavItem[] = [
  { label: "Dashboard", href: "/finance/dashboard", icon: "LayoutDashboard" },
  { label: "Receivables", href: "/finance/receivables", icon: "CreditCard" },
  { label: "Disbursements", href: "/finance/disbursements", icon: "Briefcase" },
  { label: "Reports", href: "/finance/reports", icon: "PieChart" },
  ...createRoleWorkspaceNav("finance"),
];

export const supportNav: NavItem[] = [
  { label: "Dashboard", href: "/support/dashboard", icon: "LayoutDashboard" },
  { label: "Queues", href: "/support/queues", icon: "ListChecks" },
  { label: "Knowledge", href: "/support/knowledge", icon: "HelpCircle" },
  ...createRoleWorkspaceNav("support"),
];

export const techNav: NavItem[] = [
  { label: "Dashboard", href: "/tech/dashboard", icon: "LayoutDashboard" },
  { label: "Inspections", href: "/tech/inspections", icon: "Shield" },
  { label: "Service Orders", href: "/tech/service-orders", icon: "Workflow" },
  ...createRoleWorkspaceNav("tech"),
];

export const riskNav: NavItem[] = [
  { label: "Dashboard", href: "/risk/dashboard", icon: "LayoutDashboard" },
  { label: "Pipeline", href: "/risk/pipeline", icon: "KanbanSquare" },
  { label: "Reports", href: "/risk/reports", icon: "PieChart" },
  ...createRoleWorkspaceNav("risk"),
];

export const legalNav: NavItem[] = [
  { label: "Dashboard", href: "/legal/dashboard", icon: "LayoutDashboard" },
  { label: "Contracts", href: "/legal/contracts", icon: "FileText" },
  { label: "Requests", href: "/legal/requests", icon: "ListChecks" },
  ...createRoleWorkspaceNav("legal"),
];

export const accountingNav: NavItem[] = [
  { label: "Dashboard", href: "/accounting/dashboard", icon: "LayoutDashboard" },
  { label: "Ledgers", href: "/accounting/ledgers", icon: "FileText" },
  { label: "Closings", href: "/accounting/closings", icon: "GaugeCircle" },
  ...createRoleWorkspaceNav("accounting"),
];

export const investorNav: NavItem[] = [
  { label: "Dashboard", href: "/investor/dashboard", icon: "ChartLine" },
  { label: "Portfolio", href: "/investor/portfolio", icon: "Briefcase" },
  { label: "Reports", href: "/investor/reports", icon: "PieChart" },
];

const ROLE_PROFILE_PATH: Record<AppRole, string> = {
  ADMIN: "/admin/profile",
  OP_MANAGER: "/ops/profile",
  OPS_MANAGER: "/ops/profile",
  SUPPORT: "/support/profile",
  FINANCE: "/finance/profile",
  TECH_SPECIALIST: "/tech/profile",
  RISK_MANAGER: "/risk/profile",
  INVESTOR: "/investor/profile",
  LEGAL: "/legal/profile",
  ACCOUNTING: "/accounting/profile",
  CLIENT: "/client/profile",
  SELLER: "/seller/profile",
  BROKER: "/partner/profile",
};

export function resolveProfileHrefForRole(role: AppRole | null): string {
  if (!role) {
    return "/ops/profile";
  }
  return ROLE_PROFILE_PATH[role] ?? "/ops/profile";
}

export const mainShortcuts: NavItem[] = [
  { label: "Apply", href: "/apply/start", icon: "Sparkles" },
  { label: "Pricing", href: "/pricing", icon: "GaugeCircle" },
  { label: "Contact", href: "/support", icon: "LifeBuoy" },
  { label: "Settings", href: "/settings", icon: "Settings" },
  { label: "Menu", href: "#", icon: "MenuSquare" },
];
