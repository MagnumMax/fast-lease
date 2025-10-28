import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { WorkflowQueueProcessor } from "@/lib/workflow";

export async function POST() {
  const supabase = await createSupabaseServiceClient();
  const processor = new WorkflowQueueProcessor(supabase);

  const [notifications, webhooks, schedules, tasks, sla] = await Promise.all([
    processor.processNotifications(),
    processor.processWebhooks(),
    processor.processSchedules(),
    processor.processTasks(),
    processor.monitorTaskSla(),
  ]);

  return NextResponse.json({ notifications, webhooks, schedules, tasks, sla });
}
