-- Stage 3 • Migration 6: security helpers, grants, and RLS policies
-- Covers tables created in migrations 1-5 and aligns with §6 of the technical architecture.

set check_function_bodies = off;

-- Helper functions ----------------------------------------------------------

create or replace function public.has_role(role_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1
    from public.user_roles r
    where r.user_id = auth.uid()
      and r.role = role_name::public.user_role
  );
$$;

create or replace function public.has_any_role(role_names text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1
    from public.user_roles r
    where r.user_id = auth.uid()
      and r.role = any(role_names::public.user_role[])
  );
$$;

create or replace function public.is_application_owner(target_application_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select a.user_id = auth.uid()
    from public.applications a
    where a.id = target_application_id
    limit 1
  ), false);
$$;

create or replace function public.can_access_application(target_application_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select
      a.user_id = auth.uid()
      or a.assigned_to = auth.uid()
      or public.has_any_role(array['operator','ops_manager','admin','finance','support'])
    from public.applications a
    where a.id = target_application_id
    limit 1
  ), false);
$$;

create or replace function public.is_deal_client(target_deal_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select d.client_id = auth.uid()
    from public.deals d
    where d.id = target_deal_id
    limit 1
  ), false);
$$;

create or replace function public.can_access_deal(target_deal_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select
      public.is_deal_client(d.id)
      or d.assigned_account_manager = auth.uid()
      or public.has_any_role(array['operator','ops_manager','admin','finance','support','investor'])
    from public.deals d
    where d.id = target_deal_id
    limit 1
  ), false);
$$;

create or replace function public.can_access_payment(target_payment_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select public.can_access_deal(p.deal_id)
    from public.payments p
    where p.id = target_payment_id
    limit 1
  ), false);
$$;

-- Grants --------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select on public.vehicles to anon;
grant select on public.vehicle_images to anon;
grant select on public.vehicle_specifications to anon;

grant select on public.vehicles to authenticated;
grant insert, update, delete on public.vehicles to authenticated;
grant select on public.vehicle_images to authenticated;
grant insert, update, delete on public.vehicle_images to authenticated;
grant select on public.vehicle_specifications to authenticated;
grant insert, update, delete on public.vehicle_specifications to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, update, delete on public.application_documents to authenticated;
grant select, insert, update, delete on public.deals to authenticated;
grant select, insert, update, delete on public.deal_events to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.payment_transactions to authenticated;
grant select, insert, update, delete on public.payment_schedules to authenticated;

grant all privileges on all tables in schema public to service_role;

-- Profiles ------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists "Profiles self read or staff" on public.profiles;
create policy "Profiles self read or staff" on public.profiles
  for select
  using (
    auth.uid() = user_id
    or public.has_any_role(array['operator','ops_manager','admin','finance','support'])
  );

drop policy if exists "Profiles self insert" on public.profiles;
create policy "Profiles self insert" on public.profiles
  for insert
  with check (
    auth.uid() = user_id
    or public.has_any_role(array['operator','ops_manager','admin','finance','support'])
  );

drop policy if exists "Profiles self update" on public.profiles;
create policy "Profiles self update" on public.profiles
  for update
  using (
    auth.uid() = user_id
    or public.has_any_role(array['operator','ops_manager','admin','finance','support'])
  )
  with check (
    auth.uid() = user_id
    or public.has_any_role(array['operator','ops_manager','admin','finance','support'])
  );

drop policy if exists "Profiles admin delete" on public.profiles;
create policy "Profiles admin delete" on public.profiles
  for delete
  using (public.has_any_role(array['admin']));

-- User roles ----------------------------------------------------------------

alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

drop policy if exists "User roles staff read" on public.user_roles;
create policy "User roles staff read" on public.user_roles
  for select
  using (public.has_any_role(array['admin','ops_manager']));

drop policy if exists "User roles admin manage" on public.user_roles;
create policy "User roles admin manage" on public.user_roles
  for all
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

-- Vehicles ------------------------------------------------------------------

alter table public.vehicles enable row level security;

drop policy if exists "Vehicles public read" on public.vehicles;
create policy "Vehicles public read" on public.vehicles
  for select
  to anon
  using (status in ('available','reserved'));

drop policy if exists "Vehicles authenticated read" on public.vehicles;
create policy "Vehicles authenticated read" on public.vehicles
  for select
  to authenticated
  using (status in ('available','reserved','leased'));

drop policy if exists "Vehicles staff read" on public.vehicles;
create policy "Vehicles staff read" on public.vehicles
  for select
  using (public.has_any_role(array['operator','ops_manager','admin','finance','support']));

drop policy if exists "Vehicles staff insert" on public.vehicles;
create policy "Vehicles staff insert" on public.vehicles
  for insert
  with check (public.has_any_role(array['operator','ops_manager','admin']));

drop policy if exists "Vehicles staff update" on public.vehicles;
create policy "Vehicles staff update" on public.vehicles
  for update
  using (public.has_any_role(array['operator','ops_manager','admin']))
  with check (public.has_any_role(array['operator','ops_manager','admin']));

drop policy if exists "Vehicles admin delete" on public.vehicles;
create policy "Vehicles admin delete" on public.vehicles
  for delete
  using (public.has_any_role(array['admin']));

-- Vehicle images ------------------------------------------------------------

alter table public.vehicle_images enable row level security;

drop policy if exists "Vehicle images public read" on public.vehicle_images;
create policy "Vehicle images public read" on public.vehicle_images
  for select
  to anon
  using (true);

drop policy if exists "Vehicle images authenticated read" on public.vehicle_images;
create policy "Vehicle images authenticated read" on public.vehicle_images
  for select
  to authenticated
  using (true);

drop policy if exists "Vehicle images staff manage" on public.vehicle_images;
create policy "Vehicle images staff manage" on public.vehicle_images
  for all
  using (public.has_any_role(array['operator','ops_manager','admin']))
  with check (public.has_any_role(array['operator','ops_manager','admin']));

-- Vehicle specifications ----------------------------------------------------

alter table public.vehicle_specifications enable row level security;

drop policy if exists "Vehicle specs public read" on public.vehicle_specifications;
create policy "Vehicle specs public read" on public.vehicle_specifications
  for select
  to anon
  using (true);

drop policy if exists "Vehicle specs authenticated read" on public.vehicle_specifications;
create policy "Vehicle specs authenticated read" on public.vehicle_specifications
  for select
  to authenticated
  using (true);

drop policy if exists "Vehicle specs staff manage" on public.vehicle_specifications;
create policy "Vehicle specs staff manage" on public.vehicle_specifications
  for all
  using (public.has_any_role(array['operator','ops_manager','admin']))
  with check (public.has_any_role(array['operator','ops_manager','admin']));

-- Applications --------------------------------------------------------------

alter table public.applications enable row level security;
alter table public.applications force row level security;

drop policy if exists "Applications owner read" on public.applications;
create policy "Applications owner read" on public.applications
  for select
  using (auth.uid() = user_id);

drop policy if exists "Applications staff read" on public.applications;
create policy "Applications staff read" on public.applications
  for select
  using (public.has_any_role(array['operator','ops_manager','admin','finance','support']));

drop policy if exists "Applications owner insert" on public.applications;
create policy "Applications owner insert" on public.applications
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Applications staff insert" on public.applications;
create policy "Applications staff insert" on public.applications
  for insert
  with check (public.has_any_role(array['operator','ops_manager','admin','finance','support']));

drop policy if exists "Applications owner update" on public.applications;
create policy "Applications owner update" on public.applications
  for update
  using (
    auth.uid() = user_id
    and status in ('draft','submitted','on_hold')
  )
  with check (auth.uid() = user_id);

drop policy if exists "Applications staff update" on public.applications;
create policy "Applications staff update" on public.applications
  for update
  using (public.has_any_role(array['operator','ops_manager','admin','finance','support']))
  with check (public.has_any_role(array['operator','ops_manager','admin','finance','support']));

drop policy if exists "Applications owner delete draft" on public.applications;
create policy "Applications owner delete draft" on public.applications
  for delete
  using (
    auth.uid() = user_id
    and status = 'draft'
  );

drop policy if exists "Applications staff delete" on public.applications;
create policy "Applications staff delete" on public.applications
  for delete
  using (public.has_any_role(array['admin','ops_manager']));

-- Application documents -----------------------------------------------------

alter table public.application_documents enable row level security;
alter table public.application_documents force row level security;

drop policy if exists "Application documents owner read" on public.application_documents;
create policy "Application documents owner read" on public.application_documents
  for select
  using (public.can_access_application(application_id));

drop policy if exists "Application documents owner insert" on public.application_documents;
create policy "Application documents owner insert" on public.application_documents
  for insert
  with check (public.is_application_owner(application_id));

drop policy if exists "Application documents owner update" on public.application_documents;
create policy "Application documents owner update" on public.application_documents
  for update
  using (public.is_application_owner(application_id))
  with check (public.is_application_owner(application_id));

drop policy if exists "Application documents staff manage" on public.application_documents;
create policy "Application documents staff manage" on public.application_documents
  for all
  using (public.has_any_role(array['operator','ops_manager','admin','finance','support']))
  with check (public.has_any_role(array['operator','ops_manager','admin','finance','support']));

-- Deals ---------------------------------------------------------------------

alter table public.deals enable row level security;
alter table public.deals force row level security;

drop policy if exists "Deals client read" on public.deals;
create policy "Deals client read" on public.deals
  for select
  using (public.is_deal_client(id));

drop policy if exists "Deals staff read" on public.deals;
create policy "Deals staff read" on public.deals
  for select
  using (public.has_any_role(array['operator','ops_manager','admin','finance','support','investor']));

drop policy if exists "Deals staff insert" on public.deals;
create policy "Deals staff insert" on public.deals
  for insert
  with check (public.has_any_role(array['operator','ops_manager','admin','finance']));

drop policy if exists "Deals staff update" on public.deals;
create policy "Deals staff update" on public.deals
  for update
  using (public.has_any_role(array['operator','ops_manager','admin','finance']))
  with check (public.has_any_role(array['operator','ops_manager','admin','finance']));

drop policy if exists "Deals admin delete" on public.deals;
create policy "Deals admin delete" on public.deals
  for delete
  using (public.has_any_role(array['admin']));

-- Deal events ---------------------------------------------------------------

alter table public.deal_events enable row level security;
alter table public.deal_events force row level security;

drop policy if exists "Deal events client read" on public.deal_events;
create policy "Deal events client read" on public.deal_events
  for select
  using (public.can_access_deal(deal_id));

drop policy if exists "Deal events staff manage" on public.deal_events;
create policy "Deal events staff manage" on public.deal_events
  for all
  using (public.has_any_role(array['operator','ops_manager','admin','finance','support']))
  with check (public.has_any_role(array['operator','ops_manager','admin','finance','support']));

-- Invoices ------------------------------------------------------------------

alter table public.invoices enable row level security;
alter table public.invoices force row level security;

drop policy if exists "Invoices client read" on public.invoices;
create policy "Invoices client read" on public.invoices
  for select
  using (public.can_access_deal(deal_id));

drop policy if exists "Invoices staff manage" on public.invoices;
create policy "Invoices staff manage" on public.invoices
  for all
  using (public.has_any_role(array['operator','ops_manager','admin','finance']))
  with check (public.has_any_role(array['operator','ops_manager','admin','finance']));

-- Payments ------------------------------------------------------------------

alter table public.payments enable row level security;
alter table public.payments force row level security;

drop policy if exists "Payments client read" on public.payments;
create policy "Payments client read" on public.payments
  for select
  using (public.can_access_deal(deal_id));

drop policy if exists "Payments staff manage" on public.payments;
create policy "Payments staff manage" on public.payments
  for all
  using (public.has_any_role(array['operator','ops_manager','admin','finance']))
  with check (public.has_any_role(array['operator','ops_manager','admin','finance']));

-- Payment transactions ------------------------------------------------------

alter table public.payment_transactions enable row level security;
alter table public.payment_transactions force row level security;

drop policy if exists "Payment transactions read" on public.payment_transactions;
create policy "Payment transactions read" on public.payment_transactions
  for select
  using (public.can_access_payment(payment_id));

drop policy if exists "Payment transactions manage" on public.payment_transactions;
create policy "Payment transactions manage" on public.payment_transactions
  for all
  using (public.has_any_role(array['operator','ops_manager','admin','finance']))
  with check (public.has_any_role(array['operator','ops_manager','admin','finance']));

-- Payment schedules ---------------------------------------------------------

alter table public.payment_schedules enable row level security;
alter table public.payment_schedules force row level security;

drop policy if exists "Payment schedules read" on public.payment_schedules;
create policy "Payment schedules read" on public.payment_schedules
  for select
  using (public.can_access_deal(deal_id));

drop policy if exists "Payment schedules manage" on public.payment_schedules;
create policy "Payment schedules manage" on public.payment_schedules
  for all
  using (public.has_any_role(array['operator','ops_manager','admin','finance']))
  with check (public.has_any_role(array['operator','ops_manager','admin','finance']));

-- Finalize ------------------------------------------------------------------

set check_function_bodies = on;
