import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { canMutateSessionUser } from "@/lib/auth/guards";
import { logPortalAdminAction } from "@/lib/auth/portal-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type DeleteIntent = "check" | "delete";

type DeleteUserPayload = {
  userId?: string;
  intent?: DeleteIntent;
};

type DeleteBlocker = {
  type: string;
  label: string;
  count: number;
};

type BlockerInspection = {
  blockers: DeleteBlocker[];
  errors: string[];
  warnings: string[];
};

type ScrubResult = {
  warnings: string[];
};

function normalizeIntent(value: unknown): DeleteIntent {
  if (value === "delete") return "delete";
  return "check";
}

type CountResult = {
  count: number;
  error?: string;
  warning?: string;
};

const SAFE_COUNT_ERROR_CODES = new Set(["42P01", "42703"]);
const SAFE_MUTATION_ERROR_CODES = new Set(["42P01", "42703"]);

function extractErrorMessage(error: {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  if (error.message && error.message.trim().length) return error.message.trim();
  if (error.details && error.details.trim().length) return error.details.trim();
  if (error.hint && error.hint.trim().length) return error.hint.trim();
  return "Unknown error";
}

type CountQueryExecutor = () => Promise<{
  count: number | null;
  error: { message?: string | null; details?: string | null; hint?: string | null; code?: string | null } | null;
}>;

async function countRows(execute: CountQueryExecutor, context: string): Promise<CountResult> {
  const { count, error } = await execute();
  if (error) {
    const code = error.code ?? null;
    const message = extractErrorMessage(error);

    if (code && SAFE_COUNT_ERROR_CODES.has(code)) {
      console.warn(`[admin-users] ${context} count skipped (${code}): ${message}`);
      return { count: 0, warning: `[${context}] ${message}` };
    }

    if (!code && message === "Unknown error") {
      console.warn(`[admin-users] ${context} count warning (no details)`);
      return { count: 0, warning: `[${context}] Count unavailable` };
    }

    console.error(`[admin-users] ${context} count failed`, error);
    return { count: 0, error: `[${context}] ${message}` };
  }

  return { count: count ?? 0 };
}

async function collectBlockers(
  client: Awaited<ReturnType<typeof createSupabaseServiceClient>>,
  userId: string,
): Promise<BlockerInspection> {
  const checks = await Promise.all([
    countRows(
      async () =>
        await client
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assignee_user_id", userId),
      "tasks",
    ),
    countRows(
      async () =>
        await client
          .from("deals")
          .select("id", { count: "exact", head: true })
          .eq("assigned_account_manager", userId),
      "deals.assigned_account_manager",
    ),
    countRows(
      async () =>
        await client
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId),
      "applications.assigned_to",
    ),
    countRows(
      async () =>
        await client
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("verified_by", userId),
      "applications.verified_by",
    ),
    countRows(
      async () =>
        await client
          .from("client_documents")
          .select("id", { count: "exact", head: true })
          .eq("uploaded_by", userId),
      "client_documents.uploaded_by",
    ),
    countRows(
      async () =>
        await client
          .from("client_documents")
          .select("id", { count: "exact", head: true })
          .eq("verified_by", userId),
      "client_documents.verified_by",
    ),
    countRows(
      async () =>
        await client
          .from("vehicle_documents")
          .select("id", { count: "exact", head: true })
          .eq("uploaded_by", userId),
      "vehicle_documents.uploaded_by",
    ),
    countRows(
      async () =>
        await client
          .from("deal_documents")
          .select("id", { count: "exact", head: true })
          .eq("uploaded_by", userId),
      "deal_documents.uploaded_by",
    ),
  ]);

  const blockers: DeleteBlocker[] = [
    { type: "tasks", label: "Назначенные задачи", count: checks[0].count },
    { type: "deals", label: "Закреплённые сделки", count: checks[1].count },
    { type: "applications_owner", label: "Назначенные заявки", count: checks[2].count },
    {
      type: "applications_verifier",
      label: "Заявки, подтверждённые пользователем",
      count: checks[3].count,
    },
    {
      type: "client_docs_uploaded",
      label: "Документы клиентов, загруженные пользователем",
      count: checks[4].count,
    },
    {
      type: "client_docs_verified",
      label: "Документы клиентов, подтверждённые пользователем",
      count: checks[5].count,
    },
    { type: "vehicle_docs", label: "Документы по авто", count: checks[6].count },
    { type: "deal_docs", label: "Документы сделок", count: checks[7].count },
  ];

  const errors = checks
    .map((entry) => entry.error)
    .filter((message): message is string => Boolean(message));
  const warnings = checks
    .map((entry) => entry.warning)
    .filter((message): message is string => Boolean(message));

  return { blockers, errors, warnings };
}

async function scrubReferenceColumns(
  client: Awaited<ReturnType<typeof createSupabaseServiceClient>>,
  userId: string,
) : Promise<ScrubResult> {
  const mutations: Array<{
    context: string;
    exec: () => Promise<{
      error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null;
    }>;
  }> = [
    {
      context: "audit_log.actor_user_id",
      exec: async () =>
        await client
          .from("audit_log")
          .update({ actor_user_id: null })
          .eq("actor_user_id", userId),
    },
    {
      context: "deal_events.created_by",
      exec: async () =>
        await client
          .from("deal_events")
          .update({ created_by: null })
          .eq("created_by", userId),
    },
    {
      context: "deals.created_by",
      exec: async () =>
        await client
          .from("deals")
          .update({ created_by: null })
          .eq("created_by", userId),
    },
    {
      context: "user_roles.assigned_by",
      exec: async () =>
        await client
          .from("user_roles")
          .update({ assigned_by: null })
          .eq("assigned_by", userId),
    },
    {
      context: "investor_reports.requested_by",
      exec: async () =>
        await client
          .from("investor_reports")
          .update({ requested_by: null })
          .eq("requested_by", userId),
    },
  ];

  const warnings: string[] = [];

  for (const mutation of mutations) {
    const { error } = await mutation.exec();
    if (error) {
      const code = error.code ?? null;
      const message = extractErrorMessage(error);
      if (code && SAFE_MUTATION_ERROR_CODES.has(code)) {
        const warning = `[${mutation.context}] ${message}`;
        warnings.push(warning);
        console.warn(`[admin-users] scrub skipped (${mutation.context}) ${code}: ${message}`);
        continue;
      }
      console.error(`[admin-users] scrub failed (${mutation.context})`, error);
      throw new Error(`[admin-users] Failed to scrub references: ${message}`);
    }
  }

  return { warnings };
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }

    if (!canMutateSessionUser(sessionUser)) {
      return NextResponse.json({ error: "Ваш доступ только для чтения." }, { status: 403 });
    }

    let payload: DeleteUserPayload | null = null;
    try {
      payload = (await request.json()) as DeleteUserPayload | null;
    } catch {
      payload = null;
    }

    const userId = typeof payload?.userId === "string" ? payload.userId.trim() : "";
    if (!userId) {
      return NextResponse.json({ error: "Не указан пользователь." }, { status: 400 });
    }

    if (userId === sessionUser.user.id) {
      return NextResponse.json({ error: "Нельзя удалить собственную учётную запись." }, { status: 400 });
    }

    const intent = normalizeIntent(payload?.intent);

    const serviceClient = await createSupabaseServiceClient();
    const { data: profileRow, error: profileError } = await serviceClient
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[admin-users] delete load profile failed", profileError);
      return NextResponse.json(
        { error: "Не удалось загрузить профиль." },
        { status: 500 },
      );
    }

    if (!profileRow) {
      return NextResponse.json(
        { error: "Пользователь не найден." },
        { status: 404 },
      );
    }

    const { blockers, errors, warnings } = await collectBlockers(serviceClient, userId);
    if (warnings.length) {
      console.warn("[admin-users] delete check warnings", warnings);
    }

    if (errors.length) {
      return NextResponse.json(
        {
          ok: false,
          canDelete: false,
          blockers,
          errors,
          message: "Не удалось проверить связанные записи. Попробуйте позже.",
        },
        { status: 500 },
      );
    }

    const canDelete = blockers.every((blocker) => blocker.count === 0);

    if (!canDelete) {
      const status = intent === "delete" ? 409 : 200;
      return NextResponse.json(
        { ok: false, canDelete: false, blockers },
        { status },
      );
    }

    if (intent === "check") {
      return NextResponse.json({ ok: true, canDelete: true, blockers });
    }

    const scrub = await scrubReferenceColumns(serviceClient, userId);
    if (scrub.warnings.length) {
      console.warn("[admin-users] scrub warnings", scrub.warnings);
    }

    const deletions = [
      serviceClient.from("user_portals").delete().eq("user_id", userId),
      serviceClient.from("user_roles").delete().eq("user_id", userId),
      serviceClient.from("profiles").delete().eq("user_id", userId),
    ];

    for (const promise of deletions) {
      const { error } = await promise;
      if (error) {
        throw new Error(`[admin-users] delete cascade failed: ${error.message}`);
      }
    }

    try {
      const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);
      if (authError && !authError.message?.toLowerCase().includes("not found")) {
        console.error("[admin-users] auth delete failed", authError);
        return NextResponse.json(
          { error: "Не удалось удалить пользователя из auth." },
          { status: 500 },
        );
      }
    } catch (error) {
      console.error("[admin-users] auth deletion crashed", error);
      return NextResponse.json(
        { error: "Auth удаление завершилось ошибкой." },
        { status: 500 },
      );
    }

    await logPortalAdminAction({
      actorUserId: sessionUser.user.id,
      targetUserId: userId,
      action: "delete_user",
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-users] delete flow crashed", error);
    return NextResponse.json(
      { error: "Не удалось удалить пользователя." },
      { status: 500 },
    );
  }
}
