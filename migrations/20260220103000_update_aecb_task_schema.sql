-- AECB check cleanup: remove score_target field, rename task title, and align cached templates.

-- 1) Update cached workflow task templates for AECB checks.
UPDATE public.workflow_task_templates
SET schema = jsonb_set(
      schema,
      '{fields}',
      (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(schema->'fields', '[]'::jsonb)) elem
        WHERE elem->>'id' <> 'score_target'
      ),
      true
    ),
    default_payload = COALESCE(default_payload - 'score_target', '{}'::jsonb)
WHERE template_id = 'aecb_check_v1';

-- 2) Clean up existing tasks and payloads.
UPDATE public.tasks
SET title = 'Провести проверку и внутренний скоринг',
    payload = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            payload,
            '{title}',
            to_jsonb('Провести проверку и внутренний скоринг'::text),
            true
          ),
          '{fields}',
          COALESCE((payload->'fields') - 'score_target', COALESCE(payload->'fields', '{}'::jsonb)),
          true
        ),
        '{defaults}',
        COALESCE((payload->'defaults') - 'score_target', COALESCE(payload->'defaults', '{}'::jsonb)),
        true
      ),
      '{schema,fields}',
      (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(payload->'schema'->'fields', '[]'::jsonb)) elem
        WHERE elem->>'id' <> 'score_target'
      ),
      true
    )
WHERE type = 'AECB_CHECK';

-- 3) Update workflow templates stored in workflow_versions (all versions).
WITH updated AS (
  SELECT
    id,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          template,
          '{stages,RISK_REVIEW,entryActions,0,task,title}',
          to_jsonb('Провести проверку и внутренний скоринг'::text),
          true
        ),
        '{stages,RISK_REVIEW,entryActions,0,task,schema,fields}',
        (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements(
            COALESCE(template #> '{stages,RISK_REVIEW,entryActions,0,task,schema,fields}', '[]'::jsonb)
          ) elem
          WHERE elem->>'id' <> 'score_target'
        ),
        true
      ),
      '{stages,RISK_REVIEW,entryActions,0,task,defaults}',
      COALESCE((template #> '{stages,RISK_REVIEW,entryActions,0,task,defaults}') - 'score_target', '{}'::jsonb),
      true
    ) AS new_template
  FROM public.workflow_versions
)
UPDATE public.workflow_versions w
SET template = u.new_template
FROM updated u
WHERE w.id = u.id;

-- 4) Keep source YAML in sync for readability (best-effort text replacements).
UPDATE public.workflow_versions
SET source_yaml = regexp_replace(
    regexp_replace(
      regexp_replace(
        source_yaml,
        'title:\\s*\"?AECB и скоринг\"?',
        'title: "Провести проверку и внутренний скоринг"',
        'g'
      ),
      '\\n\\s*- id: score_target\\n\\s*type: number\\n\\s*label: \"?Минимальный скоринговый балл\"?\\n?',
      E'\\n',
      'g'
    ),
    '\\n\\s*score_target:\\s*720\\n',
    E'\\n',
    'g'
  )
WHERE source_yaml IS NOT NULL;
