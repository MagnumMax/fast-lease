WITH targets AS (
  SELECT
    id,
    payload,
    COALESCE(payload->'schema'->'fields', '[]'::jsonb) AS schema_fields
  FROM tasks
  WHERE type = 'VERIFY_VEHICLE'
)
UPDATE tasks
SET payload = jsonb_set(
  tasks.payload,
  '{schema,fields}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'id' = 'doc_technical_report' THEN
          jsonb_set(elem, '{required}', 'true')
        ELSE
          elem
      END
    )
    FROM jsonb_array_elements(tasks.payload->'schema'->'fields') elem
  )
)
WHERE type = 'VERIFY_VEHICLE';
