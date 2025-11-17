-- Remove legacy workflow_contacts buffer and helper function

-- Drop helper function if present
DROP FUNCTION IF EXISTS public.ensure_client_for_contact(uuid);

-- Drop buffer table used for temporary workflow leads
DROP TABLE IF EXISTS public.workflow_contacts;

