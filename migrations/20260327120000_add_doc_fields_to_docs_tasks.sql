-- Add per-document fields to buyer/seller docs collection tasks

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
              { "id": "buyer_contact_email", "type": "text", "label": "Электронная почта водителя", "hint": "Необязательно. Укажите, если есть." },
              { "id": "buyer_contact_phone", "type": "text", "label": "Телефон водителя", "hint": "Необязательно. Укажите, если есть." },
              { "id": "doc_company_license", "type": "text", "label": "Лицензия компании (файл)", "hint": "Ссылка/путь к файлу лицензии компании." },
              { "id": "doc_emirates_id_manager", "type": "text", "label": "Emirates ID менеджера лицензии (файл)", "hint": "Ссылка/путь к файлу Emirates ID менеджера." },
              { "id": "doc_visa_manager", "type": "text", "label": "Виза менеджера лицензии (файл)", "hint": "Ссылка/путь к файлу визы менеджера." },
              { "id": "doc_passport_manager", "type": "text", "label": "Паспорт менеджера лицензии (файл)", "hint": "Ссылка/путь к файлу паспорта менеджера." },
              { "id": "doc_emirates_id_driver", "type": "text", "label": "Emirates ID водителя (файл)", "hint": "Ссылка/путь к файлу Emirates ID водителя." },
              { "id": "doc_visa_driver", "type": "text", "label": "Виза водителя (файл)", "hint": "Ссылка/путь к файлу визы водителя." },
              { "id": "doc_passport_driver", "type": "text", "label": "Паспорт водителя (файл)", "hint": "Ссылка/путь к файлу паспорта водителя." },
              { "id": "doc_driving_license", "type": "text", "label": "Права клиента/водителя (файл)", "hint": "Ссылка/путь к файлу водительских прав." },
              { "id": "doc_vcc_certificate", "type": "text", "label": "VCC (Vehicle Certificate of Conformity)", "hint": "Ссылка/путь к файлу VCC." },
              { "id": "doc_vehicle_possession_certificate", "type": "text", "label": "Vehicle Possession Certificate", "hint": "Ссылка/путь к файлу сертификата." },
              { "id": "doc_hiyaza_certificate", "type": "text", "label": "Hiyaza", "hint": "Ссылка/путь к файлу." },
              { "id": "doc_mulkia_certificate", "type": "text", "label": "Mulkia", "hint": "Ссылка/путь к файлу." },
              { "id": "doc_passing_certificate", "type": "text", "label": "Passing", "hint": "Ссылка/путь к файлу." }
            ]
          },
          "defaults": {
            "buyer_type": "",
            "checklist": [],
            "buyer_company_email": "",
            "buyer_company_phone": "",
            "buyer_contact_email": "",
            "buyer_contact_phone": "",
            "doc_company_license": "",
            "doc_emirates_id_manager": "",
            "doc_visa_manager": "",
            "doc_passport_manager": "",
            "doc_emirates_id_driver": "",
            "doc_visa_driver": "",
            "doc_passport_driver": "",
            "doc_driving_license": "",
            "doc_vcc_certificate": "",
            "doc_vehicle_possession_certificate": "",
            "doc_hiyaza_certificate": "",
            "doc_mulkia_certificate": "",
            "doc_passing_certificate": ""
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
              { "id": "seller_contact_phone", "type": "text", "label": "Телефон продавца", "hint": "Необязательно. Укажите, если есть." },
              { "id": "seller_bank_details", "type": "text", "label": "Банковские реквизиты", "hint": "Необязательно. Укажите, если есть." },
              { "id": "doc_company_license", "type": "text", "label": "Лицензия компании (файл)", "hint": "Ссылка/путь к файлу лицензии компании." },
              { "id": "doc_quotation", "type": "text", "label": "Quotation (файл)", "hint": "Ссылка/путь к файлу quotation." },
              { "id": "doc_tax_invoice", "type": "text", "label": "Tax Invoice (файл)", "hint": "Ссылка/путь к tax invoice." },
              { "id": "doc_passing_certificate", "type": "text", "label": "Passing", "hint": "Ссылка/путь к файлу passing." },
              { "id": "doc_mulkia_certificate", "type": "text", "label": "Mulkia", "hint": "Ссылка/путь к файлу mulkia." },
              { "id": "doc_hiyaza_certificate", "type": "text", "label": "Hiyaza", "hint": "Ссылка/путь к файлу hiyaza." },
              { "id": "doc_noc_company_letter", "type": "text", "label": "NOC letter (компания)", "hint": "Ссылка/путь к NOC от компании." },
              { "id": "doc_noc_gps_letter", "type": "text", "label": "NOC letter от GPS", "hint": "Ссылка/путь к NOC от GPS (Rent-a-car)." },
              { "id": "doc_trn_certificate", "type": "text", "label": "TRN сертификат", "hint": "Ссылка/путь к TRN сертификату." },
              { "id": "doc_vcc_certificate", "type": "text", "label": "VCC (Vehicle Certificate of Conformity)", "hint": "Ссылка/путь к файлу VCC." },
              { "id": "doc_vehicle_possession_certificate", "type": "text", "label": "Vehicle Possession Certificate", "hint": "Ссылка/путь к файлу сертификата." },
              { "id": "doc_emirates_id_seller", "type": "text", "label": "Emirates ID продавца (файл)", "hint": "Ссылка/путь к файлу Emirates ID продавца." },
              { "id": "doc_spa_invoice", "type": "text", "label": "SPA invoice", "hint": "Ссылка/путь к файлу SPA invoice." }
            ]
          },
          "defaults": {
            "seller_type": "",
            "checklist": [],
            "seller_contact_email": "",
            "seller_contact_phone": "",
            "seller_bank_details": "",
            "doc_company_license": "",
            "doc_quotation": "",
            "doc_tax_invoice": "",
            "doc_passing_certificate": "",
            "doc_mulkia_certificate": "",
            "doc_hiyaza_certificate": "",
            "doc_noc_company_letter": "",
            "doc_noc_gps_letter": "",
            "doc_trn_certificate": "",
            "doc_vcc_certificate": "",
            "doc_vehicle_possession_certificate": "",
            "doc_emirates_id_seller": "",
            "doc_spa_invoice": ""
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
       '{
         "version": "1.0",
         "fields": [
           { "id": "buyer_type", "type": "select", "label": "Тип покупателя", "hint": "Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.", "options": [
             { "value": "company", "label": "Юридическое лицо" },
             { "value": "individual", "label": "Физическое лицо" }
           ]},
           { "id": "checklist", "type": "checklist", "label": "Рекомендуемые документы (необязательно)" },
           { "id": "buyer_company_email", "type": "text", "label": "Электронная почта компании", "hint": "Необязательно. Укажите, если есть." },
           { "id": "buyer_company_phone", "type": "text", "label": "Телефон компании", "hint": "Необязательно. Укажите, если есть." },
           { "id": "buyer_contact_email", "type": "text", "label": "Электронная почта водителя", "hint": "Необязательно. Укажите, если есть." },
           { "id": "buyer_contact_phone", "type": "text", "label": "Телефон водителя", "hint": "Необязательно. Укажите, если есть." },
           { "id": "doc_company_license", "type": "text", "label": "Лицензия компании (файл)", "hint": "Ссылка/путь к файлу лицензии компании." },
           { "id": "doc_emirates_id_manager", "type": "text", "label": "Emirates ID менеджера лицензии (файл)", "hint": "Ссылка/путь к файлу Emirates ID менеджера." },
           { "id": "doc_visa_manager", "type": "text", "label": "Виза менеджера лицензии (файл)", "hint": "Ссылка/путь к файлу визы менеджера." },
           { "id": "doc_passport_manager", "type": "text", "label": "Паспорт менеджера лицензии (файл)", "hint": "Ссылка/путь к файлу паспорта менеджера." },
           { "id": "doc_emirates_id_driver", "type": "text", "label": "Emirates ID водителя (файл)", "hint": "Ссылка/путь к файлу Emirates ID водителя." },
           { "id": "doc_visa_driver", "type": "text", "label": "Виза водителя (файл)", "hint": "Ссылка/путь к файлу визы водителя." },
           { "id": "doc_passport_driver", "type": "text", "label": "Паспорт водителя (файл)", "hint": "Ссылка/путь к файлу паспорта водителя." },
           { "id": "doc_driving_license", "type": "text", "label": "Права клиента/водителя (файл)", "hint": "Ссылка/путь к файлу водительских прав." },
           { "id": "doc_vcc_certificate", "type": "text", "label": "VCC (Vehicle Certificate of Conformity)", "hint": "Ссылка/путь к файлу VCC." },
           { "id": "doc_vehicle_possession_certificate", "type": "text", "label": "Vehicle Possession Certificate", "hint": "Ссылка/путь к файлу сертификата." },
           { "id": "doc_hiyaza_certificate", "type": "text", "label": "Hiyaza", "hint": "Ссылка/путь к файлу." },
           { "id": "doc_mulkia_certificate", "type": "text", "label": "Mulkia", "hint": "Ссылка/путь к файлу." },
           { "id": "doc_passing_certificate", "type": "text", "label": "Passing", "hint": "Ссылка/путь к файлу." }
         ]
       }'::jsonb,
       '{
         "buyer_type": "",
         "checklist": [],
         "buyer_company_email": "",
         "buyer_company_phone": "",
         "buyer_contact_email": "",
         "buyer_contact_phone": "",
         "doc_company_license": "",
         "doc_emirates_id_manager": "",
         "doc_visa_manager": "",
         "doc_passport_manager": "",
         "doc_emirates_id_driver": "",
         "doc_visa_driver": "",
         "doc_passport_driver": "",
         "doc_driving_license": "",
         "doc_vcc_certificate": "",
         "doc_vehicle_possession_certificate": "",
         "doc_hiyaza_certificate": "",
         "doc_mulkia_certificate": "",
         "doc_passing_certificate": ""
       }'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;

INSERT INTO workflow_task_templates (workflow_version_id, template_id, task_type, schema, default_payload)
SELECT w.id,
       'collect_seller_docs_v1',
       'COLLECT_SELLER_DOCS',
       '{
         "version": "1.0",
         "fields": [
           { "id": "seller_type", "type": "select", "label": "Тип продавца", "hint": "Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.", "options": [
             { "value": "company", "label": "Юридическое лицо" },
             { "value": "individual", "label": "Физическое лицо" }
           ]},
           { "id": "checklist", "type": "checklist", "label": "Рекомендуемые документы (необязательно)" },
           { "id": "seller_contact_email", "type": "text", "label": "Электронная почта продавца", "hint": "Необязательно. Укажите, если есть." },
           { "id": "seller_contact_phone", "type": "text", "label": "Телефон продавца", "hint": "Необязательно. Укажите, если есть." },
           { "id": "seller_bank_details", "type": "text", "label": "Банковские реквизиты", "hint": "Необязательно. Укажите, если есть." },
           { "id": "doc_company_license", "type": "text", "label": "Лицензия компании (файл)", "hint": "Ссылка/путь к файлу лицензии компании." },
           { "id": "doc_quotation", "type": "text", "label": "Quotation (файл)", "hint": "Ссылка/путь к файлу quotation." },
           { "id": "doc_tax_invoice", "type": "text", "label": "Tax Invoice (файл)", "hint": "Ссылка/путь к tax invoice." },
           { "id": "doc_passing_certificate", "type": "text", "label": "Passing", "hint": "Ссылка/путь к файлу passing." },
           { "id": "doc_mulkia_certificate", "type": "text", "label": "Mulkia", "hint": "Ссылка/путь к файлу mulkia." },
           { "id": "doc_hiyaza_certificate", "type": "text", "label": "Hiyaza", "hint": "Ссылка/путь к файлу hiyaza." },
           { "id": "doc_noc_company_letter", "type": "text", "label": "NOC letter (компания)", "hint": "Ссылка/путь к NOC от компании." },
           { "id": "doc_noc_gps_letter", "type": "text", "label": "NOC letter от GPS", "hint": "Ссылка/путь к NOC от GPS (Rent-a-car)." },
           { "id": "doc_trn_certificate", "type": "text", "label": "TRN сертификат", "hint": "Ссылка/путь к TRN сертификату." },
           { "id": "doc_vcc_certificate", "type": "text", "label": "VCC (Vehicle Certificate of Conformity)", "hint": "Ссылка/путь к файлу VCC." },
           { "id": "doc_vehicle_possession_certificate", "type": "text", "label": "Vehicle Possession Certificate", "hint": "Ссылка/путь к файлу сертификата." },
           { "id": "doc_emirates_id_seller", "type": "text", "label": "Emirates ID продавца (файл)", "hint": "Ссылка/путь к файлу Emirates ID продавца." },
           { "id": "doc_spa_invoice", "type": "text", "label": "SPA invoice", "hint": "Ссылка/путь к файлу SPA invoice." }
         ]
       }'::jsonb,
       '{
         "seller_type": "",
         "checklist": [],
         "seller_contact_email": "",
         "seller_contact_phone": "",
         "seller_bank_details": "",
         "doc_company_license": "",
         "doc_quotation": "",
         "doc_tax_invoice": "",
         "doc_passing_certificate": "",
         "doc_mulkia_certificate": "",
         "doc_hiyaza_certificate": "",
         "doc_noc_company_letter": "",
         "doc_noc_gps_letter": "",
         "doc_trn_certificate": "",
         "doc_vcc_certificate": "",
         "doc_vehicle_possession_certificate": "",
         "doc_emirates_id_seller": "",
         "doc_spa_invoice": ""
       }'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;

-- Refresh open tasks with new fields/defaults
WITH buyer_tasks AS (
  SELECT id,
    jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{schema,fields}',
          '{
            "fields": [
              { "id": "buyer_type", "type": "select", "label": "Тип покупателя", "hint": "Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.", "options": [
                { "value": "company", "label": "Юридическое лицо" },
                { "value": "individual", "label": "Физическое лицо" }
              ]},
              { "id": "checklist", "type": "checklist", "label": "Рекомендуемые документы (необязательно)" },
              { "id": "buyer_company_email", "type": "text", "label": "Электронная почта компании", "hint": "Необязательно. Укажите, если есть." },
              { "id": "buyer_company_phone", "type": "text", "label": "Телефон компании", "hint": "Необязательно. Укажите, если есть." },
              { "id": "buyer_contact_email", "type": "text", "label": "Электронная почта водителя", "hint": "Необязательно. Укажите, если есть." },
              { "id": "buyer_contact_phone", "type": "text", "label": "Телефон водителя", "hint": "Необязательно. Укажите, если есть." },
              { "id": "doc_company_license", "type": "text", "label": "Лицензия компании (файл)", "hint": "Ссылка/путь к файлу лицензии компании." },
              { "id": "doc_emirates_id_manager", "type": "text", "label": "Emirates ID менеджера лицензии (файл)", "hint": "Ссылка/путь к файлу Emirates ID менеджера." },
              { "id": "doc_visa_manager", "type": "text", "label": "Виза менеджера лицензии (файл)", "hint": "Ссылка/путь к файлу визы менеджера." },
              { "id": "doc_passport_manager", "type": "text", "label": "Паспорт менеджера лицензии (файл)", "hint": "Ссылка/путь к файлу паспорта менеджера." },
              { "id": "doc_emirates_id_driver", "type": "text", "label": "Emirates ID водителя (файл)", "hint": "Ссылка/путь к файлу Emirates ID водителя." },
              { "id": "doc_visa_driver", "type": "text", "label": "Виза водителя (файл)", "hint": "Ссылка/путь к файлу визы водителя." },
              { "id": "doc_passport_driver", "type": "text", "label": "Паспорт водителя (файл)", "hint": "Ссылка/путь к файлу паспорта водителя." },
              { "id": "doc_driving_license", "type": "text", "label": "Права клиента/водителя (файл)", "hint": "Ссылка/путь к файлу водительских прав." },
              { "id": "doc_vcc_certificate", "type": "text", "label": "VCC (Vehicle Certificate of Conformity)", "hint": "Ссылка/путь к файлу VCC." },
              { "id": "doc_vehicle_possession_certificate", "type": "text", "label": "Vehicle Possession Certificate", "hint": "Ссылка/путь к файлу сертификата." },
              { "id": "doc_hiyaza_certificate", "type": "text", "label": "Hiyaza", "hint": "Ссылка/путь к файлу." },
              { "id": "doc_mulkia_certificate", "type": "text", "label": "Mulkia", "hint": "Ссылка/путь к файлу." },
              { "id": "doc_passing_certificate", "type": "text", "label": "Passing", "hint": "Ссылка/путь к файлу." }
            ],
            "version": "1.0"
          }'::jsonb,
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
            'buyer_contact_phone', to_jsonb(coalesce(payload->'defaults'->>'buyer_contact_phone','')),
            'doc_company_license', to_jsonb(coalesce(payload->'defaults'->>'doc_company_license','')),
            'doc_emirates_id_manager', to_jsonb(coalesce(payload->'defaults'->>'doc_emirates_id_manager','')),
            'doc_visa_manager', to_jsonb(coalesce(payload->'defaults'->>'doc_visa_manager','')),
            'doc_passport_manager', to_jsonb(coalesce(payload->'defaults'->>'doc_passport_manager','')),
            'doc_emirates_id_driver', to_jsonb(coalesce(payload->'defaults'->>'doc_emirates_id_driver','')),
            'doc_visa_driver', to_jsonb(coalesce(payload->'defaults'->>'doc_visa_driver','')),
            'doc_passport_driver', to_jsonb(coalesce(payload->'defaults'->>'doc_passport_driver','')),
            'doc_driving_license', to_jsonb(coalesce(payload->'defaults'->>'doc_driving_license','')),
            'doc_vcc_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_vcc_certificate','')),
            'doc_vehicle_possession_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_vehicle_possession_certificate','')),
            'doc_hiyaza_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_hiyaza_certificate','')),
            'doc_mulkia_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_mulkia_certificate','')),
            'doc_passing_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_passing_certificate',''))
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
          'buyer_contact_phone', to_jsonb(coalesce(payload->'fields'->>'buyer_contact_phone','')),
          'doc_company_license', to_jsonb(coalesce(payload->'fields'->>'doc_company_license','')),
          'doc_emirates_id_manager', to_jsonb(coalesce(payload->'fields'->>'doc_emirates_id_manager','')),
          'doc_visa_manager', to_jsonb(coalesce(payload->'fields'->>'doc_visa_manager','')),
          'doc_passport_manager', to_jsonb(coalesce(payload->'fields'->>'doc_passport_manager','')),
          'doc_emirates_id_driver', to_jsonb(coalesce(payload->'fields'->>'doc_emirates_id_driver','')),
          'doc_visa_driver', to_jsonb(coalesce(payload->'fields'->>'doc_visa_driver','')),
          'doc_passport_driver', to_jsonb(coalesce(payload->'fields'->>'doc_passport_driver','')),
          'doc_driving_license', to_jsonb(coalesce(payload->'fields'->>'doc_driving_license','')),
          'doc_vcc_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_vcc_certificate','')),
          'doc_vehicle_possession_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_vehicle_possession_certificate','')),
          'doc_hiyaza_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_hiyaza_certificate','')),
          'doc_mulkia_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_mulkia_certificate','')),
          'doc_passing_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_passing_certificate',''))
        ),
      true
    ) AS new_payload
  FROM tasks
  WHERE type = 'COLLECT_DOCS' AND status IN ('OPEN','IN_PROGRESS')
),
seller_tasks AS (
  SELECT id,
    jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{schema,fields}',
          '{
            "fields": [
              { "id": "seller_type", "type": "select", "label": "Тип продавца", "hint": "Выберите тип, чтобы увидеть рекомендуемый набор документов. Все поля необязательны.", "options": [
                { "value": "company", "label": "Юридическое лицо" },
                { "value": "individual", "label": "Физическое лицо" }
              ]},
              { "id": "checklist", "type": "checklist", "label": "Рекомендуемые документы (необязательно)" },
              { "id": "seller_contact_email", "type": "text", "label": "Электронная почта продавца", "hint": "Необязательно. Укажите, если есть." },
              { "id": "seller_contact_phone", "type": "text", "label": "Телефон продавца", "hint": "Необязательно. Укажите, если есть." },
              { "id": "seller_bank_details", "type": "text", "label": "Банковские реквизиты", "hint": "Необязательно. Укажите, если есть." },
              { "id": "doc_company_license", "type": "text", "label": "Лицензия компании (файл)", "hint": "Ссылка/путь к файлу лицензии компании." },
              { "id": "doc_quotation", "type": "text", "label": "Quotation (файл)", "hint": "Ссылка/путь к файлу quotation." },
              { "id": "doc_tax_invoice", "type": "text", "label": "Tax Invoice (файл)", "hint": "Ссылка/путь к tax invoice." },
              { "id": "doc_passing_certificate", "type": "text", "label": "Passing", "hint": "Ссылка/путь к файлу passing." },
              { "id": "doc_mulkia_certificate", "type": "text", "label": "Mulkia", "hint": "Ссылка/путь к файлу mulkia." },
              { "id": "doc_hiyaza_certificate", "type": "text", "label": "Hiyaza", "hint": "Ссылка/путь к файлу hiyaza." },
              { "id": "doc_noc_company_letter", "type": "text", "label": "NOC letter (компания)", "hint": "Ссылка/путь к NOC от компании." },
              { "id": "doc_noc_gps_letter", "type": "text", "label": "NOC letter от GPS", "hint": "Ссылка/путь к NOC от GPS (Rent-a-car)." },
              { "id": "doc_trn_certificate", "type": "text", "label": "TRN сертификат", "hint": "Ссылка/путь к TRN сертификату." },
              { "id": "doc_vcc_certificate", "type": "text", "label": "VCC (Vehicle Certificate of Conformity)", "hint": "Ссылка/путь к файлу VCC." },
              { "id": "doc_vehicle_possession_certificate", "type": "text", "label": "Vehicle Possession Certificate", "hint": "Ссылка/путь к файлу сертификата." },
              { "id": "doc_emirates_id_seller", "type": "text", "label": "Emirates ID продавца (файл)", "hint": "Ссылка/путь к файлу Emirates ID продавца." },
              { "id": "doc_spa_invoice", "type": "text", "label": "SPA invoice", "hint": "Ссылка/путь к файлу SPA invoice." }
            ],
            "version": "1.0"
          }'::jsonb,
          true
        ),
        '{defaults}',
        coalesce(payload->'defaults','{}'::jsonb)
          || jsonb_build_object(
            'seller_type', to_jsonb(coalesce(payload->'defaults'->>'seller_type','')),
            'checklist', coalesce(payload->'defaults'->'checklist','[]'::jsonb),
            'seller_contact_email', to_jsonb(coalesce(payload->'defaults'->>'seller_contact_email','')),
            'seller_contact_phone', to_jsonb(coalesce(payload->'defaults'->>'seller_contact_phone','')),
            'seller_bank_details', to_jsonb(coalesce(payload->'defaults'->>'seller_bank_details','')),
            'doc_company_license', to_jsonb(coalesce(payload->'defaults'->>'doc_company_license','')),
            'doc_quotation', to_jsonb(coalesce(payload->'defaults'->>'doc_quotation','')),
            'doc_tax_invoice', to_jsonb(coalesce(payload->'defaults'->>'doc_tax_invoice','')),
            'doc_passing_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_passing_certificate','')),
            'doc_mulkia_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_mulkia_certificate','')),
            'doc_hiyaza_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_hiyaza_certificate','')),
            'doc_noc_company_letter', to_jsonb(coalesce(payload->'defaults'->>'doc_noc_company_letter','')),
            'doc_noc_gps_letter', to_jsonb(coalesce(payload->'defaults'->>'doc_noc_gps_letter','')),
            'doc_trn_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_trn_certificate','')),
            'doc_vcc_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_vcc_certificate','')),
            'doc_vehicle_possession_certificate', to_jsonb(coalesce(payload->'defaults'->>'doc_vehicle_possession_certificate','')),
            'doc_emirates_id_seller', to_jsonb(coalesce(payload->'defaults'->>'doc_emirates_id_seller','')),
            'doc_spa_invoice', to_jsonb(coalesce(payload->'defaults'->>'doc_spa_invoice',''))
          ),
        true
      ),
      '{fields}',
      coalesce(payload->'fields','{}'::jsonb)
        || jsonb_build_object(
          'seller_type', to_jsonb(coalesce(payload->'fields'->>'seller_type','')),
          'seller_contact_email', to_jsonb(coalesce(payload->'fields'->>'seller_contact_email','')),
          'seller_contact_phone', to_jsonb(coalesce(payload->'fields'->>'seller_contact_phone','')),
          'seller_bank_details', to_jsonb(coalesce(payload->'fields'->>'seller_bank_details','')),
          'doc_company_license', to_jsonb(coalesce(payload->'fields'->>'doc_company_license','')),
          'doc_quotation', to_jsonb(coalesce(payload->'fields'->>'doc_quotation','')),
          'doc_tax_invoice', to_jsonb(coalesce(payload->'fields'->>'doc_tax_invoice','')),
          'doc_passing_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_passing_certificate','')),
          'doc_mulkia_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_mulkia_certificate','')),
          'doc_hiyaza_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_hiyaza_certificate','')),
          'doc_noc_company_letter', to_jsonb(coalesce(payload->'fields'->>'doc_noc_company_letter','')),
          'doc_noc_gps_letter', to_jsonb(coalesce(payload->'fields'->>'doc_noc_gps_letter','')),
          'doc_trn_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_trn_certificate','')),
          'doc_vcc_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_vcc_certificate','')),
          'doc_vehicle_possession_certificate', to_jsonb(coalesce(payload->'fields'->>'doc_vehicle_possession_certificate','')),
          'doc_emirates_id_seller', to_jsonb(coalesce(payload->'fields'->>'doc_emirates_id_seller','')),
          'doc_spa_invoice', to_jsonb(coalesce(payload->'fields'->>'doc_spa_invoice',''))
        ),
      true
    ) AS new_payload
  FROM tasks
  WHERE type = 'COLLECT_SELLER_DOCS' AND status IN ('OPEN','IN_PROGRESS')
)
UPDATE tasks t
SET payload = u.new_payload
FROM (
  SELECT * FROM buyer_tasks
  UNION ALL
  SELECT * FROM seller_tasks
) u
WHERE t.id = u.id;
