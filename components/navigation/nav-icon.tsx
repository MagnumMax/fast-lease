"use client";

import {
  ActivitySquare,
  Briefcase,
  Car,
  ChartLine,
  CreditCard,
  FileText,
  GaugeCircle,
  HelpCircle,
  Home,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  MenuSquare,
  PieChart,
  Plug,
  Settings,
  Sparkles,
  UserCircle,
  Users,
  Workflow,
  Circle,
  type LucideIcon,
} from "lucide-react";

import type { NavItem } from "@/lib/navigation";

const iconRegistry: Record<NavItem["icon"], LucideIcon> = {
  ActivitySquare,
  Briefcase,
  Car,
  ChartLine,
  CreditCard,
  FileText,
  GaugeCircle,
  HelpCircle,
  Home,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  MenuSquare,
  PieChart,
  Plug,
  Settings,
  Sparkles,
  UserCircle,
  Users,
  Workflow,
};

export function resolveNavIcon(name: NavItem["icon"]): LucideIcon {
  return iconRegistry[name] ?? Circle;
}
