-- Unified workflow & manual tasks + task template caching + queues

-- Drop legacy tasks table (data wipe approved)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
  ) THEN
    DROP TABLE public.tasks CASCADE;
  END IF;
END $$;

-- SLA status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'task_sla_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.task_sla_status AS ENUM (
      'ON_TRACK',
      'WARNING',
      'BREACHED'
    );
  END IF;
END $$;

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  assignee_role text,
  assignee_user_id uuid REFERENCES auth.users(id),
  sla_due_at timestamptz,
  completed_at timestamptz,
  sla_status public.task_sla_status,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_hash text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX tasks_action_hash_key
  ON public.tasks(action_hash)
  WHERE action_hash IS NOT NULL;

CREATE INDEX tasks_deal_id_idx ON public.tasks(deal_id);
CREATE INDEX tasks_status_idx ON public.tasks(status);
CREATE INDEX tasks_assignee_user_idx ON public.tasks(assignee_user_id);
CREATE INDEX tasks_sla_due_idx ON public.tasks(sla_due_at);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'tasks'
      AND trigger_name = 'trg_tasks_set_updated_at'
  ) THEN
    DROP TRIGGER trg_tasks_set_updated_at ON public.tasks;
  END IF;
END $$;

CREATE TRIGGER trg_tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Cache workflow task templates for UI rendering / validation
CREATE TABLE public.workflow_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id uuid NOT NULL REFERENCES public.workflow_versions(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  task_type text NOT NULL,
  schema jsonb NOT NULL,
  default_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX workflow_task_templates_version_template_idx
  ON public.workflow_task_templates(workflow_version_id, template_id);

-- Queue for asynchronous task instantiation
CREATE TABLE public.workflow_task_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  transition_from text,
  transition_to text,
  template_id text,
  task_definition jsonb NOT NULL,
  context jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  action_hash text NOT NULL UNIQUE,
  error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  processed_at timestamptz
);

CREATE INDEX workflow_task_queue_status_idx
  ON public.workflow_task_queue(status);

-- SLA monitor helper for queue processor
CREATE OR REPLACE FUNCTION public.monitor_task_sla_status()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.tasks t
    SET sla_status = CASE
      WHEN t.sla_due_at IS NULL THEN NULL
      WHEN timezone('utc', now()) >= t.sla_due_at THEN 'BREACHED'::public.task_sla_status
      WHEN EXTRACT(EPOCH FROM (timezone('utc', now()) - t.created_at))
        / NULLIF(EXTRACT(EPOCH FROM (t.sla_due_at - t.created_at)), 0) >= 0.8
        THEN 'WARNING'::public.task_sla_status
      ELSE 'ON_TRACK'::public.task_sla_status
    END
    WHERE t.status <> 'DONE'
      AND t.sla_due_at IS NOT NULL
      AND (
        t.sla_status IS DISTINCT FROM CASE
          WHEN timezone('utc', now()) >= t.sla_due_at THEN 'BREACHED'::public.task_sla_status
          WHEN EXTRACT(EPOCH FROM (timezone('utc', now()) - t.created_at))
            / NULLIF(EXTRACT(EPOCH FROM (t.sla_due_at - t.created_at)), 0) >= 0.8
            THEN 'WARNING'::public.task_sla_status
          ELSE 'ON_TRACK'::public.task_sla_status
        END
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO updated_count FROM updated;

  RETURN COALESCE(updated_count, 0);
END;
$$;
