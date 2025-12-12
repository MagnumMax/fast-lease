-- Split docs collection into buyer and seller stages and seed seller document task

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_status') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'deal_status'
        AND e.enumlabel = 'DOCS_COLLECT_SELLER'
    ) THEN
      ALTER TYPE public.deal_status ADD VALUE 'DOCS_COLLECT_SELLER' AFTER 'DOCS_COLLECT_BUYER';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deal_statuses'
  ) THEN
    UPDATE deal_statuses
      SET title = 'Сбор документов покупателя', sort_order = 4
      WHERE code = 'DOCS_COLLECT_BUYER';

    INSERT INTO deal_statuses (code, title, sort_order) VALUES
      ('DOCS_COLLECT_SELLER', 'Сбор документов продавца', 5)
    ON CONFLICT (code) DO UPDATE
      SET title = EXCLUDED.title, sort_order = EXCLUDED.sort_order;

    UPDATE deal_statuses SET sort_order = 6 WHERE code = 'RISK_REVIEW';
    UPDATE deal_statuses SET sort_order = 7 WHERE code = 'FINANCE_REVIEW';
    UPDATE deal_statuses SET sort_order = 8 WHERE code = 'INVESTOR_PENDING';
    UPDATE deal_statuses SET sort_order = 9 WHERE code = 'CONTRACT_PREP';
    UPDATE deal_statuses SET sort_order = 10 WHERE code = 'DOC_SIGNING';
    UPDATE deal_statuses SET sort_order = 11 WHERE code = 'SIGNING_FUNDING';
    UPDATE deal_statuses SET sort_order = 12 WHERE code = 'VEHICLE_DELIVERY';
    UPDATE deal_statuses SET sort_order = 13 WHERE code = 'ACTIVE';
    UPDATE deal_statuses SET sort_order = 14 WHERE code = 'CANCELLED';
  END IF;
END $$;

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
              { "id": "checklist", "type": "checklist", "label": "Обязательные документы" }
            ]
          },
          "defaults": {
            "checklist": [
              "doc_passport_buyer",
              "doc_emirates_id_buyer",
              "doc_driving_license_buyer",
              "preliminary_purchase_agreement"
            ]
          }
        }
      }
    ],
    "exitRequirements": [
      { "key": "docs.required.allUploaded", "rule": "== true", "message": "Не все обязательные документы покупателя загружены." }
    ]
  }'::jsonb AS cfg
), seller_stage AS (
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
              { "id": "checklist", "type": "checklist", "label": "Документы продавца" }
            ]
          },
          "defaults": {
            "checklist": [
              "seller_id",
              "vehicle_registration",
              "ownership_proof",
              "seller_bank_details"
            ]
          }
        }
      }
    ],
    "exitRequirements": [
      { "key": "docs.seller.allUploaded", "rule": "== true", "message": "Не все обязательные документы продавца загружены." }
    ]
  }'::jsonb AS cfg
), patched AS (
  SELECT
    w.id,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            w.template,
            '{stages,DOCS_COLLECT_BUYER}',
            (SELECT cfg FROM buyer_stage),
            true
          ),
          '{stages,DOCS_COLLECT_SELLER}',
          (SELECT cfg FROM seller_stage),
          true
        ),
        '{kanbanOrder}',
        (
          SELECT jsonb_agg(elem)
          FROM (
            SELECT val::text AS val
            FROM jsonb_array_elements_text(w.template -> 'kanbanOrder') AS val
          ) base
          CROSS JOIN LATERAL (
            SELECT CASE
                     WHEN base.val = 'DOCS_COLLECT_BUYER'
                       THEN jsonb_build_array('DOCS_COLLECT_BUYER', 'DOCS_COLLECT_SELLER')
                     ELSE jsonb_build_array(base.val)
                   END AS expanded
          ) exp
          CROSS JOIN LATERAL jsonb_array_elements(exp.expanded) AS elem(elem)
        ),
        true
      ),
      '{transitions}',
      (
        SELECT jsonb_agg(t.elem)
        FROM (
          SELECT elem
          FROM jsonb_array_elements(w.template -> 'transitions') elem
          WHERE NOT (
            (elem->>'from' = 'DOCS_COLLECT_BUYER' AND elem->>'to' = 'RISK_REVIEW')
            OR (elem->>'from' = 'DOCS_COLLECT_BUYER' AND elem->>'to' = 'CANCELLED')
          )
          UNION ALL
          SELECT jsonb_build_object(
            'from', 'DOCS_COLLECT_BUYER',
            'to', 'DOCS_COLLECT_SELLER',
            'byRoles', jsonb_build_array('OP_MANAGER'),
            'guards', jsonb_build_array(jsonb_build_object('key', 'docs.required.allUploaded', 'rule', '== true'))
          )
          UNION ALL
          SELECT jsonb_build_object(
            'from', 'DOCS_COLLECT_SELLER',
            'to', 'RISK_REVIEW',
            'byRoles', jsonb_build_array('OP_MANAGER'),
            'guards', jsonb_build_array(jsonb_build_object('key', 'docs.seller.allUploaded', 'rule', '== true'))
          )
          UNION ALL
          SELECT jsonb_build_object(
            'from', 'DOCS_COLLECT_SELLER',
            'to', 'CANCELLED',
            'byRoles', jsonb_build_array('OP_MANAGER')
          )
        ) t
      )
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
       '{"version":"1.0","fields":[{"id":"checklist","type":"checklist","label":"Документы продавца"}]}'::jsonb,
       '{"checklist":["seller_id","vehicle_registration","ownership_proof","seller_bank_details"]}'::jsonb
FROM workflow_versions w
WHERE w.template IS NOT NULL
ON CONFLICT (workflow_version_id, template_id) DO UPDATE
  SET schema = EXCLUDED.schema,
      default_payload = EXCLUDED.default_payload;
