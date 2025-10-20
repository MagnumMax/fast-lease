import { randomUUID } from "node:crypto";
import process from "node:process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = resolve(".env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const [key, ...rest] = line.split("=");
      if (!key || rest.length === 0) continue;
      const valueRaw = rest.join("=").trim();
      const value = valueRaw.replace(/^"|"$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    console.warn("Unable to read .env.local", error.message);
  }
}

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

async function main() {
  loadEnv();

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const actionHash = randomUUID();
  const payloadMessage = `E2E Telegram ${new Date().toISOString()}`;

  const { data, error } = await supabase
    .from("workflow_notification_queue")
    .insert({
      kind: "NOTIFY",
      template: "new_deal_created",
      to_roles: ["OP_MANAGER"],
      payload: { message: payloadMessage },
      action_hash: actionHash,
      status: "PENDING",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  console.log("Queued notification", data);

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

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Function call failed: ${response.status} ${JSON.stringify(result)}`);
  }

  console.log("Function execution", result);
  console.log("Check Telegram for message:", payloadMessage);
}

main().catch((err) => {
  console.error("Test telegram run failed", err);
  process.exit(1);
});
