-- Remove visa document fields and types from workflow templates, task payloads, and queued task definitions

CREATE OR REPLACE FUNCTION strip_visa_fields(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  entry record;
  result jsonb;
BEGIN
  IF payload IS NULL THEN
    RETURN payload;
  END IF;

  IF jsonb_typeof(payload) = 'object' THEN
    result := '{}'::jsonb;
    FOR entry IN SELECT key, value FROM jsonb_each(payload)
    LOOP
      IF entry.key = ANY (ARRAY['doc_visa_manager', 'doc_visa_driver', 'doc_visa_buyer']) THEN
        CONTINUE;
      END IF;
      result := result || jsonb_build_object(entry.key, strip_visa_fields(entry.value));
    END LOOP;
    RETURN result;
  ELSIF jsonb_typeof(payload) = 'array' THEN
    result := (
      SELECT COALESCE(jsonb_agg(cleaned_elem), '[]'::jsonb)
      FROM (
        SELECT strip_visa_fields(elem) AS cleaned_elem
        FROM jsonb_array_elements(payload) AS elems(elem)
        WHERE NOT (
          jsonb_typeof(elem) = 'object'
            AND (
              elem->>'id' = ANY (ARRAY['doc_visa_manager', 'doc_visa_driver', 'doc_visa_buyer'])
              OR elem->>'value' = 'visa'
              OR elem->>'document_type' = 'visa'
            )
          OR (
            jsonb_typeof(elem) = 'string'
            AND elem IN (
              to_jsonb('visa'::text),
              to_jsonb('doc_visa_manager'::text),
              to_jsonb('doc_visa_driver'::text),
              to_jsonb('doc_visa_buyer'::text)
            )
          )
        )
      ) AS filtered
    );
    RETURN result;
  END IF;

  RETURN payload;
END;
$$;

UPDATE workflow_versions
SET template = strip_visa_fields(template),
    source_yaml = regexp_replace(
      regexp_replace(source_yaml, E'^.*doc_visa.*\\n?', '', 'gmi'),
      E'^.*\\bvisa\\b.*\\n?', '',
      'gmi'
    )
WHERE template::text ILIKE '%doc_visa%' OR template::text ILIKE '%\"visa\"%' OR source_yaml ILIKE '%doc_visa%' OR source_yaml ILIKE '% visa%';

UPDATE workflow_task_templates
SET schema = strip_visa_fields(schema),
    default_payload = strip_visa_fields(default_payload)
WHERE schema::text ILIKE '%doc_visa%' OR schema::text ILIKE '%\"visa\"%' OR default_payload::text ILIKE '%doc_visa%' OR default_payload::text ILIKE '%\"visa\"%';

UPDATE tasks
SET payload = strip_visa_fields(payload),
    updated_at = now()
WHERE payload::text ILIKE '%doc_visa%' OR payload::text ILIKE '%\"visa\"%';

UPDATE workflow_task_queue
SET task_definition = strip_visa_fields(task_definition)
WHERE task_definition::text ILIKE '%doc_visa%' OR task_definition::text ILIKE '%\"visa\"%';

DROP FUNCTION strip_visa_fields(jsonb);
