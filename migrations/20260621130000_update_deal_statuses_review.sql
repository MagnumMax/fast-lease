-- Rename existing values to match new workflow status names
ALTER TYPE deal_status RENAME VALUE 'DOCS_COLLECT_BUYER' TO 'DOCS_REVIEW_BUYER';
ALTER TYPE deal_status RENAME VALUE 'DOCS_COLLECT_SELLER' TO 'DOCS_REVIEW_SELLER';

-- Add missing status for broker review
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'DOCS_REVIEW_BROKER' AFTER 'DOCS_REVIEW_SELLER';

-- Update audit logs to reflect the new naming for consistency
UPDATE audit_log SET from_status = 'DOCS_REVIEW_BUYER' WHERE from_status = 'DOCS_COLLECT_BUYER';
UPDATE audit_log SET to_status = 'DOCS_REVIEW_BUYER' WHERE to_status = 'DOCS_COLLECT_BUYER';

UPDATE audit_log SET from_status = 'DOCS_REVIEW_SELLER' WHERE from_status = 'DOCS_COLLECT_SELLER';
UPDATE audit_log SET to_status = 'DOCS_REVIEW_SELLER' WHERE to_status = 'DOCS_COLLECT_SELLER';
