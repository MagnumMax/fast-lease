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
  customer_id UUID REFERENCES contacts(id),
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

-- Задания по сделке
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                      -- CONFIRM_CAR / PREPARE_QUOTE / COLLECT_DOCS / ...
  status TEXT NOT NULL DEFAULT 'OPEN',     -- OPEN / IN_PROGRESS / DONE / BLOCKED
  assignee_role TEXT REFERENCES roles(code),
  assignee_user_id UUID,
  sla_due_at TIMESTAMPTZ,
  payload JSONB,
  action_hash TEXT,                        -- идемпотентность entry actions (уникальный хэш)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tasks_deal_idx ON tasks(deal_id);
CREATE INDEX tasks_status_idx ON tasks(status);
CREATE INDEX tasks_sla_idx ON tasks(sla_due_at);

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

CREATE INDEX audit_deal_idx ON audit_log(deal_id);

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_set_updated_at
BEFORE UPDATE ON deals
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------- Сиды: роли ----------

INSERT INTO roles (code, name) VALUES
  ('ADMIN',        'Администратор процесса'),
  ('OP_MANAGER',   'Операционный менеджер'),
  ('SUPPORT',      'Поддержка операций'),
  ('TECH_SPECIALIST', 'Технический специалист'),
  ('FINANCE',      'Финансовый отдел'),
  ('RISK_MANAGER', 'Менеджер по управлению рисками'),
  ('INVESTOR',     'Инвестор / ЛПР'),
  ('LEGAL',        'Юридический отдел'),
  ('ACCOUNTING',   'Бухгалтерия'),
  ('CLIENT',       'Клиент')
ON CONFLICT (code) DO NOTHING;

-- ---------- Сиды: статусы (канбан-порядок) ----------
INSERT INTO deal_statuses (code, title, sort_order) VALUES
  ('NEW',               'Новая заявка',                 1),
  ('OFFER_PREP',        'Подготовка предложения',       2),
  ('VEHICLE_CHECK',     'Проверка авто',                3),
  ('DOCS_COLLECT',      'Сбор документов',              4),
  ('RISK_REVIEW',       'Проверка риска',               5),
  ('FINANCE_REVIEW',    'Финансовое утверждение',       6),
  ('INVESTOR_PENDING',  'Одобрение инвестора',          7),
  ('CONTRACT_PREP',     'Подготовка договора',          8),
  ('SIGNING_FUNDING',   'Подписание и финансирование',  9),
  ('VEHICLE_DELIVERY',  'Выдача автомобиля',           10),
  ('ACTIVE',            'Активный лизинг',             11),
  ('CANCELLED',         'Отменена',                    12)
ON CONFLICT (code) DO NOTHING;

-- ---------- Сиды: разрешённые переходы ----------
INSERT INTO deal_transitions (from_status, to_status, role_required) VALUES
  ('NEW',              'OFFER_PREP',       'OP_MANAGER'),
  ('OFFER_PREP',       'VEHICLE_CHECK',    'TECH_SPECIALIST'),
  ('VEHICLE_CHECK',    'DOCS_COLLECT',     'TECH_SPECIALIST'),
  ('DOCS_COLLECT',     'RISK_REVIEW',      'OP_MANAGER'),
  ('RISK_REVIEW',      'FINANCE_REVIEW',   'RISK_MANAGER'),
  ('FINANCE_REVIEW',   'INVESTOR_PENDING', 'FINANCE'),
  ('INVESTOR_PENDING', 'CONTRACT_PREP',    'INVESTOR'),
  ('CONTRACT_PREP',    'SIGNING_FUNDING',  'LEGAL'),
  ('SIGNING_FUNDING',  'VEHICLE_DELIVERY', 'TECH_SPECIALIST'),
  ('VEHICLE_DELIVERY', 'ACTIVE',           'TECH_SPECIALIST'),
  ('NEW',              'CANCELLED',        'OP_MANAGER'),
  ('OFFER_PREP',       'CANCELLED',        'OP_MANAGER'),
  ('VEHICLE_CHECK',    'CANCELLED',        'TECH_SPECIALIST'),
  ('DOCS_COLLECT',     'CANCELLED',        'OP_MANAGER'),
  ('RISK_REVIEW',      'CANCELLED',        'OP_MANAGER'),
  ('FINANCE_REVIEW',   'CANCELLED',        'FINANCE'),
  ('INVESTOR_PENDING', 'CANCELLED',        'INVESTOR'),
  ('CONTRACT_PREP',    'CANCELLED',        'LEGAL'),
  ('SIGNING_FUNDING',  'CANCELLED',        'FINANCE'),
  ('VEHICLE_DELIVERY', 'CANCELLED',        'TECH_SPECIALIST')
ON CONFLICT DO NOTHING;

-- ---------- Полезные представления ----------
CREATE OR REPLACE VIEW vw_deals_kanban AS
SELECT d.id, d.status, s.title, s.sort_order, d.created_at, d.updated_at, d.op_manager_id
FROM deals d
JOIN deal_statuses s ON s.code = d.status;

CREATE OR REPLACE VIEW vw_tasks_sla_burning AS
SELECT t.*, EXTRACT(EPOCH FROM (t.sla_due_at - now()))/3600 AS hours_left
FROM tasks t
WHERE t.status IN ('OPEN','IN_PROGRESS') AND t.sla_due_at IS NOT NULL
ORDER BY t.sla_due_at ASC;

-- ---------- Полезные функции-переходы ----------
-- (Пример: централизованная смена статуса с проверкой роли)
CREATE OR REPLACE FUNCTION deal_transition(p_deal UUID, p_to TEXT, p_actor_role TEXT, p_actor_user UUID)
RETURNS VOID AS $$
DECLARE
  v_from TEXT;
  v_allowed INT;
BEGIN
  SELECT status INTO v_from FROM deals WHERE id = p_deal FOR UPDATE;
  IF v_from IS NULL THEN RAISE EXCEPTION 'Deal not found'; END IF;

  SELECT COUNT(*) INTO v_allowed
  FROM deal_transitions
  WHERE from_status = v_from AND to_status = p_to AND role_required = p_actor_role;

  IF v_allowed = 0 THEN
    RAISE EXCEPTION 'Transition from % to % not allowed for role %', v_from, p_to, p_actor_role;
  END IF;

  UPDATE deals SET status = p_to WHERE id = p_deal;

  INSERT INTO audit_log(deal_id, actor_user_id, action, from_status, to_status, metadata)
  VALUES (p_deal, p_actor_user, 'STATUS_CHANGED', v_from, p_to, json_build_object('by_role', p_actor_role));
END;
$$ LANGUAGE plpgsql;
