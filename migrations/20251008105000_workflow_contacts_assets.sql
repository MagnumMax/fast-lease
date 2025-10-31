-- Seed tables for workflow contacts and assets to support deals creation

create table if not exists public.workflow_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  emirates_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workflow_assets (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'VEHICLE',
  vin text,
  make text,
  model text,
  trim text,
  year integer,
  supplier text,
  price numeric(18,2),
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
