-- Drop legacy vehicle valuation columns no longer used in UI or workflows
alter table if exists public.vehicles
  drop column if exists current_value,
  drop column if exists purchase_price,
  drop column if exists residual_value;
