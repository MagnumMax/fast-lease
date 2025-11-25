-- Remove legacy checklist field from buyer/seller document tasks (schema, defaults, fields)

WITH target_tasks AS (
  SELECT
    id,
    payload,
    coalesce(payload->'schema'->'fields', '[]'::jsonb) AS schema_fields,
    coalesce(payload->'defaults', '{}'::jsonb) AS defaults_obj,
    coalesce(payload->'fields', '{}'::jsonb) AS fields_obj
  FROM tasks
  WHERE type IN ('COLLECT_DOCS', 'COLLECT_SELLER_DOCS')
),
filtered AS (
  SELECT
    id,
    jsonb_agg(elem) FILTER (WHERE elem->>'id' <> 'checklist') AS filtered_fields,
    defaults_obj - 'checklist' AS filtered_defaults,
    fields_obj - 'checklist' AS filtered_fields_obj,
    payload
  FROM target_tasks t,
       jsonb_array_elements(t.schema_fields) AS elem
  GROUP BY id, defaults_obj, fields_obj, payload
)
UPDATE tasks AS t
SET payload = jsonb_set(
               jsonb_set(
                 jsonb_set(payload, '{schema,fields}', coalesce(f.filtered_fields, '[]'::jsonb), true),
                 '{defaults}', coalesce(f.filtered_defaults, '{}'::jsonb), true
               ),
               '{fields}', coalesce(f.filtered_fields_obj, '{}'::jsonb),
               true
             )
FROM filtered f
WHERE t.id = f.id;
