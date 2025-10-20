import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

async function main() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const actionHash = randomUUID();

  const insertResult = await supabase
    .from("workflow_notification_queue")
    .insert({
      kind: "NOTIFY",
      template: "new_deal_created",
      to_roles: ["OP_MANAGER"],
      payload: {
        message: `Тестовое уведомление ${new Date().toISOString()}`,
      },
      action_hash: actionHash,
      status: "PENDING",
    })
    .select("id")
    .maybeSingle();

  if (insertResult.error) {
    throw insertResult.error;
  }

  console.log("Notification queued", insertResult.data);

  const functionsBase = supabaseUrl.replace(
    ".supabase.co",
    ".functions.supabase.co",
  );

  const response = await fetch(`${functionsBase}/process-workflow-queues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({}),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Function call failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  console.log("Function response", payload);
}

main().catch((error) => {
  console.error("Test run failed", error);
  process.exit(1);
});
