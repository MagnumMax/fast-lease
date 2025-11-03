-- Script to delete deal with ID '38321982-db01-5eb8-bee2-f2706489e5b9' and all related records
-- This script follows the correct deletion order to avoid constraint violations
-- and uses transactions for safety

BEGIN;

-- Step 1: Delete deal_events (1 record)
-- This must be done first as deal_events references the deal
DELETE FROM deal_events WHERE deal_id = '38321982-db01-5eb8-bee2-f2706489e5b9';

-- Step 2: Delete deal_documents (16 records)
-- This must be done before deleting the main deal record
DELETE FROM deal_documents WHERE deal_id = '38321982-db01-5eb8-bee2-f2706489e5b9';

-- Step 3: Delete the main deal record
-- This is done last as other tables reference it
DELETE FROM deals WHERE id = '38321982-db01-5eb8-bee2-f2706489e5b9';

COMMIT;