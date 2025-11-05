-- Vehicle documents storage and access control

-- Ensure dedicated bucket exists for vehicle documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'vehicle-documents',
    'vehicle-documents',
    false,
    52428800,
    array[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Table to store metadata about documents attached to vehicles
create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  document_type text not null,
  title text,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  status text not null default 'uploaded',
  metadata jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default timezone('utc', now()),
  uploaded_by uuid references auth.users(id)
);

create index if not exists idx_vehicle_documents_vehicle on public.vehicle_documents (vehicle_id);
create index if not exists idx_vehicle_documents_type on public.vehicle_documents (document_type);

grant select on public.vehicle_documents to authenticated;
grant insert, update, delete on public.vehicle_documents to authenticated;

alter table public.vehicle_documents enable row level security;
alter table public.vehicle_documents force row level security;

drop policy if exists "Vehicle documents staff read" on public.vehicle_documents;
create policy "Vehicle documents staff read" on public.vehicle_documents
  for select
  using (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE','SUPPORT']));

drop policy if exists "Vehicle documents staff manage" on public.vehicle_documents;
create policy "Vehicle documents staff manage" on public.vehicle_documents
  for all
  using (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE']))
  with check (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE']));

-- Storage policies for vehicle document bucket
drop policy if exists "Vehicle documents read" on storage.objects;
create policy "Vehicle documents read" on storage.objects
  for select
  using (
    bucket_id = 'vehicle-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE','SUPPORT'])
  );

drop policy if exists "Vehicle documents upload" on storage.objects;
create policy "Vehicle documents upload" on storage.objects
  for insert
  with check (
    bucket_id = 'vehicle-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );

drop policy if exists "Vehicle documents update" on storage.objects;
create policy "Vehicle documents update" on storage.objects
  for update
  using (
    bucket_id = 'vehicle-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  )
  with check (
    bucket_id = 'vehicle-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );

drop policy if exists "Vehicle documents delete" on storage.objects;
create policy "Vehicle documents delete" on storage.objects
  for delete
  using (
    bucket_id = 'vehicle-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );
