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

const createSelectChain = (data: unknown) => {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, maybeSingle };
};

const createSupabaseMock = () => {
  const tasksChain = createUpsertChain({ id: "task-1" });
  const dealsChain = createSelectChain({
    id: "deal-1",
    payload: { finance: { monthly_payment: 1200 } },
    client_id: "client-1",
    asset_id: "asset-1",
    source: "web",
    op_manager_id: "user-ops",
  });
  const notificationChain = createUpsertChain({ id: "notif-1" });
  const profilesChain = createSelectChain({
    seller_details: { seller_contact_email: "seller@example.com" },
    entity_type: "company",
  });
  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const fromMock = vi.fn((table: string) => {
    switch (table) {
      case "tasks":
        return { upsert: tasksChain.upsert };
      case "deals":
        return { select: dealsChain.select };
      case "profiles":
        return { select: profilesChain.select };
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
    tasksChain,
    dealsChain,
    profilesChain,
    notificationChain,
    auditInsert,
  };
};

describe("workflow action executor", () => {
  it("pre-fills task fields from seller profile", async () => {
    const { client, tasksChain, dealsChain } = createSupabaseMock();
    
    // Update deal mock to include seller_id
    dealsChain.maybeSingle.mockResolvedValue({
      data: {
        id: "deal-1",
        payload: { finance: { monthly_payment: 1200 } },
        client_id: "client-1",
        seller_id: "seller-1",
        asset_id: "asset-1",
        source: "web",
        op_manager_id: "user-ops",
      },
      error: null,
    });

    const executor = createWorkflowActionExecutor(client);

    await executor(
      {
        type: "TASK_CREATE",
        task: {
          templateId: "collect_seller_docs",
          type: "COLLECT_DOCS",
          title: "Collect Docs",
          assigneeRole: "OP_MANAGER",
          schema: {
            version: "1.0",
            fields: [{ id: "seller_contact_email", type: "string" }],
          },
        },
      },
      {
        actorRole: "OP_MANAGER",
        transition: { from: "A", to: "B" },
        template: {
          workflow: { id: "wf-1" },
        } as any,
        dealId: "deal-1",
        payload: {},
      },
    );

    const [taskPayload] = tasksChain.upsert.mock.calls[0];
    expect(taskPayload).toMatchObject({
      payload: expect.objectContaining({
        fields: expect.objectContaining({
          seller_contact_email: "seller@example.com",
        }),
      }),
    });
  });

  it("создает задачу при TASK_CREATE", async () => {
    const { client, fromMock, tasksChain, dealsChain, auditInsert } = createSupabaseMock();
    const executor = createWorkflowActionExecutor(client);

    await executor(
      {
        type: "TASK_CREATE",
        task: {
          templateId: "prepare_quote_v1",
          type: "PREPARE_QUOTE",
          title: "Подготовить КП",
          assigneeRole: "OP_MANAGER",
          sla: { hours: 4 },
        },
      },
      {
        actorRole: "OP_MANAGER",
        transition: { from: "NEW", to: "OFFER_PREP" },
        template: {
          workflow: {
            id: "fast-lease-v1",
            title: "Fast Lease",
            entity: "Deal",
            ownerRole: "OP_MANAGER",
            timezone: "Asia/Dubai",
          },
          roles: [],
          kanbanOrder: [],
          stages: {
            OFFER_PREP: { code: "OFFER_PREP", title: "Подготовка предложения" },
          },
          transitions: [],
          permissions: {},
          integrations: {},
          metrics: { enabled: false },
          notifications: { channels: [], templates: {} },
        } as WorkflowTemplate,
        dealId: "deal-1",
        payload: { finance: {} },
      },
    );

    expect(fromMock).toHaveBeenCalledWith("deals");
    expect(dealsChain.select).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("tasks");
    const [taskPayload, taskOptions] = tasksChain.upsert.mock.calls[0];
    expect(taskPayload).toMatchObject({
      deal_id: "deal-1",
      action_hash: expect.any(String),
      type: "PREPARE_QUOTE",
      title: "Подготовить КП",
      status: "OPEN",
      assignee_role: "OP_MANAGER",
      assignee_user_id: "user-ops",
      payload: expect.objectContaining({
        template_id: "prepare_quote_v1",
        status_key: "OFFER_PREP",
        status_title: "Подготовка предложения",
        workflow: expect.objectContaining({ id: "fast-lease-v1" }),
      }),
      sla_status: "ON_TRACK",
    });
    expect(taskOptions).toMatchObject({
      onConflict: "action_hash",
    });
    expect(tasksChain.select).toHaveBeenCalledWith("id");
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

  it("creates a task with extended fields (template, schema, bindings)", async () => {
    const { client, tasksChain } = createSupabaseMock();
    const executor = createWorkflowActionExecutor(client);

    await executor(
      {
        type: "TASK_CREATE",
        task: {
          templateId: "extended_task_v1",
          type: "MANUAL_TASK",
          title: "Extended Task",
          assigneeRole: "ADMIN",
          sla: { hours: 24 },
          schema: {
            version: "1.0",
            fields: [{ id: "f1", type: "string" }],
          },
          bindings: { deal_id: "{{deal.id}}" },
          defaults: { priority: "high" },
          guardKey: "guard.key",
        },
      },
      {
        actorRole: "ADMIN",
        transition: { from: "A", to: "B" },
        template: {
          workflow: { id: "wf-1" },
        } as any,
        dealId: "deal-1",
        payload: {},
      },
    );

    const [taskPayload] = tasksChain.upsert.mock.calls[0];
    expect(taskPayload).toMatchObject({
      payload: expect.objectContaining({
        template_id: "extended_task_v1",
        schema_version: "1.0",
        schema: {
          version: "1.0",
          fields: [{ id: "f1", type: "string" }],
        },
        defaults: { priority: "high" },
        guard_key: "guard.key",
        fields: expect.objectContaining({
          priority: "high",
          deal_id: "deal-1",
        }),
      }),
      sla_status: "ON_TRACK",
      sla_due_at: expect.any(String),
    });
  });
});
