-- Workflow action queues and idempotency support
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks
      ADD COLUMN IF NOT EXISTS action_hash text;

    CREATE UNIQUE INDEX IF NOT EXISTS tasks_action_hash_key
      ON public.tasks(action_hash)
      WHERE action_hash IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.workflow_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'NOTIFY',
  deal_id uuid, -- Remove foreign key constraint for now
  transition_from text,
  transition_to text,
  template text NOT NULL,
  to_roles text[] NOT NULL DEFAULT '{}'::text[],
  payload jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  action_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE INDEX IF NOT EXISTS workflow_notification_queue_status_idx
  ON public.workflow_notification_queue(status);

CREATE TABLE IF NOT EXISTS public.workflow_webhook_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid, -- Remove foreign key constraint for now
  transition_from text,
  transition_to text,
  endpoint text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  retry_count int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  action_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE INDEX IF NOT EXISTS workflow_webhook_queue_status_idx
  ON public.workflow_webhook_queue(status);

CREATE TABLE IF NOT EXISTS public.workflow_schedule_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid, -- Remove foreign key constraint for now
  transition_from text,
  transition_to text,
  job_type text NOT NULL,
  cron text,
  payload jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  action_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE INDEX IF NOT EXISTS workflow_schedule_queue_status_idx
  ON public.workflow_schedule_queue(status);
