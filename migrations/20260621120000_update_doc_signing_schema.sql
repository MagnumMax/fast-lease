WITH doc_signing_tasks AS (
  SELECT
    id,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            payload,
            '{fields,doc_tax_invoice}',
            to_jsonb(coalesce(payload->'fields'->>'doc_tax_invoice', '')),
            true
          ),
          '{fields,doc_invoice}',
          to_jsonb(coalesce(payload->'fields'->>'doc_invoice', '')),
          true
        ),
        '{fields,doc_receipt_voucher}',
        to_jsonb(coalesce(payload->'fields'->>'doc_receipt_voucher', '')),
        true
      ),
      '{fields,doc_payment_order}',
      to_jsonb(coalesce(payload->'fields'->>'doc_payment_order', '')),
      true
    ) AS new_payload
  FROM tasks
  WHERE type = 'DOC_SIGNING' AND status IN ('OPEN', 'IN_PROGRESS')
)
UPDATE tasks t
SET payload = u.new_payload
FROM doc_signing_tasks u
WHERE t.id = u.id;
