-- Replace remaining checklists with explicit file fields in workflow and tasks

-- Update workflow stage entry actions (VEHICLE_CHECK)
WITH defs AS (
  SELECT *
  FROM (VALUES
    (
      'verify_vehicle_v1',
      '{"version":"1.0","fields":[{"id":"deal_id","type":"badge","label":"ID сделки"},{"id":"doc_technical_report","type":"file","label":"Технический отчёт","document_type":"technical_report"},{"id":"analog_market_url_1","type":"text","label":"Аналоги на площадках #1"},{"id":"analog_market_url_2","type":"text","label":"Аналоги на площадках #2"},{"id":"analog_market_url_3","type":"text","label":"Аналоги на площадках #3"},{"id":"analog_market_plus1_url_1","type":"text","label":"Аналоги на площадках +1 год #1"},{"id":"analog_market_plus1_url_2","type":"text","label":"Аналоги на площадках +1 год #2"},{"id":"analog_market_plus1_url_3","type":"text","label":"Аналоги на площадках +1 год #3"}]}'::jsonb,
      '{"instruction_short":"Проверьте техсостояние авто, оценку стоимости и приложите отчёт.","doc_technical_report":""}'::jsonb
    )
  ) AS t(template_id, schema_payload, default_payload)
)
UPDATE workflow_versions w
SET template = jsonb_set(
  w.template,
  '{stages,VEHICLE_CHECK,entryActions}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN action->>'type' = 'TASK_CREATE'
             AND (action->'task')->>'templateId' = 'verify_vehicle_v1'
        THEN jsonb_set(
               jsonb_set(action, '{task,schema}', d.schema_payload, false),
               '{task,defaults}', d.default_payload, false
             )
        ELSE action
      END
    )
    FROM jsonb_array_elements(w.template #> '{stages,VEHICLE_CHECK,entryActions}') action
    CROSS JOIN (SELECT schema_payload, default_payload FROM defs WHERE template_id = 'verify_vehicle_v1') d
  ),
  false
)
WHERE w.template #>> '{stages,VEHICLE_CHECK}' IS NOT NULL;

-- Update workflow stage entry actions (SIGNING_FUNDING)
WITH defs AS (
  SELECT *
  FROM (VALUES
    (
      'receive_advance_v1',
      '{"version":"1.0","fields":[{"id":"tax_invoice","type":"file","label":"Инвойс на первый взнос","document_type":"tax_invoice","required":true}]}'::jsonb,
      '{"instruction_short":"Проверьте получение первого взноса и приложите подтверждение (инвойс)."}'::jsonb
    ),
    (
      'pay_supplier_v1',
      '{"version":"1.0","fields":[{"id":"quotation","type":"file","label":"Quotation","document_type":"quotation","required":false},{"id":"payment_receipt","type":"file","label":"Платёжка поставщику","document_type":"payment_receipt","required":true}]}'::jsonb,
      '{"instruction_short":"Проверьте данные и приложите платёжку поставщику."}'::jsonb
    )
  ) AS t(template_id, schema_payload, default_payload)
)
UPDATE workflow_versions w
SET template = jsonb_set(
  w.template,
  '{stages,SIGNING_FUNDING,entryActions}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN action->>'type' = 'TASK_CREATE'
             AND (action->'task')->>'templateId' = 'receive_advance_v1'
        THEN jsonb_set(
               jsonb_set(action, '{task,schema}', d1.schema_payload, false),
               '{task,defaults}', d1.default_payload, false
             )
        WHEN action->>'type' = 'TASK_CREATE'
             AND (action->'task')->>'templateId' = 'pay_supplier_v1'
        THEN jsonb_set(
               jsonb_set(action, '{task,schema}', d2.schema_payload, false),
               '{task,defaults}', d2.default_payload, false
             )
        ELSE action
      END
    )
    FROM jsonb_array_elements(w.template #> '{stages,SIGNING_FUNDING,entryActions}') action
    CROSS JOIN (SELECT schema_payload, default_payload FROM defs WHERE template_id = 'receive_advance_v1') d1
    CROSS JOIN (SELECT schema_payload, default_payload FROM defs WHERE template_id = 'pay_supplier_v1') d2
  ),
  false
)
WHERE w.template #>> '{stages,SIGNING_FUNDING}' IS NOT NULL;

-- Update task template cache
WITH defs AS (
  SELECT *
  FROM (VALUES
    (
      'verify_vehicle_v1',
      '{"version":"1.0","fields":[{"id":"deal_id","type":"badge","label":"ID сделки"},{"id":"doc_technical_report","type":"file","label":"Технический отчёт","document_type":"technical_report"},{"id":"analog_market_url_1","type":"text","label":"Аналоги на площадках #1"},{"id":"analog_market_url_2","type":"text","label":"Аналоги на площадках #2"},{"id":"analog_market_url_3","type":"text","label":"Аналоги на площадках #3"},{"id":"analog_market_plus1_url_1","type":"text","label":"Аналоги на площадках +1 год #1"},{"id":"analog_market_plus1_url_2","type":"text","label":"Аналоги на площадках +1 год #2"},{"id":"analog_market_plus1_url_3","type":"text","label":"Аналоги на площадках +1 год #3"}]}'::jsonb,
      '{"instruction_short":"Проверьте техсостояние авто, оценку стоимости и приложите отчёт.","doc_technical_report":""}'::jsonb
    ),
    (
      'receive_advance_v1',
      '{"version":"1.0","fields":[{\"id\":\"tax_invoice\",\"type\":\"file\",\"label\":\"Инвойс на первый взнос\",\"document_type\":\"tax_invoice\",\"required\":true}]}'::jsonb,
      '{"instruction_short":"Проверьте получение первого взноса и приложите подтверждение (инвойс)."}'::jsonb
    ),
    (
      'pay_supplier_v1',
      '{"version":"1.0","fields":[{\"id\":\"quotation\",\"type\":\"file\",\"label\":\"Quotation\",\"document_type\":\"quotation\",\"required\":false},{\"id\":\"payment_receipt\",\"type\":\"file\",\"label\":\"Платёжка поставщику\",\"document_type\":\"payment_receipt\",\"required\":true}]}'::jsonb,
      '{"instruction_short":"Проверьте данные и приложите платёжку поставщику."}'::jsonb
    )
  ) AS t(template_id, schema_payload, default_payload)
)
UPDATE workflow_task_templates wtt
SET schema = d.schema_payload,
    default_payload = d.default_payload
FROM defs d
WHERE wtt.template_id = d.template_id;

-- Backfill existing tasks payloads
WITH defs AS (
  SELECT *
  FROM (VALUES
    (
      'verify_vehicle_v1',
      '{"version":"1.0","fields":[{"id":"deal_id","type":"badge","label":"ID сделки"},{"id":"doc_technical_report","type":"file","label":"Технический отчёт","document_type":"technical_report"},{"id":"analog_market_url_1","type":"text","label":"Аналоги на площадках #1"},{"id":"analog_market_url_2","type":"text","label":"Аналоги на площадках #2"},{"id":"analog_market_url_3","type":"text","label":"Аналоги на площадках #3"},{"id":"analog_market_plus1_url_1","type":"text","label":"Аналоги на площадках +1 год #1"},{"id":"analog_market_plus1_url_2","type":"text","label":"Аналоги на площадках +1 год #2"},{"id":"analog_market_plus1_url_3","type":"text","label":"Аналоги на площадках +1 год #3"}]}'::jsonb,
      '{"instruction_short":"Проверьте техсостояние авто, оценку стоимости и приложите отчёт.","doc_technical_report":""}'::jsonb
    ),
    (
      'receive_advance_v1',
      '{"version":"1.0","fields":[{\"id\":\"tax_invoice\",\"type\":\"file\",\"label\":\"Инвойс на первый взнос\",\"document_type\":\"tax_invoice\",\"required\":true}]}'::jsonb,
      '{"instruction_short":"Проверьте получение первого взноса и приложите подтверждение (инвойс)."}'::jsonb
    ),
    (
      'pay_supplier_v1',
      '{"version":"1.0","fields":[{\"id\":\"quotation\",\"type\":\"file\",\"label\":\"Quotation\",\"document_type\":\"quotation\",\"required\":false},{\"id\":\"payment_receipt\",\"type\":\"file\",\"label\":\"Платёжка поставщику\",\"document_type\":\"payment_receipt\",\"required\":true}]}'::jsonb,
      '{"instruction_short":"Проверьте данные и приложите платёжку поставщику."}'::jsonb
    )
  ) AS t(template_id, schema_payload, default_payload)
)
UPDATE tasks t
SET payload =
  (
    payload
    - 'checklist'
    - 'actions'
    - 'custom_actions'
    - 'customActions'
  )
  || jsonb_build_object(
    'schema', d.schema_payload,
    'defaults', d.default_payload,
    'fields', (coalesce(payload->'fields', '{}'::jsonb) - 'checklist')
              || jsonb_build_object('instruction_short', d.default_payload->>'instruction_short')
  )
FROM defs d
WHERE t.payload->>'template_id' = d.template_id;
