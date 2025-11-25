-- Rename COLLECT_DOCS tasks to COLLECT_BUYER_DOCS and update template_id

UPDATE tasks
SET type = 'COLLECT_BUYER_DOCS',
    payload = jsonb_set(payload, '{template_id}', to_jsonb('collect_buyer_docs_v1'), true)
WHERE type = 'COLLECT_DOCS';
