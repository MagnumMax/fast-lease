"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Check, Plus, Search, Shield, UserCog } from "lucide-react";

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

type AdminUsersDirectoryProps = {
  initialUsers: AdminUserRecord[];
  initialAuditLog: AdminAuditLogEntry[];
  actorName: string;
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

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  client: "Client",
  finance: "Finance",
  investor: "Investor",
  operator: "Operator",
  ops_manager: "Operations Manager",
  support: "Support",
};

const STATUS_META: Record<
  AdminUserStatus,
  { label: string; description: string; badgeVariant: "success" | "warning" | "danger" | "outline" }
> = {
  active: {
    label: "Active",
    description: "User has full access.",
    badgeVariant: "success",
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

function makeAuditEntry(
  actorName: string,
  message: string,
  target: string,
): AdminAuditLogEntry {
  return {
    id:
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `audit-${Math.random().toString(36).slice(2)}`),
    actor: actorName,
    action: message,
    target,
    occurredAt: new Date().toISOString(),
  };
}

const AVAILABLE_ROLES: AppRole[] = [
  "admin",
  "ops_manager",
  "operator",
  "finance",
  "support",
  "investor",
  "client",
];

export function AdminUsersDirectory({
  initialUsers,
  initialAuditLog,
  actorName,
}: AdminUsersDirectoryProps) {
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
    role: "ops_manager",
    sendInvite: true,
  });

  const [manageState, setManageState] = useState<ManageAccessState>({
    isOpen: false,
    user: null,
    status: "active",
    roles: new Set(),
    isSaving: false,
  });

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.roles.some((role) => ROLE_LABELS[role]?.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, users]);

  function resetCreateForm() {
    setCreateForm({
      fullName: "",
      email: "",
      role: "ops_manager",
      sendInvite: true,
    });
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createForm.fullName || !createForm.email) return;

    setIsCreating(true);

    setTimeout(() => {
      const newUser: AdminUserRecord = {
        id:
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `profile-${Math.random().toString(36).slice(2)}`),
        userId:
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `user-${Math.random().toString(36).slice(2)}`),
        fullName: createForm.fullName,
        email: createForm.email,
        roles: [createForm.role],
        status: createForm.sendInvite ? "pending" : "active",
        lastLoginAt: null,
        invitationSentAt: createForm.sendInvite ? new Date().toISOString() : null,
        phone: null,
        metadata: { createdOffline: true },
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
  }

  function handleManageSave() {
    const targetUser = manageState.user;
    if (!targetUser) return;
    const nextStatus = manageState.status;
    const nextRolesSet = new Set(manageState.roles);

    setManageState((prev) => ({ ...prev, isSaving: true }));

    setTimeout(() => {
      const nextRoles = Array.from(nextRolesSet);
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== targetUser.id) return user;
          return {
            ...user,
            roles: nextRoles.length ? nextRoles : user.roles,
            status: nextStatus,
          };
        }),
      );

      setAuditLog((prev) => [
        makeAuditEntry(
          actorName,
          "Updated access",
          `${targetUser.email} · ${STATUS_META[nextStatus].label}`,
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
    }, 600);
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/80 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Users
            </p>
            <CardTitle className="text-2xl">Roles &amp; Access</CardTitle>
            <CardDescription>
              Manage platform roles, invitations, and access policies as defined in /beta/admin/users.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, email, or role"
                className="h-10 w-72 rounded-xl pl-9 pr-4"
              />
            </div>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
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
                        {user.roles.map((role) => (
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
          setManageState((prev) =>
            isOpen
              ? prev
              : { isOpen: false, user: null, status: "active", roles: new Set(), isSaving: false },
          )
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
