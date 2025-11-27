# Workflow template catalogue — design

Goal: make `docs/workflow_template.yaml` the single source of truth for workflow roles, statuses, task templates, labels, hints, documents, and transition rules across server and UI.

## Canonical schema (YAML)
- `workflow`: id/title/entity/owner_role/timezone.
- `roles`: array of `{ code, name, categories }`.
- `kanban_order`: ordered list of status keys for board sorting.
- `schemas`: reusable form fragments (e.g., buyer/seller docs) referenced via anchors.
- `statuses`: keyed by status code; each contains `title`, `description?`, `entry_actions[]`, `exit_requirements[]`, optional `sla`.
  - `entry_actions` of type `TASK_CREATE` define the task template: `template_id`, `type`, `title`, `assignee_role`, `guard_key`, `sla`, `schema`, `defaults`, `bindings`, `conditions`.
- `transitions`: `from`, `to`, `by_roles`, `guards`.
- `permissions`, `integrations`, `metrics`, `notifications`: pass-through for consumers that need them.
- Versioning: `template_id` suffix (`_v1`) remains stable for backward compatibility with existing tasks in DB.

## Runtime loader (Node/Edge)
Create `lib/workflow/template-catalog.ts` that:
- Reads `docs/workflow_template.yaml` at runtime (server-side), parses via `js-yaml`, validates via zod schema, and normalises structures into a typed catalogue.
- Exposes `getWorkflowCatalog()` with in-memory cache (invalidated on mtime change in dev, static after first load in prod).
- Produces derived maps:
  - `rolesByCode: Record<string, Role>` and `roleLabels`.
  - `statuses: WorkflowStatus[]` (ordered by `kanban_order`), `statusByKey`.
  - `taskTemplates: Record<template_id, TaskTemplate>` flattened from all `TASK_CREATE` actions; each template carries `type`, `title`, `assignee_role`, `guard_key`, `schema`, `defaults`, `bindings`, `conditions`, `sla`.
  - `exitRequirementsByStatus`, `transitionsByFrom`, `kanbanOrder`.
  - Document field metadata stays on each template schema; no hardcoded labels in code.
- Validation errors throw a descriptive exception that names the offending path.

## Consumption plan
- Server (`lib/supabase/queries/operations*.ts`): replace duplicated `WORKFLOW_ROLES`, `OPS_WORKFLOW_STATUSES`, label maps, and kanban order with values from the catalogue; export thin wrappers if needed.
- UI (`app/(dashboard)/ops/_components/tasks-board.tsx`, `task-detail.tsx`): pull titles/descriptions/labels/hints/options/guard labels from catalogue via template id/status key instead of hardcoded strings. Keep UI-only concerns (local state, filters) out of the catalogue.
- Workflow utilities (`lib/workflow/*`): map guard keys and task templates from the catalogue; provide fallback behaviour for unknown `template_id` (use stored task title/description when missing in YAML and log a warning).

## Backward compatibility
- Keep support for existing tasks with stored `template_id`/fields; when a template id is absent in YAML, render with stored values and mark as `unknown_template` in logs.
- Preserve `template_id` versions; new iterations add `_v2` rather than mutating `_v1`.

## Testing and checks
- Unit tests for the loader: YAML parse/validate, map derivation, cache invalidation.
- Add a small fixture YAML in tests mirroring the real shape.
- Optionally add a CI check that runs loader validation against `docs/workflow_template.yaml`.

## Next steps (implementation order)
1) Implement `template-catalog.ts` with zod schema, loader, cache.
2) Swap server constants to catalogue exports.
3) Swap UI components to catalogue for labels/hints/options.
4) Add tests + CI check; document usage in `README`/`docs`.

## CI/verification
- Use `pnpm workflow:check-catalog` to assert `lib/workflow/catalog.runtime.json` is in sync with `docs/workflow_template.yaml`.
