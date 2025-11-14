-- Create missing RPC functions for admin-auth.ts
-- Functions: count_auth_users and get_all_auth_users

-- Function to count total auth users
create or replace function public.count_auth_users()
returns bigint
language sql
security definer
set search_path = auth
as $$
  select count(*)::bigint from auth.users;
$$;

revoke all on function public.count_auth_users() from public, anon, authenticated;
grant execute on function public.count_auth_users() to service_role;
grant execute on function public.count_auth_users() to supabase_auth_admin;

-- Function to get paginated auth users
create or replace function public.get_all_auth_users(
  page_number int default 1,
  page_size int default 30
)
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
  order by u.created_at asc
  limit page_size
  offset (page_number - 1) * page_size;
$$;

revoke all on function public.get_all_auth_users(int, int) from public, anon, authenticated;
grant execute on function public.get_all_auth_users(int, int) to service_role;
grant execute on function public.get_all_auth_users(int, int) to supabase_auth_admin;