-- Force set schema and instruction_short for PREPARE_QUOTE tasks; remove checklist

WITH targets AS (
  SELECT
    id,
    COALESCE(payload->'schema'->'fields','[]'::jsonb) AS schema_fields,
    COALESCE(payload->'defaults','{}'::jsonb) AS defaults_obj,
    COALESCE(payload->'fields','{}'::jsonb) AS fields_obj
  FROM tasks
  WHERE type = 'PREPARE_QUOTE'
), updated AS (
  SELECT
    id,
    (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem FROM jsonb_array_elements(schema_fields) elem
        WHERE elem->>'id' NOT IN ('instructions','doc_signed_commercial_offer')
        UNION ALL
        SELECT jsonb_build_object('id','instructions','type','textarea','label','Инструкции')
        WHERE NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(schema_fields) e WHERE e->>'id'='instructions'
        )
        UNION ALL
        SELECT jsonb_build_object('id','doc_signed_commercial_offer','type','text','label','Коммерческое предложение (подписанное)')
        WHERE NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(schema_fields) e WHERE e->>'id'='doc_signed_commercial_offer'
        )
      ) s
    ) AS new_schema_fields,
    (defaults_obj - 'checklist') || jsonb_build_object(
      'instructions', COALESCE(defaults_obj->>'instructions',''),
      'doc_signed_commercial_offer', COALESCE(defaults_obj->>'doc_signed_commercial_offer',''),
      'instruction_short', 'Загрузите подписанное КП покупателя через эту задачу.'
    ) AS new_defaults,
    (fields_obj - 'checklist') || jsonb_build_object(
      'instructions', COALESCE(fields_obj->>'instructions',''),
      'doc_signed_commercial_offer', COALESCE(fields_obj->>'doc_signed_commercial_offer','')
    ) AS new_fields
  FROM targets
)
UPDATE tasks AS t
SET payload = jsonb_set(
               jsonb_set(
                 jsonb_set(t.payload, '{schema,fields}', COALESCE(u.new_schema_fields,'[]'::jsonb), true),
                 '{defaults}', COALESCE(u.new_defaults,'{}'::jsonb), true
               ),
               '{fields}', COALESCE(u.new_fields,'{}'::jsonb), true
             )
FROM updated u
WHERE t.id = u.id;
