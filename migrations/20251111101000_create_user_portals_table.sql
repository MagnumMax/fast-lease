-- Create user_portals to track which audiences each user can access
create table public.user_portals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portal public.portal_code not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_portals_user_portal_key unique (user_id, portal)
);

create index idx_user_portals_user_id on public.user_portals(user_id);
create index idx_user_portals_portal on public.user_portals(portal);

create trigger trg_user_portals_set_updated_at
  before update on public.user_portals
  for each row execute function public.set_updated_at();

alter table public.user_portals enable row level security;

create policy "service manage user portals"
  on public.user_portals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "users read their portals"
  on public.user_portals
  for select
  using (auth.uid() = user_id);
