-- Enable uuid-ossp extension for uuid_generate_v4()
create extension if not exists "uuid-ossp";

-- Workflow versioning storage
create table if not exists public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id text not null,
  version text not null,
  title text not null,
  description text,
  source_yaml text not null,
  template jsonb not null,
  checksum text not null,
  is_active boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(workflow_id, version)
);

create index if not exists workflow_versions_workflow_idx
  on public.workflow_versions(workflow_id);

create unique index if not exists workflow_versions_active_unique
  on public.workflow_versions(workflow_id)
  where is_active;

-- Add workflow_version_id column to deals table if it exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'deals' and table_schema = 'public') then
    alter table public.deals
      add column if not exists workflow_version_id uuid references public.workflow_versions(id) on update cascade;
    
    create index if not exists deals_workflow_version_id_idx
      on public.deals(workflow_version_id);
  end if;
end $$;
