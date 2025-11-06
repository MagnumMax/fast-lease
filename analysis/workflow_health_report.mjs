#!/usr/bin/env node

import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function resolveValueByPath(context, path) {
  if (!path || !context) return undefined;
  return path.split(".").reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== "object") return undefined;
    return acc[key];
  }, context);
}

function parseExpectedValue(raw) {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (!Number.isNaN(Number(value)) && value !== "") {
    return Number(value);
  }
  return value;
}

function evaluateGuard(rule, actual) {
  const trimmed = rule.trim();
  if (trimmed.startsWith("==")) {
    const expected = parseExpectedValue(trimmed.slice(2));
    return { ok: actual === expected, expected };
  }
  if (trimmed.startsWith("!=")) {
    const expected = parseExpectedValue(trimmed.slice(2));
    return { ok: actual !== expected, expected, negate: true };
  }
  if (trimmed === "truthy") {
    return { ok: Boolean(actual), expected: "truthy" };
  }
  if (trimmed === "falsy") {
    return { ok: !actual, expected: "falsy" };
  }
  return { ok: false, unsupported: true };
}

function formatValue(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function main() {
  const { data: version, error: versionError } = await supabase
    .from("workflow_versions")
    .select("id, template")
    .eq("workflow_id", "fast-lease-v1")
    .eq("is_active", true)
    .maybeSingle();

  if (versionError || !version) {
    console.error("Failed to load active workflow template", versionError);
    process.exit(1);
  }

  const template = version.template;
  if (!template || !template.stages) {
    console.error("Workflow template is missing stages");
    process.exit(1);
  }

  const kanbanOrder = template.kanbanOrder || template.kanban_order || [];
  const kanbanIndex = kanbanOrder.reduce((acc, code, idx) => {
    acc[code] = idx;
    return acc;
  }, {});

  const stageTasks = {};
  const taskTypeToStage = {};
  const guardKeyToTaskType = {};

  for (const [stageCode, stage] of Object.entries(template.stages)) {
    const tasks = [];
    for (const action of stage.entryActions || []) {
      if (action.type === "TASK_CREATE") {
        tasks.push(action.task.type);
        taskTypeToStage[action.task.type] = stageCode;
        if (action.task.guardKey) {
          guardKeyToTaskType[action.task.guardKey] = action.task.type;
        }
      }
    }
    stageTasks[stageCode] = tasks;
  }

  const incomingGuards = {};
  const outgoingTransitions = {};

  for (const transition of template.transitions || []) {
    if (!incomingGuards[transition.to]) {
      incomingGuards[transition.to] = [];
    }
    if (transition.guards) {
      incomingGuards[transition.to].push(...transition.guards);
    }
    if (!outgoingTransitions[transition.from]) {
      outgoingTransitions[transition.from] = [];
    }
    outgoingTransitions[transition.from].push(transition);
  }

  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("id, status, payload, workflow_id, workflow_version_id, created_at, source, op_manager_id")
    .order("created_at", { ascending: true });

  if (dealsError) {
    console.error("Failed to load deals", dealsError);
    process.exit(1);
  }

  if (!deals || deals.length === 0) {
    console.log("No deals found");
    return;
  }

  const dealIds = deals.map((deal) => deal.id);
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, deal_id, type, status, assignee_role, created_at, completed_at, payload")
    .in("deal_id", dealIds);

  if (tasksError) {
    console.error("Failed to load tasks", tasksError);
    process.exit(1);
  }

  const tasksByDeal = new Map();
  for (const task of tasks || []) {
    if (!tasksByDeal.has(task.deal_id)) {
      tasksByDeal.set(task.deal_id, []);
    }
    tasksByDeal.get(task.deal_id).push(task);
  }

  const report = [];

  for (const deal of deals) {
    const issues = [];
    const warnings = [];
    const stage = template.stages[deal.status];
    const dealTasks = tasksByDeal.get(deal.id) || [];
    const stageTaskTypes = stageTasks[deal.status] || [];
    const stageIndex = kanbanIndex[deal.status];

    for (const expectedTaskType of stageTaskTypes) {
      const matching = dealTasks.filter((task) => task.type === expectedTaskType);
      if (matching.length === 0) {
        issues.push(`Отсутствует задача ${expectedTaskType}, которая должна создаваться на этапе ${deal.status}`);
      }
    }

    for (const task of dealTasks) {
      const taskStage = taskTypeToStage[task.type];
      if (!taskStage) {
        continue;
      }
      const taskStageIndex = kanbanIndex[taskStage];
      if (Number.isInteger(taskStageIndex) && Number.isInteger(stageIndex)) {
        if (taskStageIndex < stageIndex && task.status !== "DONE") {
          issues.push(`Задача ${task.type} (${taskStage}) все еще ${task.status}, хотя сделка ушла дальше (${deal.status})`);
        }
        if (taskStageIndex > stageIndex && task.status !== "CANCELLED") {
          warnings.push(`Задача ${task.type} создана для будущего этапа ${taskStage} (текущий статус ${deal.status})`);
        }
      }
      if (taskStage === deal.status && task.status === "DONE") {
        warnings.push(`Задача ${task.type} завершена, можно готовить переход на следующий этап`);
      }
    }

    const guards = incomingGuards[deal.status] || [];
    for (const guard of guards) {
      const actual = resolveValueByPath(deal.payload || {}, guard.key);
      const evaluation = evaluateGuard(guard.rule, actual);
      if (!evaluation.ok) {
        const expectedText = evaluation.unsupported
          ? `неподдерживаемое правило ${guard.rule}`
          : `ожидалось ${evaluation.negate ? "!=" : "=="} ${formatValue(evaluation.expected)}`;
        issues.push(`Guard ${guard.key} (${guard.rule}) не выполнен (значение ${formatValue(actual)}, ${expectedText})`);
      }
    }

    if (stage && stage.exitRequirements && stage.exitRequirements.length > 0) {
      const unmet = stage.exitRequirements.filter((req) => {
        const actual = resolveValueByPath(deal.payload || {}, req.key);
        const evalResult = evaluateGuard(req.rule, actual);
        return !evalResult.ok;
      });
      if (unmet.length === 0 && (outgoingTransitions[deal.status] || []).length > 0) {
        warnings.push("Все выходные условия выполнены, ожидается переход на следующий этап");
      }
    }

    if (issues.length > 0 || warnings.length > 0) {
      report.push({
        deal,
        issues,
        warnings,
        taskCount: dealTasks.length,
      });
    }
  }

  console.log("=== Workflow Health Report ===");
  console.log(`Всего сделок: ${deals.length}`);
  console.log(`Сделок с обнаруженными проблемами/предупреждениями: ${report.length}`);
  console.log("");

  report.sort((a, b) => {
    const idxA = kanbanIndex[a.deal.status] ?? Infinity;
    const idxB = kanbanIndex[b.deal.status] ?? Infinity;
    if (idxA !== idxB) return idxA - idxB;
    return a.deal.created_at.localeCompare(b.deal.created_at);
  });

  for (const entry of report) {
    console.log(`Deal ${entry.deal.id} — статус ${entry.deal.status} (задач: ${entry.taskCount})`);
    if (entry.issues.length > 0) {
      console.log("  ❌ Нарушения:");
      for (const issue of entry.issues) {
        console.log(`    - ${issue}`);
      }
    }
    if (entry.warnings.length > 0) {
      console.log("  ⚠️ Предупреждения:");
      for (const warning of entry.warnings) {
        console.log(`    - ${warning}`);
      }
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error("Unexpected error while building workflow health report", error);
  process.exit(1);
});

