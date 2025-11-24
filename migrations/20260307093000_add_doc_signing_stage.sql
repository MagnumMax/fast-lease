-- Add DOC_SIGNING stage after CONTRACT_PREP and sync workflow template/tasks

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'deal_status' AND e.enumlabel = 'DOC_SIGNING'
  ) THEN
    ALTER TYPE public.deal_status ADD VALUE 'DOC_SIGNING' AFTER 'CONTRACT_PREP';
  END IF;
END $$;

-- Patch workflow_versions templates with new stage and transitions
WITH stage_def AS (
  SELECT '{
    "code": "DOC_SIGNING",
    "title": "Подписание документов",
    "entryActions": [
      {
        "type": "TASK_CREATE",
        "task": {
          "templateId": "doc_signing_v1",
          "type": "DOC_SIGNING",
          "title": "Подписание документов",
          "assigneeRole": "OP_MANAGER",
          "guardKey": "contracts.signedUploaded",
          "sla": { "hours": 24 },
          "schema": {
            "version": "1.0",
            "fields": [
              { "id": "checklist", "type": "checklist", "label": "Подписанные файлы" }
            ]
          },
          "defaults": {
            "checklist": [
              "signed_purchase_agreement",
              "signed_lease_agreement",
              "signed_payment_schedule",
              "signed_delivery_act"
            ]
          }
        }
      }
    ],
    "exitRequirements": [
      { "key": "contracts.signedUploaded", "rule": "== true", "message": "Нет подписанных документов." }
    ]
  }'::jsonb AS cfg
), patched AS (
  SELECT
    w.id,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          w.template,
          '{stages,DOC_SIGNING}',
          (SELECT cfg FROM stage_def),
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
            SELECT CASE WHEN base.val = 'CONTRACT_PREP'
                        THEN jsonb_build_array('CONTRACT_PREP', 'DOC_SIGNING')
                        ELSE jsonb_build_array(base.val)
                   END AS expanded
          ) exp
          CROSS JOIN LATERAL jsonb_array_elements(exp.expanded) AS elem(elem)
        ),
        true
      ),
      '{transitions}',
      (
        SELECT jsonb_agg(t.elem)
        FROM (
          SELECT elem
          FROM jsonb_array_elements(w.template -> 'transitions') elem
          WHERE NOT (elem->>'from' = 'CONTRACT_PREP' AND elem->>'to' = 'SIGNING_FUNDING')
          UNION ALL
          SELECT jsonb_build_object(
            'from', 'CONTRACT_PREP',
            'to', 'DOC_SIGNING',
            'byRoles', jsonb_build_array('OP_MANAGER', 'LEGAL'),
            'guards', jsonb_build_array(jsonb_build_object('key', 'legal.contractReady', 'rule', '== true'))
          )
          UNION ALL
          SELECT jsonb_build_object(
            'from', 'DOC_SIGNING',
            'to', 'SIGNING_FUNDING',
            'byRoles', jsonb_build_array('OP_MANAGER'),
            'guards', jsonb_build_array(jsonb_build_object('key', 'contracts.signedUploaded', 'rule', '== true'))
          )
          UNION ALL
          SELECT jsonb_build_object(
            'from', 'DOC_SIGNING',
            'to', 'CANCELLED',
            'byRoles', jsonb_build_array('OP_MANAGER')
          )
        ) t
      )
    ) AS new_template
  FROM workflow_versions w
  WHERE w.template IS NOT NULL
)
UPDATE workflow_versions w
SET template = p.new_template
FROM patched p
WHERE w.id = p.id;

-- Cache task template for new stage
INSERT INTO workflow_task_templates (workflow_version_id, template_id, task_type, schema, default_payload)
SELECT w.id,
       'doc_signing_v1',
       'DOC_SIGNING',
       '{"version":"1.0","fields":[{"id":"checklist","type":"checklist","label":"Подписанные файлы"}]}'::jsonb,
       '{"checklist":["signed_purchase_agreement","signed_lease_agreement","signed_payment_schedule","signed_delivery_act"]}'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;
