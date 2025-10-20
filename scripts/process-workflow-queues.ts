#!/usr/bin/env ts-node

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { WorkflowQueueProcessor } from "@/lib/workflow";

async function main() {
  const supabase = await createSupabaseServiceClient();
  const processor = new WorkflowQueueProcessor(supabase);

  const notifications = await processor.processNotifications();
  const webhooks = await processor.processWebhooks();
  const schedules = await processor.processSchedules();

  console.log("Queues processed", { notifications, webhooks, schedules });
}

main().catch((error) => {
  console.error("Queue processing failed", error);
  process.exit(1);
});
