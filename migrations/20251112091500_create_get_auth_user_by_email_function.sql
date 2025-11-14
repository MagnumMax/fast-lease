-- Create helper function to fetch auth user by email without relying on GoTrue pagination.

create or replace function public.get_auth_user_by_email(search_email text)
returns table (
  id uuid,
  email text,
  phone text,
  app_metadata jsonb,
  user_metadata jsonb,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  confirmation_token text
)
language sql
security definer
set search_path = auth
as $$
  select
    u.id,
    u.email,
    u.phone,
    u.raw_app_meta_data as app_metadata,
    u.raw_user_meta_data as user_metadata,
    u.last_sign_in_at,
    u.created_at,
    u.confirmation_token
  from auth.users u
  where lower(u.email) = lower(search_email)
  order by u.created_at asc
  limit 1;
$$;

revoke all on function public.get_auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.get_auth_user_by_email(text) to service_role;
grant execute on function public.get_auth_user_by_email(text) to supabase_auth_admin;
