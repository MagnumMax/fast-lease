-- Stage 8 • Migration 10: investor data model
-- Creates investor, portfolio, and reporting tables aligned with the `/beta/investor/*` prototype.

set search_path = public;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'investor_status' and n.nspname = 'public'
  ) then
    create type public.investor_status as enum (
      'active',
      'inactive',
      'suspended',
      'under_review'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'investor_type' and n.nspname = 'public'
  ) then
    create type public.investor_type as enum (
      'individual',
      'institutional',
      'fund'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'portfolio_asset_status' and n.nspname = 'public'
  ) then
    create type public.portfolio_asset_status as enum (
      'in_operation',
      'pending_delivery',
      'under_review',
      'attention_required',
      'exited'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'investor_report_type' and n.nspname = 'public'
  ) then
    create type public.investor_report_type as enum (
      'payment_schedule',
      'portfolio_yield',
      'cash_flow'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'investor_report_format' and n.nspname = 'public'
  ) then
    create type public.investor_report_format as enum (
      'pdf',
      'xlsx',
      'csv'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'investor_report_status' and n.nspname = 'public'
  ) then
    create type public.investor_report_status as enum (
      'queued',
      'processing',
      'ready',
      'failed'
    );
  end if;
end $$;

create table if not exists public.investors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investor_code text not null unique,
  display_name text not null,
  investor_type public.investor_type not null default 'individual',
  status public.investor_status not null default 'active',
  total_investment numeric(16,2) not null default 0,
  available_funds numeric(16,2) not null default 0,
  compliance_status text,
  onboarded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

do $$
begin
  if exists (
    select 1
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'investors'
      and trigger_name = 'trg_investors_set_updated_at'
  ) then
    drop trigger trg_investors_set_updated_at on public.investors;
  end if;
end $$;

create trigger trg_investors_set_updated_at
before update on public.investors
for each row
execute function public.set_updated_at();

create index if not exists idx_investors_user_id on public.investors (user_id);

create table if not exists public.investment_portfolios (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  portfolio_name text not null,
  portfolio_type text,
  total_value numeric(16,2) not null default 0,
  allocated_amount numeric(16,2) not null default 0,
  available_amount numeric(16,2) not null default 0,
  irr_percent numeric(6,3),
  risk_band text,
  performance_metrics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if exists (
    select 1
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'investment_portfolios'
      and trigger_name = 'trg_investment_portfolios_set_updated_at'
  ) then
    drop trigger trg_investment_portfolios_set_updated_at on public.investment_portfolios;
  end if;
end $$;

create trigger trg_investment_portfolios_set_updated_at
before update on public.investment_portfolios
for each row
execute function public.set_updated_at();

create index if not exists idx_investment_portfolios_investor_id on public.investment_portfolios (investor_id);

create table if not exists public.portfolio_assets (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.investment_portfolios(id) on delete cascade,
  deal_id uuid references public.deals(id),
  vehicle_id uuid references public.vehicles(id),
  asset_code text,
  vin text,
  vehicle_make text,
  vehicle_model text,
  vehicle_variant text,
  status public.portfolio_asset_status not null default 'in_operation',
  irr_percent numeric(6,3),
  last_valuation numeric(16,2),
  last_payout_amount numeric(16,2),
  last_payout_currency text default 'AED',
  last_payout_date date,
  payout_frequency text,
  acquisition_cost numeric(16,2),
  contract_start_date date,
  contract_end_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if exists (
    select 1
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'portfolio_assets'
      and trigger_name = 'trg_portfolio_assets_set_updated_at'
  ) then
    drop trigger trg_portfolio_assets_set_updated_at on public.portfolio_assets;
  end if;
end $$;

create trigger trg_portfolio_assets_set_updated_at
before update on public.portfolio_assets
for each row
execute function public.set_updated_at();

create index if not exists idx_portfolio_assets_portfolio_id on public.portfolio_assets (portfolio_id);
create index if not exists idx_portfolio_assets_status on public.portfolio_assets (status);

create table if not exists public.portfolio_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.investment_portfolios(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  period_label text not null,
  accrued_amount numeric(16,2) not null default 0,
  actual_amount numeric(16,2) not null default 0,
  irr_percent numeric(6,3),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_portfolio_performance_portfolio_id on public.portfolio_performance_snapshots (portfolio_id);
create index if not exists idx_portfolio_performance_period on public.portfolio_performance_snapshots (period_start);

create table if not exists public.portfolio_activity_events (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.investment_portfolios(id) on delete cascade,
  occurred_at timestamptz not null default timezone('utc', now()),
  category text,
  description text not null,
  amount numeric(16,2),
  currency text default 'AED',
  amount_direction text default 'credit',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_portfolio_activity_portfolio_id on public.portfolio_activity_events (portfolio_id);
create index if not exists idx_portfolio_activity_occurred_at on public.portfolio_activity_events (occurred_at desc);

create table if not exists public.investor_reports (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.investment_portfolios(id) on delete cascade,
  report_code text not null unique,
  report_type public.investor_report_type not null,
  period_start date,
  period_end date,
  format public.investor_report_format not null,
  status public.investor_report_status not null default 'queued',
  storage_path text,
  send_copy boolean not null default false,
  requested_by uuid references auth.users(id),
  generated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if exists (
    select 1
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'investor_reports'
      and trigger_name = 'trg_investor_reports_set_updated_at'
  ) then
    drop trigger trg_investor_reports_set_updated_at on public.investor_reports;
  end if;
end $$;

create trigger trg_investor_reports_set_updated_at
before update on public.investor_reports
for each row
execute function public.set_updated_at();

create index if not exists idx_investor_reports_portfolio_id on public.investor_reports (portfolio_id);
create index if not exists idx_investor_reports_status on public.investor_reports (status);

