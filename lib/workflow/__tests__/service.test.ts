import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  WorkflowService,
  type WorkflowDeal,
  type WorkflowDealRepository,
  type WorkflowAuditLogger,
} from "../service";
import {
  WorkflowVersionService,
  type WorkflowVersionRecord,
  type WorkflowVersionRepository,
} from "../versioning";
import { WorkflowTransitionError } from "../state-machine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(
  __dirname,
  "../../../docs/workflow_template.yaml",
);

class InMemoryWorkflowVersionRepository
  implements WorkflowVersionRepository
{
  private records: WorkflowVersionRecord[] = [];
  private sequence = 1;

  async insert(input: Parameters<WorkflowVersionRepository["insert"]>[0]) {
    const record: WorkflowVersionRecord = {
      id: `version-${this.sequence++}`,
      workflowId: input.workflowId,
      version: input.version,
      title: input.title,
      description: input.description,
      sourceYaml: input.sourceYaml,
      template: input.template,
      checksum: input.checksum,
      isActive: input.isActive,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };

    this.records.push(record);
    return { ...record };
  }

  async list(workflowId: string) {
    return this.records
      .filter((record) => record.workflowId === workflowId)
      .map((record) => ({ ...record }));
  }

  async findActive(workflowId: string) {
    const active = this.records.find(
      (record) => record.workflowId === workflowId && record.isActive,
    );
    return active ? { ...active } : null;
  }

  async findByVersion(workflowId: string, version: string) {
    const record = this.records.find(
      (item) => item.workflowId === workflowId && item.version === version,
    );
    return record ? { ...record } : null;
  }

  async findById(id: string) {
    const record = this.records.find((item) => item.id === id);
    return record ? { ...record } : null;
  }

  async markActive(workflowId: string, versionId: string) {
    this.records = this.records.map((record) => {
      if (record.workflowId !== workflowId) {
        return record;
      }

      return {
        ...record,
        isActive: record.id === versionId,
      };
    });
  }
}

class InMemoryDealRepository implements WorkflowDealRepository {
  private deals: Map<string, WorkflowDeal> = new Map();

  constructor(initialDeals: WorkflowDeal[]) {
    for (const deal of initialDeals) {
      this.deals.set(deal.id, { ...deal });
    }
  }

  async getDealById(id: string) {
    const deal = this.deals.get(id);
    return deal ? { ...deal } : null;
  }

  async updateDealStatus({
    dealId,
    previousStatus,
    status,
    workflowVersionId,
  }: Parameters<WorkflowDealRepository["updateDealStatus"]>[0]) {
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw new Error(`Deal '${dealId}' not found`);
    }

    if (deal.status !== previousStatus) {
      throw new Error(
        `Deal '${dealId}' status mismatch: expected '${previousStatus}', got '${deal.status}'`,
      );
    }

    this.deals.set(dealId, {
      ...deal,
      status,
      workflowVersionId,
    });
  }

  getCurrent(dealId: string) {
    const deal = this.deals.get(dealId);
    if (!deal) throw new Error(`Deal '${dealId}' not found`);
    return deal;
  }
}

type WorkflowAuditLoggerEntry = Parameters<WorkflowAuditLogger["logTransition"]>[0];

class InMemoryAuditLogger implements WorkflowAuditLogger {
  public entries: WorkflowAuditLoggerEntry[] = [];

  async logTransition(entry: WorkflowAuditLoggerEntry) {
    this.entries.push(entry);
  }
}

describe("WorkflowService", () => {
  const yaml = readFileSync(TEMPLATE_PATH, "utf-8");
  let versionRepository: InMemoryWorkflowVersionRepository;
  let versionService: WorkflowVersionService;
  let auditLogger: InMemoryAuditLogger;
  let dealRepository: InMemoryDealRepository;
  let workflowService: WorkflowService;
  let activeVersion: WorkflowVersionRecord;

  beforeEach(async () => {
    versionRepository = new InMemoryWorkflowVersionRepository();
    versionService = new WorkflowVersionService(versionRepository);

    activeVersion = await versionService.createVersion({
      sourceYaml: yaml,
      version: "fast-lease-v1",
      activate: true,
    });

    dealRepository = new InMemoryDealRepository([
      {
        id: "deal-1",
        workflowId: "fast-lease-v1",
        workflowVersionId: null,
        status: "NEW",
        payload: null,
      },
      {
        id: "deal-guard",
        workflowId: "fast-lease-v1",
        workflowVersionId: null,
        status: "NEW",
        payload: null,
      },
    ]);

    auditLogger = new InMemoryAuditLogger();

    workflowService = new WorkflowService({
      versionService,
      dealRepository,
      auditLogger,
    });
  });

  it("updates deal status and logs audit when transition succeeds", async () => {
    const output = await workflowService.transitionDeal({
      dealId: "deal-1",
      targetStatus: "OFFER_PREP",
      actorRole: "OP_MANAGER",
      guardContext: {
        quotationPrepared: true,
      },
    });

    expect(output.newStatus).toBe("OFFER_PREP");
    const updatedDeal = dealRepository.getCurrent("deal-1");
    expect(updatedDeal.status).toBe("OFFER_PREP");
    expect(updatedDeal.workflowVersionId).toBe(activeVersion.id);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      dealId: "deal-1",
      toStatus: "OFFER_PREP",
    });
  });

  it("allows supervisor roles to bypass transition role restrictions", async () => {
    const output = await workflowService.transitionDeal({
      dealId: "deal-1",
      targetStatus: "OFFER_PREP",
      actorRole: "ADMIN",
      guardContext: {
        quotationPrepared: true,
      },
    });

    expect(output.newStatus).toBe("OFFER_PREP");
    const updatedDeal = dealRepository.getCurrent("deal-1");
    expect(updatedDeal.status).toBe("OFFER_PREP");
  });

  it("throws when guard conditions fail", async () => {
    const sleepSpy = vi
      .spyOn(WorkflowService.prototype as unknown as { sleep(ms: number): Promise<void> }, "sleep")
      .mockResolvedValue();

    await expect(
      workflowService.transitionDeal({
        dealId: "deal-guard",
        targetStatus: "OFFER_PREP",
        actorRole: "OP_MANAGER",
      }),
    ).rejects.toBeInstanceOf(WorkflowTransitionError);

    sleepSpy.mockRestore();
  });

  it("resyncs deal version and triggers entry actions", async () => {
    // 1. Create a deal with old/null version
    // (deal-1 already has null version and status NEW)
    
    // 2. Mock action executor
    const actionExecutor = vi.fn();
    workflowService = new WorkflowService({
      versionService,
      dealRepository,
      auditLogger,
      actionExecutor,
    });

    // 3. Call resync
    const output = await workflowService.resyncDeal("deal-1");

    // 4. Assertions
    expect(output.newStatus).toBe("NEW");
    expect(output.workflowVersionId).toBe(activeVersion.id);
    
    // Check DB update
    const updatedDeal = dealRepository.getCurrent("deal-1");
    expect(updatedDeal.workflowVersionId).toBe(activeVersion.id);

    // Check actions executed
    expect(actionExecutor).toHaveBeenCalled();
    expect(actionExecutor).toHaveBeenCalledTimes(2);
    
    // Verify first call is TASK_CREATE
    const calls = actionExecutor.mock.calls;
    const taskAction = calls.find(call => call[0].type === "TASK_CREATE");
    expect(taskAction).toBeDefined();
    expect(taskAction?.[0].task.templateId).toBe("prepare_quote_v1");
    
    // Verify context
    const context = taskAction?.[1];
    expect(context?.transition?.from).toBe("NEW");
    expect(context?.transition?.to).toBe("NEW");
    expect(context?.actorRole).toBe("ADMIN");
  });
});
