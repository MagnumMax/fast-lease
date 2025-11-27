-- Add schema field for signed commercial offer to PREPARE_QUOTE tasks

WITH targets AS (
  SELECT
    id,
    payload,
    COALESCE(payload->'schema'->'fields','[]'::jsonb) AS schema_fields,
    COALESCE(payload->'defaults','{}'::jsonb) AS defaults_obj,
    COALESCE(payload->'fields','{}'::jsonb) AS fields_obj
  FROM tasks
  WHERE type = 'PREPARE_QUOTE'
)
, filtered AS (
  SELECT
    id,
    (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(schema_fields) elem
        WHERE elem->>'id' <> 'doc_signed_commercial_offer' AND elem->>'id' <> 'instructions'
        UNION ALL
        SELECT jsonb_build_object('id','instructions','type','textarea','label','Инструкции')
        WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(schema_fields) e WHERE e->>'id'='instructions')
        UNION ALL
        SELECT jsonb_build_object('id','doc_signed_commercial_offer','type','text','label','Коммерческое предложение (подписанное)')
        WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(schema_fields) e WHERE e->>'id'='doc_signed_commercial_offer')
      ) s
    ) AS new_schema_fields,
    defaults_obj || jsonb_build_object(
      'instructions', COALESCE(defaults_obj->>'instructions',''),
      'doc_signed_commercial_offer', COALESCE(defaults_obj->>'doc_signed_commercial_offer','')
    ) AS new_defaults,
    fields_obj || jsonb_build_object(
      'instructions', COALESCE(fields_obj->>'instructions',''),
      'doc_signed_commercial_offer', COALESCE(fields_obj->>'doc_signed_commercial_offer','')
    ) AS new_fields
  FROM targets
)
UPDATE tasks AS t
SET payload = jsonb_set(
               jsonb_set(
                 jsonb_set(t.payload, '{schema,fields}', COALESCE(f.new_schema_fields,'[]'::jsonb), true),
                 '{defaults}', f.new_defaults, true
               ),
               '{fields}', f.new_fields, true
             )
FROM filtered f
WHERE t.id = f.id;
