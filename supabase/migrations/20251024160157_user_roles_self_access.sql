-- Allow authenticated users to read their own role assignments.
drop policy if exists "User roles self read" on public.user_roles;
create policy "User roles self read" on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid());
