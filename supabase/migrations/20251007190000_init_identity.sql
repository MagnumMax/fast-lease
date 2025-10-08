-- Stage 3 • Migration 1: identity & shared helpers
-- Creates profile storage and reusable trigger for updated_at management.

create extension if not exists "pgcrypto";

create type public.user_role as enum (
  'client',
  'operator',
  'ops_manager',
  'admin',
  'investor',
  'finance',
  'support'
);

create type public.user_status as enum (
  'pending',
  'active',
  'suspended',
  'archived'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.user_status not null default 'pending',
  full_name text,
  first_name text,
  last_name text,
  phone text unique,
  emirates_id text unique,
  passport_number text,
  nationality text,
  residency_status text,
  date date_of_birth,
  jsonb address default '{}'::jsonb,
  jsonb employment_info default '{}'::jsonb,
  jsonb financial_profile default '{}'::jsonb,
  jsonb metadata default '{}'::jsonb,
  boolean marketing_opt_in not null default false,
  text timezone default 'Asia/Dubai',
  text avatar_url,
  timestamptz last_login_at,
  timestamptz created_at not null default timezone('utc', now()),
  timestamptz updated_at not null default timezone('utc', now()),
  unique (user_id)
);

create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create index if not exists idx_profiles_user_id on public.profiles (user_id);
create index if not exists idx_profiles_status on public.profiles (status);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null,
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid references auth.users(id),
  jsonb metadata default '{}'::jsonb,
  timestamptz created_at not null default timezone('utc', now()),
  timestamptz updated_at not null default timezone('utc', now()),
  unique (user_id, role)
);

create trigger trg_user_roles_set_updated_at
before update on public.user_roles
for each row
execute function public.set_updated_at();

create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_user_roles_role on public.user_roles (role);
