create or replace function public.get_user_by_email(user_email text)
returns auth.users
language sql
security definer
stable
as $$
  select u.*
  from auth.users u
  where u.email = user_email
  limit 1;
$$;
