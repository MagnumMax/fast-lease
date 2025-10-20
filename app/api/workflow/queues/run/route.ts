import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { WorkflowQueueProcessor } from "@/lib/workflow";

export async function POST() {
  const supabase = await createSupabaseServiceClient();
  const processor = new WorkflowQueueProcessor(supabase);

  const [notifications, webhooks, schedules] = await Promise.all([
    processor.processNotifications(),
    processor.processWebhooks(),
    processor.processSchedules(),
  ]);

  return NextResponse.json({ notifications, webhooks, schedules });
}
