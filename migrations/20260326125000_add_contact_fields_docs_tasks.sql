-- Add contact fields for buyer and seller document collection tasks

WITH buyer_stage AS (
  SELECT '{
    "code": "DOCS_COLLECT",
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
              {
                "id": "buyer_type",
                "type": "select",
                "label": "Тип покупателя",
                "hint": "Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.",
                "options": [
                  { "value": "company", "label": "Юридическое лицо" },
                  { "value": "individual", "label": "Физическое лицо" }
                ]
              },
              { "id": "checklist", "type": "checklist", "label": "Рекомендуемые документы (необязательно)" },
              { "id": "buyer_company_email", "type": "text", "label": "Электронная почта компании", "hint": "Необязательно. Укажите, если есть." },
              { "id": "buyer_company_phone", "type": "text", "label": "Телефон компании", "hint": "Необязательно. Укажите, если есть." },
              { "id": "buyer_contact_email", "type": "text", "label": "Электронная почта покупателя/водителя", "hint": "Необязательно. Укажите, если есть." },
              { "id": "buyer_contact_phone", "type": "text", "label": "Телефон покупателя/водителя", "hint": "Необязательно. Укажите, если есть." }
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
seller_stage AS (
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
              { "id": "seller_contact_phone", "type": "text", "label": "Телефон продавца", "hint": "Необязательно. Укажите, если есть." }
            ]
          },
          "defaults": {
            "seller_type": "",
            "checklist": [],
            "seller_contact_email": "",
            "seller_contact_phone": ""
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
      jsonb_set(
        w.template,
        '{stages,DOCS_COLLECT}',
        (SELECT cfg FROM buyer_stage),
        true
      ),
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
       'collect_docs_v1',
       'COLLECT_DOCS',
       '{\"version\":\"1.0\",\"fields\":[{\"id\":\"buyer_type\",\"type\":\"select\",\"label\":\"Тип покупателя\",\"hint\":\"Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.\",\"options\":[{\"value\":\"company\",\"label\":\"Юридическое лицо\"},{\"value\":\"individual\",\"label\":\"Физическое лицо\"}]},{\"id\":\"checklist\",\"type\":\"checklist\",\"label\":\"Рекомендуемые документы (необязательно)\"},{\"id\":\"buyer_company_email\",\"type\":\"text\",\"label\":\"Электронная почта компании\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"buyer_company_phone\",\"type\":\"text\",\"label\":\"Телефон компании\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"buyer_contact_email\",\"type\":\"text\",\"label\":\"Электронная почта покупателя/водителя\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"buyer_contact_phone\",\"type\":\"text\",\"label\":\"Телефон покупателя/водителя\",\"hint\":\"Необязательно. Укажите, если есть.\"}]}'::jsonb,
       '{\"buyer_type\":\"\",\"checklist\":[],\"buyer_company_email\":\"\",\"buyer_company_phone\":\"\",\"buyer_contact_email\":\"\",\"buyer_contact_phone\":\"\"}'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;

INSERT INTO workflow_task_templates (workflow_version_id, template_id, task_type, schema, default_payload)
SELECT w.id,
       'collect_seller_docs_v1',
       'COLLECT_SELLER_DOCS',
       '{\"version\":\"1.0\",\"fields\":[{\"id\":\"seller_type\",\"type\":\"select\",\"label\":\"Тип продавца\",\"hint\":\"Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.\",\"options\":[{\"value\":\"company\",\"label\":\"Юридическое лицо\"},{\"value\":\"individual\",\"label\":\"Физическое лицо\"}]},{\"id\":\"checklist\",\"type\":\"checklist\",\"label\":\"Рекомендуемые документы (необязательно)\"},{\"id\":\"seller_contact_email\",\"type\":\"text\",\"label\":\"Электронная почта продавца\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"seller_contact_phone\",\"type\":\"text\",\"label\":\"Телефон продавца\",\"hint\":\"Необязательно. Укажите, если есть.\"}]}'::jsonb,
       '{\"seller_type\":\"\",\"checklist\":[],\"seller_contact_email\":\"\",\"seller_contact_phone\":\"\"}'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;

-- Refresh open tasks with new fields (non-destructive; defaults preserved where present)
WITH updated_tasks AS (
  SELECT id,
    jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{schema,fields}',
          '{\"fields\":[{\"id\":\"buyer_type\",\"type\":\"select\",\"label\":\"Тип покупателя\",\"hint\":\"Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.\",\"options\":[{\"value\":\"company\",\"label\":\"Юридическое лицо\"},{\"value\":\"individual\",\"label\":\"Физическое лицо\"}]},{\"id\":\"checklist\",\"type\":\"checklist\",\"label\":\"Рекомендуемые документы (необязательно)\"},{\"id\":\"buyer_company_email\",\"type\":\"text\",\"label\":\"Электронная почта компании\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"buyer_company_phone\",\"type\":\"text\",\"label\":\"Телефон компании\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"buyer_contact_email\",\"type\":\"text\",\"label\":\"Электронная почта покупателя/водителя\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"buyer_contact_phone\",\"type\":\"text\",\"label\":\"Телефон покупателя/водителя\",\"hint\":\"Необязательно. Укажите, если есть.\"}],\"version\":\"1.0\"}'::jsonb,
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
), seller_tasks AS (
  SELECT id,
    jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{schema,fields}',
          '{\"fields\":[{\"id\":\"seller_type\",\"type\":\"select\",\"label\":\"Тип продавца\",\"hint\":\"Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.\",\"options\":[{\"value\":\"company\",\"label\":\"Юридическое лицо\"},{\"value\":\"individual\",\"label\":\"Физическое лицо\"}]},{\"id\":\"checklist\",\"type\":\"checklist\",\"label\":\"Рекомендуемые документы (необязательно)\"},{\"id\":\"seller_contact_email\",\"type\":\"text\",\"label\":\"Электронная почта продавца\",\"hint\":\"Необязательно. Укажите, если есть.\"},{\"id\":\"seller_contact_phone\",\"type\":\"text\",\"label\":\"Телефон продавца\",\"hint\":\"Необязательно. Укажите, если есть.\"}],\"version\":\"1.0\"}'::jsonb,
          true
        ),
        '{defaults}',
        coalesce(payload->'defaults','{}'::jsonb)
          || jsonb_build_object(
            'seller_type', to_jsonb(coalesce(payload->'defaults'->>'seller_type','')),
            'checklist', coalesce(payload->'defaults'->'checklist','[]'::jsonb),
            'seller_contact_email', to_jsonb(coalesce(payload->'defaults'->>'seller_contact_email','')),
            'seller_contact_phone', to_jsonb(coalesce(payload->'defaults'->>'seller_contact_phone',''))
          ),
        true
      ),
      '{fields}',
      coalesce(payload->'fields','{}'::jsonb)
        || jsonb_build_object(
          'seller_type', to_jsonb(coalesce(payload->'fields'->>'seller_type','')),
          'seller_contact_email', to_jsonb(coalesce(payload->'fields'->>'seller_contact_email','')),
          'seller_contact_phone', to_jsonb(coalesce(payload->'fields'->>'seller_contact_phone',''))
        ),
      true
    ) AS new_payload
  FROM tasks
  WHERE type = 'COLLECT_SELLER_DOCS' AND status IN ('OPEN','IN_PROGRESS')
)
UPDATE tasks t
SET payload = u.new_payload
FROM (
  SELECT * FROM updated_tasks
  UNION ALL
  SELECT * FROM seller_tasks
) u
WHERE t.id = u.id;
