-- Split buyer/seller doc tasks into company/individual types and clean payload fields

-- Helper function to filter fields by allowlist
WITH buyer_tasks AS (
  SELECT
    id,
    COALESCE(payload->'fields'->>'buyer_type', payload->'defaults'->>'buyer_type') AS buyer_type,
    payload
  FROM tasks
  WHERE type = 'COLLECT_BUYER_DOCS'
), buyer_filtered AS (
  SELECT
    id,
    buyer_type,
    CASE WHEN buyer_type = 'company' THEN 'COLLECT_BUYER_DOCS_COMPANY' ELSE 'COLLECT_BUYER_DOCS_INDIVIDUAL' END AS new_type,
    CASE WHEN buyer_type = 'company' THEN 'collect_buyer_docs_company_v1' ELSE 'collect_buyer_docs_individual_v1' END AS new_template,
    ARRAY[
      'buyer_type','buyer_company_email','buyer_company_phone','buyer_contact_email','buyer_contact_phone',
      'doc_company_license','doc_emirates_id_manager','doc_passport_manager',
      'doc_emirates_id_driver','doc_passport_driver','doc_driving_license'
    ] AS allow_company,
    ARRAY[
      'buyer_type','buyer_contact_email','buyer_contact_phone',
      'doc_passport_buyer','doc_emirates_id_buyer','doc_driving_license_buyer','doc_second_driver_bundle'
    ] AS allow_individual,
    payload
  FROM buyer_tasks
), buyer_updates AS (
  SELECT
    id,
    new_type,
    new_template,
    jsonb_agg(elem) FILTER (WHERE elem->>'id' = ANY( CASE WHEN buyer_type='company' THEN allow_company ELSE allow_individual END)) AS new_schema_fields,
    (COALESCE(payload->'defaults','{}'::jsonb) - (SELECT jsonb_object_agg(k,v) FROM (SELECT * FROM jsonb_each_text(COALESCE(payload->'defaults','{}'::jsonb))) s WHERE key NOT IN (CASE WHEN buyer_type='company' THEN allow_company ELSE allow_individual END))) AS new_defaults_stub,
    (COALESCE(payload->'fields','{}'::jsonb) - (SELECT jsonb_object_agg(k,v) FROM (SELECT * FROM jsonb_each_text(COALESCE(payload->'fields','{}'::jsonb))) s WHERE key NOT IN (CASE WHEN buyer_type='company' THEN allow_company ELSE allow_individual END))) AS new_fields_stub
  FROM buyer_filtered t, LATERAL jsonb_array_elements(COALESCE(payload->'schema'->'fields','[]'::jsonb)) elem
  GROUP BY id, new_type, new_template, allow_company, allow_individual, payload, buyer_type
)
UPDATE tasks AS t
SET type = u.new_type,
    payload = jsonb_set(
               jsonb_set(
                 jsonb_set(payload, '{schema,fields}', COALESCE(u.new_schema_fields,'[]'::jsonb), true),
                 '{template_id}', to_jsonb(u.new_template::text), true
               ),
               '{fields}', COALESCE(u.new_fields_stub,'{}'::jsonb), true
             ),
    updated_at = NOW()
FROM buyer_updates u
WHERE t.id = u.id;

WITH seller_tasks AS (
  SELECT
    id,
    COALESCE(payload->'fields'->>'seller_type', payload->'defaults'->>'seller_type') AS seller_type,
    payload
  FROM tasks
  WHERE type = 'COLLECT_SELLER_DOCS'
), seller_filtered AS (
  SELECT
    id,
    seller_type,
    CASE WHEN seller_type = 'company' THEN 'COLLECT_SELLER_DOCS_COMPANY' ELSE 'COLLECT_SELLER_DOCS_INDIVIDUAL' END AS new_type,
    CASE WHEN seller_type = 'company' THEN 'collect_seller_docs_company_v1' ELSE 'collect_seller_docs_individual_v1' END AS new_template,
    ARRAY[
      'seller_type','seller_contact_email','seller_contact_phone','seller_bank_details',
      'doc_company_license','doc_quotation','doc_tax_invoice','doc_passing_certificate','doc_mulkia_certificate','doc_hiyaza_certificate',
      'doc_noc_company_letter','doc_noc_gps_letter','doc_trn_certificate','doc_emirates_id_owner'
    ] AS allow_company,
    ARRAY[
      'seller_type','seller_contact_email','seller_contact_phone',
      'doc_vcc_certificate','doc_vehicle_possession_certificate','doc_hiyaza_certificate','doc_mulkia_certificate','doc_passing_certificate',
      'doc_emirates_id_seller','doc_emirates_id_owner','doc_spa_invoice'
    ] AS allow_individual,
    payload
  FROM seller_tasks
), seller_updates AS (
  SELECT
    id,
    new_type,
    new_template,
    jsonb_agg(elem) FILTER (WHERE elem->>'id' = ANY( CASE WHEN seller_type='company' THEN allow_company ELSE allow_individual END)) AS new_schema_fields,
    (COALESCE(payload->'defaults','{}'::jsonb) - (SELECT jsonb_object_agg(k,v) FROM (SELECT * FROM jsonb_each_text(COALESCE(payload->'defaults','{}'::jsonb))) s WHERE key NOT IN (CASE WHEN seller_type='company' THEN allow_company ELSE allow_individual END))) AS new_defaults_stub,
    (COALESCE(payload->'fields','{}'::jsonb) - (SELECT jsonb_object_agg(k,v) FROM (SELECT * FROM jsonb_each_text(COALESCE(payload->'fields','{}'::jsonb))) s WHERE key NOT IN (CASE WHEN seller_type='company' THEN allow_company ELSE allow_individual END))) AS new_fields_stub
  FROM seller_filtered t, LATERAL jsonb_array_elements(COALESCE(payload->'schema'->'fields','[]'::jsonb)) elem
  GROUP BY id, new_type, new_template, allow_company, allow_individual, payload, seller_type
)
UPDATE tasks AS t
SET type = u.new_type,
    payload = jsonb_set(
               jsonb_set(
                 jsonb_set(payload, '{schema,fields}', COALESCE(u.new_schema_fields,'[]'::jsonb), true),
                 '{template_id}', to_jsonb(u.new_template::text), true
               ),
               '{fields}', COALESCE(u.new_fields_stub,'{}'::jsonb), true
             ),
    updated_at = NOW()
FROM seller_updates u
WHERE t.id = u.id;
