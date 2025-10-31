drop policy if exists "Role access admin manage" on public.role_access_rules;

create policy "Role access admin manage" on public.role_access_rules
for all
using (
  exists (
    select 1
    from public.user_roles roles
    where roles.user_id = auth.uid()
      and roles.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.user_roles roles
    where roles.user_id = auth.uid()
      and roles.role = 'ADMIN'
  )
);
