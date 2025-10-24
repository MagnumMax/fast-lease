import type { AppRole } from "../auth/types";

export type WorkflowRoleCategory = "auth" | "workflow";

export type WorkflowRoleDefinition = {
  code: AppRole;
  name: string;
  categories: WorkflowRoleCategory[];
};

export type WorkflowMetadata = {
  id: string;
  title: string;
  entity: string;
  ownerRole: AppRole;
  timezone: string;
};

export type WorkflowTaskSLA = {
  hours: number;
};

export type WorkflowTaskDefinition = {
  type: string;
  title: string;
  assigneeRole: AppRole;
  sla?: WorkflowTaskSLA;
  checklist?: string[];
  guardKey?: string;
};

export type WorkflowNotifyAction = {
  type: "NOTIFY";
  toRoles: AppRole[];
  template: string;
};

export type WorkflowEscalateAction = {
  type: "ESCALATE";
  toRoles: AppRole[];
  template: string;
};

export type WorkflowTaskCreateAction = {
  type: "TASK_CREATE";
  task: WorkflowTaskDefinition;
};

export type WorkflowWebhookAction = {
  type: "WEBHOOK";
  endpoint: string;
  payload?: Record<string, unknown>;
};

export type WorkflowScheduleAction = {
  type: "SCHEDULE";
  job: {
    type: string;
    cron: string;
  };
};

export type WorkflowAction =
  | WorkflowTaskCreateAction
  | WorkflowNotifyAction
  | WorkflowEscalateAction
  | WorkflowWebhookAction
  | WorkflowScheduleAction;

export type WorkflowRequirement = {
  key: string;
  rule: string;
  message?: string;
};

export type WorkflowCondition = {
  key: string;
  rule: string;
};

export type WorkflowStatusWebhookEvent = {
  event: string;
  transitionTo: string;
  conditions?: WorkflowCondition[];
};

export type WorkflowStatusWebhookConfig = {
  onEvent?: WorkflowStatusWebhookEvent[];
};

export type WorkflowSLAEscalation = {
  afterHours: number;
  action: WorkflowAction;
};

export type WorkflowStatusSLA = {
  maxHours: number;
  escalation?: WorkflowSLAEscalation[];
};

export type WorkflowStatusDefinition = {
  code: string;
  title: string;
  description?: string;
  entryActions?: WorkflowAction[];
  exitRequirements?: WorkflowRequirement[];
  webhooks?: WorkflowStatusWebhookConfig;
  sla?: WorkflowStatusSLA;
};

export type WorkflowTransition = {
  from: string;
  to: string;
  byRoles: AppRole[];
  guards?: WorkflowCondition[];
};

export type WorkflowPermissionRule = {
  role: AppRole;
  allowedFrom: string[];
  allowedTo?: string[];
};

export type WorkflowPermissionEntry =
  | {
      kind: "roles";
      roles: AppRole[];
    }
  | {
      kind: "rules";
      rules: WorkflowPermissionRule[];
    };

export type WorkflowPermissions = Record<string, WorkflowPermissionEntry>;

export type WorkflowIntegrationsConfig = {
  webhooks?: Record<string, string>;
  callbacks?: Record<string, string>;
  retries?: {
    policy: string;
    baseMs?: number;
    maxRetries?: number;
  };
};

export type WorkflowTimerMetric = {
  name: string;
  from: string;
  to: string;
};

export type WorkflowMetricsConfig = {
  enabled: boolean;
  timers?: WorkflowTimerMetric[];
  export?: {
    prometheus?: string;
    dimensions?: string[];
  };
};

export type WorkflowNotificationConfig = {
  channels: string[];
  templates: Record<string, string>;
};

export type WorkflowTemplate = {
  workflow: WorkflowMetadata;
  roles: WorkflowRoleDefinition[];
  kanbanOrder: string[];
  stages: Record<string, WorkflowStatusDefinition>;
  transitions: WorkflowTransition[];
  permissions: WorkflowPermissions;
  integrations: WorkflowIntegrationsConfig;
  metrics: WorkflowMetricsConfig;
  notifications: WorkflowNotificationConfig;
};
