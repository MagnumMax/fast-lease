import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it } from "vitest";

import {
  WorkflowVersionService,
  type WorkflowVersionRecord,
  type WorkflowVersionRepository,
  getWorkflowVersionChecksum,
} from "@/lib/workflow/versioning";
import { ensureActiveWorkflowVersion } from "@/lib/workflow/http/create-deal";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dirname, "../../../../docs/workflow_template.yaml");
const TEMPLATE_SOURCE = readFileSync(TEMPLATE_PATH, "utf-8");
const TEMPLATE_CHECKSUM = getWorkflowVersionChecksum(TEMPLATE_SOURCE);

class InMemoryWorkflowVersionRepository implements WorkflowVersionRepository {
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
      createdAt: new Date(0).toISOString(),
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

  async syncTaskTemplates() {
    return;
  }
}

describe("ensureActiveWorkflowVersion", () => {
  let repository: InMemoryWorkflowVersionRepository;
  let service: WorkflowVersionService;

  beforeEach(() => {
    repository = new InMemoryWorkflowVersionRepository();
    service = new WorkflowVersionService(repository);
  });

  it("creates and reuses the default workflow version", async () => {
    const created = await ensureActiveWorkflowVersion(service);

    expect(created).not.toBeNull();
    expect(created?.isActive).toBe(true);
    expect(created?.checksum).toBe(TEMPLATE_CHECKSUM);

    const again = await ensureActiveWorkflowVersion(service);
    expect(again?.id).toBe(created?.id);
  });

  it("activates an existing matching version when the active one is stale", async () => {
    const stale = await repository.insert({
      workflowId: "fast-lease-v1",
      version: "legacy-version",
      title: "Legacy",
      description: null,
      sourceYaml: "legacy",
      template: {} as WorkflowVersionRecord["template"],
      checksum: "legacy-checksum",
      createdBy: null,
      isActive: true,
    });

    const cached = await repository.insert({
      workflowId: "fast-lease-v1",
      version: "cached-version",
      title: "Cached",
      description: null,
      sourceYaml: TEMPLATE_SOURCE,
      template: {} as WorkflowVersionRecord["template"],
      checksum: TEMPLATE_CHECKSUM,
      createdBy: null,
      isActive: false,
    });

    expect(stale.isActive).toBe(true);
    expect(cached.isActive).toBe(false);

    const synchronized = await ensureActiveWorkflowVersion(service);

    expect(synchronized?.id).toBe(cached.id);
    expect(synchronized?.isActive).toBe(true);

    const active = await service.getActiveVersion("fast-lease-v1");
    expect(active?.id).toBe(cached.id);
    expect(active?.checksum).toBe(TEMPLATE_CHECKSUM);
  });
});
