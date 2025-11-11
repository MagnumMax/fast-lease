-- Audit table for login events
create table public.auth_login_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  portal public.portal_code not null,
  identity text not null,
  status text not null check (status in ('success','failure')),
  error_code text,
  ip inet,
  user_agent text,
  role_snapshot jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index idx_auth_login_events_portal on public.auth_login_events(portal);
create index idx_auth_login_events_occurred_at on public.auth_login_events(occurred_at desc);
create index idx_auth_login_events_user_id on public.auth_login_events(user_id);

alter table public.auth_login_events enable row level security;

create policy "service manage auth login events"
  on public.auth_login_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
