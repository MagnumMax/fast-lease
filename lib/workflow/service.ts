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

function logTrace(entry: Record<string, unknown>): void {
  console.log(JSON.stringify({ tag: "trace", scope: "workflow-service", ...entry }));
}

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
    const maxRetries = 3;
    const baseDelay = 1000; // 1 секунда
    const maxDelay = 10000; // 10 секунд

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptStartedAt = Date.now();
      try {
        // Получаем deal для текущей попытки
        const deal = await this.dealRepository.getDealById(input.dealId);
        if (!deal) {
          throw new Error(`Deal '${input.dealId}' not found`);
        }
        logTrace({
          step: "attempt-start",
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          dealId: input.dealId,
          currentStatus: deal.status,
          targetStatus: input.targetStatus,
        });
        console.log(`[WorkflowService] Attempt ${attempt + 1}/${maxRetries + 1} for deal ${input.dealId} transition from ${deal.status} to ${input.targetStatus}`);

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

        console.log(`[WorkflowService] Successfully completed transition for deal ${input.dealId} on attempt ${attempt + 1}`);
        logTrace({
          step: "attempt-success",
          attempt: attempt + 1,
          dealId: deal.id,
          targetStatus: input.targetStatus,
          newStatus: transitionResult.newStatus.code,
          elapsedMs: Date.now() - attemptStartedAt,
        });

        return {
          dealId: deal.id,
          previousStatus: deal.status,
          newStatus: transitionResult.newStatus.code,
          workflowVersionId: version.id,
          executedActions: transitionResult.executedActions,
          transition: transitionResult,
        };

      } catch (error) {
        lastError = error as Error;
        console.error(`[WorkflowService] Attempt ${attempt + 1} failed for deal ${input.dealId}:`, error);

        // Проверяем, является ли ошибка временной и стоит ли делать retry
        const isRetryableError = this.isRetryableError(error);
        logTrace({
          step: "attempt-failed",
          attempt: attempt + 1,
          dealId: input.dealId,
          targetStatus: input.targetStatus,
          retryable: isRetryableError,
          elapsedMs: Date.now() - attemptStartedAt,
          error: error instanceof Error ? error.message : String(error),
        });

        if (!isRetryableError || attempt === maxRetries) {
          console.error(`[WorkflowService] Final failure for deal ${input.dealId} after ${attempt + 1} attempts:`, error);
          throw error;
        }

        // Вычисляем задержку с exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        console.log(`[WorkflowService] Retrying transition for deal ${input.dealId} in ${delay}ms (attempt ${attempt + 2}/${maxRetries + 1})`);

        // Добавляем jitter для избежания thundering herd
        const jitteredDelay = delay + Math.random() * 1000;
        await this.sleep(jitteredDelay);
      }
    }

    // Это не должно быть достигнуто, но на всякий случай
    throw lastError || new Error('Unknown error occurred during transition');
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

  /**
   * Определяет, является ли ошибка временной и стоит ли делать retry
   */
  private isRetryableError(error: Error | unknown): boolean {
    // Обрабатываем WorkflowTransitionError
    if (error instanceof Error) {
      // GUARD_FAILED ошибки могут быть временными (например, если задачи еще не завершились)
      if (error.name === 'WorkflowTransitionError') {
        const workflowError = error as any;
        if (workflowError.validation?.reason === 'GUARD_FAILED') {
          console.log(`[WorkflowService] GUARD_FAILED error detected, will retry`);
          return true;
        }
      }

      // Ошибки базы данных часто бывают временными
      const errorMessage = error.message.toLowerCase();
      const dbErrors = [
        'connection',
        'timeout',
        'deadlock',
        'lock wait timeout',
        'temporary failure',
        'service unavailable',
        'too many connections'
      ];

      if (dbErrors.some(dbError => errorMessage.includes(dbError))) {
        console.log(`[WorkflowService] Database error detected, will retry: ${error.message}`);
        return true;
      }

      // Сетевые ошибки
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        console.log(`[WorkflowService] Network error detected, will retry: ${error.message}`);
        return true;
      }
    }

    console.log(`[WorkflowService] Non-retryable error detected: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }

  /**
   * Вспомогательный метод для задержки выполнения
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async resyncDeal(dealId: string): Promise<WorkflowTransitionOutput> {
    const deal = await this.dealRepository.getDealById(dealId);
    if (!deal) {
      throw new Error(`Deal '${dealId}' not found`);
    }

    // Always get the latest active version
    const version = await this.versionService.getActiveVersion(deal.workflowId);
    if (!version) {
      throw new Error(`No active workflow version found for workflow '${deal.workflowId}'`);
    }

    // Update version in DB if it mismatches
    if (deal.workflowVersionId !== version.id) {
      await this.dealRepository.updateDealStatus({
        dealId: deal.id,
        previousStatus: deal.status,
        status: deal.status,
        workflowVersionId: version.id,
        // System action, no specific actor
        actorId: undefined,
      });
      console.log(`[WorkflowService] Updated deal ${deal.id} to version ${version.id}`);
    }

    const stateMachine = new WorkflowStateMachine(version.template, {
      guardEvaluator: this.guardEvaluator,
      actionExecutor: this.actionExecutor,
    });

    const statusDef = stateMachine.getStatus(deal.status);
    if (!statusDef) {
      throw new Error(`Status '${deal.status}' is not defined in the active workflow version`);
    }

    const executedActions: WorkflowAction[] = [];
    const entryActions = statusDef.entryActions ?? [];

    if (this.actionExecutor && entryActions.length > 0) {
      const context: WorkflowActionContext = {
        dealId: deal.id,
        actorRole: "ADMIN", // System role for resync
        transition: {
          from: deal.status,
          to: deal.status,
        },
        template: version.template,
        payload: deal.payload ?? undefined,
      };

      for (const action of entryActions) {
        await this.actionExecutor(action, context);
        executedActions.push(action);
      }
    }

    return {
      dealId: deal.id,
      previousStatus: deal.status,
      newStatus: deal.status,
      workflowVersionId: version.id,
      executedActions,
      transition: {
        newStatus: statusDef,
        executedActions,
      },
    };
  }
}
