import type { AppRole } from "../auth/types";
import type {
  WorkflowAction,
  WorkflowCondition,
  WorkflowStatusDefinition,
  WorkflowTemplate,
  WorkflowTransition,
} from "./types";

export type WorkflowGuardContext = Record<string, unknown>;

export type WorkflowActionContext = {
  dealId?: string;
  actorRole: AppRole;
  actorId?: string;
  payload?: Record<string, unknown>;
  transition: {
    from: string;
    to: string;
  };
  template: WorkflowTemplate;
};

export type WorkflowGuardEvaluator = (
  condition: WorkflowCondition,
  context: WorkflowGuardContext,
) => Promise<boolean> | boolean;

export type WorkflowActionExecutor = (
  action: WorkflowAction,
  context: WorkflowActionContext,
) => Promise<void>;

export type WorkflowTransitionValidation = {
  allowed: boolean;
  reason?: "UNKNOWN_TRANSITION" | "ROLE_NOT_ALLOWED" | "GUARD_FAILED";
  failedGuards?: WorkflowCondition[];
  transition?: WorkflowTransition;
};

export type WorkflowTransitionRequest = {
  from: string;
  to: string;
  actorRole: AppRole;
  guardContext?: WorkflowGuardContext;
  actionContext?: Omit<WorkflowActionContext, "transition" | "template" | "actorRole"> &
    Partial<Pick<WorkflowActionContext, "actorRole">>;
  executeEntryActions?: boolean;
};

export type WorkflowTransitionResult = {
  newStatus: WorkflowStatusDefinition;
  executedActions: WorkflowAction[];
};

export class WorkflowTransitionError extends Error {
  constructor(
    message: string,
    readonly validation: WorkflowTransitionValidation,
  ) {
    super(message);
    this.name = "WorkflowTransitionError";
  }
}

type WorkflowStateMachineOptions = {
  guardEvaluator?: WorkflowGuardEvaluator;
  actionExecutor?: WorkflowActionExecutor;
};

function resolveValueByPath(
  context: WorkflowGuardContext,
  path: string,
): unknown {
  if (!path) return undefined;

  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }

    if (typeof acc !== "object") {
      return undefined;
    }

    return (acc as Record<string, unknown>)[key];
  }, context);
}

function parseRuleExpectedValue(raw: string): unknown {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;

  if (!Number.isNaN(Number(value)) && value !== "") {
    return Number(value);
  }

  return value;
}

function defaultGuardEvaluator(
  condition: WorkflowCondition,
  context: WorkflowGuardContext,
): boolean {
  const actual = resolveValueByPath(context, condition.key);
  const rule = condition.rule.trim();

  if (rule.startsWith("==")) {
    const expected = parseRuleExpectedValue(rule.slice(2));
    return actual === expected;
  }

  if (rule.startsWith("!=")) {
    const expected = parseRuleExpectedValue(rule.slice(2));
    return actual !== expected;
  }

  if (rule === "truthy") {
    return Boolean(actual);
  }

  if (rule === "falsy") {
    return !actual;
  }

  throw new Error(
    `Unsupported guard rule '${rule}' for key '${condition.key}'. Provide a custom guard evaluator to handle this rule.`,
  );
}

async function defaultActionExecutor(): Promise<void> {
  // No-op by default – integrate with task/notification schedulers later.
}

export class WorkflowStateMachine {
  private readonly guardEvaluator: WorkflowGuardEvaluator;
  private readonly actionExecutor: WorkflowActionExecutor;
  private readonly transitionsByFrom: Map<string, WorkflowTransition[]>;

  constructor(
    private readonly template: WorkflowTemplate,
    options: WorkflowStateMachineOptions = {},
  ) {
    this.guardEvaluator = options.guardEvaluator ?? defaultGuardEvaluator;
    this.actionExecutor = options.actionExecutor ?? defaultActionExecutor;
    this.transitionsByFrom = this.buildTransitionIndex(template.transitions);
  }

  private buildTransitionIndex(
    transitions: WorkflowTransition[],
  ): Map<string, WorkflowTransition[]> {
    return transitions.reduce((acc, transition) => {
      const list = acc.get(transition.from) ?? [];
      list.push(transition);
      acc.set(transition.from, list);
      return acc;
    }, new Map<string, WorkflowTransition[]>());
  }

  private resolveTransition(
    from: string,
    to: string,
  ): WorkflowTransition | undefined {
    const transitions = this.transitionsByFrom.get(from) ?? [];
    return transitions.find((transition) => transition.to === to);
  }

  getStatus(code: string): WorkflowStatusDefinition | undefined {
    return this.template.statuses[code];
  }

  getAvailableTransitions(
    from: string,
    role: AppRole,
  ): WorkflowTransition[] {
    const transitions = this.transitionsByFrom.get(from) ?? [];
    return transitions.filter((transition) =>
      transition.byRoles.includes(role),
    );
  }

  async validateTransition(
    request: WorkflowTransitionRequest,
  ): Promise<WorkflowTransitionValidation> {
    const transition = this.resolveTransition(request.from, request.to);

    if (!transition) {
      return {
        allowed: false,
        reason: "UNKNOWN_TRANSITION",
      };
    }

    if (!transition.byRoles.includes(request.actorRole)) {
      return {
        allowed: false,
        reason: "ROLE_NOT_ALLOWED",
        transition,
      };
    }

    const guards = transition.guards ?? [];
    if (guards.length === 0) {
      return {
        allowed: true,
        transition,
      };
    }

    const context = request.guardContext ?? {};
    const failedGuards: WorkflowCondition[] = [];

    for (const condition of guards) {
      const result = await this.guardEvaluator(condition, context);
      if (!result) {
        failedGuards.push(condition);
      }
    }

    if (failedGuards.length > 0) {
      return {
        allowed: false,
        reason: "GUARD_FAILED",
        failedGuards,
        transition,
      };
    }

    return {
      allowed: true,
      transition,
    };
  }

  async performTransition(
    request: WorkflowTransitionRequest,
  ): Promise<WorkflowTransitionResult> {
    const validation = await this.validateTransition(request);

    if (!validation.allowed || !validation.transition) {
      throw new WorkflowTransitionError(
        `Transition from '${request.from}' to '${request.to}' is not allowed`,
        validation,
      );
    }

    const targetStatus = this.template.statuses[request.to];
    if (!targetStatus) {
      throw new WorkflowTransitionError(
        `Target status '${request.to}' is not defined in workflow template`,
        {
          allowed: false,
          reason: "UNKNOWN_TRANSITION",
          transition: validation.transition,
        },
      );
    }

    const executedActions: WorkflowAction[] = [];

    if (request.executeEntryActions !== false) {
      const actions = targetStatus.entryActions ?? [];
      const baseContext: WorkflowActionContext = {
        actorRole: request.actorRole,
        transition: {
          from: request.from,
          to: request.to,
        },
        template: this.template,
        dealId: request.actionContext?.dealId,
        actorId: request.actionContext?.actorId,
        payload: request.actionContext?.payload,
      };

      for (const action of actions) {
        await this.actionExecutor(action, baseContext);
        executedActions.push(action);
      }
    }

    return {
      newStatus: targetStatus,
      executedActions,
    };
  }
}
