-- Restore schema fields and instruction_short for PREPARE_QUOTE tasks (schema was empty)

WITH targets AS (
  SELECT
    id,
    COALESCE(payload->'defaults','{}'::jsonb) AS defaults_obj,
    COALESCE(payload->'fields','{}'::jsonb) AS fields_obj
  FROM tasks
  WHERE type = 'PREPARE_QUOTE'
)
UPDATE tasks AS t
SET payload = jsonb_set(
               jsonb_set(
                 jsonb_set(payload, '{schema,fields}', (
                   '[{"id":"instructions","type":"textarea","label":"Инструкции"}, {"id":"doc_signed_commercial_offer","type":"text","label":"Коммерческое предложение (подписанное)"}]'
                 )::jsonb, true),
                 '{defaults}', (defaults_obj || jsonb_build_object(
                   'instruction_short', 'Загрузите подписанное КП покупателя через эту задачу.',
                   'instructions', COALESCE(defaults_obj->>'instructions',''),
                   'doc_signed_commercial_offer', COALESCE(defaults_obj->>'doc_signed_commercial_offer','')
                 ))
                 , true
               ),
               '{fields}', (fields_obj || jsonb_build_object(
                 'instructions', COALESCE(fields_obj->>'instructions',''),
                 'doc_signed_commercial_offer', COALESCE(fields_obj->>'doc_signed_commercial_offer','')
               )),
               true
             )
FROM targets
WHERE t.id = targets.id;
