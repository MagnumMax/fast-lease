-- Grant admin/operations staff visibility into user_portals for directory views
set check_function_bodies = off;

drop policy if exists "User portals admin read" on public.user_portals;

create policy "User portals admin read"
  on public.user_portals
  for select
  using (
    public.has_any_role(array['ADMIN','OP_MANAGER'])
  );
