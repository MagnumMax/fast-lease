import { describe, expect, it } from "vitest";

import { resolveAutoTransitionPlan } from "../task-completion";
import type { WorkflowTemplate } from "../types";

const template: WorkflowTemplate = {
  workflow: {
    id: "fast-lease-v1",
    title: "Test",
    entity: "Deal",
    ownerRole: "OP_MANAGER",
    timezone: "UTC",
  },
  roles: [
    {
      code: "OP_MANAGER",
      name: "Ops",
      categories: ["auth", "workflow"],
    },
  ],
  kanbanOrder: ["DOC_SIGNING", "SIGNING_FUNDING"],
  stages: {
    DOC_SIGNING: {
      code: "DOC_SIGNING",
      title: "Doc signing",
      exitRequirements: [{ key: "contracts.signedUploaded", rule: "== true" }],
    },
    SIGNING_FUNDING: {
      code: "SIGNING_FUNDING",
      title: "Signing & funding",
    },
  },
  transitions: [
    {
      from: "DOC_SIGNING",
      to: "SIGNING_FUNDING",
      byRoles: ["OP_MANAGER"],
      guards: [{ key: "contracts.signedUploaded", rule: "== true" }],
    },
  ],
  permissions: {
    STATUS_TRANSITION: {
      kind: "roles",
      roles: ["OP_MANAGER"],
    },
  },
  integrations: {
    retries: { policy: "exponential" },
  },
  metrics: { enabled: false },
  notifications: { channels: [], templates: {} },
};

describe("resolveAutoTransitionPlan", () => {
  it("отмечает несоответствие guard ключа", () => {
    const plan = resolveAutoTransitionPlan({
      template,
      currentStatus: "DOC_SIGNING",
      guardKey: "other.guard",
      guardContext: { contracts: { signedUploaded: true } },
    });

    expect(plan.statusFound).toBe(true);
    expect(plan.guardMatched).toBe(false);
    expect(plan.exitGuardKeys).toEqual(["contracts.signedUploaded"]);
  });

  it("возвращает неудовлетворенные guard'ы при неверном значении", () => {
    const plan = resolveAutoTransitionPlan({
      template,
      currentStatus: "DOC_SIGNING",
      guardKey: "contracts.signedUploaded",
      guardContext: { contracts: { signedUploaded: false } },
    });

    expect(plan.guardMatched).toBe(true);
    expect(plan.unsatisfiedGuards).toEqual(["contracts.signedUploaded"]);
    expect(plan.targetStatus).toBe("SIGNING_FUNDING");
  });

  it("находит следующий статус, когда guard выполнен", () => {
    const plan = resolveAutoTransitionPlan({
      template,
      currentStatus: "DOC_SIGNING",
      guardKey: "contracts.signedUploaded",
      guardContext: { contracts: { signedUploaded: true } },
    });

    expect(plan.unsatisfiedGuards).toHaveLength(0);
    expect(plan.targetStatus).toBe("SIGNING_FUNDING");
    expect(plan.guardMatched).toBe(true);
  });
});
