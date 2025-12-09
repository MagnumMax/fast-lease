WITH updated_schema AS (
  SELECT
    id,
    jsonb_set(
      payload,
      '{schema,fields}',
      (payload->'schema'->'fields') || 
      '[
        {
          "id": "doc_tax_invoice",
          "type": "file",
          "label": "Tax Invoice (для VAT-продавцов)",
          "document_type": "tax_invoice",
          "required": false
        },
        {
          "id": "doc_invoice",
          "type": "file",
          "label": "Invoice (без VAT)",
          "document_type": "invoice",
          "required": false
        },
        {
          "id": "doc_receipt_voucher",
          "type": "file",
          "label": "Receipt voucher (от продавца)",
          "document_type": "payment_receipt",
          "required": false
        },
        {
          "id": "doc_payment_order",
          "type": "file",
          "label": "Платежное поручение",
          "document_type": "payment_receipt",
          "required": false
        }
      ]'::jsonb
    ) AS payload_with_schema
  FROM tasks
  WHERE type = 'DOC_SIGNING' AND status IN ('OPEN', 'IN_PROGRESS')
  -- Ensure we don't add if already present
  AND NOT (payload->'schema'->'fields' @> '[{"id": "doc_tax_invoice"}]')
),
final_payload AS (
  SELECT
    id,
    jsonb_set(
      payload_with_schema,
      '{defaults}',
      (payload_with_schema->'defaults') ||
      '{
        "doc_tax_invoice": "",
        "doc_invoice": "",
        "doc_receipt_voucher": "",
        "doc_payment_order": ""
      }'::jsonb
    ) as final_payload
  FROM updated_schema
)
UPDATE tasks t
SET payload = u.final_payload
FROM final_payload u
WHERE t.id = u.id;
