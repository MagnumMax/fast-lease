-- Stage 3 • Migration 1: identity & shared helpers
-- Creates profile storage and reusable trigger for updated_at management.

create extension if not exists "pgcrypto";

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_role' and n.nspname = 'public'
  ) then
    create type public.user_role as enum (
      'CLIENT',
      'OPERATOR',
      'OP_MANAGER',
      'ADMIN',
      'INVESTOR',
      'FINANCE',
      'SUPPORT'
    );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_status' and n.nspname = 'public'
  ) then
    create type public.user_status as enum (
      'pending',
      'active',
      'suspended',
      'archived'
    );
  end if;
end $$;

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
  date_of_birth date,
  address jsonb default '{}'::jsonb,
  employment_info jsonb default '{}'::jsonb,
  financial_profile jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  marketing_opt_in boolean not null default false,
  timezone text default 'Asia/Dubai',
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

do $$ begin
  if exists (
    select 1 from information_schema.triggers
    where event_object_table = 'profiles'
      and trigger_name = 'trg_profiles_set_updated_at'
  ) then
    drop trigger trg_profiles_set_updated_at on public.profiles;
  end if;
end $$;

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
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role)
);

do $$ begin
  if exists (
    select 1 from information_schema.triggers
    where event_object_table = 'user_roles'
      and trigger_name = 'trg_user_roles_set_updated_at'
  ) then
    drop trigger trg_user_roles_set_updated_at on public.user_roles;
  end if;
end $$;

create trigger trg_user_roles_set_updated_at
before update on public.user_roles
for each row
execute function public.set_updated_at();

create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_user_roles_role on public.user_roles (role);
