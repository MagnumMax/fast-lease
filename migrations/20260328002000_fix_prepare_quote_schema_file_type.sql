UPDATE tasks
SET payload = jsonb_set(
  tasks.payload,
  '{schema,fields}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'id' = 'doc_signed_commercial_offer' THEN
          jsonb_set(elem, '{type}', '"file"')
        ELSE
          elem
      END
    )
    FROM jsonb_array_elements(tasks.payload->'schema'->'fields') elem
  )
)
WHERE type = 'PREPARE_QUOTE';
