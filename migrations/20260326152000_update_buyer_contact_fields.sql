-- Ensure buyer tasks have separate contact email/phone fields in schema, defaults, and fields (without checklist)

WITH buyer_tasks AS (
  SELECT id,
    jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{schema,fields}',
          '{"fields":[{"id":"buyer_type","type":"select","label":"Тип покупателя","hint":"","options":[{"value":"company","label":"Юридическое лицо"},{"value":"individual","label":"Физическое лицо"}]},{"id":"buyer_company_email","type":"text","label":"Электронная почта компании"},{"id":"buyer_company_phone","type":"text","label":"Телефон компании"},{"id":"buyer_contact_email","type":"text","label":"Электронная почта покупателя"},{"id":"buyer_contact_phone","type":"text","label":"Телефон покупателя"}],"version":"1.0"}'::jsonb,
          true
        ),
        '{defaults}',
        coalesce(payload->'defaults','{}'::jsonb)
          || jsonb_build_object(
            'buyer_type', to_jsonb(coalesce(payload->'defaults'->>'buyer_type','')),
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
)
UPDATE tasks t
SET payload = u.new_payload
FROM buyer_tasks u
WHERE t.id = u.id;
