-- Drop unused vehicle columns

alter table if exists public.vehicles
  drop column if exists location_data,
  drop column if exists acquired_at;
