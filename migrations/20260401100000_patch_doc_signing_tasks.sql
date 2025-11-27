-- Align existing DOC_SIGNING tasks with file-based schema and drop checklist remnants

WITH schema_doc AS (
  SELECT jsonb_build_object(
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
  ) AS schema_payload
)
UPDATE tasks AS t
SET payload =
  (
    payload
    - 'checklist'
    - 'actions'
    - 'custom_actions'
    - 'customActions'
  )
  || jsonb_build_object(
    'schema', sd.schema_payload,
    'defaults',
      (coalesce(payload->'defaults', '{}'::jsonb) - 'checklist')
      || jsonb_build_object('instruction_short', 'Приложите подписанные документы сделки.'),
    'fields',
      (coalesce(payload->'fields', '{}'::jsonb) - 'checklist')
      || jsonb_build_object('instruction_short', 'Приложите подписанные документы сделки.')
  )
FROM schema_doc sd
WHERE t.type = 'DOC_SIGNING' OR t.payload->>'template_id' = 'doc_signing_v1';
