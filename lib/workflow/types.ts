import type { AppRole } from "../auth/types";

export type WorkflowRoleCategory = "auth" | "workflow";

export type WorkflowRoleDefinition = {
  code: AppRole;
  name: string;
  categories: WorkflowRoleCategory[];
};

export type WorkflowDocumentCategory = "required" | "signature" | "archived" | "other";
export type WorkflowDocumentContext = "personal" | "company" | "any" | "vehicle";

export type WorkflowDocumentTypeEntry = {
  value: string;
  label: string;
  category?: WorkflowDocumentCategory;
  context?: WorkflowDocumentContext;
};

export type WorkflowDocumentTypeAlias = {
  alias: string;
  target: string;
};

export type WorkflowDocumentTypesConfig = {
  registry?: WorkflowDocumentTypeEntry[];
  aliases?: WorkflowDocumentTypeAlias[];
  deal?: {
    registry?: WorkflowDocumentTypeEntry[];
    aliases?: WorkflowDocumentTypeAlias[];
  };
  client?: {
    registry?: WorkflowDocumentTypeEntry[];
    aliases?: WorkflowDocumentTypeAlias[];
  };
  vehicle?: {
    registry?: WorkflowDocumentTypeEntry[];
    aliases?: WorkflowDocumentTypeAlias[];
  };
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

export type WorkflowTaskFieldOption = {
  value: string;
  label?: string;
  description?: string;
};

export type WorkflowTaskFieldSchema = {
  id: string;
  type: string;
  label?: string;
  description?: string;
  document_type?: string;
  documentType?: string;
  required?: boolean;
  options?: WorkflowTaskFieldOption[];
  ui?: Record<string, unknown>;
};

export type WorkflowTaskSchema = {
  version: string;
  fields: WorkflowTaskFieldSchema[];
  save_to_buyer_profile?: string[];
  save_to_seller_profile?: string[];
  save_to_client_profile?: string[];
};

export type WorkflowTaskDefinition = {
  templateId: string;
  type: string;
  title: string;
  assigneeRole: AppRole;
  sla?: WorkflowTaskSLA;
  schema?: WorkflowTaskSchema;
  bindings?: Record<string, string>;
  defaults?: Record<string, unknown>;
  guardKey?: string;
};

export type WorkflowActionBase = {
  conditions?: WorkflowCondition[];
};

export type WorkflowNotifyAction = WorkflowActionBase & {
  type: "NOTIFY";
  toRoles: AppRole[];
  template: string;
};

export type WorkflowEscalateAction = WorkflowActionBase & {
  type: "ESCALATE";
  toRoles: AppRole[];
  template: string;
};

export type WorkflowTaskCreateAction = WorkflowActionBase & {
  type: "TASK_CREATE";
  task: WorkflowTaskDefinition;
};

export type WorkflowWebhookAction = WorkflowActionBase & {
  type: "WEBHOOK";
  endpoint: string;
  payload?: Record<string, unknown>;
};

export type WorkflowScheduleAction = WorkflowActionBase & {
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
  documentTypes?: WorkflowDocumentTypesConfig;
  stages: Record<string, WorkflowStatusDefinition>;
  transitions: WorkflowTransition[];
  permissions: WorkflowPermissions;
  integrations: WorkflowIntegrationsConfig;
  metrics: WorkflowMetricsConfig;
  notifications: WorkflowNotificationConfig;
  schemas?: Record<string, WorkflowTaskSchema>;
};
