"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Plus, Search, Shield, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminAuditLogEntry,
  AdminUserRecord,
  AdminUserStatus,
} from "@/lib/data/admin/users";
import type { AppRole } from "@/lib/auth/types";
import {
  APP_ROLE_CODES,
  APP_ROLE_LABELS,
} from "@/lib/data/app-roles";

type AdminUsersDirectoryProps = {
  initialUsers: AdminUserRecord[];
  initialAuditLog: AdminAuditLogEntry[];
  actorName: string;
  mode?: "users" | "roles";
};

type CreateUserForm = {
  fullName: string;
  email: string;
  role: AppRole;
  sendInvite: boolean;
};

type ManageAccessState = {
  isOpen: boolean;
  user: AdminUserRecord | null;
  status: AdminUserStatus;
  roles: Set<AppRole>;
  isSaving: boolean;
};

const ROLE_LABELS: Record<AppRole, string> = APP_ROLE_LABELS;

const STATUS_META: Record<
  AdminUserStatus,
  { label: string; description: string; badgeVariant: "success" | "warning" | "danger" | "outline" }
> = {
  active: {
    label: "Active",
    description: "User has full access.",
    badgeVariant: "success",
  },
  inactive: {
    label: "Inactive",
    description: "User is inactive.",
    badgeVariant: "outline",
  },
  pending: {
    label: "Invitation sent",
    description: "Awaiting invitation acceptance.",
    badgeVariant: "warning",
  },
  suspended: {
    label: "Suspended",
    description: "Access temporarily revoked.",
    badgeVariant: "danger",
  },
  archived: {
    label: "Deactivated",
    description: "Account archived, no access.",
    badgeVariant: "outline",
  },
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function generateClientId(prefix: string) {
  try {
    if (
      typeof globalThis !== "undefined" &&
      globalThis.crypto &&
      typeof globalThis.crypto.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Ignore and fallback to manual ID generation
  }

  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${random}${timestamp}`;
}

function makeAuditEntry(
  actorName: string,
  message: string,
  target: string,
): AdminAuditLogEntry {
  return {
    id: generateClientId("audit"),
    userId: "system",
    actor: actorName,
    action: message,
    target,
    timestamp: new Date().toISOString(),
    occurredAt: new Date().toISOString(),
    details: message,
  };
}

const AVAILABLE_ROLES: AppRole[] = APP_ROLE_CODES;
const ROLES_MODE_SCOPE: AppRole[] = [
  "ADMIN",
  "OP_MANAGER",
  "TECH_SPECIALIST",
  "FINANCE",
  "SUPPORT",
  "RISK_MANAGER",
  "LEGAL",
  "ACCOUNTING",
];

export function AdminUsersDirectory({
  initialUsers,
  initialAuditLog,
  actorName,
  mode = "users",
}: AdminUsersDirectoryProps) {
  const isRolesMode = mode === "roles";
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRecord[]>(() =>
    [...initialUsers].sort((a, b) => a.fullName.localeCompare(b.fullName)),
  );
  const [auditLog, setAuditLog] = useState<AdminAuditLogEntry[]>(() =>
    [...initialAuditLog].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    ),
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    fullName: "",
    email: "",
    role: "OP_MANAGER",
    sendInvite: true,
  });

  const [manageState, setManageState] = useState<ManageAccessState>({
    isOpen: false,
    user: null,
    status: "active",
    roles: new Set(),
    isSaving: false,
  });
  const [manageError, setManageError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<AppRole | null>(() =>
    isRolesMode ? ROLES_MODE_SCOPE[0] ?? null : null,
  );

  useEffect(() => {
    if (isRolesMode) {
      setRoleFilter((prev) => prev ?? ROLES_MODE_SCOPE[0] ?? null);
    } else if (!isRolesMode && roleFilter) {
      setRoleFilter(null);
    }
  }, [isRolesMode, roleFilter]);

  const roleStats = useMemo(() => {
    if (!isRolesMode) return null;

    const stats = new Map<AppRole, { count: number; members: AdminUserRecord[] }>();
    for (const role of ROLES_MODE_SCOPE) {
      stats.set(role, { count: 0, members: [] });
    }

    for (const user of users) {
      for (const role of user.roles) {
        if (!stats.has(role)) continue;
        const entry = stats.get(role)!;
        entry.count += 1;
        entry.members.push(user);
      }
    }

    return stats;
  }, [isRolesMode, users]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let dataset = [...users];

    if (isRolesMode && roleFilter) {
      dataset = dataset.filter((user) => user.roles.includes(roleFilter));
    }

    if (!query) return dataset;

    return dataset.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.roles.some((role: AppRole) => ROLE_LABELS[role]?.toLowerCase().includes(query))
      );
    });
  }, [isRolesMode, roleFilter, searchQuery, users]);

  function resetCreateForm() {
    setCreateForm({
      fullName: "",
      email: "",
      role: "OP_MANAGER",
      sendInvite: true,
    });
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createForm.fullName || !createForm.email) return;

    setIsCreating(true);

    setTimeout(() => {
      const newUser: AdminUserRecord = {
        id: generateClientId("profile"),
        name: "",
        fullName: createForm.fullName,
        email: createForm.email,
        role: createForm.role,
        roles: [createForm.role],
        status: createForm.sendInvite ? "pending" : "active",
        lastLogin: "",
        lastLoginAt: createForm.sendInvite ? null : new Date().toISOString(),
        invitationSentAt: createForm.sendInvite ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      };

      setUsers((prev) => [newUser, ...prev]);
      setAuditLog((prev) => [
        makeAuditEntry(actorName, "Created user", createForm.email),
        ...prev,
      ]);

      setIsCreating(false);
      setIsCreateDialogOpen(false);
      resetCreateForm();
    }, 600);
  }

  function handleManageOpen(user: AdminUserRecord) {
    setManageState({
      isOpen: true,
      user,
      status: user.status,
      roles: new Set(user.roles),
      isSaving: false,
    });
    setManageError(null);
  }

  function toggleRole(role: AppRole) {
    setManageState((prev) => {
      const nextRoles = new Set(prev.roles);
      if (nextRoles.has(role)) {
        nextRoles.delete(role);
      } else {
        nextRoles.add(role);
      }
      return { ...prev, roles: nextRoles };
    });
    setManageError(null);
  }

  async function handleManageSave() {
    const targetUser = manageState.user;
    if (!targetUser) return;
    const nextStatus = manageState.status;
    const nextRolesSet = new Set(manageState.roles);

    if (!nextRolesSet.size) {
      setManageError("Назначьте минимум одну роль.");
      return;
    }

    setManageState((prev) => ({ ...prev, isSaving: true }));
    setManageError(null);

    try {
      const response = await fetch("/api/admin/users/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: targetUser.id,
          status: nextStatus,
          roles: Array.from(nextRolesSet),
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        roles?: AppRole[];
        status?: AdminUserStatus;
        error?: string;
      };

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Не удалось сохранить изменения");
      }

      const persistedRoles = Array.from(payload.roles ?? nextRolesSet);

      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== targetUser.id) return user;
          return {
            ...user,
            roles: persistedRoles,
            status: payload.status ?? nextStatus,
          };
        }),
      );

      setAuditLog((prev) => [
        makeAuditEntry(
          actorName,
          "Updated access",
          `${targetUser.email} · ${STATUS_META[payload.status ?? nextStatus].label}`,
        ),
        ...prev,
      ]);

      setManageState({
        isOpen: false,
        user: null,
        status: "active",
        roles: new Set(),
        isSaving: false,
      });
      setManageError(null);
    } catch (error) {
      console.error("[admin] Failed to update user access", error);
      setManageError(
        error instanceof Error ? error.message : "Не удалось сохранить изменения",
      );
      setManageState((prev) => ({ ...prev, isSaving: false }));
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/80 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {isRolesMode ? "Roles" : "Users"}
            </p>
            <CardTitle className="text-2xl">
              {isRolesMode ? "Roles" : "Roles & Access"}
            </CardTitle>
            <CardDescription>
              {isRolesMode
                ? "Полный контроль над RBAC: назначайте и отзывайте роли, поддерживайте комплаенс."
                : "Manage platform roles, invitations, and access policies for every team member."}
            </CardDescription>
            <div className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50/60 px-3 py-2 text-xs text-brand-700 dark:border-brand-400/60 dark:bg-brand-500/10 dark:text-brand-200">
              <Shield className="h-4 w-4" />
              Изменения применяются мгновенно и записываются в Supabase.
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={
                  isRolesMode ? "Search members within selected role" : "Search name, email, or role"
                }
                className="h-10 w-72 rounded-xl pl-9 pr-4"
              />
            </div>
            {!isRolesMode ? (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    Add user
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg rounded-3xl">
                  <DialogHeader className="space-y-2">
                    <DialogTitle>Create user</DialogTitle>
                    <DialogDescription>
                      Issue an invitation and assign initial access roles.
                    </DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={handleCreateSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="create-full-name">Full name</Label>
                      <Input
                        id="create-full-name"
                        value={createForm.fullName}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, fullName: event.target.value }))
                        }
                        placeholder="Lina Admin"
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-email">Email</Label>
                      <Input
                        id="create-email"
                        type="email"
                        value={createForm.email}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, email: event.target.value.trim() }))
                        }
                        placeholder="user@fastlease.io"
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-role">Role</Label>
                      <select
                        id="create-role"
                        value={createForm.role}
                        onChange={(event) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            role: event.target.value as AppRole,
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        {AVAILABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={createForm.sendInvite}
                        onChange={(event) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            sendInvite: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-border text-brand-500 focus-visible:ring-brand-500"
                      />
                      Send invitation email
                    </label>
                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          setIsCreating(false);
                          resetCreateForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="rounded-xl" disabled={isCreating}>
                        {isCreating ? (
                          <span className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                              <path d="M22 12a10 10 0 0 1-10 10" />
                            </svg>
                            Creating…
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            Save
                          </span>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </CardHeader>
        {isRolesMode && roleStats ? (
          <CardContent className="pb-0">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ROLES_MODE_SCOPE.map((role) => {
                const stat = roleStats.get(role);
                const count = stat?.count ?? 0;
                const membersPreview = stat?.members
                  ? stat.members.slice(0, 3).map((member) => member.fullName)
                  : [];
                const isActive = roleFilter === role;
                return (
                  <button
                    key={`role-card-${role}`}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    className={`rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      isActive
                        ? "border-brand-500 bg-brand-50 dark:border-brand-400/60 dark:bg-brand-500/10"
                        : "border-border bg-card/60 hover:border-brand-400/80"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      {role.replace(/_/g, " ")}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between">
                      <p className="text-lg font-semibold text-foreground">{ROLE_LABELS[role]}</p>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    {membersPreview && membersPreview.length ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {membersPreview.join(", ")}
                        {count > membersPreview.length ? "…" : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Нет участников</p>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        ) : null}
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRolesMode ? "Member" : "Employee"}</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const statusMeta = STATUS_META[user.status];
                return (
                  <TableRow key={user.id} className="align-top">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium leading-tight">{user.fullName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 py-1">
                        {user.roles.map((role: AppRole) => (
                          <Badge key={`${user.id}-${role}`} variant="secondary">
                            {ROLE_LABELS[role] ?? role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={statusMeta.badgeVariant}
                          className="rounded-xl px-3 py-1"
                        >
                          {statusMeta.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{statusMeta.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{formatDateTime(user.lastLoginAt)}</p>
                      {user.invitationSentAt ? (
                        <p className="text-xs text-muted-foreground">
                          Invited {formatDateTime(user.invitationSentAt)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => handleManageOpen(user)}
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
                      <Shield className="h-10 w-10 text-muted-foreground/40" />
                      <p>No users found for the current filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border border-border/80 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-4 w-4 text-brand-500" />
            Access audit log
          </CardTitle>
          <CardDescription>
            Track administrative actions. Mirrors /beta/admin/users recent activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            auditLog.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-border bg-background/60 px-4 py-3 shadow-sm"
              >
                <p className="text-sm font-medium text-foreground">
                  {entry.action} · {entry.target}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.actor} • {formatDateTime(entry.occurredAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={manageState.isOpen}
        onOpenChange={(isOpen) =>
          setManageState((prev) => {
            if (isOpen) {
              return prev;
            }

            setManageError(null);
            return {
              isOpen: false,
              user: null,
              status: "active",
              roles: new Set(),
              isSaving: false,
            };
          })
        }
      >
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader className="space-y-2">
            <DialogTitle>Manage access</DialogTitle>
            <DialogDescription>
              Configure RBAC policies and role assignments for the selected account.
            </DialogDescription>
          </DialogHeader>
          {manageState.user ? (
            <div className="space-y-4">
              {manageError ? (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  <span>{manageError}</span>
                </div>
              ) : null}
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm font-medium text-foreground">{manageState.user.fullName}</p>
                <p className="text-sm text-muted-foreground">{manageState.user.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manage-status">Status</Label>
                <select
                  id="manage-status"
                  value={manageState.status}
                  onChange={(event) =>
                    setManageState((prev) => ({
                      ...prev,
                      status: event.target.value as AdminUserStatus,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Invitation sent</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Deactivated</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label>Roles</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AVAILABLE_ROLES.map((role) => {
                    const checked = manageState.roles.has(role);
                    return (
                      <button
                        key={`role-${role}`}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className="flex items-center justify-between rounded-2xl border border-border bg-card/60 px-4 py-3 text-left text-sm transition hover:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <div>
                          <p className="font-medium text-foreground">{ROLE_LABELS[role]}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            {role.replace(/_/g, " ")}
                          </p>
                        </div>
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background"
                          aria-hidden="true"
                        >
                          {checked ? <Check className="h-4 w-4 text-brand-500" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                setManageState({
                  isOpen: false,
                  user: null,
                  status: "active",
                  roles: new Set(),
                  isSaving: false,
                })
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={handleManageSave}
              disabled={manageState.isSaving}
            >
              {manageState.isSaving ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                    <path d="M22 12a10 10 0 0 1-10 10" />
                  </svg>
                  Updating…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Save changes
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
