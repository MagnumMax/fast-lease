-- Rename columns
ALTER TABLE deals RENAME COLUMN down_payment_amount TO first_payment_amount;
ALTER TABLE applications RENAME COLUMN down_payment TO first_payment;

-- Update JSONB payload in deal_events
UPDATE deal_events
SET payload = payload - 'down_payment_amount' || jsonb_build_object('first_payment_amount', payload->'down_payment_amount')
WHERE payload ? 'down_payment_amount';

UPDATE deal_events
SET payload = payload - 'down_payment_percent' || jsonb_build_object('first_payment_percent', payload->'down_payment_percent')
WHERE payload ? 'down_payment_percent';

UPDATE deal_events
SET payload = payload - 'down_payment_source' || jsonb_build_object('first_payment_source', payload->'down_payment_source')
WHERE payload ? 'down_payment_source';

-- Update contract_terms in deals
UPDATE deals
SET contract_terms = contract_terms - 'down_payment_amount' || jsonb_build_object('first_payment_amount', contract_terms->'down_payment_amount')
WHERE contract_terms ? 'down_payment_amount';
