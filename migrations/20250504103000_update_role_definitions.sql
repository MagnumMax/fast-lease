-- Update role definitions: add technical specialist and alias legacy operator permissions

alter type public.user_role add value if not exists 'TECH_SPECIALIST';

update public.user_roles
set role = 'OP_MANAGER'
where role = 'OPERATOR';

create or replace function public.has_role(role_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  lookup_roles text[];
begin
  if role_name is null then
    return false;
  end if;

  lookup_roles := array[upper(role_name)];

  if upper(role_name) = 'OPERATOR' then
    lookup_roles := array['OP_MANAGER', 'TECH_SPECIALIST'];
  end if;

  return exists(
    select 1
    from public.user_roles r
    where r.user_id = auth.uid()
      and r.role = any(lookup_roles::public.user_role[])
  );
end;
$$;

create or replace function public.has_any_role(role_names text[])
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  expanded text[] := array[]::text[];
  role_name text;
begin
  if role_names is null then
    return false;
  end if;

  foreach role_name in array role_names loop
    if role_name is null then
      continue;
    end if;

    if upper(role_name) = 'OPERATOR' then
      expanded := array_cat(expanded, array['OP_MANAGER', 'TECH_SPECIALIST']);
    else
      expanded := array_append(expanded, upper(role_name));
    end if;
  end loop;

  if expanded = '{}' then
    return false;
  end if;

  return exists(
    select 1
    from public.user_roles r
    where r.user_id = auth.uid()
      and r.role = any(expanded::public.user_role[])
  );
end;
$$;
