import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  loadWorkflowTemplate,
  parseWorkflowTemplate,
  WorkflowTemplateParseError,
} from "../parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

  it("parses extended task fields in TASK_CREATE actions", () => {
    const yamlWithTask = `
workflow:
  id: test-v1
  title: Test
  entity: Deal
  owner_role: ADMIN
  timezone: UTC
roles:
  - code: ADMIN
    name: Admin
    categories: [auth]
kanban_order: [STAGE1]
statuses:
  STAGE1:
    title: Stage 1
    entry_actions:
      - type: TASK_CREATE
        task:
          template_id: tpl-1
          type: MANUAL_TASK
          title: Manual Task
          assignee_role: ADMIN
          schema:
            version: "1.0"
            fields:
              - id: field1
                type: string
          bindings:
            deal_id: "\${deal.id}"
          defaults:
            priority: high
          guard_key: "guard-1"
transitions:
  - from: STAGE1
    to: STAGE1
    by_roles: [ADMIN]
permissions: {}
integrations: {}
metrics: { enabled: false }
notifications: { channels: [], templates: {} }
`;

    let template;
    try {
      template = parseWorkflowTemplate(yamlWithTask);
    } catch (error) {
      if (error instanceof WorkflowTemplateParseError) {
        console.error(JSON.stringify(error, null, 2));
        // @ts-ignore
        console.error(JSON.stringify(error.cause, null, 2));
      }
      throw error;
    }
    const action = template.stages.STAGE1.entryActions?.[0];

    if (action?.type !== "TASK_CREATE") {
      throw new Error("Expected TASK_CREATE action");
    }

    expect(action.task).toEqual(
      expect.objectContaining({
        templateId: "tpl-1",
        schema: {
          version: "1.0",
          fields: [{ id: "field1", type: "string" }],
        },
        bindings: { deal_id: "${deal.id}" },
        defaults: { priority: "high" },
        guardKey: "guard-1",
      }),
    );
  });
});
