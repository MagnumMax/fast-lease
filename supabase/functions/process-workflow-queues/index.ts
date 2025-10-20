declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Promise<Response> | Response) => unknown;
};

type NotificationRow = {
  id: string;
  template: string;
  to_roles: string[];
  payload: Record<string, unknown> | null;
};

type WebhookRow = {
  id: string;
  endpoint: string;
  payload: Record<string, unknown> | null;
};

type ScheduleRow = {
  id: string;
  job_type: string;
  payload: Record<string, unknown> | null;
};

type Summary = {
  processed: number;
  failed: number;
};

type SupabaseErrorResult = { error?: unknown };
type SelectResult<T = unknown> = { data?: Array<T>; error?: unknown };

type FilterBuilder<T = unknown> = {
  select: (columns: string) => FilterBuilder<T>;
  eq: (column: string, value: unknown) => FilterBuilder<T>;
  order: (column: string, options: { ascending: boolean }) => FilterBuilder<T>;
  limit: (count: number) => Promise<SelectResult<T>>;
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: unknown) => Promise<SupabaseErrorResult>;
  };
};

type SupabaseClientLike = {
  from: (table: string) => FilterBuilder;
};

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";

async function processNotifications(client: SupabaseClientLike): Promise<Summary> {
  const { data, error } = await client
    .from("workflow_notification_queue")
    .select("id, template, to_roles, payload")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    console.error("[edge] load notifications error", error);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const row of (data ?? []) as Array<NotificationRow>) {
    const message = (row.payload as { message?: string } | null)?.message ?? row.template;
    const sent = await sendTelegram(message);

    const update = await client
      .from("workflow_notification_queue")
      .update({
        status: sent ? "SENT" : "FAILED",
        processed_at: new Date().toISOString(),
        error: sent ? null : "telegram_send_failed",
      })
      .eq("id", row.id);

    if (update.error) {
      console.error("[edge] update notification error", update.error);
      failed += 1;
      continue;
    }

    if (sent) {
      processed += 1;
    } else {
      failed += 1;
    }
  }

  return { processed, failed };
}

async function sendTelegram(message: string): Promise<boolean> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.info("[edge] telegram stub", { message });
    return true;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[edge] telegram api error", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[edge] telegram fetch error", error);
    return false;
  }
}

async function processWebhooks(client: SupabaseClientLike): Promise<Summary> {
  const { data, error } = await client
    .from("workflow_webhook_queue")
    .select("id, endpoint, payload")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    console.error("[edge] load webhooks error", error);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const row of (data ?? []) as Array<WebhookRow>) {
    try {
      console.info("[edge] webhook stub", { endpoint: row.endpoint });
      await client
        .from("workflow_webhook_queue")
        .update({
          status: "SENT",
          processed_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", row.id);
      processed += 1;
    } catch (error) {
      console.error("[edge] webhook update error", error);
      failed += 1;
    }
  }

  return { processed, failed };
}

async function processSchedules(client: SupabaseClientLike): Promise<Summary> {
  const { data, error } = await client
    .from("workflow_schedule_queue")
    .select("id, job_type, payload")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    console.error("[edge] load schedules error", error);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const row of (data ?? []) as Array<ScheduleRow>) {
    try {
      console.info("[edge] schedule stub", { job: row.job_type });
      await client
        .from("workflow_schedule_queue")
        .update({
          status: "SENT",
          processed_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", row.id);
      processed += 1;
    } catch (error) {
      console.error("[edge] schedule update error", error);
      failed += 1;
    }
  }

  return { processed, failed };
}

Deno.serve(async (req: Request) => {
  try {
    // Check if this is a test request for environment variables
    const body = await req.json().catch(() => ({}));
    if (body.check_env) {
      return new Response(
        JSON.stringify({
          telegram_token_set: !!TELEGRAM_TOKEN,
          telegram_chat_id_set: !!TELEGRAM_CHAT_ID,
          telegram_token_length: TELEGRAM_TOKEN.length,
          telegram_chat_id: TELEGRAM_CHAT_ID,
          env_check: true
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import(
      Deno ? "npm:@supabase/supabase-js@2.48.0" : "@supabase/supabase-js"
    );
    const client = createClient(supabaseUrl, supabaseServiceKey);

    const [notifications, webhooks, schedules] = await Promise.all([
      processNotifications(client),
      processWebhooks(client),
      processSchedules(client),
    ]);

    return new Response(
      JSON.stringify({
        notifications,
        webhooks,
        schedules,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("[edge] error", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
