-- Add seller bank details field to seller docs task schema and open tasks

WITH seller_stage AS (
  SELECT '{
    "code": "DOCS_COLLECT_SELLER",
    "title": "Сбор документов продавца",
    "entryActions": [
      {
        "type": "TASK_CREATE",
        "task": {
          "templateId": "collect_seller_docs_v1",
          "type": "COLLECT_SELLER_DOCS",
          "title": "Собрать пакет документов продавца",
          "assigneeRole": "OP_MANAGER",
          "guardKey": "docs.seller.allUploaded",
          "sla": { "hours": 48 },
          "schema": {
            "version": "1.0",
            "fields": [
              {
                "id": "seller_type",
                "type": "select",
                "label": "Тип продавца",
                "hint": "Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.",
                "options": [
                  { "value": "company", "label": "Юридическое лицо" },
                  { "value": "individual", "label": "Физическое лицо" }
                ]
              },
              { "id": "checklist", "type": "checklist", "label": "Рекомендуемые документы (необязательно)" },
              { "id": "seller_contact_email", "type": "text", "label": "Электронная почта продавца", "hint": "Необязательно. Укажите, если есть." },
              { "id": "seller_contact_phone", "type": "text", "label": "Телефон продавца", "hint": "Необязательно. Укажите, если есть." },
              { "id": "seller_bank_details", "type": "text", "label": "Банковские реквизиты", "hint": "Необязательно. Укажите, если есть." }
            ]
          },
          "defaults": {
            "seller_type": "",
            "checklist": [],
            "seller_contact_email": "",
            "seller_contact_phone": "",
            "seller_bank_details": ""
          }
        }
      }
    ],
    "exitRequirements": [
      { "key": "docs.seller.allUploaded", "rule": "== true", "message": "Не все обязательные документы продавца загружены." }
    ]
  }'::jsonb AS cfg
),
patched AS (
  SELECT
    w.id,
    jsonb_set(
      w.template,
      '{stages,DOCS_COLLECT_SELLER}',
      (SELECT cfg FROM seller_stage),
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
       'collect_seller_docs_v1',
       'COLLECT_SELLER_DOCS',
       '{\"version\":\"1.0\",\"fields\":[{\"id\":\"seller_type\",\"type\":\"select\",\"label\":\"Тип продавца\",\"hint\":\"Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.\",\"options\":[{\"value\":\"company\",\"label\":\"Юридическое лицо\"},{\"value\":\"individual\",\"label\":\"Физическое лицо\"}]},{\"id\":\"checklist\",\"type\":\"checklist\",\"label\":\"Рекомендуемые документы (необязательно)\"},{\"id\":\"seller_contact_email\",\"type\":\"text\",\"label\":\"Электронная почта продавца\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"seller_contact_phone\",\"type\":\"text\",\"label\":\"Телефон продавца\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"seller_bank_details\",\"type\":\"text\",\"label\":\"Банковские реквизиты\",\"hint\":\"Необязательно. Укажите, если есть.\"}]}'::jsonb,
       '{\"seller_type\":\"\",\"checklist\":[],\"seller_contact_email\":\"\",\"seller_contact_phone\":\"\",\"seller_bank_details\":\"\"}'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;

-- Refresh open seller tasks to include the new field
WITH updated_tasks AS (
  SELECT id,
    jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{schema,fields}',
          '{\"fields\":[{\"id\":\"seller_type\",\"type\":\"select\",\"label\":\"Тип продавца\",\"hint\":\"Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.\",\"options\":[{\"value\":\"company\",\"label\":\"Юридическое лицо\"},{\"value\":\"individual\",\"label\":\"Физическое лицо\"}]},{\"id\":\"checklist\",\"type\":\"checklist\",\"label\":\"Рекомендуемые документы (необязательно)\"},{\"id\":\"seller_contact_email\",\"type\":\"text\",\"label\":\"Электронная почта продавца\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"seller_contact_phone\",\"type\":\"text\",\"label\":\"Телефон продавца\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"seller_bank_details\",\"type\":\"text\",\"label\":\"Банковские реквизиты\",\"hint\":\"Необязательно. Укажите, если есть.\"}],\"version\":\"1.0\"}'::jsonb,
          true
        ),
        '{defaults}',
        coalesce(payload->'defaults','{}'::jsonb)
          || jsonb_build_object(
            'seller_type', to_jsonb(coalesce(payload->'defaults'->>'seller_type','')),
            'checklist', coalesce(payload->'defaults'->'checklist','[]'::jsonb),
            'seller_contact_email', to_jsonb(coalesce(payload->'defaults'->>'seller_contact_email','')),
            'seller_contact_phone', to_jsonb(coalesce(payload->'defaults'->>'seller_contact_phone','')),
            'seller_bank_details', to_jsonb(coalesce(payload->'defaults'->>'seller_bank_details',''))
          ),
        true
      ),
      '{fields}',
      coalesce(payload->'fields','{}'::jsonb)
        || jsonb_build_object(
          'seller_type', to_jsonb(coalesce(payload->'fields'->>'seller_type','')),
          'seller_contact_email', to_jsonb(coalesce(payload->'fields'->>'seller_contact_email','')),
          'seller_contact_phone', to_jsonb(coalesce(payload->'fields'->>'seller_contact_phone','')),
          'seller_bank_details', to_jsonb(coalesce(payload->'fields'->>'seller_bank_details',''))
        ),
      true
    ) AS new_payload
  FROM tasks
  WHERE type = 'COLLECT_SELLER_DOCS' AND status IN ('OPEN','IN_PROGRESS')
)
UPDATE tasks t
SET payload = u.new_payload
FROM updated_tasks u
WHERE t.id = u.id;
