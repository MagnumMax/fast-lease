-- Grant workspace task read access to authenticated users and enforce RLS
grant select on public.tasks to authenticated;

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

drop policy if exists "Tasks read access" on public.tasks;
create policy "Tasks read access" on public.tasks
  for select
  using (
    public.has_any_role(array['ADMIN','OP_MANAGER','SUPPORT','FINANCE','TECH_SPECIALIST','RISK_MANAGER','LEGAL','ACCOUNTING'])
    or (assignee_user_id is not null and assignee_user_id = auth.uid())
    or (deal_id is not null and public.can_access_deal(deal_id))
  );
