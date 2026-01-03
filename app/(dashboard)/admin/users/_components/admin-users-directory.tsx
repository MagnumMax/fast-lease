"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  KeyRound,
  History,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCog,
  X,
} from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AdminCreateUserSchema } from "@/lib/validation/admin-users";
import type {
  AdminAuditLogEntry,
  AdminUserRecord,
  AdminUserStatus,
} from "@/lib/data/admin/users";
import type { AppRole, PortalCode } from "@/lib/auth/types";
import {
  APP_ROLE_CODES,
  APP_ROLE_LABELS,
} from "@/lib/data/app-roles";
import { PORTAL_CODES, PORTAL_DEFINITIONS, resolvePortalForRole } from "@/lib/auth/portals";

type AdminUsersDirectoryProps = {
  initialUsers: AdminUserRecord[];
  initialAuditLog: AdminAuditLogEntry[];
  actorName: string;
  actorId?: string;
  mode?: "users" | "roles";
  actorCanMutate?: boolean;
};

type CreateUserForm = {
  fullName: string;
  email: string;
  role: AppRole;
  readOnly: boolean;
  sendInvite: boolean;
};

type CreateUserSuccess = {
  email: string;
  inviteLink?: string | null;
  temporaryPassword?: string | null;
};

type CreateFieldErrors = Partial<Record<keyof CreateUserForm, string>>;

type ManageAccessState = {
  isOpen: boolean;
  user: AdminUserRecord | null;
  status: AdminUserStatus;
  roles: RoleSelectionState;
  portals: Map<PortalCode, boolean>;
  isSaving: boolean;
};

type RoleToggle = {
  selected: boolean;
  readOnly: boolean;
};

type RoleSelectionState = Map<AppRole, RoleToggle>;

type DeleteBlocker = {
  type: string;
  label: string;
  count: number;
};

type BulkDeleteState = {
  isChecking: boolean;
  isDialogOpen: boolean;
  isDeleting: boolean;
  selectedUserIds: Set<string>;
  blockers: DeleteBlocker[];
  error: string | null;
};

type DeleteState = {
  isChecking: boolean;
  isDialogOpen: boolean;
  isDeleting: boolean;
  blockers: DeleteBlocker[];
  error: string | null;
};

type ResetPasswordState = {
  isResetting: boolean;
  temporaryPassword: string | null;
  error: string | null;
};

type DeleteApiResponse = {
  ok?: boolean;
  canDelete?: boolean;
  blockers?: DeleteBlocker[];
  error?: string;
  errors?: string[];
  message?: string;
};

const DEFAULT_DELETE_STATE: DeleteState = {
  isChecking: false,
  isDialogOpen: false,
  isDeleting: false,
  blockers: [],
  error: null,
};

const DEFAULT_BULK_DELETE_STATE: BulkDeleteState = {
  isChecking: false,
  isDialogOpen: false,
  isDeleting: false,
  selectedUserIds: new Set(),
  blockers: [],
  error: null,
};

const DEFAULT_RESET_PASSWORD_STATE: ResetPasswordState = {
  isResetting: false,
  temporaryPassword: null,
  error: null,
};

function resolveDeleteErrorMessage(payload: DeleteApiResponse | null | undefined, fallback?: string) {
  if (!payload) return fallback ?? null;
  if (payload.errors && payload.errors.length) {
    return payload.errors.join("\n");
  }
  if (payload.message && payload.message.trim().length) {
    return payload.message;
  }
  if (payload.error && payload.error.trim().length) {
    return payload.error;
  }
  return fallback ?? null;
}

const ROLE_LABELS: Record<AppRole, string> = APP_ROLE_LABELS;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
const DEFAULT_PAGE_SIZE = 10;

const STATUS_META: Record<
  AdminUserStatus,
  { label: string; badgeVariant: "success" | "warning" | "danger" | "outline" }
> = {
  active: {
    label: "Active",
    badgeVariant: "success",
  },
  inactive: {
    label: "Inactive",
    badgeVariant: "outline",
  },
  pending: {
    label: "Invitation sent",
    badgeVariant: "warning",
  },
  suspended: {
    label: "Suspended",
    badgeVariant: "danger",
  },
  archived: {
    label: "Deactivated",
    badgeVariant: "outline",
  },
};

const STATUS_FILTER_VALUES = Object.keys(STATUS_META) as AdminUserStatus[];

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
const PORTAL_LIST: PortalCode[] = PORTAL_CODES;

type UserSortColumn = "employee" | "lastLogin";
type UserSortDirection = "asc" | "desc";
type UserSortState = {
  column: UserSortColumn;
  direction: UserSortDirection;
};

const DEFAULT_SORT_STATE: UserSortState = {
  column: "employee",
  direction: "asc",
};

function sortUsers(
  users: AdminUserRecord[],
  sortState: UserSortState = DEFAULT_SORT_STATE,
): AdminUserRecord[] {
  return [...users].sort((a, b) => {
    if (sortState.column === "lastLogin") {
      return compareByLastLogin(a, b, sortState.direction);
    }
    return compareByEmployee(a, b, sortState.direction);
  });
}

function compareByEmployee(
  a: AdminUserRecord,
  b: AdminUserRecord,
  direction: UserSortDirection,
) {
  const result = a.fullName.localeCompare(b.fullName);
  return direction === "asc" ? result : -result;
}

function compareByLastLogin(
  a: AdminUserRecord,
  b: AdminUserRecord,
  direction: UserSortDirection,
) {
  const aHasLogin = Boolean(a.lastLoginAt);
  const bHasLogin = Boolean(b.lastLoginAt);

  if (!aHasLogin && !bHasLogin) return 0;
  if (!aHasLogin) return 1;
  if (!bHasLogin) return -1;

  const aTime = new Date(a.lastLoginAt as string).getTime();
  const bTime = new Date(b.lastLoginAt as string).getTime();

  return direction === "asc" ? aTime - bTime : bTime - aTime;
}

function sortAuditLog(entries: AdminAuditLogEntry[]): AdminAuditLogEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

function initializePortalState(user: AdminUserRecord | null): Map<PortalCode, boolean> {
  const map = new Map<PortalCode, boolean>();
  for (const portal of PORTAL_LIST) {
    const summary = user?.portals?.find((entry) => entry.portal === portal);
    map.set(portal, summary ? summary.status !== "inactive" : false);
  }
  return map;
}

function initializeRoleSelections(user: AdminUserRecord | null): RoleSelectionState {
  const map = new Map<AppRole, RoleToggle>();
  for (const role of AVAILABLE_ROLES) {
    const assignment = user?.roleAssignments?.find((entry) => entry.role === role);
    map.set(role, {
      selected: Boolean(user?.roles.includes(role)),
      readOnly: assignment?.isReadOnly ?? false,
    });
  }
  return map;
}

export function AdminUsersDirectory({
  initialUsers,
  initialAuditLog,
  actorName,
  actorId,
  mode = "users",
  actorCanMutate = true,
}: AdminUsersDirectoryProps) {
  const isRolesMode = mode === "roles";
  const actorIsReadOnly = !actorCanMutate;
  const readOnlyTooltip = actorIsReadOnly ? "Your current access is read-only." : undefined;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRecord[]>(() => sortUsers(initialUsers));
  const [auditLog, setAuditLog] = useState<AdminAuditLogEntry[]>(() =>
    sortAuditLog(initialAuditLog),
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    fullName: "",
    email: "",
    role: "OP_MANAGER",
    readOnly: false,
    sendInvite: true,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<CreateFieldErrors>({});
  const [createSuccess, setCreateSuccess] = useState<CreateUserSuccess | null>(null);
  const [sortState, setSortState] = useState<UserSortState>(DEFAULT_SORT_STATE);

  const [manageState, setManageState] = useState<ManageAccessState>({
    isOpen: false,
    user: null,
    status: "active",
    roles: initializeRoleSelections(null),
    portals: initializePortalState(null),
    isSaving: false,
  });
  const [manageError, setManageError] = useState<string | null>(null);
  const [resetPasswordState, setResetPasswordState] = useState<ResetPasswordState>(
    DEFAULT_RESET_PASSWORD_STATE,
  );
  const [deleteState, setDeleteState] = useState<DeleteState>(DEFAULT_DELETE_STATE);
  const [bulkDeleteState, setBulkDeleteState] = useState<BulkDeleteState>(DEFAULT_BULK_DELETE_STATE);
  const [roleFilter, setRoleFilter] = useState<AppRole | null>(() =>
    isRolesMode ? ROLES_MODE_SCOPE[0] ?? null : null,
  );
  const [roleFilters, setRoleFilters] = useState<Set<AppRole>>(new Set());
  const [portalFilters, setPortalFilters] = useState<Set<PortalCode>>(new Set());
  const [statusFilters, setStatusFilters] = useState<Set<AdminUserStatus>>(new Set());
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const normalizedCreateForm = useMemo(
    () => ({
      fullName: createForm.fullName.trim(),
      email: createForm.email.trim(),
      role: {
        code: createForm.role,
        readOnly: createForm.readOnly,
      },
      sendInvite: createForm.sendInvite,
    }),
    [createForm],
  );

  const isCreateFormValid = useMemo(() => {
    const result = AdminCreateUserSchema.safeParse(normalizedCreateForm);
    return result.success;
  }, [normalizedCreateForm]);

  useEffect(() => {
    setUsers(sortUsers(initialUsers));
  }, [initialUsers]);

  useEffect(() => {
    setAuditLog(sortAuditLog(initialAuditLog));
  }, [initialAuditLog]);

  useEffect(() => {
    if (isRolesMode) {
      setRoleFilter((prev) => prev ?? ROLES_MODE_SCOPE[0] ?? null);
    } else if (!isRolesMode && roleFilter) {
      setRoleFilter(null);
    }
  }, [isRolesMode, roleFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, isRolesMode, pageSize, roleFilters, portalFilters, statusFilters]);

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

    if (roleFilters.size) {
      dataset = dataset.filter((user) => user.roles.some((role) => roleFilters.has(role)));
    }

    if (portalFilters.size) {
      dataset = dataset.filter((user) =>
        (user.portals ?? []).some(
          (portal) => portalFilters.has(portal.portal) && portal.status !== "inactive",
        ),
      );
    }

    if (statusFilters.size) {
      dataset = dataset.filter((user) => statusFilters.has(user.status));
    }

    if (query) {
      dataset = dataset.filter((user) => {
        return (
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.roles.some((role: AppRole) => ROLE_LABELS[role]?.toLowerCase().includes(query))
        );
      });
    }

    return sortUsers(dataset, sortState);
  }, [
    isRolesMode,
    roleFilter,
    searchQuery,
    users,
    roleFilters,
    portalFilters,
    statusFilters,
    sortState,
  ]);

  const totalUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(totalUsers, 1) / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safePage - 1) * pageSize,
    (safePage - 1) * pageSize + pageSize,
  );
  const pageStart = totalUsers === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = totalUsers === 0 ? 0 : Math.min(safePage * pageSize, totalUsers);
  const showPaginationFooter = totalUsers > 0;

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(Math.max(filteredUsers.length, 1) / pageSize),
    );
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [filteredUsers.length, pageSize]);

  const isSelfTarget = Boolean(actorId && manageState.user && manageState.user.id === actorId);
  const activeDeleteBlockers = deleteState.blockers.filter((blocker) => blocker.count > 0);

  function handleSort(column: UserSortColumn) {
    setSortState((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        column,
        direction: column === "lastLogin" ? "desc" : "asc",
      };
    });
  }

  function renderSortIcon(column: UserSortColumn) {
    if (sortState.column !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />;
    }

    if (sortState.direction === "asc") {
      return <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />;
    }

    return <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />;
  }

  function resetCreateForm() {
    setCreateForm({
      fullName: "",
      email: "",
      role: "OP_MANAGER",
      readOnly: false,
      sendInvite: true,
    });
    setCreateError(null);
    setCreateFieldErrors({});
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = AdminCreateUserSchema.safeParse(normalizedCreateForm);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setCreateFieldErrors({
        fullName: fieldErrors.fullName?.[0],
        email: fieldErrors.email?.[0],
        role: fieldErrors.role?.[0],
      });
      setCreateError(
        fieldErrors.fullName?.[0] ??
          fieldErrors.email?.[0] ??
          fieldErrors.role?.[0] ??
          "Исправьте данные формы и попробуйте ещё раз.",
      );
      return;
    }

    const requestPayload = validation.data;

    setIsCreating(true);
    setCreateError(null);
    setCreateFieldErrors({});

    try {
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      let payload: {
        ok?: boolean;
        error?: string;
        inviteLink?: string | null;
        temporaryPassword?: string | null;
        fieldErrors?: Record<string, string[]>;
      } | null = null;
      try {
        payload = (await response.json()) as { ok?: boolean; error?: string } | null;
      } catch {
        /* no-op */
      }

      if (!response.ok || !payload?.ok) {
        if (payload?.fieldErrors) {
          const roleError =
            payload.fieldErrors.role?.[0] ??
            payload.fieldErrors["role.code"]?.[0];
          setCreateFieldErrors({
            fullName: payload.fieldErrors.fullName?.[0],
            email: payload.fieldErrors.email?.[0],
            role: roleError,
          });
        }
        const firstFieldError =
          payload?.fieldErrors?.fullName?.[0] ??
          payload?.fieldErrors?.email?.[0] ??
          payload?.fieldErrors?.role?.[0] ??
          payload?.fieldErrors?.["role.code"]?.[0];
        throw new Error(
          payload?.error ??
            firstFieldError ??
            "Не удалось создать пользователя. Проверьте введённые данные.",
        );
      }

      router.refresh();
      setCreateSuccess({
        email: requestPayload.email,
        inviteLink: payload?.inviteLink ?? null,
        temporaryPassword: payload?.temporaryPassword ?? null,
      });
      setIsCreateDialogOpen(false);
      resetCreateForm();
    } catch (error) {
      console.error("[admin-users] create flow failed", error);
      setCreateError(
        error instanceof Error ? error.message : "Не удалось создать пользователя.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function handleManageOpen(user: AdminUserRecord) {
    if (!actorCanMutate) {
      return;
    }
    setResetPasswordState(DEFAULT_RESET_PASSWORD_STATE);
    setManageState({
      isOpen: true,
      user,
      status: user.status,
      roles: initializeRoleSelections(user),
      portals: initializePortalState(user),
      isSaving: false,
    });
    setManageError(null);
    resetDeleteState();
  }

  function toggleSimpleFilter<T>(
    value: T,
    setter: Dispatch<SetStateAction<Set<T>>>,
    enabled?: boolean,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      const shouldEnable = typeof enabled === "boolean" ? enabled : !next.has(value);
      if (shouldEnable) {
        next.add(value);
      } else {
        next.delete(value);
      }
      return next;
    });
  }

  const hasAdvancedFilters =
    roleFilters.size > 0 || portalFilters.size > 0 || statusFilters.size > 0;

  function clearAdvancedFilters() {
    setRoleFilters(new Set());
    setPortalFilters(new Set());
    setStatusFilters(new Set());
  }

  function resetDeleteState() {
    setDeleteState(DEFAULT_DELETE_STATE);
  }

  function toggleRole(role: AppRole) {
    setManageState((prev) => {
      const nextRoles = new Map(prev.roles);
      const current = nextRoles.get(role) ?? { selected: false, readOnly: false };
      const nextSelected = !current.selected;
      nextRoles.set(role, {
        selected: nextSelected,
        readOnly: nextSelected ? current.readOnly : false,
      });
      return { ...prev, roles: nextRoles };
    });
    setManageError(null);
  }

  function toggleRoleReadOnly(role: AppRole, readOnly: boolean) {
    setManageState((prev) => {
      const nextRoles = new Map(prev.roles);
      const current = nextRoles.get(role) ?? { selected: false, readOnly: false };
      nextRoles.set(role, {
        selected: current.selected,
        readOnly: current.selected ? readOnly : false,
      });
      return { ...prev, roles: nextRoles };
    });
  }

  function toggleUserSelection(userId: string) {
    setBulkDeleteState((prev) => {
      const nextSelected = new Set(prev.selectedUserIds);
      if (nextSelected.has(userId)) {
        nextSelected.delete(userId);
      } else {
        nextSelected.add(userId);
      }
      return { ...prev, selectedUserIds: nextSelected };
    });
  }

  function toggleSelectAll() {
    setBulkDeleteState((prev) => {
      const allUserIds = new Set(paginatedUsers.map((user) => user.id));
      const nextSelected = prev.selectedUserIds.size === paginatedUsers.length
        ? new Set<string>()
        : allUserIds;
      return { ...prev, selectedUserIds: nextSelected };
    });
  }

  function resetBulkDeleteState() {
    setBulkDeleteState(DEFAULT_BULK_DELETE_STATE);
  }

  async function handleBulkDeleteCheck() {
    if (bulkDeleteState.selectedUserIds.size === 0) {
      setBulkDeleteState((prev) => ({
        ...prev,
        error: "Выберите хотя бы одного пользователя для удаления.",
      }));
      return;
    }

    if (!actorCanMutate) {
      setBulkDeleteState((prev) => ({
        ...prev,
        error: "Your account is limited to read-only access.",
      }));
      return;
    }

    setBulkDeleteState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      // Check if all selected users can be deleted
      const userIds = Array.from(bulkDeleteState.selectedUserIds);
      const checkPromises = userIds.map(async (userId) => {
        const response = await fetch("/api/admin/users/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, intent: "check" }),
        });

        let payload: DeleteApiResponse | null = null;
        try {
          payload = (await response.json()) as DeleteApiResponse;
        } catch {
          payload = null;
        }

        return { userId, payload, response };
      });

      const results = await Promise.all(checkPromises);
      const allBlockers: DeleteBlocker[] = [];
      let canDeleteAll = true;

      for (const result of results) {
        const blockers = result.payload?.blockers ?? [];
        const canDelete = Boolean(result.payload?.canDelete) && result.response.ok;

        if (!canDelete && blockers.some((blocker) => blocker.count > 0)) {
          canDeleteAll = false;
        }

        allBlockers.push(...blockers);
      }

      if (!canDeleteAll) {
        throw new Error("Очистите связанные объекты перед удалением.");
      }

      setBulkDeleteState((prev) => ({
        ...prev,
        blockers: allBlockers,
        isDialogOpen: true,
        error: null,
      }));
    } catch (error) {
      setBulkDeleteState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Не удалось проверить возможность удаления.",
      }));
    } finally {
      setBulkDeleteState((prev) => ({ ...prev, isChecking: false }));
    }
  }

  function closeBulkDeleteDialog() {
    setBulkDeleteState((prev) => ({ ...prev, isDialogOpen: false, isDeleting: false }));
  }

  async function handleBulkDeleteConfirm() {
    if (bulkDeleteState.selectedUserIds.size === 0 || bulkDeleteState.isDeleting) {
      return;
    }

    if (!actorCanMutate) {
      setBulkDeleteState((prev) => ({
        ...prev,
        error: "Your account is limited to read-only access.",
      }));
      return;
    }

    setBulkDeleteState((prev) => ({ ...prev, isDeleting: true, error: null }));

    try {
      const userIds = Array.from(bulkDeleteState.selectedUserIds);
      const deletePromises = userIds.map(async (userId) => {
        const response = await fetch("/api/admin/users/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, intent: "delete" }),
        });

        let payload: DeleteApiResponse | null = null;
        try {
          payload = (await response.json()) as DeleteApiResponse;
        } catch {
          payload = null;
        }

        return { userId, payload, response };
      });

      const results = await Promise.all(deletePromises);
      let hasErrors = false;
      const errorMessages: string[] = [];

      for (const result of results) {
        if (!result.response.ok || !result.payload?.ok) {
          hasErrors = true;
          const message = resolveDeleteErrorMessage(result.payload, "Не удалось удалить пользователя.") ?? "Не удалось удалить пользователя.";
          errorMessages.push(message);
        }
      }

      if (hasErrors) {
        throw new Error(errorMessages.join("\n"));
      }

      // Remove deleted users from the list
      setUsers((prev) => prev.filter((user) => !bulkDeleteState.selectedUserIds.has(user.id)));

      // Add audit log entries for each deleted user
      const deletedUsers = users.filter((user) => bulkDeleteState.selectedUserIds.has(user.id));
      setAuditLog((prev) => [
        ...deletedUsers.map((user) =>
          makeAuditEntry(
            actorName,
            "Удалена учётная запись",
            user.email ?? user.fullName ?? user.id,
          ),
        ),
        ...prev,
      ]);

      router.refresh();
      resetBulkDeleteState();
      setManageError(null);
    } catch (error) {
      setBulkDeleteState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Не удалось удалить пользователей.",
        isDialogOpen: false,
      }));
    } finally {
      setBulkDeleteState((prev) => ({ ...prev, isDeleting: false }));
    }
  }

  function updatePortalAccess(portal: PortalCode, enabled: boolean) {
    setManageState((prev) => {
      const nextPortals = new Map(prev.portals);
      nextPortals.set(portal, enabled);
      return {
        ...prev,
        portals: nextPortals,
      };
    });
  }

  async function handleManageSave() {
    const targetUser = manageState.user;
    if (!targetUser) return;
    if (!actorCanMutate) {
      setManageError("Your account is limited to read-only access.");
      return;
    }
    const nextStatus = manageState.status;
    const selectedRoles = Array.from(manageState.roles.entries())
      .filter(([, state]) => state.selected)
      .map(([role, state]) => ({ role, readOnly: state.readOnly }));

    if (!selectedRoles.length) {
      setManageError("Назначьте минимум одну роль.");
      return;
    }

    setManageState((prev) => ({ ...prev, isSaving: true }));
    setManageError(null);

    try {
      const portalUpdates = Array.from(manageState.portals.entries()).map(
        ([portal, enabled]) => ({
          portal,
          status: enabled ? "active" : "inactive",
        }),
      );

      const response = await fetch("/api/admin/users/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: targetUser.id,
          status: nextStatus,
          roles: selectedRoles,
          portals: portalUpdates,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        roles?: Array<AppRole | { role: AppRole; readOnly?: boolean }>;
        status?: AdminUserStatus;
        portals?: { portal: PortalCode; status: string; last_access_at?: string | null }[];
        error?: string;
      };

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Не удалось сохранить изменения");
      }

      const normalizedAssignments = (payload.roles && payload.roles.length
        ? payload.roles
        : selectedRoles
      ).map((entry) => {
        if (typeof entry === "string") {
          return { role: entry as AppRole, readOnly: false };
        }
        return { role: entry.role, readOnly: Boolean(entry.readOnly) };
      });

      const persistedRoles = normalizedAssignments.map((assignment) => assignment.role);

      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== targetUser.id) return user;
          const updatedPortals =
            payload.portals?.map((portal) => ({
              portal: portal.portal,
              status: portal.status,
              lastAccessAt: portal.last_access_at ?? null,
            })) ??
            portalUpdates.map((portal) => ({
              portal: portal.portal,
              status: portal.status,
              lastAccessAt:
                user.portals?.find((summary) => summary.portal === portal.portal)
                  ?.lastAccessAt ?? null,
            }));

          return {
            ...user,
            roles: persistedRoles,
            roleAssignments: normalizedAssignments.map((assignment) => ({
              role: assignment.role,
              portal: resolvePortalForRole(assignment.role),
              isReadOnly: assignment.readOnly,
            })),
            portals: updatedPortals,
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
        roles: initializeRoleSelections(null),
        portals: initializePortalState(null),
        isSaving: false,
      });
      setResetPasswordState(DEFAULT_RESET_PASSWORD_STATE);
      setManageError(null);
    } catch (error) {
      console.error("[admin] Failed to update user access", error);
      setManageError(
        error instanceof Error ? error.message : "Не удалось сохранить изменения",
      );
      setManageState((prev) => ({ ...prev, isSaving: false }));
    }
  }

  async function handlePasswordReset() {
    const targetUser = manageState.user;
    if (!targetUser || resetPasswordState.isResetting) {
      return;
    }

    if (!actorCanMutate) {
      setResetPasswordState((prev) => ({
        ...prev,
        error: "Your account is limited to read-only access.",
      }));
      return;
    }

    setResetPasswordState({
      isResetting: true,
      temporaryPassword: null,
      error: null,
    });

    try {
      const response = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: targetUser.id }),
      });

      let payload: { ok?: boolean; temporaryPassword?: string | null; error?: string } | null =
        null;
      try {
        payload = (await response.json()) as {
          ok?: boolean;
          temporaryPassword?: string | null;
          error?: string;
        } | null;
      } catch {
        /* no-op */
      }

      if (!response.ok || !payload?.ok || !payload.temporaryPassword) {
        throw new Error(payload?.error ?? "Не удалось сбросить пароль.");
      }

      setResetPasswordState({
        isResetting: false,
        temporaryPassword: payload.temporaryPassword,
        error: null,
      });

      setAuditLog((prev) => [
        makeAuditEntry(
          actorName,
          "Сброшен пароль",
          targetUser.email ?? targetUser.fullName ?? targetUser.id,
        ),
        ...prev,
      ]);
    } catch (error) {
      setResetPasswordState({
        isResetting: false,
        temporaryPassword: null,
        error: error instanceof Error ? error.message : "Не удалось сбросить пароль.",
      });
    }
  }

  async function handleDeleteCheck() {
    const targetUser = manageState.user;
    if (!targetUser || deleteState.isChecking || deleteState.isDeleting) {
      return;
    }
    if (!actorCanMutate) {
      setDeleteState((prev) => ({
        ...prev,
        error: "Your account is limited to read-only access.",
      }));
      return;
    }

    setDeleteState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser.id, intent: "check" }),
      });

      let payload: DeleteApiResponse | null = null;
      try {
        payload = (await response.json()) as DeleteApiResponse;
      } catch {
        payload = null;
      }

      const blockers = payload?.blockers ?? [];
      const canDelete = Boolean(payload?.canDelete) && response.ok;
      const blockerError = !canDelete && blockers.some((blocker) => blocker.count > 0)
        ? "Очистите связанные объекты перед удалением."
        : resolveDeleteErrorMessage(payload);

      if (!response.ok && response.status !== 409) {
        throw new Error(blockerError ?? "Не удалось проверить возможность удаления.");
      }

      setDeleteState((prev) => ({
        ...prev,
        blockers,
        isDialogOpen: canDelete,
        error: blockerError,
      }));
    } catch (error) {
      setDeleteState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Не удалось проверить зависимости.",
      }));
    } finally {
      setDeleteState((prev) => ({ ...prev, isChecking: false }));
    }
  }

  function closeDeleteDialog() {
    setDeleteState((prev) => ({ ...prev, isDialogOpen: false, isDeleting: false }));
  }

  async function handleDeleteConfirm() {
    const targetUser = manageState.user;
    if (!targetUser || deleteState.isDeleting) {
      return;
    }
    if (!actorCanMutate) {
      setDeleteState((prev) => ({
        ...prev,
        error: "Your account is limited to read-only access.",
      }));
      return;
    }

    setDeleteState((prev) => ({ ...prev, isDeleting: true, error: null }));

    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser.id, intent: "delete" }),
      });

      let payload: DeleteApiResponse | null = null;
      try {
        payload = (await response.json()) as DeleteApiResponse;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        const blockers = payload?.blockers ?? [];
        const message = resolveDeleteErrorMessage(payload, "Не удалось удалить пользователя.");
        setDeleteState((prev) => ({
          ...prev,
          blockers: blockers.length ? blockers : prev.blockers,
          error: message,
          isDialogOpen: false,
        }));
        return;
      }

      setUsers((prev) => prev.filter((user) => user.id !== targetUser.id));
      setAuditLog((prev) => [
        makeAuditEntry(
          actorName,
          "Удалена учётная запись",
          targetUser.email ?? targetUser.fullName ?? targetUser.id,
        ),
        ...prev,
      ]);
      router.refresh();
      resetDeleteState();
      setManageError(null);
      setManageState({
        isOpen: false,
        user: null,
        status: "active",
        roles: initializeRoleSelections(null),
        portals: initializePortalState(null),
        isSaving: false,
      });
      setResetPasswordState(DEFAULT_RESET_PASSWORD_STATE);
    } catch (error) {
      setDeleteState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Не удалось удалить пользователя.",
        isDialogOpen: false,
      }));
    } finally {
      setDeleteState((prev) => ({ ...prev, isDeleting: false }));
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
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={
                    isRolesMode
                      ? "Search members within selected role"
                      : "Search name, email, or role"
                  }
                  className="h-10 w-full rounded-xl pl-9 pr-4"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {!isRolesMode && bulkDeleteState.selectedUserIds.size > 0 ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-xl"
                    onClick={handleBulkDeleteCheck}
                    disabled={bulkDeleteState.isChecking || actorIsReadOnly}
                    title={actorIsReadOnly ? readOnlyTooltip : undefined}
                  >
                    {bulkDeleteState.isChecking ? (
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
                        Checking...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Selected ({bulkDeleteState.selectedUserIds.size})
                      </span>
                    )}
                  </Button>
                ) : null}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Roles {roleFilters.size ? `(${roleFilters.size})` : ""}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-xl">
                    <p className="mb-2 text-sm font-semibold">Filter by role</p>
                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {AVAILABLE_ROLES.map((role) => (
                        <label
                          key={`filter-role-${role}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={roleFilters.has(role)}
                            onCheckedChange={(checked) =>
                              toggleSimpleFilter(role, setRoleFilters, checked === true)
                            }
                          />
                          <span>{ROLE_LABELS[role]}</span>
                        </label>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3 h-8 rounded-xl text-xs"
                      onClick={() => setRoleFilters(new Set())}
                      disabled={roleFilters.size === 0}
                    >
                      Clear
                    </Button>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Portals {portalFilters.size ? `(${portalFilters.size})` : ""}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-xl">
                    <p className="mb-2 text-sm font-semibold">Filter by portal</p>
                    <div className="space-y-2">
                      {PORTAL_LIST.map((portal) => (
                        <label
                          key={`filter-portal-${portal}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={portalFilters.has(portal)}
                            onCheckedChange={(checked) =>
                              toggleSimpleFilter(portal, setPortalFilters, checked === true)
                            }
                          />
                          <span>{PORTAL_DEFINITIONS[portal].label}</span>
                        </label>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3 h-8 rounded-xl text-xs"
                      onClick={() => setPortalFilters(new Set())}
                      disabled={portalFilters.size === 0}
                    >
                      Clear
                    </Button>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Status {statusFilters.size ? `(${statusFilters.size})` : ""}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-xl">
                    <p className="mb-2 text-sm font-semibold">Filter by status</p>
                    <div className="space-y-2">
                      {STATUS_FILTER_VALUES.map((status) => (
                        <label
                          key={`filter-status-${status}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={statusFilters.has(status)}
                            onCheckedChange={(checked) =>
                              toggleSimpleFilter(status, setStatusFilters, checked === true)
                            }
                          />
                          <span>{STATUS_META[status].label}</span>
                        </label>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3 h-8 rounded-xl text-xs"
                      onClick={() => setStatusFilters(new Set())}
                      disabled={statusFilters.size === 0}
                    >
                      Clear
                    </Button>
                  </PopoverContent>
                </Popover>
                {hasAdvancedFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={clearAdvancedFilters}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reset filters
                  </Button>
                ) : null}
              </div>
            </div>
            {!isRolesMode ? (
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                  setIsCreateDialogOpen(open);
                  if (!open) {
                    setIsCreating(false);
                    resetCreateForm();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="rounded-xl"
                    disabled={actorIsReadOnly}
                    title={actorIsReadOnly ? readOnlyTooltip : undefined}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add user
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg rounded-3xl p-0">
                  <form className="flex max-h-[90vh] flex-col" onSubmit={handleCreateSubmit}>
                    <DialogHeader className="space-y-2 px-6 pt-6">
                      <DialogTitle>Create user</DialogTitle>
                      <DialogDescription>
                        Issue an invitation and assign initial access roles.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-full-name">Full name</Label>
                        <Input
                          id="create-full-name"
                          value={createForm.fullName}
                          onChange={(event) =>
                            setCreateForm((prev) => ({ ...prev, fullName: event.target.value }))
                          }
                          placeholder="Lina Admin"
                          className="rounded-xl"
                          aria-invalid={Boolean(createFieldErrors.fullName)}
                        />
                        {createFieldErrors.fullName ? (
                          <p className="text-xs text-destructive" role="alert">
                            {createFieldErrors.fullName}
                          </p>
                        ) : null}
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
                          placeholder="user@fastlease.ae"
                          className="rounded-xl"
                          aria-invalid={Boolean(createFieldErrors.email)}
                        />
                        {createFieldErrors.email ? (
                          <p className="text-xs text-destructive" role="alert">
                            {createFieldErrors.email}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-role">Role</Label>
                        <Select
                          value={createForm.role}
                          onValueChange={(value) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              role: value as AppRole,
                            }))
                          }
                        >
                          <SelectTrigger
                            id="create-role"
                            className="h-10"
                            aria-invalid={Boolean(createFieldErrors.role)}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {createFieldErrors.role ? (
                          <p className="text-xs text-destructive" role="alert">
                            {createFieldErrors.role}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-3">
                        <div className="pr-4">
                          <p className="text-sm font-medium text-foreground">Read-only role</p>
                          <p className="text-xs text-muted-foreground">
                            Users can browse data but cannot create or edit records.
                          </p>
                        </div>
                        <Switch
                          checked={createForm.readOnly}
                          onCheckedChange={(checked) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              readOnly: Boolean(checked),
                            }))
                          }
                          aria-label="Toggle read-only role"
                        />
                      </div>
                      <label className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                        <Checkbox
                          checked={createForm.sendInvite}
                          onCheckedChange={(checked) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              sendInvite: Boolean(checked),
                            }))
                          }
                        />
                        Send invitation email
                      </label>
                      {createError ? (
                        <p className="text-sm text-destructive" role="alert">
                          {createError}
                        </p>
                      ) : null}
                    </div>
                    <DialogFooter>
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
                      <Button
                        type="submit"
                        className="rounded-xl"
                        disabled={isCreating || !isCreateFormValid}
                      >
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
        {actorIsReadOnly ? (
          <CardContent className="pt-0">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
              Your current role is read-only. Invites, edits, and deletions are disabled until an administrator grants broader access.
            </div>
          </CardContent>
        ) : null}
        {createSuccess ? (
          <div className="px-4 pt-2 sm:px-8">
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium">
                  User {createSuccess.email} created. Share the details below with them.
                </p>
                {createSuccess.inviteLink ? (
                  <p className="mt-2 break-words text-xs text-emerald-900/80 dark:text-emerald-100/80">
                    Invite link:{" "}
                    <span className="font-mono">{createSuccess.inviteLink}</span>
                  </p>
                ) : null}
                {createSuccess.temporaryPassword ? (
                  <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                    Temporary password:{" "}
                    <span className="font-mono">{createSuccess.temporaryPassword}</span>
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="self-end rounded-xl text-emerald-900 hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-500/20"
                onClick={() => setCreateSuccess(null)}
              >
                Hide
              </Button>
            </div>
          </div>
        ) : null}
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
        <CardContent className="p-0">
            <Table className="min-w-[1000px]" containerClassName="border-0 rounded-none">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={bulkDeleteState.selectedUserIds.size === paginatedUsers.length && paginatedUsers.length > 0}
                      onCheckedChange={toggleSelectAll}
                      disabled={actorIsReadOnly || paginatedUsers.length === 0}
                      title={actorIsReadOnly ? readOnlyTooltip : undefined}
                    />
                  </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("employee")}
                    className="inline-flex items-center gap-1 rounded-lg text-left font-medium text-foreground transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {isRolesMode ? "Member" : "Employee"}
                    {renderSortIcon("employee")}
                    <span className="sr-only">
                      {sortState.column === "employee"
                        ? `Sorted ${sortState.direction === "asc" ? "ascending" : "descending"}`
                        : "Not sorted"}
                    </span>
                  </button>
                </TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Portals</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("lastLogin")}
                    className="inline-flex items-center gap-1 rounded-lg text-left font-medium text-foreground transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    Last login
                    {renderSortIcon("lastLogin")}
                    <span className="sr-only">
                      {sortState.column === "lastLogin"
                        ? `Sorted ${sortState.direction === "asc" ? "ascending" : "descending"}`
                        : "Not sorted"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => {
                const statusMeta = STATUS_META[user.status];
                const primaryEmail =
                  typeof user.email === "string" &&
                  user.email.trim().length > 0 &&
                  user.email !== "—"
                    ? user.email.trim()
                    : null;
                const readOnlyRoleSet = new Set(
                  (user.roleAssignments ?? [])
                    .filter((assignment) => assignment.isReadOnly)
                    .map((assignment) => assignment.role),
                );
                return (
                  <TableRow key={user.id} className="align-top">
                    <TableCell>
                      <Checkbox
                        checked={bulkDeleteState.selectedUserIds.has(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                        disabled={actorIsReadOnly}
                        title={actorIsReadOnly ? readOnlyTooltip : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium leading-tight">{user.fullName}</p>
                        <div className="text-sm text-muted-foreground">
                          {primaryEmail ? (
                            <a
                              href={`mailto:${primaryEmail}`}
                              className="hover:text-brand-600 hover:underline"
                            >
                              {primaryEmail}
                            </a>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <Badge
                            variant={statusMeta.badgeVariant}
                            className="rounded-xl px-3 py-1"
                          >
                            {statusMeta.label}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 py-1">
                        {user.roles.map((role: AppRole) => {
                          const isReadOnly = readOnlyRoleSet.has(role);
                          return (
                            <div key={`${user.id}-${role}`} className="flex items-center gap-2">
                              <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>
                              {isReadOnly ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-xl border-dashed px-2 py-0.5 text-[11px] uppercase tracking-wide"
                                >
                                  Read-only
                                </Badge>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 py-1">
                        {PORTAL_LIST.map((portal) => {
                          const summary = user.portals?.find((entry) => entry.portal === portal);
                          const enabled = summary ? summary.status !== "inactive" : false;
                          return (
                            <Badge
                              key={`${user.id}-${portal}`}
                              variant={enabled ? "secondary" : "outline"}
                              className="rounded-xl px-3 py-1 text-xs"
                            >
                              {PORTAL_DEFINITIONS[portal].label}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{formatDateTime(user.lastLoginAt)}</p>
                      {user.invitationSentAt ? (
                        <p className="text-xs text-muted-foreground">
                          Invited {formatDateTime(user.invitationSentAt)}
                        </p>
                      ) : null}
                      {user.loginEvents && user.loginEvents.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 rounded-lg px-2 py-1 text-xs"
                            >
                              <History className="mr-1 h-3.5 w-3.5" />
                              View history
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 rounded-2xl border border-border bg-card/90 shadow-xl">
                            <div className="space-y-2">
                              {user.loginEvents.slice(0, 5).map((event, index) => (
                                <div
                                  key={`${user.id}-login-${index}`}
                                  className="rounded-xl border border-border/60 px-3 py-2 text-sm"
                                >
                                  <p className="font-medium">
                                    {PORTAL_DEFINITIONS[event.portal].label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {event.status === "success" ? "Success" : "Failure"}
                                    {" · "}
                                    {formatDateTime(event.occurredAt)}
                                  </p>
                                  {event.errorCode ? (
                                    <p className="text-xs text-red-500">
                                      Error: {event.errorCode}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => handleManageOpen(user)}
                        disabled={actorIsReadOnly}
                        title={actorIsReadOnly ? readOnlyTooltip : undefined}
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
                  <TableCell colSpan={6}>
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
        {showPaginationFooter ? (
          <CardContent className="border-t border-border/60 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {pageStart.toLocaleString("en-US")}–{pageEnd.toLocaleString("en-US")} of {" "}
                {totalUsers.toLocaleString("en-US")} {isRolesMode ? "members" : "users"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Rows per page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => setPageSize(Number(value))}
                  >
                    <SelectTrigger className="h-9 w-[84px] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end" className="rounded-2xl">
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={`page-size-${size}`} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safePage === 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safePage === totalPages}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        ) : null}
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
            resetDeleteState();
            setResetPasswordState(DEFAULT_RESET_PASSWORD_STATE);
            return {
              isOpen: false,
              user: null,
              status: "active",
              roles: initializeRoleSelections(null),
              portals: initializePortalState(null),
              isSaving: false,
            };
          })
        }
      >
        <DialogContent className="max-w-2xl rounded-3xl p-0 md:max-h-[90vh]">
          <div className="flex max-h-[90vh] flex-col">
            <DialogHeader className="space-y-2 px-6 pt-6">
              <DialogTitle>Manage access</DialogTitle>
              <DialogDescription>
                Configure RBAC policies and role assignments for the selected account.
              </DialogDescription>
            </DialogHeader>
            {manageState.user ? (
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
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
                  <Label htmlFor="manage-email">Email</Label>
                  <Input
                    id="manage-email"
                    value={manageState.user.email ?? ""}
                    readOnly
                    disabled
                    className="h-10 bg-muted/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manage-status">Status</Label>
                  <Select
                    value={manageState.status}
                    onValueChange={(value) =>
                      setManageState((prev) => {
                        if (!actorCanMutate) {
                          return prev;
                        }
                        return {
                          ...prev,
                          status: value as AdminUserStatus,
                        };
                      })
                    }
                  >
                    <SelectTrigger
                      id="manage-status"
                      className="h-10"
                      disabled={actorIsReadOnly}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Invitation sent</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="archived">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Roles</Label>
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                    {AVAILABLE_ROLES.map((role) => {
                      const selection = manageState.roles.get(role);
                      const checked = selection?.selected ?? false;
                      const readOnly = selection?.readOnly ?? false;
                      return (
                        <div
                          key={`role-${role}`}
                          className={`rounded-2xl border px-4 py-3 text-sm transition ${
                            checked
                              ? "border-brand-500 bg-brand-50 dark:border-brand-400/60 dark:bg-brand-500/10"
                              : "border-border bg-card/60 hover:border-brand-400/80"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleRole(role)}
                            className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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
                          <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-border/60 bg-background/60 px-3 py-2 text-xs">
                            <span className="text-muted-foreground">Read-only</span>
                            <Switch
                              checked={readOnly}
                              disabled={!checked || !actorCanMutate}
                              onCheckedChange={(state) => toggleRoleReadOnly(role, Boolean(state))}
                              aria-label={`Toggle read-only for ${ROLE_LABELS[role]}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Portal access</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PORTAL_LIST.map((portal) => {
                      const definition = PORTAL_DEFINITIONS[portal];
                      const enabled = manageState.portals.get(portal) ?? false;
                      return (
                        <div
                          key={`portal-${portal}`}
                          className="flex items-center justify-between rounded-2xl border border-border bg-card/60 px-4 py-3"
                        >
                          <div className="pr-4">
                            <p className="text-sm font-medium text-foreground">
                              {definition.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {definition.description}
                            </p>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => {
                              if (!actorCanMutate) {
                                return;
                              }
                              updatePortalAccess(portal, Boolean(checked));
                            }}
                            disabled={actorIsReadOnly}
                            aria-label={`Toggle ${definition.label}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Пароль доступа</p>
                      <p className="text-xs text-muted-foreground">
                        Сгенерируйте временный пароль и передайте его пользователю.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={handlePasswordReset}
                      disabled={
                        !manageState.user ||
                        resetPasswordState.isResetting ||
                        actorIsReadOnly
                      }
                      title={actorIsReadOnly ? readOnlyTooltip : undefined}
                    >
                      {resetPasswordState.isResetting ? (
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
                          Сбрасываем...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4" />
                          Сбросить пароль
                        </span>
                      )}
                    </Button>
                  </div>
                  {resetPasswordState.error ? (
                    <p className="text-xs text-destructive">{resetPasswordState.error}</p>
                  ) : null}
                  {resetPasswordState.temporaryPassword ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
                      <p className="text-sm font-semibold">Временный пароль</p>
                      <p className="mt-1 font-mono text-sm">
                        {resetPasswordState.temporaryPassword}
                      </p>
                      <p className="mt-1 text-[11px] text-emerald-900/80 dark:text-emerald-100/80">
                        Скопируйте и передайте пользователю. Пароль показывается один раз.
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        Опасная зона
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isSelfTarget
                          ? "Нельзя удалить собственную учётную запись."
                          : "Удаление необратимо и потребует повторного подтверждения."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-xl"
                      onClick={handleDeleteCheck}
                      disabled={
                        !manageState.user ||
                        deleteState.isChecking ||
                        deleteState.isDeleting ||
                        isSelfTarget ||
                        actorIsReadOnly
                      }
                      title={actorIsReadOnly ? readOnlyTooltip : undefined}
                    >
                      {deleteState.isChecking ? "Проверяем..." : "Удалить пользователя"}
                    </Button>
                  </div>
                  {activeDeleteBlockers.length ? (
                    <div className="rounded-xl bg-background/80 p-3 text-xs text-destructive">
                      <p className="font-medium">Очистите связанные объекты:</p>
                      <ul className="mt-2 space-y-1">
                        {activeDeleteBlockers.map((blocker) => (
                          <li
                            key={blocker.type}
                            className="flex items-center justify-between gap-3"
                          >
                            <span>{blocker.label}</span>
                            <span className="font-semibold">{blocker.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {deleteState.error ? (
                    <p className="text-xs text-destructive">{deleteState.error}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex-1 px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Select a user from the table to manage their permissions.
                </p>
              </div>
            )}
            <DialogFooter className="gap-3 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  {
                    resetDeleteState();
                    setResetPasswordState(DEFAULT_RESET_PASSWORD_STATE);
                    setManageState({
                      isOpen: false,
                      user: null,
                      status: "active",
                      roles: initializeRoleSelections(null),
                      portals: initializePortalState(null),
                      isSaving: false,
                    });
                  }
                }
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                onClick={handleManageSave}
                disabled={manageState.isSaving || !actorCanMutate}
                title={!actorCanMutate ? readOnlyTooltip : undefined}
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
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteState.isDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDeleteDialog();
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Удалить пользователя</DialogTitle>
            <DialogDescription>
              Эта операция удалит учётную запись из Supabase Auth и всех связанных справочников.
              Восстановление будет невозможно.
            </DialogDescription>
          </DialogHeader>
          {manageState.user ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-semibold text-foreground">
                  {manageState.user.fullName}
                </p>
                <p className="text-xs text-muted-foreground">{manageState.user.email}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Назначенные роли, порталы и профиль будут очищены автоматически после подтверждения.
              </p>
              {deleteState.error ? (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {deleteState.error}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={closeDeleteDialog}
              disabled={deleteState.isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              onClick={handleDeleteConfirm}
              disabled={deleteState.isDeleting || actorIsReadOnly}
              title={actorIsReadOnly ? readOnlyTooltip : undefined}
            >
              {deleteState.isDeleting ? (
                "Удаляем..."
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={bulkDeleteState.isDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeBulkDeleteDialog();
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Удалить выбранных пользователей</DialogTitle>
            <DialogDescription>
              Эта операция удалит {bulkDeleteState.selectedUserIds.size} учётных записей из Supabase Auth и всех связанных справочников.
              Восстановление будет невозможно.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Назначенные роли, порталы и профили будут очищены автоматически после подтверждения.
            </p>
            {bulkDeleteState.error ? (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {bulkDeleteState.error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={closeBulkDeleteDialog}
              disabled={bulkDeleteState.isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              onClick={handleBulkDeleteConfirm}
              disabled={bulkDeleteState.isDeleting || actorIsReadOnly}
              title={actorIsReadOnly ? readOnlyTooltip : undefined}
            >
              {bulkDeleteState.isDeleting ? (
                "Удаляем..."
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Удалить ({bulkDeleteState.selectedUserIds.size})
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
