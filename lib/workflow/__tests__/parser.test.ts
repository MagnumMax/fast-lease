import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  loadWorkflowTemplate,
  parseWorkflowTemplate,
  WorkflowTemplateParseError,
} from "../parser";

const TEMPLATE_PATH = resolve(
  __dirname,
  "../../../docs/workflow_template.yaml",
);

describe("workflow template parser", () => {
  const yaml = readFileSync(TEMPLATE_PATH, "utf-8");

  it("parses the sample template and normalizes fields", () => {
    const template = parseWorkflowTemplate(yaml);

    expect(template.workflow).toEqual(
      expect.objectContaining({
        id: "fast-lease-v1",
        ownerRole: "OP_MANAGER",
        timezone: "Asia/Dubai",
      }),
    );

    expect(template.roles).toHaveLength(10);

    const signingFunding = template.stages.SIGNING_FUNDING;
    expect(signingFunding).toBeDefined();
    expect(signingFunding.entryActions?.[0]).toEqual(
      expect.objectContaining({ type: "WEBHOOK" }),
    );
    expect(signingFunding.webhooks?.onEvent?.[0]).toEqual(
      expect.objectContaining({ transitionTo: "VEHICLE_DELIVERY" }),
    );

    expect(template.transitions[0]).toEqual(
      expect.objectContaining({
        from: "NEW",
        to: "OFFER_PREP",
        byRoles: ["OP_MANAGER"],
      }),
    );

    const statusPermissions = template.permissions.STATUS_TRANSITION;
    expect(statusPermissions).toEqual(
      expect.objectContaining({ kind: "rules" }),
    );

    expect(template.integrations.retries).toEqual(
      expect.objectContaining({
        policy: "exponential",
        baseMs: 500,
        maxRetries: 5,
      }),
    );

    expect(template.metrics.export?.prometheus).toBe("/metrics/process");
    expect(template.notifications.templates).toHaveProperty(
      "new_deal_created",
    );
  });

  it("loads from the filesystem", () => {
    const template = loadWorkflowTemplate(TEMPLATE_PATH);
    expect(template.workflow.id).toBe("fast-lease-v1");
  });

  it("throws a parse error when referencing unknown statuses", () => {
    const invalidYaml = `
workflow:
  id: sample
  title: Sample
  entity: Deal
  owner_role: ADMIN
  timezone: UTC
roles:
  - code: ADMIN
    name: Admin
    categories: [auth]
kanban_order: [UNKNOWN]
statuses:
  VALID:
    title: Valid
transitions:
  - from: VALID
    to: VALID
    by_roles: [ADMIN]
permissions:
  SAMPLE:
    roles: [ADMIN]
integrations: {}
metrics:
  enabled: false
notifications:
  channels: []
  templates: {}
`;

    expect(() => parseWorkflowTemplate(invalidYaml)).toThrow(
      WorkflowTemplateParseError,
    );
  });
});
