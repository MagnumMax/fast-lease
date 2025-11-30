-- Rename DOCS_COLLECT to DOCS_COLLECT_BUYER across enum and textual references

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'deal_status' AND e.enumlabel = 'DOCS_COLLECT'
  ) THEN
    ALTER TYPE public.deal_status RENAME VALUE 'DOCS_COLLECT' TO 'DOCS_COLLECT_BUYER';
  END IF;
END $$;

-- Update audit log entries (text columns)
UPDATE public.audit_log
SET from_status = 'DOCS_COLLECT_BUYER'
WHERE from_status = 'DOCS_COLLECT';

UPDATE public.audit_log
SET to_status = 'DOCS_COLLECT_BUYER'
WHERE to_status = 'DOCS_COLLECT';

-- Update stored workflow templates
UPDATE public.workflow_versions
SET template = regexp_replace(template::text, '"DOCS_COLLECT"', '"DOCS_COLLECT_BUYER"', 'g')::jsonb
WHERE template::text LIKE '%"DOCS_COLLECT"%';
