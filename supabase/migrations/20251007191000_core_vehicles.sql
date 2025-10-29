-- Stage 3 • Migration 2: vehicle catalogue

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'vehicle_status' and n.nspname = 'public'
  ) then
    create type public.vehicle_status as enum (
      'draft',
      'available',
      'reserved',
      'leased',
      'maintenance',
      'retired'
    );
  end if;
end $$;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vin text unique,
  make text not null,
  model text not null,
  variant text,
  year integer check (year >= 1900),
  body_type text,
  fuel_type text,
  transmission text,
  engine_capacity numeric(10,2),
  mileage integer,
  color_exterior text,
  color_interior text,
  purchase_price numeric(16,2),
  current_value numeric(16,2),
  residual_value numeric(16,2),
  status public.vehicle_status not null default 'draft',
  features jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$ begin
  if exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'vehicles'
      and trigger_name = 'trg_vehicles_set_updated_at'
  ) then
    drop trigger trg_vehicles_set_updated_at on public.vehicles;
  end if;
end $$;

create trigger trg_vehicles_set_updated_at
before update on public.vehicles
for each row
execute function public.set_updated_at();

create index if not exists idx_vehicles_status on public.vehicles (status);
create index if not exists idx_vehicles_make_model on public.vehicles (make, model);

create table if not exists public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null,
  label text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_vehicle_images_vehicle on public.vehicle_images (vehicle_id);
create unique index if not exists uniq_vehicle_primary_image
  on public.vehicle_images (vehicle_id)
  where is_primary;

create table if not exists public.vehicle_specifications (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  category text,
  spec_key text not null,
  spec_value text,
  unit text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_vehicle_specifications_vehicle on public.vehicle_specifications (vehicle_id);
