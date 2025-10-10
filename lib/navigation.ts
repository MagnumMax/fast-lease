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
    | "Sparkles"
    | "UserCircle"
    | "Users"
    | "Workflow";
};

export const publicNav: NavItem[] = [
  { label: "Каталог", href: "/", icon: "Home" },
  { label: "Тарифы", href: "/pricing", icon: "GaugeCircle" },
  { label: "Поддержка", href: "/support", icon: "LifeBuoy" },
  { label: "FAQ", href: "/faq", icon: "HelpCircle" },
  { label: "Лизинг", href: "/apply/start", icon: "Sparkles" },
];

export const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/client/dashboard", icon: "LayoutDashboard" },
  { label: "My Vehicle", href: "/client/vehicle", icon: "Car" },
  { label: "Payments", href: "/client/invoices", icon: "CreditCard" },
  { label: "Documents", href: "/client/documents", icon: "FileText" },
  { label: "Deals", href: "/client/deals", icon: "KanbanSquare" },
  { label: "Profile", href: "/client/profile", icon: "UserCircle" },
  { label: "Referrals", href: "/client/referrals", icon: "Users" },
  { label: "Support", href: "/client/support", icon: "LifeBuoy" },
];

export const opsNav: NavItem[] = [
  { label: "Dashboard", href: "/ops/dashboard", icon: "ActivitySquare" },
  { label: "Tasks", href: "/ops/tasks", icon: "ListChecks" },
  { label: "Deals", href: "/ops/deals", icon: "KanbanSquare" },
  { label: "Clients", href: "/ops/clients", icon: "Users" },
  { label: "Vehicles", href: "/ops/cars", icon: "Car" },
];

export const adminNav: NavItem[] = [
  { label: "BPMN Processes", href: "/admin/bpm", icon: "Workflow" },
  { label: "Users", href: "/admin/users", icon: "Users" },
  { label: "Integrations", href: "/admin/integrations", icon: "Plug" },
];

export const investorNav: NavItem[] = [
  { label: "Dashboard", href: "/investor/dashboard", icon: "ChartLine" },
  { label: "Portfolio", href: "/investor/portfolio", icon: "Briefcase" },
  { label: "Reports", href: "/investor/reports", icon: "PieChart" },
];

export const mainShortcuts: NavItem[] = [
  { label: "Apply", href: "/apply/start", icon: "Sparkles" },
  { label: "Pricing", href: "/pricing", icon: "GaugeCircle" },
  { label: "Contact", href: "/support", icon: "LifeBuoy" },
  { label: "Settings", href: "/settings", icon: "Settings" },
  { label: "Menu", href: "#", icon: "MenuSquare" },
];
