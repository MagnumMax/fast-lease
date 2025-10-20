import type { AppRole } from "@/lib/auth/types";

export type AdminUserStatus = "active" | "pending" | "suspended" | "archived";

export type AdminUserRecord = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  roles: AppRole[];
  status: AdminUserStatus;
  lastLoginAt: string | null;
  invitationSentAt: string | null;
  phone: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AdminAuditLogEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  occurredAt: string;
};

export const ADMIN_USERS_FALLBACK: AdminUserRecord[] = [
  {
    id: "fallback-profile-maria-novak",
    userId: "fallback-user-maria-novak",
    fullName: "Maria Novak",
    email: "m.novak@fastlease.io",
    roles: ["OP_MANAGER"],
    status: "active",
    lastLoginAt: "2025-01-14T09:12:00+04:00",
    invitationSentAt: null,
    phone: "+971 50 200 3000",
    metadata: { department: "Operations" },
  },
  {
    id: "fallback-profile-nicolas-blanc",
    userId: "fallback-user-nicolas-blanc",
    fullName: "Nicolas Blanc",
    email: "n.blanc@fastlease.io",
    roles: ["OPERATOR"],
    status: "active",
    lastLoginAt: "2025-01-14T08:47:00+04:00",
    invitationSentAt: null,
    phone: "+971 50 200 3001",
    metadata: { department: "Operations" },
  },
  {
    id: "fallback-profile-anna-mueller",
    userId: "fallback-user-anna-mueller",
    fullName: "Anna Müller",
    email: "a.mueller@fastlease.io",
    roles: ["FINANCE"],
    status: "pending",
    lastLoginAt: null,
    invitationSentAt: "2025-01-13T10:00:00+04:00",
    phone: "+971 50 200 3002",
    metadata: { department: "Finance" },
  },
  {
    id: "fallback-profile-lukas-schmidt",
    userId: "fallback-user-lukas-schmidt",
    fullName: "Lukas Schmidt",
    email: "l.schmidt@fastlease.io",
    roles: ["ADMIN"],
    status: "active",
    lastLoginAt: "2025-01-14T07:05:00+04:00",
    invitationSentAt: null,
    phone: "+971 50 200 3003",
    metadata: { department: "Administration" },
  },
];

export const ADMIN_AUDIT_LOG_FALLBACK: AdminAuditLogEntry[] = [
  {
    id: "fallback-audit-001",
    actor: "Lina Admin",
    action: "Changed user role",
    target: "a.mueller@fastlease.io → Finance",
    occurredAt: "2025-01-13T18:04:00+04:00",
  },
  {
    id: "fallback-audit-002",
    actor: "Lina Admin",
    action: "Created user",
    target: "n.blanc@fastlease.io",
    occurredAt: "2025-01-13T11:20:00+04:00",
  },
  {
    id: "fallback-audit-003",
    actor: "Omar Operations",
    action: "Disabled access",
    target: "k.lehmann@fastlease.io",
    occurredAt: "2025-01-12T09:55:00+04:00",
  },
];
