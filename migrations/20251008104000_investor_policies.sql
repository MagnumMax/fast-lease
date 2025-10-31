-- Stage 8 • Migration 12: investor RLS policies

set check_function_bodies = off;

create or replace function public.is_investor_owner(target_investor_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select
      inv.user_id = auth.uid()
      or public.has_any_role(array['admin'])
    from public.investors inv
    where inv.id = target_investor_id
    limit 1
  ), false);
$$;

create or replace function public.is_portfolio_owner(target_portfolio_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select public.is_investor_owner(port.investor_id)
    from public.investment_portfolios port
    where port.id = target_portfolio_id
    limit 1
  ), false);
$$;

create or replace function public.is_portfolio_asset_owner(target_asset_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select public.is_portfolio_owner(asset.portfolio_id)
    from public.portfolio_assets asset
    where asset.id = target_asset_id
    limit 1
  ), false);
$$;

create or replace function public.is_investor_report_owner(target_report_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select public.is_portfolio_owner(rep.portfolio_id)
    from public.investor_reports rep
    where rep.id = target_report_id
    limit 1
  ), false);
$$;

-- Investors -----------------------------------------------------------------

alter table public.investors enable row level security;
alter table public.investors force row level security;

drop policy if exists "Investors owner read" on public.investors;
create policy "Investors owner read" on public.investors
  for select
  using (public.is_investor_owner(id));

drop policy if exists "Investors admin manage" on public.investors;
create policy "Investors admin manage" on public.investors
  for all
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

-- Investment portfolios -----------------------------------------------------

alter table public.investment_portfolios enable row level security;
alter table public.investment_portfolios force row level security;

drop policy if exists "Portfolios owner read" on public.investment_portfolios;
create policy "Portfolios owner read" on public.investment_portfolios
  for select
  using (public.is_portfolio_owner(id));

drop policy if exists "Portfolios owner update" on public.investment_portfolios;
create policy "Portfolios owner update" on public.investment_portfolios
  for update
  using (public.is_portfolio_owner(id))
  with check (public.is_portfolio_owner(id));

drop policy if exists "Portfolios admin manage" on public.investment_portfolios;
create policy "Portfolios admin manage" on public.investment_portfolios
  for all
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

-- Portfolio assets ----------------------------------------------------------

alter table public.portfolio_assets enable row level security;
alter table public.portfolio_assets force row level security;

drop policy if exists "Portfolio assets owner read" on public.portfolio_assets;
create policy "Portfolio assets owner read" on public.portfolio_assets
  for select
  using (public.is_portfolio_asset_owner(id));

drop policy if exists "Portfolio assets admin manage" on public.portfolio_assets;
create policy "Portfolio assets admin manage" on public.portfolio_assets
  for all
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

-- Performance snapshots -----------------------------------------------------

alter table public.portfolio_performance_snapshots enable row level security;
alter table public.portfolio_performance_snapshots force row level security;

drop policy if exists "Performance owner read" on public.portfolio_performance_snapshots;
create policy "Performance owner read" on public.portfolio_performance_snapshots
  for select
  using (public.is_portfolio_owner(portfolio_id));

drop policy if exists "Performance admin manage" on public.portfolio_performance_snapshots;
create policy "Performance admin manage" on public.portfolio_performance_snapshots
  for all
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

-- Activity events -----------------------------------------------------------

alter table public.portfolio_activity_events enable row level security;
alter table public.portfolio_activity_events force row level security;

drop policy if exists "Portfolio events owner read" on public.portfolio_activity_events;
create policy "Portfolio events owner read" on public.portfolio_activity_events
  for select
  using (public.is_portfolio_owner(portfolio_id));

drop policy if exists "Portfolio events admin manage" on public.portfolio_activity_events;
create policy "Portfolio events admin manage" on public.portfolio_activity_events
  for all
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

-- Investor reports ----------------------------------------------------------

alter table public.investor_reports enable row level security;
alter table public.investor_reports force row level security;

drop policy if exists "Investor reports owner read" on public.investor_reports;
create policy "Investor reports owner read" on public.investor_reports
  for select
  using (public.is_investor_report_owner(id));

drop policy if exists "Investor reports owner insert" on public.investor_reports;
create policy "Investor reports owner insert" on public.investor_reports
  for insert
  with check (public.is_portfolio_owner(portfolio_id));

drop policy if exists "Investor reports owner update" on public.investor_reports;
create policy "Investor reports owner update" on public.investor_reports
  for update
  using (public.is_investor_report_owner(id))
  with check (public.is_investor_report_owner(id));

drop policy if exists "Investor reports admin manage" on public.investor_reports;
create policy "Investor reports admin manage" on public.investor_reports
  for all
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

set check_function_bodies = on;
