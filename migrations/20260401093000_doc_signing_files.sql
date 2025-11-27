-- Convert DOC_SIGNING checklist into explicit file uploads and drop per-task overrides

WITH new_stage AS (
  SELECT
    jsonb_build_object(
      'title', 'Подписание документов',
      'entryActions', jsonb_build_array(
        jsonb_build_object(
          'type', 'TASK_CREATE',
          'task', jsonb_build_object(
            'templateId', 'doc_signing_v1',
            'type', 'DOC_SIGNING',
            'title', 'Подписание документов',
            'assigneeRole', 'OP_MANAGER',
            'guardKey', 'contracts.signedUploaded',
            'sla', jsonb_build_object('hours', 24),
            'schema', jsonb_build_object(
              'version', '1.0',
              'fields', jsonb_build_array(
                jsonb_build_object(
                  'id', 'signed_purchase_agreement',
                  'type', 'file',
                  'label', 'Подписанный договор купли-продажи',
                  'document_type', 'signed_purchase_agreement',
                  'required', true
                ),
                jsonb_build_object(
                  'id', 'signed_lease_agreement',
                  'type', 'file',
                  'label', 'Подписанный договор лизинга',
                  'document_type', 'signed_lease_agreement',
                  'required', true
                ),
                jsonb_build_object(
                  'id', 'signed_payment_schedule',
                  'type', 'file',
                  'label', 'Подписанный график платежей',
                  'document_type', 'signed_payment_schedule',
                  'required', true
                ),
                jsonb_build_object(
                  'id', 'signed_delivery_act',
                  'type', 'file',
                  'label', 'Подписанный акт приема-передачи',
                  'document_type', 'signed_delivery_act',
                  'required', true
                )
              )
            ),
            'defaults', jsonb_build_object(
              'instruction_short', 'Приложите подписанные документы сделки.'
            )
          )
        )
      ),
      'exitRequirements', jsonb_build_array(
        jsonb_build_object(
          'key', 'contracts.signedUploaded',
          'rule', '== true',
          'message', 'Нет подписанных документов.'
        )
      )
    ) AS stage,
    jsonb_build_object(
      'version', '1.0',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'signed_purchase_agreement',
          'type', 'file',
          'label', 'Подписанный договор купли-продажи',
          'document_type', 'signed_purchase_agreement',
          'required', true
        ),
        jsonb_build_object(
          'id', 'signed_lease_agreement',
          'type', 'file',
          'label', 'Подписанный договор лизинга',
          'document_type', 'signed_lease_agreement',
          'required', true
        ),
        jsonb_build_object(
          'id', 'signed_payment_schedule',
          'type', 'file',
          'label', 'Подписанный график платежей',
          'document_type', 'signed_payment_schedule',
          'required', true
        ),
        jsonb_build_object(
          'id', 'signed_delivery_act',
          'type', 'file',
          'label', 'Подписанный акт приема-передачи',
          'document_type', 'signed_delivery_act',
          'required', true
        )
      )
    ) AS task_schema,
    jsonb_build_object(
      'instruction_short', 'Приложите подписанные документы сделки.'
    ) AS default_payload
)
UPDATE workflow_versions w
SET template = jsonb_set(w.template, '{stages,DOC_SIGNING}', ns.stage, true)
FROM new_stage ns
WHERE w.template ? 'stages' AND w.template->'stages' ? 'DOC_SIGNING';

WITH new_stage AS (
  SELECT
    jsonb_build_object(
      'version', '1.0',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'signed_purchase_agreement',
          'type', 'file',
          'label', 'Подписанный договор купли-продажи',
          'document_type', 'signed_purchase_agreement',
          'required', true
        ),
        jsonb_build_object(
          'id', 'signed_lease_agreement',
          'type', 'file',
          'label', 'Подписанный договор лизинга',
          'document_type', 'signed_lease_agreement',
          'required', true
        ),
        jsonb_build_object(
          'id', 'signed_payment_schedule',
          'type', 'file',
          'label', 'Подписанный график платежей',
          'document_type', 'signed_payment_schedule',
          'required', true
        ),
        jsonb_build_object(
          'id', 'signed_delivery_act',
          'type', 'file',
          'label', 'Подписанный акт приема-передачи',
          'document_type', 'signed_delivery_act',
          'required', true
        )
      )
    ) AS task_schema,
    jsonb_build_object(
      'instruction_short', 'Приложите подписанные документы сделки.'
    ) AS default_payload
)
UPDATE workflow_task_templates wtt
SET schema = ns.task_schema,
    default_payload = ns.default_payload
FROM new_stage ns
WHERE wtt.template_id = 'doc_signing_v1';

UPDATE tasks
SET payload = payload - 'checklist' - 'actions' - 'custom_actions' - 'customActions'
WHERE payload->>'template_id' = 'doc_signing_v1' OR type = 'DOC_SIGNING';
