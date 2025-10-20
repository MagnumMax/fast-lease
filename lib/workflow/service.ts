import type { AppRole } from "../auth/types";
import {
  WorkflowStateMachine,
  type WorkflowActionContext,
  type WorkflowActionExecutor,
  type WorkflowGuardContext,
  type WorkflowGuardEvaluator,
  type WorkflowTransitionResult,
} from "./state-machine";
import type { WorkflowAction } from "./types";
import {
  WorkflowVersionService,
  type WorkflowVersionRecord,
} from "./versioning";

export type WorkflowDeal = {
  id: string;
  workflowId: string;
  workflowVersionId: string | null;
  status: string;
  payload?: Record<string, unknown> | null;
};

export interface WorkflowDealRepository {
  getDealById(id: string): Promise<WorkflowDeal | null>;
  updateDealStatus(input: {
    dealId: string;
    previousStatus: string;
    status: string;
    workflowVersionId: string;
    actorId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;
}

export interface WorkflowAuditLogger {
  logTransition(entry: {
    dealId: string;
    fromStatus: string;
    toStatus: string;
    actorRole: AppRole;
    actorId?: string | null;
    workflowVersionId: string;
    context?: Record<string, unknown>;
  }): Promise<void>;
}

export type WorkflowTransitionInput = {
  dealId: string;
  targetStatus: string;
  actorRole: AppRole;
  actorId?: string;
  guardContext?: WorkflowGuardContext;
  actionPayload?: Record<string, unknown>;
  executeEntryActions?: boolean;
};

export type WorkflowTransitionOutput = {
  dealId: string;
  previousStatus: string;
  newStatus: string;
  workflowVersionId: string;
  executedActions: WorkflowAction[];
  transition: WorkflowTransitionResult;
};

export type WorkflowServiceDependencies = {
  versionService: WorkflowVersionService;
  dealRepository: WorkflowDealRepository;
  auditLogger?: WorkflowAuditLogger;
  guardEvaluator?: WorkflowGuardEvaluator;
  actionExecutor?: WorkflowActionExecutor;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];

    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing, value);
      continue;
    }

    result[key] = value;
  }

  return result as T;
}

export class WorkflowService {
  private readonly versionService: WorkflowVersionService;
  private readonly dealRepository: WorkflowDealRepository;
  private readonly auditLogger?: WorkflowAuditLogger;
  private readonly guardEvaluator?: WorkflowGuardEvaluator;
  private readonly actionExecutor?: WorkflowActionExecutor;

  constructor(dependencies: WorkflowServiceDependencies) {
    this.versionService = dependencies.versionService;
    this.dealRepository = dependencies.dealRepository;
    this.auditLogger = dependencies.auditLogger;
    this.guardEvaluator = dependencies.guardEvaluator;
    this.actionExecutor = dependencies.actionExecutor;
  }

  async transitionDeal(
    input: WorkflowTransitionInput,
  ): Promise<WorkflowTransitionOutput> {
    const deal = await this.dealRepository.getDealById(input.dealId);
    if (!deal) {
      throw new Error(`Deal '${input.dealId}' not found`);
    }

    const version = await this.resolveWorkflowVersion(deal);

    if (version.workflowId !== deal.workflowId) {
      throw new Error(
        `Deal workflow '${deal.workflowId}' does not match template workflow '${version.workflowId}'`,
      );
    }

    const stateMachine = new WorkflowStateMachine(version.template, {
      guardEvaluator: this.guardEvaluator,
      actionExecutor: this.actionExecutor,
    });

    const guardContext = this.buildGuardContext(deal.payload, input.guardContext);

    const transitionResult = await stateMachine.performTransition({
      from: deal.status,
      to: input.targetStatus,
      actorRole: input.actorRole,
      guardContext,
      actionContext: this.buildActionContext({
        dealId: deal.id,
        actorId: input.actorId,
        payload: input.actionPayload,
      }),
      executeEntryActions: input.executeEntryActions,
    });

    await this.dealRepository.updateDealStatus({
      dealId: deal.id,
      previousStatus: deal.status,
      status: transitionResult.newStatus.code,
      workflowVersionId: version.id,
      actorId: input.actorId,
    });

    await this.auditLogger?.logTransition({
      dealId: deal.id,
      fromStatus: deal.status,
      toStatus: transitionResult.newStatus.code,
      actorRole: input.actorRole,
      actorId: input.actorId,
      workflowVersionId: version.id,
      context: {
        guardContext,
        actionsExecuted: transitionResult.executedActions.map((action) => action.type),
      },
    });

    return {
      dealId: deal.id,
      previousStatus: deal.status,
      newStatus: transitionResult.newStatus.code,
      workflowVersionId: version.id,
      executedActions: transitionResult.executedActions,
      transition: transitionResult,
    };
  }

  private buildGuardContext(
    dealPayload: Record<string, unknown> | null | undefined,
    override?: WorkflowGuardContext,
  ): WorkflowGuardContext {
    if (!dealPayload && !override) {
      return {};
    }

    if (!dealPayload) {
      return override ?? {};
    }

    if (!override) {
      return dealPayload;
    }

    return deepMerge({ ...dealPayload }, override);
  }

  private buildActionContext(context: {
    dealId: string;
    actorId?: string;
    payload?: Record<string, unknown>;
  }): Omit<WorkflowActionContext, "actorRole" | "transition" | "template"> {
    return {
      dealId: context.dealId,
      actorId: context.actorId,
      payload: context.payload,
    };
  }

  private async resolveWorkflowVersion(
    deal: WorkflowDeal,
  ): Promise<WorkflowVersionRecord> {
    if (deal.workflowVersionId) {
      const existing = await this.versionService.getVersionById(
        deal.workflowVersionId,
      );
      if (existing) {
        return existing;
      }
    }

    const active = await this.versionService.getActiveVersion(deal.workflowId);

    if (!active) {
      throw new Error(
        `No active workflow version found for workflow '${deal.workflowId}'`,
      );
    }

    return active;
  }
}
