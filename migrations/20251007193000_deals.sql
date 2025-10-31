-- Stage 3 • Migration 4: deals lifecycle

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'deal_status' and n.nspname = 'public'
  ) then
    create type public.deal_status as enum (
      'draft',
      'pending_activation',
      'active',
      'suspended',
      'completed',
      'defaulted',
      'cancelled'
    );
  end if;
end $$;

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  deal_number text unique,
  application_id uuid not null references public.applications(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  client_id uuid not null references auth.users(id) on delete restrict,
  status public.deal_status not null default 'draft',
  principal_amount numeric(16,2),
  total_amount numeric(16,2),
  monthly_payment numeric(16,2),
  monthly_lease_rate numeric(16,2),
  term_months integer,
  interest_rate numeric(8,4),
  down_payment_amount numeric(16,2),
  security_deposit numeric(16,2),
  processing_fee numeric(16,2),
  contract_start_date date,
  contract_end_date date,
  first_payment_date date,
  contract_terms jsonb default '{}'::jsonb,
  insurance_details jsonb default '{}'::jsonb,
  assigned_account_manager uuid references auth.users(id),
  activated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$ begin
  if exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'deals'
      and trigger_name = 'trg_deals_set_updated_at'
  ) then
    drop trigger trg_deals_set_updated_at on public.deals;
  end if;
end $$;

create trigger trg_deals_set_updated_at
before update on public.deals
for each row
execute function public.set_updated_at();

create index if not exists idx_deals_client on public.deals (client_id);
create index if not exists idx_deals_status on public.deals (status);

create table if not exists public.deal_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_deal_events_deal on public.deal_events (deal_id);
create index if not exists idx_deal_events_type on public.deal_events (event_type);
