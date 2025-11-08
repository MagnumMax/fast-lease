import { readFileSync } from "node:fs";

import { APP_ROLE_CODES } from "../data/app-roles";
import { z } from "zod";
import { parse as parseYaml } from "yaml";

import type {
  WorkflowAction,
  WorkflowSLAEscalation,
  WorkflowStatusDefinition,
  WorkflowStatusSLA,
  WorkflowStatusWebhookConfig,
  WorkflowTaskDefinition,
  WorkflowTemplate,
} from "./types";
import type { AppRole } from "../auth/types";

export class WorkflowTemplateParseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "WorkflowTemplateParseError";
  }
}

const appRoleEnum = z.enum(APP_ROLE_CODES as [AppRole, ...AppRole[]]);

const roleDefinitionSchema = z.object({
  code: appRoleEnum,
  name: z.string().min(1),
  categories: z.array(z.enum(["auth", "workflow"])).min(1),
});

const requirementSchema = z.object({
  key: z.string().min(1),
  rule: z.string().min(1),
  message: z.string().min(1).optional(),
});

const conditionSchema = z.object({
  key: z.string().min(1),
  rule: z.string().min(1),
});

const rawTaskFieldSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  options: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  ui: z.record(z.string(), z.any()).optional(),
});

const rawTaskSchemaSchema = z.object({
  version: z.string().min(1).optional(),
  fields: z.array(rawTaskFieldSchema).min(1),
});

const rawTaskDefinitionSchema = z.object({
  template_id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  assignee_role: appRoleEnum,
  sla: z
    .object({
      hours: z.number().int().positive(),
    })
    .optional(),
  schema: rawTaskSchemaSchema.optional(),
  bindings: z.record(z.string(), z.string().min(1)).optional(),
  defaults: z.record(z.string(), z.any()).optional(),
  guard_key: z.string().min(1).optional(),
});

const rawTaskCreateActionSchema = z.object({
  type: z.literal("TASK_CREATE"),
  task: rawTaskDefinitionSchema,
});

const rawNotifyActionSchema = z.object({
  type: z.literal("NOTIFY"),
  to_roles: z.array(appRoleEnum).min(1),
  template: z.string().min(1),
});

const rawEscalateActionSchema = z.object({
  type: z.literal("ESCALATE"),
  to_roles: z.array(appRoleEnum).min(1),
  template: z.string().min(1),
});

const rawWebhookActionSchema = z.object({
  type: z.literal("WEBHOOK"),
  endpoint: z.string().min(1),
  payload: z.record(z.string(), z.any()).optional(),
});

const rawScheduleActionSchema = z.object({
  type: z.literal("SCHEDULE"),
  job: z.object({
    type: z.string().min(1),
    cron: z.string().min(1),
  }),
});

const rawActionSchema = z.discriminatedUnion("type", [
  rawTaskCreateActionSchema,
  rawNotifyActionSchema,
  rawEscalateActionSchema,
  rawWebhookActionSchema,
  rawScheduleActionSchema,
]);

type RawTaskDefinition = z.infer<typeof rawTaskDefinitionSchema>;
type RawAction = z.infer<typeof rawActionSchema>;
type RawStatusWebhook = z.infer<typeof rawStatusWebhookSchema>;
type RawStatusSLA = z.infer<typeof rawStatusSLASchema>;

const mapTaskDefinition = (task: RawTaskDefinition): WorkflowTaskDefinition => ({
  templateId: task.template_id,
  type: task.type,
  title: task.title,
  assigneeRole: task.assignee_role,
  sla: task.sla,
  schema: task.schema
    ? {
        version: task.schema.version ?? "1.0",
        fields: task.schema.fields,
      }
    : undefined,
  bindings: task.bindings,
  defaults: task.defaults,
  guardKey: task.guard_key,
});

const mapAction = (action: RawAction): WorkflowAction => {
  switch (action.type) {
    case "TASK_CREATE":
      return {
        type: "TASK_CREATE",
        task: mapTaskDefinition(action.task),
      };
    case "NOTIFY":
      return {
        type: "NOTIFY",
        toRoles: action.to_roles,
        template: action.template,
      };
    case "ESCALATE":
      return {
        type: "ESCALATE",
        toRoles: action.to_roles,
        template: action.template,
      };
    case "WEBHOOK":
      return {
        type: "WEBHOOK",
        endpoint: action.endpoint,
        payload: action.payload,
      };
    case "SCHEDULE":
      return {
        type: "SCHEDULE",
        job: action.job,
      };
    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
};

const mapActions = (actions?: RawAction[]): WorkflowAction[] | undefined =>
  actions?.map(mapAction);

const mapStatusWebhooks = (
  webhooks?: RawStatusWebhook,
): WorkflowStatusWebhookConfig | undefined => {
  if (!webhooks) {
    return undefined;
  }

  const events = webhooks.on_event?.map((event) => ({
    event: event.event,
    transitionTo: event.transition_to,
    conditions: event.conditions,
  }));

  return { onEvent: events };
};

const mapStatusSLA = (
  sla?: RawStatusSLA,
): WorkflowStatusSLA | undefined => {
  if (!sla) {
    return undefined;
  }

  const escalation: WorkflowSLAEscalation[] | undefined = sla.escalation?.map(
    (step) => ({
      afterHours: step.after_hours,
      action: mapAction(step.action),
    }),
  );

  return {
    maxHours: sla.max_hours,
    escalation,
  };
};

const rawStatusWebhookSchema = z.object({
  on_event: z
    .array(
      z.object({
        event: z.string().min(1),
        transition_to: z.string().min(1),
        conditions: z.array(conditionSchema).optional(),
      }),
    )
    .optional(),
});

const rawStatusSLASchema = z.object({
  max_hours: z.number().int().positive(),
  escalation: z
    .array(
      z.object({
        after_hours: z.number().int().positive(),
        action: rawActionSchema,
      }),
    )
    .optional(),
});

const statusSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  entry_actions: z.array(rawActionSchema).optional(),
  exit_requirements: z.array(requirementSchema).optional(),
  webhooks: rawStatusWebhookSchema.optional(),
  sla: rawStatusSLASchema.optional(),
});

const transitionSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    by_roles: z.array(appRoleEnum).min(1),
    guards: z.array(conditionSchema).optional(),
  })
  .transform(({ by_roles, ...rest }) => ({
    ...rest,
    byRoles: by_roles,
  }));

const permissionRuleSchema = z
  .object({
    role: appRoleEnum,
    allowed_from: z.array(z.string().min(1)).min(1),
    allowed_to: z.array(z.string().min(1)).optional(),
  })
  .transform(({ allowed_from, allowed_to, ...rest }) => ({
    ...rest,
    allowedFrom: allowed_from,
    allowedTo: allowed_to,
  }));

const permissionEntrySchema = z.union([
  z
    .object({
      roles: z.array(appRoleEnum).min(1),
    })
    .transform(({ roles }) => ({
      kind: "roles" as const,
      roles,
    })),
  z
    .object({
      rules: z.array(permissionRuleSchema).min(1),
    })
    .transform(({ rules }) => ({
      kind: "rules" as const,
      rules,
    })),
]);

const integrationsSchema = z
  .object({
    webhooks: z.record(z.string(), z.string().min(1)).optional(),
    callbacks: z.record(z.string(), z.string().min(1)).optional(),
    retries: z
      .object({
        policy: z.string().min(1),
        base_ms: z.number().int().nonnegative().optional(),
        max_retries: z.number().int().nonnegative().optional(),
      })
      .optional(),
  })
  .transform(({ retries, ...rest }) => ({
    ...rest,
    retries: retries
      ? {
          policy: retries.policy,
          baseMs: retries.base_ms,
          maxRetries: retries.max_retries,
        }
      : undefined,
  }));

const metricsSchema = z.object({
  enabled: z.boolean(),
  timers: z
    .array(
      z.object({
        name: z.string().min(1),
        from: z.string().min(1),
        to: z.string().min(1),
      }),
    )
    .optional(),
  export: z
    .object({
      prometheus: z.string().min(1).optional(),
      dimensions: z.array(z.string().min(1)).optional(),
    })
    .optional(),
});

const notificationsSchema = z.object({
  channels: z.array(z.string().min(1)),
  templates: z.record(z.string(), z.string().min(1)),
});

const metadataSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    entity: z.string().min(1),
    owner_role: appRoleEnum,
    timezone: z.string().min(1),
  })
  .transform(({ owner_role, ...rest }) => ({
    ...rest,
    ownerRole: owner_role,
  }));

const templateSchema = z.object({
  workflow: metadataSchema,
  roles: z.array(roleDefinitionSchema).min(1),
  kanban_order: z.array(z.string().min(1)).min(1),
  statuses: z.record(z.string(), statusSchema),
  transitions: z.array(transitionSchema).min(1),
  permissions: z.record(z.string(), permissionEntrySchema),
  integrations: integrationsSchema,
  metrics: metricsSchema,
  notifications: notificationsSchema,
});

type TemplateSchemaResult = z.infer<typeof templateSchema>;

const ensureStatusCoverage = (
  result: TemplateSchemaResult,
): void => {
  const knownStatuses = new Set(Object.keys(result.statuses));

  const missingInKanban = result.kanban_order.filter(
    (code) => !knownStatuses.has(code),
  );
  if (missingInKanban.length > 0) {
    throw new WorkflowTemplateParseError(
      `Kanban order references undefined statuses: ${missingInKanban.join(", ")}`,
    );
  }

  const undefinedTransitionStatuses = result.transitions
    .flatMap((transition) => [transition.from, transition.to])
    .filter((code) => !knownStatuses.has(code));
  if (undefinedTransitionStatuses.length > 0) {
    throw new WorkflowTemplateParseError(
      `Transitions reference undefined statuses: ${[...new Set(undefinedTransitionStatuses)].join(", ")}`,
    );
  }
};

const normalizeTemplate = (result: TemplateSchemaResult): WorkflowTemplate => {
  const statuses: Record<string, WorkflowStatusDefinition> = Object.entries(
    result.statuses,
  ).reduce((acc, [code, status]) => {
    const normalizedStatus: WorkflowStatusDefinition = {
      code,
      title: status.title,
      description: status.description,
      entryActions: mapActions(status.entry_actions),
      exitRequirements: status.exit_requirements,
      webhooks: mapStatusWebhooks(status.webhooks),
      sla: mapStatusSLA(status.sla),
    };
    acc[code] = normalizedStatus;
    return acc;
  }, {} as Record<string, WorkflowStatusDefinition>);

  return {
    workflow: result.workflow,
    roles: result.roles,
    kanbanOrder: result.kanban_order,
    stages: statuses,
    transitions: result.transitions,
    permissions: result.permissions,
    integrations: result.integrations,
    metrics: result.metrics,
    notifications: result.notifications,
  };
};

export const parseWorkflowTemplate = (source: string): WorkflowTemplate => {
  let rawContents: unknown;

  try {
    rawContents = parseYaml(source);
  } catch (error) {
    throw new WorkflowTemplateParseError("Failed to parse workflow YAML", error);
  }

  const parsed = templateSchema.safeParse(rawContents);
  if (!parsed.success) {
    throw new WorkflowTemplateParseError(
      "Workflow template structure is invalid",
      parsed.error.flatten(),
    );
  }

  ensureStatusCoverage(parsed.data);

  return normalizeTemplate(parsed.data);
};

export const loadWorkflowTemplate = (filePath: string): WorkflowTemplate => {
  try {
    const fileContents = readFileSync(filePath, "utf-8");
    return parseWorkflowTemplate(fileContents);
  } catch (error) {
    if (error instanceof WorkflowTemplateParseError) {
      throw error;
    }

    throw new WorkflowTemplateParseError(
      `Failed to load workflow template from ${filePath}`,
      error,
    );
  }
};
