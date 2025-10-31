-- Stage 6 • Client portal supporting tables

-- Support enums ------------------------------------------------------------

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'support_priority' and n.nspname = 'public'
  ) then
    create type public.support_priority as enum ('low','medium','high','critical');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'support_status' and n.nspname = 'public'
  ) then
    create type public.support_status as enum (
      'open',
      'in_progress',
      'waiting_client',
      'resolved',
      'closed'
    );
  end if;
end $$;

-- Referral enum ------------------------------------------------------------

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'referral_event_type' and n.nspname = 'public'
  ) then
    create type public.referral_event_type as enum ('click','application','deal');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'referral_reward_status' and n.nspname = 'public'
  ) then
    create type public.referral_reward_status as enum (
      'pending',
      'earned',
      'paid',
      'cancelled'
    );
  end if;
end $$;

-- Service enum -------------------------------------------------------------

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'service_status' and n.nspname = 'public'
  ) then
    create type public.service_status as enum (
      'scheduled',
      'in_progress',
      'completed',
      'overdue'
    );
  end if;
end $$;

-- Support tables -----------------------------------------------------------

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique,
  client_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  topic text not null,
  priority public.support_priority not null default 'medium',
  status public.support_status not null default 'open',
  description text,
  attachments jsonb default '[]'::jsonb,
  last_message_at timestamptz not null default timezone('utc', now()),
  last_message_preview text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_support_tickets_client on public.support_tickets (client_id);
create index if not exists idx_support_tickets_status on public.support_tickets (status);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_support_messages_ticket on public.support_messages (ticket_id);
create index if not exists idx_support_messages_author on public.support_messages (author_id);

-- Referral tables ----------------------------------------------------------

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  share_url text,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz
);

create index if not exists idx_referral_codes_client on public.referral_codes (client_id);
create index if not exists idx_referral_codes_code on public.referral_codes (code);

create table if not exists public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referral_codes(id) on delete cascade,
  event_type public.referral_event_type not null,
  metadata jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_referral_events_referral on public.referral_events (referral_id);
create index if not exists idx_referral_events_type on public.referral_events (event_type);

create table if not exists public.referral_deals (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referral_codes(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  friend_name text,
  status public.deal_status,
  monthly_payment numeric(16,2),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_referral_deals_referral on public.referral_deals (referral_id);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referral_codes(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  reward_amount numeric(16,2),
  status public.referral_reward_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  paid_at timestamptz
);

create index if not exists idx_referral_rewards_referral on public.referral_rewards (referral_id);

-- Client documents & notifications ----------------------------------------

create table if not exists public.deal_documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  title text not null,
  document_type text,
  status text,
  storage_path text,
  signed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_deal_documents_deal on public.deal_documents (deal_id);

create table if not exists public.client_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  icon text,
  severity text default 'info',
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_client_notifications_client on public.client_notifications (client_id);

-- Vehicle services and telemetry ------------------------------------------

create table if not exists public.vehicle_services (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  service_type text,
  title text not null,
  description text,
  due_date date,
  mileage_target integer,
  status public.service_status not null default 'scheduled',
  completed_at timestamptz,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_vehicle_services_vehicle on public.vehicle_services (vehicle_id);
create index if not exists idx_vehicle_services_deal on public.vehicle_services (deal_id);

create table if not exists public.vehicle_telematics (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  odometer integer,
  battery_health numeric(5,2),
  fuel_level numeric(5,2),
  tire_pressure jsonb default '{}'::jsonb,
  location jsonb default '{}'::jsonb,
  last_reported_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uniq_vehicle_telematics_vehicle on public.vehicle_telematics (vehicle_id);
