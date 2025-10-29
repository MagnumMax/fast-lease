-- Move monthly lease rate from vehicles to deals

alter table if exists public.deals
  add column if not exists monthly_lease_rate numeric(16,2);

update public.deals
set monthly_lease_rate = coalesce(monthly_lease_rate, monthly_payment)
where monthly_lease_rate is null;

alter table if exists public.vehicles
  drop column if exists monthly_lease_rate;
