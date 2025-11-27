-- Clear checklist for PREPARE_QUOTE tasks (remove signed_commercial_offer default)

UPDATE tasks
SET payload = jsonb_set(
               payload - 'checklist',
               '{defaults}',
               (coalesce(payload->'defaults','{}'::jsonb) - 'checklist'),
               true
             )
WHERE type = 'PREPARE_QUOTE';
