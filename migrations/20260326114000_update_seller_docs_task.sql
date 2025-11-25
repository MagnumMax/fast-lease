-- Update seller documents task to support seller type selection and optional checklist

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
              { "id": "checklist", "type": "checklist", "label": "Рекомендуемые документы (необязательно)" }
            ]
          },
          "defaults": {
            "seller_type": "",
            "checklist": []
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
       '{\"version\":\"1.0\",\"fields\":[{\"id\":\"seller_type\",\"type\":\"select\",\"label\":\"Тип продавца\",\"hint\":\"Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.\",\"options\":[{\"value\":\"company\",\"label\":\"Юридическое лицо\"},{\"value\":\"individual\",\"label\":\"Физическое лицо\"}]},{\"id\":\"checklist\",\"type\":\"checklist\",\"label\":\"Рекомендуемые документы (необязательно)\"}]}'::jsonb,
       '{\"seller_type\":\"\",\"checklist\":[]}'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;
