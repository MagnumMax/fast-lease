import type { AppRole } from "@/lib/auth/types";

type RecordLike = Record<string, unknown>;

const NESTED_ASSIGNMENT_KEYS = [
  "assignments",
  "assignees",
  "roleAssignments",
  "role_assignments",
  "workflowAssignments",
  "workflow_assignments",
  "guardAssignments",
  "guard_assignments",
];

function isRecord(value: unknown): value is RecordLike {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toCamelCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function extractUserId(candidate: unknown): string | null {
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(candidate)) {
    for (const entry of candidate) {
      const resolved = extractUserId(entry);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }

  if (!isRecord(candidate)) {
    return null;
  }

  const keys = ["user_id", "userId", "id", "assignee_user_id", "assigneeUserId"];
  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function lookupUserIdInSource(source: RecordLike, roleKey: string): string | null {
  const variants = [
    roleKey,
    roleKey.toUpperCase(),
    roleKey.toLowerCase(),
    toCamelCase(roleKey),
  ];

  for (const key of variants) {
    if (!(key in source)) {
      continue;
    }
    const candidate = extractUserId(source[key]);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function resolveFromAssignments(container: unknown, roleKey: string): string | null {
  if (isRecord(container)) {
    return lookupUserIdInSource(container, roleKey);
  }

  if (Array.isArray(container)) {
    for (const entry of container) {
      if (!isRecord(entry)) {
        continue;
      }
      const entryRole = entry.role ?? entry.role_code ?? entry.roleCode;
      if (typeof entryRole === "string" && entryRole.toUpperCase() !== roleKey.toUpperCase()) {
        continue;
      }
      const candidate = extractUserId(entry);
      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

export type TaskAssigneeResolutionInput = {
  role: AppRole;
  deal?: {
    op_manager_id?: string | null;
    [key: string]: unknown;
  };
  payloadSources?: Array<Record<string, unknown> | null | undefined>;
  actor?: {
    role?: AppRole;
    id?: string | null | undefined;
  };
};

export function resolveTaskAssigneeUserId(input: TaskAssigneeResolutionInput): string | null {
  const normalizedRole = input.role.toUpperCase();
  const payloadSources = input.payloadSources ?? [];

  for (const payload of payloadSources) {
    if (!isRecord(payload)) {
      continue;
    }

    const direct = lookupUserIdInSource(payload, normalizedRole);
    if (direct) {
      return direct;
    }

    for (const key of NESTED_ASSIGNMENT_KEYS) {
      if (!(key in payload)) {
        continue;
      }
      const candidate = resolveFromAssignments(payload[key], normalizedRole);
      if (candidate) {
        return candidate;
      }
    }
  }

  if (
    normalizedRole === "OP_MANAGER" &&
    typeof input.deal?.op_manager_id === "string" &&
    input.deal.op_manager_id.trim().length > 0
  ) {
    return input.deal.op_manager_id;
  }

  if (
    input.actor?.role &&
    input.actor.role.toUpperCase() === normalizedRole &&
    typeof input.actor.id === "string" &&
    input.actor.id.trim().length > 0
  ) {
    return input.actor.id;
  }

  return null;
}
