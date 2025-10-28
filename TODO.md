# Workflow Tasks Unification Plan

## 1. Database & Schema
- [x] Create fresh `public.tasks` table (id, deal_id nullable, type, status, title, assignee_role, assignee_user_id, sla_due_at, completed_at, sla_status, payload jsonb, action_hash, created_at, updated_at) + indexes on `deal_id`, `status`, `sla_due_at`, `assignee_user_id`.
- [x] Add `workflow_task_templates` table (`id uuid`, `workflow_version_id`, `template_id`, `type`, `schema jsonb`, `default_payload jsonb`, timestamps) to cache YAML definitions.
- [x] Update Supabase migrations & seed to drop legacy task tables/data (permitted wipe) and apply new schema.

## 2. Workflow Specification & Parser
- [x] Extend `docs/workflow_template.yaml` TASK_CREATE actions with `template_id`, `schema`, `bindings`.
- [x] Update `lib/workflow/parser.ts` + types to read new fields and validate schema/bindings.
- [x] Ensure workflow versioning pipeline persists parsed task templates into `workflow_task_templates`.

## 3. Workflow Engine & Queue
- [x] Introduce `processTaskCreates` stage in `WorkflowQueueProcessor` that executes TASK_CREATE actions asynchronously (reused queue runner `app/api/workflow/queues/run/route.ts`).
- [x] Implement idempotent task upsert using `action_hash` (deal_id + transition + template_id + guard_key) and keep payload/sla in sync when context changes.
- [x] On task completion, update `guard_tasks[guard_key]`, set `completed_at`, recompute `sla_status`; add background SLA monitor to mark `WARNING/BREACHED`.

## 4. API Layer
- [x] Create `/api/tasks` REST endpoints (list/create/update) that serve unified tasks with filters by assignee, status, type, deal.
- [x] Refactor `/api/deals/[id]/tasks` to proxy the same data source and remove redundant logic.
- [x] Update task mutation endpoints (`/api/tasks/:id/start`, `/api/tasks/:id/complete`, etc.) to write guard flags + SLA fields.

## 5. UI/UX
- [x] Build unified task inbox component showing manual + workflow tasks with filters (status, deal, type) and visual workflow badge.
- [x] Update deal workspace pages to consume new task API and render dynamic payload (checklists, bindings, etc.).
- [x] Add manual task form (nullable `deal_id`) and workflow task viewer that interprets `payload.schema`.

## 6. Testing & Verification
- [ ] Extend workflow unit tests to cover new schema parsing, template persistence, task generation, SLA recalculation.
- [ ] Add API tests (vitest) for `/api/tasks` CRUD and SLA edge cases.
- [ ] Manual QA checklist: run migrations, seed sample workflow, trigger transitions → verify tasks appear in inbox and guard rules honor completion.

## 7. Rollout
- [ ] Document migration steps + rollback strategy in `docs/workflow_operations.md`.
- [ ] Communicate downtime (tasks wiped) and provide operator training on new UI.
