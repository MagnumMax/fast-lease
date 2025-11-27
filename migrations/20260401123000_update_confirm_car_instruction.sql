-- Add instruction_short to confirm_car_v1 templates and tasks (status NEW)
-- Aligns DB defaults with docs/workflow_template.yaml
BEGIN;

-- Ensure template defaults carry the new short instruction
UPDATE workflow_task_templates
SET default_payload =
  coalesce(default_payload, '{}'::jsonb)
  || jsonb_build_object(
    'instruction_short',
    'Подтвердите наличие авто и условия у дилера/брокера.'
  )
WHERE template_id = 'confirm_car_v1';

-- Backfill existing tasks with the short instruction
UPDATE tasks
SET payload = jsonb_set(
  payload,
  '{defaults}',
  coalesce(
    CASE
      WHEN jsonb_typeof(payload->'defaults') = 'object' THEN payload->'defaults'
      ELSE '{}'::jsonb
    END,
    '{}'::jsonb
  ) || jsonb_build_object(
    'instruction_short',
    'Подтвердите наличие авто и условия у дилера/брокера.'
  ),
  true
)
WHERE payload->>'template_id' = 'confirm_car_v1';

COMMIT;
