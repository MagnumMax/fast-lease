import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export type WorkspaceTask = {
  id: string;
  title: string;
  type: string;
  status: string;
  assigneeRole: string | null;
  assigneeUserId: string | null;
  slaDueAt: string | null;
  completedAt: string | null;
  slaStatus: "ON_TRACK" | "WARNING" | "BREACHED" | null;
  dealId: string | null;
  dealNumber: string | null;
  dealClientName: string | null;
  dealVehicleName: string | null;
  isWorkflow: boolean;
  workflowStageKey: string | null;
  workflowStageTitle: string | null;
  createdAt: string;
  updatedAt: string;
  fields: Record<string, unknown>;
  payload: Record<string, unknown>;
};

type TaskDealRelation = {
  id: string;
  deal_number: string | null;
  payload: Record<string, unknown> | null;
};

type TaskRow = {
  id: string;
  deal_id: string | null;
  type: string;
  title: string;
  status: string;
  assignee_role: string | null;
  assignee_user_id: string | null;
  sla_due_at: string | null;
  completed_at: string | null;
  sla_status: "ON_TRACK" | "WARNING" | "BREACHED" | null;
  payload: Record<string, unknown> | null;
  action_hash: string | null;
  created_at: string;
  updated_at: string;
  deals: TaskDealRelation | TaskDealRelation[] | null;
};

export const TASK_SELECT =
  "id, deal_id, type, title, status, assignee_role, assignee_user_id, sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at, deals:deal_id (id, deal_number, payload)";

function resolveDealCustomerName(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const customer = payload["customer"];
  if (customer && typeof customer === "object" && !Array.isArray(customer)) {
    const customerRecord = customer as Record<string, unknown>;
    const keys = ["full_name", "name", "title"];
    for (const key of keys) {
      const value = customerRecord[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
  }
  return null;
}

function resolveDealVehicleName(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const vehicle = payload["vehicle"];
  if (vehicle && typeof vehicle === "object" && !Array.isArray(vehicle)) {
    const vehicleRecord = vehicle as Record<string, unknown>;
    const make = vehicleRecord["make"];
    const model = vehicleRecord["model"];
    if (typeof make === "string" && make.trim().length > 0 && typeof model === "string" && model.trim().length > 0) {
      return `${make} ${model}`.trim();
    }
    const name = vehicleRecord["name"];
    if (typeof name === "string" && name.trim().length > 0) {
      return name;
    }
    const meta = vehicleRecord["meta"];
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const label = (meta as Record<string, unknown>)["title"] ?? (meta as Record<string, unknown>)["name"];
      if (typeof label === "string" && label.trim().length > 0) {
        return label;
      }
    }
  }
  return null;
}

export function mapTaskRow(row: TaskRow): WorkspaceTask {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const statusBranch =
    typeof payload.status === "object" && payload.status !== null && !Array.isArray(payload.status)
      ? (payload.status as Record<string, unknown>)
      : undefined;
  const fields =
    typeof payload.fields === "object" && payload.fields !== null && !Array.isArray(payload.fields)
      ? (payload.fields as Record<string, unknown>)
      : {};

  const workflowStageKey =
    typeof payload.status_key === "string"
      ? payload.status_key
      : typeof statusBranch?.key === "string"
        ? (statusBranch.key as string)
        : null;

  const workflowStageTitle =
    typeof payload.status_title === "string"
      ? payload.status_title
      : typeof statusBranch?.title === "string"
        ? (statusBranch.title as string)
        : null;

  const dealRef = Array.isArray(row.deals) ? row.deals[0] ?? null : row.deals;
  const dealPayload =
    dealRef && dealRef.payload && typeof dealRef.payload === "object" && !Array.isArray(dealRef.payload)
      ? (dealRef.payload as Record<string, unknown>)
      : null;

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    assigneeRole: row.assignee_role,
    assigneeUserId: row.assignee_user_id,
    slaDueAt: row.sla_due_at,
    completedAt: row.completed_at,
    slaStatus: row.sla_status,
    dealId: row.deal_id,
    dealNumber: dealRef?.deal_number ?? null,
    dealClientName: resolveDealCustomerName(dealPayload),
    dealVehicleName: resolveDealVehicleName(dealPayload),
    isWorkflow: Boolean(row.action_hash),
    workflowStageKey,
    workflowStageTitle,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fields,
    payload,
  };
}

export type WorkspaceTaskFilters = {
  limit?: number;
  workflowOnly?: boolean;
  assigned?: "me" | "role";
  status?: string;
  type?: string;
  dealId?: string;
  assigneeRole?: string;
  assigneeUserId?: string;
};

export async function getWorkspaceTasks(
  filters: WorkspaceTaskFilters = {},
): Promise<WorkspaceTask[]> {
  const {
    limit = 200,
    workflowOnly,
    assigned,
    status,
    type,
    dealId,
    assigneeRole,
    assigneeUserId,
  } = filters;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .order("sla_due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }
  if (type) {
    query = query.eq("type", type);
  }
  if (dealId) {
    query = query.eq("deal_id", dealId);
  }
  if (assigneeRole) {
    query = query.eq("assignee_role", assigneeRole);
  }
  if (assigneeUserId) {
    query = query.eq("assignee_user_id", assigneeUserId);
  }
  if (workflowOnly) {
    query = query.not("action_hash", "is", null);
  }

  if (assigned) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return [];
    }
    if (assigned === "me") {
      query = query.eq("assignee_user_id", sessionUser.user.id);
    } else if (assigned === "role") {
      if (!sessionUser.primaryRole) {
        return [];
      }
      query = query.eq("assignee_role", sessionUser.primaryRole);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[workspace-tasks] failed to load tasks", error);
    return [];
  }

  const rows = (data ?? []) as unknown as TaskRow[];
  return rows.map(mapTaskRow);
}

export async function getWorkspaceTaskById(id: string): Promise<WorkspaceTask | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[workspace-tasks] failed to load task by id", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapTaskRow(data as TaskRow);
}
