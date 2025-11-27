import { WorkflowTemplateParseError } from "@/lib/workflow/parser";
import type {
  WorkflowRequirement,
  WorkflowTemplate,
  WorkflowTransition,
  WorkflowStatusDefinition,
  WorkflowTaskDefinition,
  WorkflowRoleDefinition,
} from "@/lib/workflow/types";

type TaskTemplate = WorkflowTaskDefinition & {
  statusKey: string;
};

export type WorkflowCatalog = {
  template: WorkflowTemplate;
  rolesByCode: Record<string, WorkflowRoleDefinition>;
  roleLabels: Record<string, string>;
  statusByKey: Record<string, WorkflowStatusDefinition>;
  statusesOrdered: WorkflowStatusDefinition[];
  kanbanOrder: string[];
  taskTemplates: Record<string, TaskTemplate>;
  taskTemplatesByType: Record<string, TaskTemplate[]>;
  exitRequirementsByStatus: Record<string, WorkflowRequirement[] | undefined>;
  transitionsByFrom: Record<string, WorkflowTransition[]>;
};

function collectTaskTemplates(
  stages: Record<string, WorkflowStatusDefinition>,
): Record<string, TaskTemplate> {
  const result: Record<string, TaskTemplate> = {};

  for (const [statusKey, status] of Object.entries(stages)) {
    const actions = status.entryActions ?? [];
    for (const action of actions) {
      if (action.type !== "TASK_CREATE") continue;
      const templateId = action.task.templateId;
      if (result[templateId]) {
        throw new WorkflowTemplateParseError(
          `Duplicate task template_id detected: ${templateId} (statuses: ${result[templateId].statusKey}, ${statusKey})`,
        );
      }
      result[templateId] = { ...action.task, statusKey };
    }
  }

  return result;
}

function groupTaskTemplatesByType(templates: Record<string, TaskTemplate>): Record<string, TaskTemplate[]> {
  const grouped: Record<string, TaskTemplate[]> = {};

  for (const template of Object.values(templates)) {
    if (!grouped[template.type]) {
      grouped[template.type] = [];
    }
    grouped[template.type].push(template);
  }

  return grouped;
}

function indexTransitionsByFrom(transitions: WorkflowTransition[]): Record<string, WorkflowTransition[]> {
  return transitions.reduce<Record<string, WorkflowTransition[]>>((acc, transition) => {
    if (!acc[transition.from]) {
      acc[transition.from] = [];
    }
    acc[transition.from].push(transition);
    return acc;
  }, {});
}

export function buildWorkflowCatalog(template: WorkflowTemplate): WorkflowCatalog {
  const rolesByCode = template.roles.reduce<Record<string, WorkflowRoleDefinition>>((acc, role) => {
    acc[role.code] = role;
    return acc;
  }, {});

  const roleLabels = template.roles.reduce<Record<string, string>>((acc, role) => {
    acc[role.code] = role.name;
    return acc;
  }, {});

  const statusByKey = template.stages;
  const statusesOrdered = template.kanbanOrder.map((key) => {
    const status = statusByKey[key];
    if (!status) {
      throw new WorkflowTemplateParseError(`Kanban order references undefined status: ${key}`);
    }
    return status;
  });

  const taskTemplates = collectTaskTemplates(template.stages);
  const taskTemplatesByType = groupTaskTemplatesByType(taskTemplates);
  const exitRequirementsByStatus = Object.entries(template.stages).reduce<
    Record<string, WorkflowRequirement[] | undefined>
  >((acc, [key, status]) => {
    acc[key] = status.exitRequirements;
    return acc;
  }, {});

  const transitionsByFrom = indexTransitionsByFrom(template.transitions);

  return {
    template,
    rolesByCode,
    roleLabels,
    statusByKey,
    statusesOrdered,
    kanbanOrder: template.kanbanOrder,
    taskTemplates,
    taskTemplatesByType,
    exitRequirementsByStatus,
    transitionsByFrom,
  };
}
