import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createSupabaseWorkflowAuditLogger } from "@/lib/supabase/queries/workflow-audit";
import { createSupabaseWorkflowDealRepository } from "@/lib/supabase/queries/workflow-deals";
import { createSupabaseWorkflowVersionRepository } from "@/lib/supabase/queries/workflow-versions";

import { createWorkflowActionExecutor } from "./actions";
import { WorkflowService } from "./service";
import { WorkflowVersionService } from "./versioning";

export async function createWorkflowService() {
  const supabase = await createSupabaseServiceClient();

  const versionRepository = createSupabaseWorkflowVersionRepository(supabase);
  const versionService = new WorkflowVersionService(versionRepository);

  return new WorkflowService({
    versionService,
    dealRepository: createSupabaseWorkflowDealRepository(supabase),
    auditLogger: createSupabaseWorkflowAuditLogger(supabase),
    actionExecutor: createWorkflowActionExecutor(supabase),
  });
}
