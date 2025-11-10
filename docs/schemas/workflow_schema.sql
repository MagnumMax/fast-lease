-- =========================================================
-- Fast Lease — schema & seeds (PostgreSQL)
-- Включает: роли, статусы, переходы, базовые сущности,
--           задания, документы, платежи, отчёты по рискам.
-- =========================================================

-- ---------- Расширения ----------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- Справочники ----------

CREATE TABLE roles (
  code TEXT PRIMARY KEY,                   -- OP_MANAGER, RISK_MANAGER, FINANCE, INVESTOR, LEGAL, ACCOUNTING, ADMIN
  name TEXT NOT NULL
);

CREATE TABLE deal_statuses (
  code TEXT PRIMARY KEY,                   -- NEW, OFFER_PREP, ...
  title TEXT NOT NULL,                     -- Человекочитаемое название
  sort_order INT NOT NULL                  -- Для канбана/воронки
);

-- Разрешённые переходы между статусами
CREATE TABLE deal_transitions (
  from_status TEXT REFERENCES deal_statuses(code) ON UPDATE CASCADE ON DELETE CASCADE,
  to_status   TEXT REFERENCES deal_statuses(code) ON UPDATE CASCADE ON DELETE CASCADE,
  role_required TEXT REFERENCES roles(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  PRIMARY KEY (from_status, to_status)
);

-- Версии workflow (история шаблонов бизнес-процесса)
CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_yaml TEXT NOT NULL,
  template JSONB NOT NULL,
  checksum TEXT NOT NULL,
  is_active BOOL NOT NULL DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version)
);

CREATE INDEX workflow_versions_workflow_idx ON workflow_versions(workflow_id);
CREATE UNIQUE INDEX workflow_versions_active_unique ON workflow_versions(workflow_id)
  WHERE is_active;

-- ---------- Основные сущности ----------

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  emirates_id TEXT,                        -- храните токен/маску
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'VEHICLE',    -- для будущих типов активов
  vin TEXT,
  make TEXT,
  model TEXT,
  trim TEXT,
  year INT,
  supplier TEXT,                           -- дилер / брокер
  price NUMERIC(18,2),
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id TEXT NOT NULL DEFAULT 'fast-lease-v1',
  workflow_version_id UUID REFERENCES workflow_versions(id) ON UPDATE CASCADE,
  asset_id UUID REFERENCES assets(id),
  source TEXT,                             -- website/broker/other
  status TEXT REFERENCES deal_statuses(code),
  op_manager_id UUID,                      -- привязка к пользователю из вашей IAM (внешняя)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB                             -- любые доп. поля/фичфлаги
);

CREATE INDEX deals_status_idx ON deals(status);
CREATE INDEX deals_opmgr_idx  ON deals(op_manager_id);
CREATE INDEX deals_workflow_version_id_idx ON deals(workflow_version_id);

CREATE TYPE task_sla_status AS ENUM ('ON_TRACK','WARNING','BREACHED');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE, -- NULL = ручная задача без сделки
  type TEXT NOT NULL,                      -- CONFIRM_CAR / PREPARE_QUOTE / MANUAL / ...
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',     -- OPEN / IN_PROGRESS / DONE / BLOCKED
  assignee_role TEXT,
  assignee_user_id UUID REFERENCES auth.users(id),
  sla_due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sla_status task_sla_status,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  action_hash TEXT,                        -- идемпотентность entry actions (уникальный хэш)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tasks_action_hash_key
  ON tasks(action_hash)
  WHERE action_hash IS NOT NULL;

CREATE INDEX tasks_deal_idx ON tasks(deal_id);
CREATE INDEX tasks_status_idx ON tasks(status);
CREATE INDEX tasks_assignee_idx ON tasks(assignee_user_id);
CREATE INDEX tasks_sla_idx ON tasks(sla_due_at);

-- Кэш шаблонов задач для UI
CREATE TABLE workflow_task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  schema JSONB NOT NULL,
  default_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX workflow_task_templates_version_template_idx
  ON workflow_task_templates(workflow_version_id, template_id);

-- Очередь генерации задач (TASK_CREATE actions)
CREATE TABLE workflow_task_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  transition_from TEXT,
  transition_to TEXT,
  template_id TEXT,
  task_definition JSONB NOT NULL,
  context JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  action_hash TEXT NOT NULL UNIQUE,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX workflow_task_queue_status_idx ON workflow_task_queue(status);

-- Очередь уведомлений/эскалаций
CREATE TABLE workflow_notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL DEFAULT 'NOTIFY',
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  transition_from TEXT,
  transition_to TEXT,
  template TEXT NOT NULL,
  to_roles TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING',
  action_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

-- Очередь вебхуков
CREATE TABLE workflow_webhook_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  transition_from TEXT,
  transition_to TEXT,
  endpoint TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  action_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

-- Очередь отложенных заданий (schedule)
CREATE TABLE workflow_schedule_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  transition_from TEXT,
  transition_to TEXT,
  job_type TEXT NOT NULL,
  cron TEXT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING',
  action_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

-- Документы и подписи
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                      -- QUOTE / CONTRACT / SCHEDULE / DELIVERY_ACT / KYC_DOC
  storage_url TEXT NOT NULL,               -- ссылка на объектное хранилище
  signed BOOL DEFAULT FALSE,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Платежи
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                      -- ADVANCE / SUPPLIER
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING / CONFIRMED / FAILED
  external_ref TEXT,                       -- банк/провайдер
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Отчёт по рискам (AECB + внутренний)
CREATE TABLE risk_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  aecb_score INT,
  approved BOOL,
  notes TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Аудит действий
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  deal_id UUID,
  actor_user_id UUID,
  action TEXT NOT NULL,                    -- STATUS_CHANGED / TASK_CREATED / DOC_UPLOADED / ...
  from_status TEXT,
  to_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
