-- Add reopen metadata and events for tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reopen_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopen_reason text,
  ADD COLUMN IF NOT EXISTS reopen_comment text;

CREATE TABLE IF NOT EXISTS public.task_reopen_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id),
  reason text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS task_reopen_events_task_id_idx ON public.task_reopen_events(task_id);
CREATE INDEX IF NOT EXISTS task_reopen_events_deal_id_idx ON public.task_reopen_events(deal_id);
