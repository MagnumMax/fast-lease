import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, beforeEach } from "vitest";

import {
  WorkflowVersionService,
  type WorkflowVersionRecord,
  type WorkflowVersionRepository,
  type WorkflowTaskTemplateCacheEntry,
} from "../versioning";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(
  __dirname,
  "../../../docs/workflow_template.yaml",
);

const BASE_CREATED_AT = "2025-01-01T00:00:00.000Z";

class InMemoryWorkflowVersionRepository
  implements WorkflowVersionRepository {
  private records: WorkflowVersionRecord[] = [];
  public taskTemplates: Record<string, WorkflowTaskTemplateCacheEntry[]> = {};
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
      createdAt: new Date(BASE_CREATED_AT).toISOString(),
    };

    this.records.push(record);
    return record;
  }

  async list(workflowId: string) {
    return this.records
      .filter((record) => record.workflowId === workflowId)
      .map((record) => ({ ...record }));
  }

  async findActive(workflowId: string) {
    const record = this.records.find(
      (item) => item.workflowId === workflowId && item.isActive,
    );
    return record ? { ...record } : null;
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

      if (record.id === versionId) {
        return { ...record, isActive: true };
      }

      return { ...record, isActive: false };
    });
  }

  async syncTaskTemplates(
    versionId: string,
    templates: WorkflowTaskTemplateCacheEntry[],
  ) {
    this.taskTemplates[versionId] = templates;
  }
}

describe("WorkflowVersionService", () => {
  const yaml = readFileSync(TEMPLATE_PATH, "utf-8");
  let repository: InMemoryWorkflowVersionRepository;
  let service: WorkflowVersionService;

  beforeEach(() => {
    repository = new InMemoryWorkflowVersionRepository();
    service = new WorkflowVersionService(repository);
  });

  it("creates a new version and stores parsed template", async () => {
    const record = await service.createVersion({
      sourceYaml: yaml,
      version: "2025-02-12",
    });

    expect(record.workflowId).toBe("fast-lease-v1");
    expect(record.version).toBe("2025-02-12");
    expect(record.template.workflow.title).toContain("Fast Lease");

    const summary = await service.listVersions("fast-lease-v1");
    expect(summary).toHaveLength(1);
    expect(summary[0]).toEqual(
      expect.objectContaining({
        version: "2025-02-12",
        checksum: record.checksum,
        isActive: false,
      }),
    );
  });

  it("activates the version when requested", async () => {
    const record = await service.createVersion({
      sourceYaml: yaml,
      version: "fast-lease-v1",
      activate: true,
    });

    expect(record.isActive).toBe(true);

    const active = await service.getActiveTemplate("fast-lease-v1");
    expect(active?.workflow.id).toBe("fast-lease-v1");
  });

  it("throws when workflow id does not match template", async () => {
    await expect(
      service.createVersion({
        sourceYaml: yaml,
        workflowId: "fast-lease-v2",
      }),
    ).rejects.toThrow(/Workflow ID mismatch/);
  });

  it("syncs task templates when creating a version", async () => {
    const record = await service.createVersion({
      sourceYaml: yaml,
      version: "2025-02-12",
    });

    const templates = repository.taskTemplates[record.id];
    expect(templates).toBeDefined();
    expect(templates.length).toBeGreaterThan(0);

    const confirmCar = templates.find((t) => t.templateId === "confirm_car_v1");
    expect(confirmCar).toBeDefined();
    expect(confirmCar).toMatchObject({
      taskType: "CONFIRM_CAR",
      defaults: {
        instructions: expect.stringContaining("Свяжитесь с дилером"),
      },
    });
    expect(confirmCar?.schema).toMatchObject({
      version: "1.0",
      fields: expect.arrayContaining([
        expect.objectContaining({ id: "deal_id" }),
      ]),
    });
  });
});
