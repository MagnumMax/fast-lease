-- Update buyer buyer documents task to support buyer type selection and optional checklist

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
              { "id": "checklist", "type": "checklist", "label": "Рекомендуемые документы (необязательно)" }
            ]
          },
          "defaults": {
            "buyer_type": "",
            "checklist": []
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
       '{"version":"1.0","fields":[{"id":"buyer_type","type":"select","label":"Тип покупателя","hint":"Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.","options":[{"value":"company","label":"Юридическое лицо"},{"value":"individual","label":"Физическое лицо"}]},{"id":"checklist","type":"checklist","label":"Рекомендуемые документы (необязательно)"}]}'::jsonb,
       '{"buyer_type":"","checklist":[]}'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;
