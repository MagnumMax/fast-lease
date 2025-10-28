-- Ensure action_hash can be used with ON CONFLICT
DROP INDEX IF EXISTS tasks_action_hash_key;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_action_hash_unique UNIQUE (action_hash);
