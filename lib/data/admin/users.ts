// Admin Users Data Module
export type AdminUserStatus = "active" | "inactive" | "suspended" | "pending" | "archived";

import type { AppRole, PortalCode } from "@/lib/auth/types";

export type AdminUserRecord = {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: string;
  roles: AppRole[];
  roleAssignments?: RoleAssignmentRecord[];
  portals?: PortalAccessSummary[];
  loginEvents?: LoginEventSummary[];
  status: AdminUserStatus;
  lastLogin: string;
  lastLoginAt: string | null;
  invitationSentAt: string | null;
  createdAt: string;
};

export type AdminAuditLogEntry = {
  id: string;
  userId: string;
  actor: string;
  target: string;
  action: string;
  timestamp: string;
  occurredAt: string;
  details: string;
};

export type PortalAccessSummary = {
  portal: PortalCode;
  status: string;
  lastAccessAt: string | null;
};

export type LoginEventSummary = {
  portal: PortalCode;
  status: "success" | "failure";
  occurredAt: string;
  errorCode?: string | null;
};

export type RoleAssignmentRecord = {
  role: AppRole;
  portal: PortalCode;
  isReadOnly?: boolean;
};

// Fallback data for development
export const ADMIN_USERS_FALLBACK: AdminUserRecord[] = [
  {
    id: "admin-1",
    name: "Администратор Системы",
    fullName: "Администратор Системы",
    email: "admin@fastlease.ae",
    role: "ADMIN",
    roles: ["ADMIN"],
    roleAssignments: [{ role: "ADMIN", portal: "app", isReadOnly: false }],
    portals: [{ portal: "app", status: "active", lastAccessAt: new Date().toISOString() }],
    loginEvents: [],
    status: "active",
    lastLogin: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    invitationSentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export const ADMIN_AUDIT_LOG_FALLBACK: AdminAuditLogEntry[] = [
  {
    id: "audit-1",
    userId: "admin-1",
    actor: "admin-1",
    target: "system",
    action: "LOGIN",
    timestamp: new Date().toISOString(),
    occurredAt: new Date().toISOString(),
    details: "Успешный вход в систему",
  },
];
