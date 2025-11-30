-- Update buyer contact labels to "водителя" and refresh open tasks/templates

WITH buyer_stage AS (
  SELECT '{
    "code": "DOCS_COLLECT_BUYER",
    "title": "Сбор документов покупателя",
    "entryActions": [
      {
        "type": "TASK_CREATE",
        "task": {
          "templateId": "collect_docs_v1",
          "type": "COLLECT_DOCS",
          "title": "Собрать пакет документов покупателя",
          "assigneeRole": "OP_MANAGER",
          "guardKey": "docs.required.allUploaded",
          "sla": { "hours": 48 },
          "schema": {
            "version": "1.0",
            "fields": [
              { "id": "buyer_type", "type": "select", "label": "Тип покупателя", "hint": "", "options": [
                { "value": "company", "label": "Юридическое лицо" },
                { "value": "individual", "label": "Физическое лицо" }
              ]},
              { "id": "checklist", "type": "checklist", "label": "Рекомендуемые документы (необязательно)" },
              { "id": "buyer_company_email", "type": "text", "label": "Электронная почта компании" },
              { "id": "buyer_company_phone", "type": "text", "label": "Телефон компании" },
              { "id": "buyer_contact_email", "type": "text", "label": "Электронная почта водителя" },
              { "id": "buyer_contact_phone", "type": "text", "label": "Телефон водителя" }
            ]
          },
          "defaults": {
            "buyer_type": "",
            "checklist": [],
            "buyer_company_email": "",
            "buyer_company_phone": "",
            "buyer_contact_email": "",
            "buyer_contact_phone": ""
          }
        }
      }
    ],
    "exitRequirements": [
      { "key": "docs.required.allUploaded", "rule": "== true", "message": "Не все обязательные документы покупателя загружены." }
    ]
  }'::jsonb AS cfg
),
patched AS (
  SELECT
    w.id,
    jsonb_set(
      w.template,
      '{stages,DOCS_COLLECT_BUYER}',
      (SELECT cfg FROM buyer_stage),
      true
    ) AS new_template
  FROM workflow_versions w
  WHERE w.template IS NOT NULL
)
UPDATE workflow_versions w
SET template = p.new_template
FROM patched p
WHERE w.id = p.id;

INSERT INTO workflow_task_templates (workflow_version_id, template_id, task_type, schema, default_payload)
SELECT w.id,
       'collect_docs_v1',
       'COLLECT_DOCS',
       '{\"version\":\"1.0\",\"fields\":[{\"id\":\"buyer_type\",\"type\":\"select\",\"label\":\"Тип покупателя\",\"hint\":\"\",\"options\":[{\"value\":\"company\",\"label\":\"Юридическое лицо\"},{\"value\":\"individual\",\"label\":\"Физическое лицо\"}]},{\"id\":\"checklist\",\"type\":\"checklist\",\"label\":\"Рекомендуемые документы (необязательно)\"},{\"id\":\"buyer_company_email\",\"type\":\"text\",\"label\":\"Электронная почта компании\"},{\"id\":\"buyer_company_phone\",\"type\":\"text\",\"label\":\"Телефон компании\"},{\"id\":\"buyer_contact_email\",\"type\":\"text\",\"label\":\"Электронная почта водителя\"},{\"id\":\"buyer_contact_phone\",\"type\":\"text\",\"label\":\"Телефон водителя\"}]}'::jsonb,
       '{\"buyer_type\":\"\",\"checklist\":[],\"buyer_company_email\":\"\",\"buyer_company_phone\":\"\",\"buyer_contact_email\":\"\",\"buyer_contact_phone\":\"\"}'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;

-- Refresh open buyer tasks with updated labels
WITH updated_tasks AS (
  SELECT id,
    jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{schema,fields}',
          '{\"fields\":[{\"id\":\"buyer_type\",\"type\":\"select\",\"label\":\"Тип покупателя\",\"hint\":\"\",\"options\":[{\"value\":\"company\",\"label\":\"Юридическое лицо\"},{\"value\":\"individual\",\"label\":\"Физическое лицо\"}]},{\"id\":\"checklist\",\"type\":\"checklist\",\"label\":\"Рекомендуемые документы (необязательно)\"},{\"id\":\"buyer_company_email\",\"type\":\"text\",\"label\":\"Электронная почта компании\"},{\"id\":\"buyer_company_phone\",\"type\":\"text\",\"label\":\"Телефон компании\"},{\"id\":\"buyer_contact_email\",\"type\":\"text\",\"label\":\"Электронная почта водителя\"},{\"id\":\"buyer_contact_phone\",\"type\":\"text\",\"label\":\"Телефон водителя\"}],\"version\":\"1.0\"}'::jsonb,
          true
        ),
        '{defaults}',
        coalesce(payload->'defaults','{}'::jsonb)
          || jsonb_build_object(
            'buyer_type', to_jsonb(coalesce(payload->'defaults'->>'buyer_type','')),
            'checklist', coalesce(payload->'defaults'->'checklist','[]'::jsonb),
            'buyer_company_email', to_jsonb(coalesce(payload->'defaults'->>'buyer_company_email','')),
            'buyer_company_phone', to_jsonb(coalesce(payload->'defaults'->>'buyer_company_phone','')),
            'buyer_contact_email', to_jsonb(coalesce(payload->'defaults'->>'buyer_contact_email','')),
            'buyer_contact_phone', to_jsonb(coalesce(payload->'defaults'->>'buyer_contact_phone',''))
          ),
        true
      ),
      '{fields}',
      coalesce(payload->'fields','{}'::jsonb)
        || jsonb_build_object(
          'buyer_type', to_jsonb(coalesce(payload->'fields'->>'buyer_type','')),
          'buyer_company_email', to_jsonb(coalesce(payload->'fields'->>'buyer_company_email','')),
          'buyer_company_phone', to_jsonb(coalesce(payload->'fields'->>'buyer_company_phone','')),
          'buyer_contact_email', to_jsonb(coalesce(payload->'fields'->>'buyer_contact_email','')),
          'buyer_contact_phone', to_jsonb(coalesce(payload->'fields'->>'buyer_contact_phone',''))
        ),
      true
    ) AS new_payload
  FROM tasks
  WHERE type = 'COLLECT_DOCS' AND status IN ('OPEN','IN_PROGRESS')
)
UPDATE tasks t
SET payload = u.new_payload
FROM updated_tasks u
WHERE t.id = u.id;
