import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export type WorkspaceTask = {
  id: string;
  title: string;
  type: string;
  status: string;
  assigneeRole: string | null;
  assigneeUserId: string | null;
  assigneeFullName: string | null;
  assigneePhone: string | null;
  assigneeEmail: string | null;
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
  assigneeFullName: null,
  assigneePhone: null,
  assigneeEmail: null,
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

function resolveProfileFullName(row: {
  user_id: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string | null {
  const fullName = typeof row.full_name === "string" ? row.full_name.trim() : "";
  if (fullName.length > 0) return fullName;

  const first = typeof row.first_name === "string" ? row.first_name.trim() : "";
  const last = typeof row.last_name === "string" ? row.last_name.trim() : "";
  const combined = [first, last].filter(Boolean).join(" ").trim();
  return combined.length > 0 ? combined : null;
}

export async function hydrateTaskAssigneeNames(
  tasks: WorkspaceTask[],
  supabaseClient?: SupabaseClient,
): Promise<WorkspaceTask[]> {
  const uniqueIds = Array.from(
    new Set(
      tasks
        .map((task) => task.assigneeUserId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (uniqueIds.length === 0) {
    return tasks;
  }

  const nameMap = new Map<string, string>();
  const phoneMap = new Map<string, string>();
  const emailMap = new Map<string, string>();

  // 1) Основной источник — auth.users
  try {
    const serviceClient = await createSupabaseServiceClient();
    const { data: authRows, error: authError } = await serviceClient
      .from("auth.users")
      .select("id, email, phone, raw_user_meta_data, user_metadata")
      .in("id", uniqueIds);

    if (!authError && Array.isArray(authRows)) {
      authRows.forEach(
        (row: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          raw_user_meta_data?: Record<string, unknown> | null;
          user_metadata?: Record<string, unknown> | null;
        }) => {
          if (!row.id) return;
          const meta =
            (row.raw_user_meta_data && typeof row.raw_user_meta_data === "object"
              ? row.raw_user_meta_data
              : null) ||
            (row.user_metadata && typeof row.user_metadata === "object" ? row.user_metadata : null);

          const metaEmailCandidates = ["email", "contact_email", "work_email", "primary_email", "notification_email"];
          const metaPhoneCandidates = ["phone", "contact_phone", "work_phone"];

          const metaNameCandidates = ["full_name", "name", "title"];
          const metaFirst = typeof meta?.["first_name"] === "string" ? meta["first_name"]?.toString().trim() : "";
          const metaLast = typeof meta?.["last_name"] === "string" ? meta["last_name"]?.toString().trim() : "";

          let metaName: string | null = null;
          for (const key of metaNameCandidates) {
            const val = meta?.[key];
            if (typeof val === "string" && val.trim().length > 0) {
              metaName = val.trim();
              break;
            }
          }
          if (!metaName) {
            const combined = [metaFirst, metaLast].filter(Boolean).join(" ").trim();
            metaName = combined.length > 0 ? combined : null;
          }

          const email =
            typeof row.email === "string" && row.email.trim().length > 0
              ? row.email.trim()
              : metaEmailCandidates
                  .map((key) => (typeof meta?.[key] === "string" ? (meta[key] as string).trim() : ""))
                  .find((val) => val.length > 0) || null;

          const phone =
            typeof row.phone === "string" && row.phone.trim().length > 0
              ? row.phone.trim()
              : metaPhoneCandidates
                  .map((key) => (typeof meta?.[key] === "string" ? (meta[key] as string).trim() : ""))
                  .find((val) => val.length > 0) || null;

          if (metaName) nameMap.set(row.id, metaName);
          if (phone) phoneMap.set(row.id, phone);
          if (email) emailMap.set(row.id, email);
        },
      );
    } else if (authError) {
      console.info("[workspace-tasks] auth.users lookup failed:", authError.message ?? authError);
    }
  } catch (err) {
    console.info("[workspace-tasks] auth.users service lookup unavailable:", err);
  }

  // 2) Фолбэк — profiles (если чего-то не хватает)
  const supabase = supabaseClient ?? (await createSupabaseServerClient());
  const needProfile = uniqueIds.filter(
    (id) => !nameMap.has(id) || !phoneMap.has(id) || !emailMap.has(id),
  );

  if (needProfile.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, first_name, last_name, phone, metadata")
      .in("user_id", needProfile);

    if (error) {
      console.error("[workspace-tasks] failed to load assignee profiles", error);
    } else {
      (data ?? []).forEach((row) => {
        const userId = (row as { user_id?: string }).user_id;
        if (!userId) return;

        const name = resolveProfileFullName(row as unknown as {
          user_id: string;
          full_name: string | null;
          first_name?: string | null;
          last_name?: string | null;
        });

        const phone =
          typeof (row as { phone?: unknown }).phone === "string"
            ? ((row as { phone?: string }).phone ?? "").trim()
            : "";
        const metadata =
          row && typeof (row as { metadata?: unknown }).metadata === "object" && !Array.isArray((row as { metadata?: unknown }).metadata)
            ? ((row as { metadata?: Record<string, unknown> | null }).metadata as Record<string, unknown>)
            : null;
        const metadataEmailCandidates = ["ops_email", "work_email", "email", "contact_email", "primary_email", "notification_email"];
        const metadataPhoneCandidates = ["ops_phone", "work_phone", "phone", "contact_phone"];
        let metaEmail: string | null = null;
        let metaPhone: string | null = null;
        if (metadata) {
          for (const key of metadataEmailCandidates) {
            const value = metadata[key];
            if (typeof value === "string" && value.trim().length > 0) {
              metaEmail = value.trim();
              break;
            }
          }
          for (const key of metadataPhoneCandidates) {
            const value = metadata[key];
            if (typeof value === "string" && value.trim().length > 0) {
              metaPhone = value.trim();
              break;
            }
          }
        }

        if (!nameMap.has(userId) && name) {
          nameMap.set(userId, name);
        }
        if (!phoneMap.has(userId) && phone.length > 0) {
          phoneMap.set(userId, phone);
        }
        if (!phoneMap.has(userId) && metaPhone) {
          phoneMap.set(userId, metaPhone);
        }
        if (!emailMap.has(userId) && metaEmail) {
          emailMap.set(userId, metaEmail);
        }
      });
    }
  }

  return tasks.map((task) => {
    const nextName = task.assigneeUserId ? nameMap.get(task.assigneeUserId) ?? null : null;
    const nextPhone = task.assigneeUserId ? phoneMap.get(task.assigneeUserId) ?? null : null;
    const nextEmail = task.assigneeUserId ? emailMap.get(task.assigneeUserId) ?? null : null;
    if (!nextName && !nextPhone && !nextEmail) return task;
    return {
      ...task,
      assigneeFullName: nextName ?? task.assigneeFullName,
      assigneePhone: nextPhone ?? task.assigneePhone,
      assigneeEmail: nextEmail ?? task.assigneeEmail,
    };
  });
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
  const tasks = rows.map(mapTaskRow);
  return hydrateTaskAssigneeNames(tasks, supabase);
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

  const mapped = mapTaskRow(data as TaskRow);
  const [hydrated] = await hydrateTaskAssigneeNames([mapped], supabase);
  return hydrated ?? mapped;
}
