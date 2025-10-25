import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createWorkflowActionExecutor } from "../actions";
import type { WorkflowTemplate } from "../types";

const createUpsertChain = (data: unknown) => {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const upsert = vi.fn().mockReturnValue({ select });
  return { upsert, select, maybeSingle };
};

const createSupabaseMock = () => {
  const taskChain = createUpsertChain({ id: "task-1" });
  const notificationChain = createUpsertChain({ id: "notif-1" });
  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const fromMock = vi.fn((table: string) => {
    switch (table) {
      case "tasks":
        return { upsert: taskChain.upsert };
      case "workflow_notification_queue":
        return { upsert: notificationChain.upsert };
      case "audit_log":
        return { insert: auditInsert };
      default:
        return { upsert: createUpsertChain({ id: "noop" }).upsert };
    }
  });

  const client = {
    from: fromMock,
  } as unknown as SupabaseClient;

  return {
    client,
    fromMock,
    taskChain,
    notificationChain,
    auditInsert,
  };
};

describe("workflow action executor", () => {
  it("создает задачу при TASK_CREATE", async () => {
    const { client, fromMock, taskChain, auditInsert } = createSupabaseMock();
    const executor = createWorkflowActionExecutor(client);

    await executor(
      {
        type: "TASK_CREATE",
        task: {
          type: "PREPARE_QUOTE",
          title: "Подготовить КП",
          assigneeRole: "OP_MANAGER",
          sla: { hours: 4 },
        },
      },
      {
        actorRole: "OP_MANAGER",
        transition: { from: "NEW", to: "OFFER_PREP" },
        template: {} as WorkflowTemplate,
        dealId: "deal-1",
      },
    );

    expect(fromMock).toHaveBeenCalledWith("tasks");
    const [taskPayload, taskOptions] = taskChain.upsert.mock.calls[0];
    expect(taskPayload).toMatchObject({
      deal_id: "deal-1",
      type: "PREPARE_QUOTE",
      assignee_role: "OP_MANAGER",
      status: "OPEN",
      action_hash: expect.any(String),
      payload: expect.objectContaining({
        title: "Подготовить КП",
        status_key: "OFFER_PREP",
        status_title: "OFFER_PREP",
      }),
    });
    expect(taskOptions).toMatchObject({
      onConflict: "action_hash",
      ignoreDuplicates: true,
    });
    expect(taskChain.select).toHaveBeenCalledWith("id");
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TASK_CREATE" }),
    );
  });

  it("логирует уведомление при NOTIFY", async () => {
    const { client, fromMock, notificationChain, auditInsert } =
      createSupabaseMock();
    const executor = createWorkflowActionExecutor(client);

    await executor(
      {
        type: "NOTIFY",
        toRoles: ["OP_MANAGER"],
        template: "new_deal_created",
      },
      {
        actorRole: "ADMIN",
        transition: { from: "NEW", to: "OFFER_PREP" },
        template: {
          workflow: { id: "test", title: "Test", entity: "Deal", ownerRole: "ADMIN", timezone: "UTC" },
          roles: [{ code: "ADMIN", name: "Admin", categories: ["auth"] }],
          kanbanOrder: [],
          stages: {},
          transitions: [],
          permissions: {},
          integrations: {},
          metrics: { enabled: false },
          notifications: {
            channels: [],
            templates: {
              new_deal_created: "Создана новая заявка",
            },
          },
        } as WorkflowTemplate,
        dealId: "deal-1",
      },
    );

    expect(fromMock).toHaveBeenCalledWith("workflow_notification_queue");
    const [notificationPayload, notificationOptions] =
      notificationChain.upsert.mock.calls[0];
    expect(notificationPayload).toMatchObject({
      kind: "NOTIFY",
      template: "new_deal_created",
      to_roles: ["OP_MANAGER"],
      action_hash: expect.any(String),
      payload: expect.objectContaining({ message: expect.stringContaining("Создана") }),
    });
    expect(notificationOptions).toMatchObject({
      onConflict: "action_hash",
      ignoreDuplicates: true,
    });
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "NOTIFY_TRIGGER" }),
    );
  });
});
