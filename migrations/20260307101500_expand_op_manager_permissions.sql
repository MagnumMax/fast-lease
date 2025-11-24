-- Expand OP_MANAGER allowed_from to include DOC_SIGNING and adjacent stages

WITH updated AS (
  SELECT
    id,
    jsonb_set(
      template,
      '{permissions,STATUS_TRANSITION,rules}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN rule->>'role' = 'OP_MANAGER' THEN
              jsonb_set(
                rule,
                '{allowedFrom}',
                '["NEW","OFFER_PREP","VEHICLE_CHECK","DOCS_COLLECT","RISK_REVIEW","FINANCE_REVIEW","INVESTOR_PENDING","CONTRACT_PREP","DOC_SIGNING","SIGNING_FUNDING","VEHICLE_DELIVERY"]'::jsonb,
                true
              )
            ELSE rule
          END
        )
        FROM jsonb_array_elements(template #> '{permissions,STATUS_TRANSITION,rules}') rule
      ),
      true
    ) AS new_template
  FROM workflow_versions
  WHERE template IS NOT NULL
)
UPDATE workflow_versions w
SET template = u.new_template
FROM updated u
WHERE w.id = u.id;
