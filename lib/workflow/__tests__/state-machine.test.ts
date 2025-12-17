import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, beforeEach } from "vitest";

import { parseWorkflowTemplate } from "../parser";
import {
  WorkflowStateMachine,
  WorkflowTransitionError,
  type WorkflowActionContext,
} from "../state-machine";
import type { WorkflowAction } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(
  __dirname,
  "../../../docs/workflow_template.yaml",
);

describe("WorkflowStateMachine", () => {
  const yaml = readFileSync(TEMPLATE_PATH, "utf-8");
  const template = parseWorkflowTemplate(yaml);

  let executed: Array<{ action: WorkflowAction; context: WorkflowActionContext }>;
  let machine: WorkflowStateMachine;

  beforeEach(() => {
    executed = [];
    machine = new WorkflowStateMachine(template, {
      actionExecutor: async (action, context) => {
        executed.push({ action, context });
      },
    });
  });

  it("lists transitions available for a role", () => {
    const available = machine.getAvailableTransitions("NEW", "OP_MANAGER");
    expect(available.map((t) => t.to)).toContain("OFFER_PREP");
  });

  it("rejects transition when guard conditions fail", async () => {
    await expect(
      machine.performTransition({
        from: "DOCS_REVIEW_BUYER",
        to: "DOCS_REVIEW_SELLER",
        actorRole: "OP_MANAGER",
      }),
    ).rejects.toMatchObject({
      name: "WorkflowTransitionError",
      validation: {
        reason: "GUARD_FAILED",
      },
    });
  });

  it("executes entry actions when guards pass", async () => {
    const result = await machine.performTransition({
      from: "DOCS_REVIEW_BUYER",
      to: "DOCS_REVIEW_SELLER",
      actorRole: "OP_MANAGER",
      guardContext: {
        buyer: {
          verified: true,
        },
      },
      actionContext: {
        dealId: "deal-123",
        actorId: "user-ops",
      },
    });

    expect(result.newStatus.code).toBe("DOCS_REVIEW_SELLER");
    expect(executed).toHaveLength((template.stages.DOCS_REVIEW_SELLER.entryActions ?? []).length);
    expect(executed[0]?.context.dealId).toBe("deal-123");
  });

  it("throws when transition is not defined", async () => {
    await expect(
      machine.performTransition({
        from: "NEW",
        to: "ACTIVE",
        actorRole: "OP_MANAGER",
      }),
    ).rejects.toBeInstanceOf(WorkflowTransitionError);
  });
});
