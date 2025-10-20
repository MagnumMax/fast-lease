import { createHash } from "node:crypto";

import { parseWorkflowTemplate } from "./parser";
import type { WorkflowTemplate } from "./types";

export type WorkflowVersionRecord = {
  id: string;
  workflowId: string;
  version: string;
  title: string;
  description: string | null;
  sourceYaml: string;
  template: WorkflowTemplate;
  checksum: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
};

export type CreateWorkflowVersionInput = {
  workflowId?: string;
  version?: string;
  title?: string;
  description?: string | null;
  sourceYaml: string;
  createdBy?: string | null;
  activate?: boolean;
};

export type WorkflowVersionSummary = {
  id: string;
  workflowId: string;
  version: string;
  title: string;
  checksum: string;
  isActive: boolean;
  createdAt: string;
};

export interface WorkflowVersionRepository {
  insert(input: {
    workflowId: string;
    version: string;
    title: string;
    description: string | null;
    sourceYaml: string;
    template: WorkflowTemplate;
    checksum: string;
    createdBy: string | null;
    isActive: boolean;
  }): Promise<WorkflowVersionRecord>;

  list(workflowId: string): Promise<WorkflowVersionRecord[]>;

  findActive(workflowId: string): Promise<WorkflowVersionRecord | null>;

  findByVersion(workflowId: string, version: string): Promise<WorkflowVersionRecord | null>;

  findById(id: string): Promise<WorkflowVersionRecord | null>;

  markActive(workflowId: string, versionId: string): Promise<void>;
}

function computeChecksum(source: string): string {
  return createHash("sha256").update(source, "utf8").digest("hex");
}

export class WorkflowVersionService {
  constructor(private readonly repository: WorkflowVersionRepository) {}

  async createVersion(
    input: CreateWorkflowVersionInput,
  ): Promise<WorkflowVersionRecord> {
    const { sourceYaml } = input;
    if (!sourceYaml) {
      throw new Error("Workflow version source YAML is required");
    }

    const parsed = parseWorkflowTemplate(sourceYaml);

    const workflowId = input.workflowId ?? parsed.workflow.id;
    if (parsed.workflow.id !== workflowId) {
      throw new Error(
        `Workflow ID mismatch: template declares '${parsed.workflow.id}', expected '${workflowId}'`,
      );
    }

    const version = input.version ?? parsed.workflow.id;
    const title = input.title ?? parsed.workflow.title;
    const description = input.description ?? null;
    const checksum = computeChecksum(sourceYaml);

    const existing = await this.repository.findByVersion(workflowId, version);
    if (existing) {
      throw new Error(
        `Workflow version '${version}' already exists for workflow '${workflowId}'`,
      );
    }

    const record = await this.repository.insert({
      workflowId,
      version,
      title,
      description,
      sourceYaml,
      template: parsed,
      checksum,
      createdBy: input.createdBy ?? null,
      isActive: Boolean(input.activate),
    });

    if (input.activate) {
      await this.repository.markActive(workflowId, record.id);
      return { ...record, isActive: true };
    }

    return record;
  }

  async listVersions(workflowId: string): Promise<WorkflowVersionSummary[]> {
    const records = await this.repository.list(workflowId);
    return records.map((record) => ({
      id: record.id,
      workflowId: record.workflowId,
      version: record.version,
      title: record.title,
      checksum: record.checksum,
      isActive: record.isActive,
      createdAt: record.createdAt,
    }));
  }

  async getActiveTemplate(workflowId: string): Promise<WorkflowTemplate | null> {
    const record = await this.repository.findActive(workflowId);
    return record ? record.template : null;
  }

  async getActiveVersion(
    workflowId: string,
  ): Promise<WorkflowVersionRecord | null> {
    return this.repository.findActive(workflowId);
  }

  async getVersionById(id: string): Promise<WorkflowVersionRecord | null> {
    return this.repository.findById(id);
  }

  async activateVersion(workflowId: string, versionId: string): Promise<void> {
    await this.repository.markActive(workflowId, versionId);
  }
}

export function getWorkflowVersionChecksum(sourceYaml: string): string {
  return computeChecksum(sourceYaml);
}
