-- Создаем RPC функцию для поиска пользователя по email
create or replace function public.get_user_by_email(user_email text)
returns auth.users
language plpgsql
security definer
as $$
begin
  return (
    select au.*
    from auth.users au
    where au.email = user_email
    limit 1
  );
end;
$$;

-- Создаем RPC функцию для проверки существования пользователя
create or replace function public.user_exists(user_email text)
returns boolean
language plpgsql
security definer
as $$
begin
  return (
    select exists(
      select 1
      from auth.users au
      where au.email = user_email
    )
  );
end;
$$;

-- Предоставляем доступ к этим функциям только аутентифицированным пользователям
grant execute on function public.get_user_by_email(text) to authenticated;
grant execute on function public.user_exists(text) to authenticated;

-- Также разрешаем service role
grant execute on function public.get_user_by_email(text) to service_role;
grant execute on function public.user_exists(text) to service_role;