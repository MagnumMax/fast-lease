-- Add DOC_CHECK_LEGAL stage after DOC_SIGNING

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'deal_status' AND e.enumlabel = 'DOC_CHECK_LEGAL'
  ) THEN
    ALTER TYPE public.deal_status ADD VALUE 'DOC_CHECK_LEGAL' AFTER 'DOC_SIGNING';
  END IF;
END $$;

-- Patch workflow_versions templates with new stage and transitions
WITH stage_def AS (
  SELECT '{
    "code": "DOC_CHECK_LEGAL",
    "title": "Проверка документов юристом",
    "entryActions": [
      {
        "type": "TASK_CREATE",
        "task": {
          "templateId": "check_signed_docs_v1",
          "type": "CHECK_SIGNED_DOCS",
          "title": "Проверить подписанные документы клиентом",
          "assigneeRole": "LEGAL",
          "guardKey": "contracts.legalChecked",
          "sla": { "hours": 24 },
          "schema": {
            "version": "1.0",
            "fields": [
              {
                "id": "check_decision",
                "type": "select",
                "label": "Решение",
                "options": [
                  { "value": "approved", "label": "Документы проверены и корректны" }
                ],
                "required": true
              },
              {
                "id": "comment",
                "type": "textarea",
                "label": "Комментарий к проверке",
                "required": false
              }
            ]
          },
          "defaults": {
            "instruction_short": "Проверьте загруженные подписанные документы на корректность.",
            "check_decision": ""
          }
        }
      }
    ],
    "exitRequirements": [
      { "key": "contracts.legalChecked", "rule": "== true", "message": "Документы не проверены юристом." }
    ]
  }'::jsonb AS cfg
), patched AS (
  SELECT
    w.id,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          w.template,
          '{stages,DOC_CHECK_LEGAL}',
          s.cfg,
          true
        ),
        '{kanbanOrder}',
        (
          SELECT jsonb_agg(elem)
          FROM (
            SELECT val::text AS val
            FROM jsonb_array_elements_text(w.template -> 'kanbanOrder') AS val
          ) base
          CROSS JOIN LATERAL (
            SELECT CASE WHEN base.val = 'DOC_SIGNING'
                        THEN jsonb_build_array('DOC_SIGNING', 'DOC_CHECK_LEGAL')
                        ELSE jsonb_build_array(base.val)
                   END AS expanded
          ) exp
          CROSS JOIN LATERAL jsonb_array_elements(exp.expanded) AS elem(elem)
        ),
        true
      ),
      '{transitions}',
      (
        SELECT jsonb_agg(x.elem)
        FROM (
          SELECT elem
          FROM jsonb_array_elements(w.template -> 'transitions') elem
          WHERE NOT (elem->>'from' = 'DOC_SIGNING' AND elem->>'to' = 'SIGNING_FUNDING')
          UNION ALL
          SELECT jsonb_build_object(
            'from', 'DOC_SIGNING',
            'to', 'DOC_CHECK_LEGAL',
            'byRoles', jsonb_build_array('OP_MANAGER'),
            'guards', jsonb_build_array(jsonb_build_object('key', 'contracts.signedUploaded', 'rule', '== true'))
          )
          UNION ALL
          SELECT jsonb_build_object(
            'from', 'DOC_CHECK_LEGAL',
            'to', 'SIGNING_FUNDING',
            'byRoles', jsonb_build_array('LEGAL'),
            'guards', jsonb_build_array(jsonb_build_object('key', 'contracts.legalChecked', 'rule', '== true'))
          )
          UNION ALL
          SELECT jsonb_build_object(
              'from', 'DOC_CHECK_LEGAL',
              'to', 'CANCELLED',
              'byRoles', jsonb_build_array('OP_MANAGER')
          )
        ) x
      )
    ) AS new_template
  FROM workflow_versions w, stage_def s
  WHERE w.is_active = true
)
UPDATE workflow_versions
SET template = patched.new_template,
    version = 'fast-lease-v1-' || to_char(now(), 'YYYYMMDDHHMI') || '-legal-patch'
FROM patched
WHERE workflow_versions.id = patched.id;
