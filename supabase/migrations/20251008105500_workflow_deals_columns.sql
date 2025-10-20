-- Add workflow-specific columns to deals table if missing

alter table public.deals
  add column if not exists workflow_id text default 'fast-lease-v1';

alter table public.deals
  add column if not exists workflow_version_id uuid references public.workflow_versions(id) on update cascade;

alter table public.deals
  add column if not exists customer_id uuid references public.workflow_contacts(id) on update cascade;

alter table public.deals
  add column if not exists asset_id uuid references public.workflow_assets(id) on update cascade;

alter table public.deals
  add column if not exists source text;

alter table public.deals
  add column if not exists payload jsonb default '{}'::jsonb;

alter table public.deals
  add column if not exists op_manager_id uuid;
