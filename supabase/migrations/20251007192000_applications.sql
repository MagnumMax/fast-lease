-- Stage 3 • Migration 3: applications flow

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'application_status' and n.nspname = 'public'
  ) then
    create type public.application_status as enum (
      'draft',
      'submitted',
      'in_review',
      'on_hold',
      'approved',
      'rejected',
      'cancelled',
      'converted'
    );
  end if;
end $$;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  application_number text unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  status public.application_status not null default 'draft',
  requested_amount numeric(16,2),
  term_months integer,
  down_payment numeric(16,2),
  monthly_payment numeric(16,2),
  interest_rate numeric(8,4),
  personal_info jsonb default '{}'::jsonb,
  financial_info jsonb default '{}'::jsonb,
  employment_info jsonb default '{}'::jsonb,
  references_info jsonb default '{}'::jsonb,
  scoring_results jsonb default '{}'::jsonb,
  risk_assessment jsonb default '{}'::jsonb,
  assigned_to uuid references auth.users(id),
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$ begin
  if exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'applications'
      and trigger_name = 'trg_applications_set_updated_at'
  ) then
    drop trigger trg_applications_set_updated_at on public.applications;
  end if;
end $$;

create trigger trg_applications_set_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();

create index if not exists idx_applications_user on public.applications (user_id);
create index if not exists idx_applications_status on public.applications (status);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  document_type text not null,
  document_category text,
  original_filename text,
  stored_filename text,
  storage_path text,
  mime_type text,
  file_size integer,
  checksum text,
  status text,
  verification_data jsonb default '{}'::jsonb,
  uploaded_at timestamptz not null default timezone('utc', now()),
  verified_at timestamptz,
  verified_by uuid references auth.users(id)
);

create index if not exists idx_application_documents_application on public.application_documents (application_id);
create index if not exists idx_application_documents_type on public.application_documents (document_type);
