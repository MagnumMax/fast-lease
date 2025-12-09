-- Update CHECK_SIGNED_DOCS task schema to include 'documents_verified' checkbox

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
                "id": "documents_verified",
                "type": "boolean",
                "label": "Документы проверены и подтверждены",
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
            "documents_verified": false
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
      w.template,
      '{stages,DOC_CHECK_LEGAL}',
      s.cfg,
      true
    ) AS new_template
  FROM workflow_versions w, stage_def s
  WHERE w.is_active = true
)
UPDATE workflow_versions
SET template = patched.new_template,
    version = 'fast-lease-v1-' || to_char(now(), 'YYYYMMDDHHMI') || '-legal-checkbox-update'
FROM patched
WHERE workflow_versions.id = patched.id;
