-- Remove marketing_opt_in column from profiles and related data
alter table if exists public.profiles
drop column if exists marketing_opt_in;

alter table if exists public.applications
drop column if exists marketing_opt_in;

-- Clean metadata keys that may contain marketing info
update public.profiles
set metadata = metadata - 'marketing_opt_in'
where metadata ? 'marketing_opt_in';

