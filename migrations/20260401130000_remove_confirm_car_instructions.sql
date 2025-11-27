-- Remove legacy instructions field from confirm_car_v1 templates and tasks
-- Keep instruction_short as the sole short guidance, aligned with docs/workflow_template.yaml
BEGIN;

-- Align template defaults and schema to YAML (no instructions field)
UPDATE workflow_task_templates
SET default_payload = coalesce(default_payload, '{}'::jsonb) - 'instructions'
                      || jsonb_build_object('instruction_short', 'Подтвердите наличие авто и условия у дилера/брокера.'),
    schema = jsonb_build_object(
      'version', '1.0',
      'fields', jsonb_build_array(
        jsonb_build_object('id', 'deal_id', 'type', 'badge', 'label', 'ID сделки'),
        jsonb_build_object('id', 'current_status', 'type', 'badge', 'label', 'Текущий этап')
      )
    )
WHERE template_id = 'confirm_car_v1';

-- Backfill tasks: drop instructions from defaults/fields/schema; ensure instruction_short present
WITH cleaned AS (
  SELECT
    id,
    CASE
      WHEN jsonb_typeof(payload->'defaults') = 'object'
        THEN (payload->'defaults') - 'instructions'
      ELSE '{}'::jsonb
    END AS defaults_clean,
    CASE
      WHEN jsonb_typeof(payload->'fields') = 'object'
        THEN (payload->'fields') - 'instructions'
      ELSE '{}'::jsonb
    END AS fields_clean,
    (
      SELECT coalesce(
        jsonb_agg(elem) FILTER (WHERE elem->>'id' <> 'instructions'),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(payload->'schema') = 'object'
            THEN coalesce(payload->'schema'->'fields', '[]'::jsonb)
          ELSE '[]'::jsonb
        END
      ) AS elem
    ) AS schema_fields_clean
  FROM tasks
  WHERE payload->>'template_id' = 'confirm_car_v1'
)
UPDATE tasks t
SET payload = t.payload
  || jsonb_build_object(
    'defaults',
    c.defaults_clean || jsonb_build_object('instruction_short', 'Подтвердите наличие авто и условия у дилера/брокера.')
  )
  || jsonb_build_object('fields', c.fields_clean)
  || jsonb_build_object(
    'schema',
    jsonb_build_object('version', '1.0', 'fields', c.schema_fields_clean)
  )
FROM cleaned c
WHERE t.id = c.id;

COMMIT;
