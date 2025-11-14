-- NOTE: altering auth.users requires supabase_auth_admin ownership privileges
-- that are not available in the current automation context. This migration
-- focuses on backfilling the data so that GoTrue no longer encounters NULL
-- confirmation tokens during /token lookups. Follow-up manual action (if/when
-- access allows) is to restore the original DEFAULT '' and NOT NULL constraint.

begin;

update auth.users
set confirmation_token = ''
where confirmation_token is null;

commit;
