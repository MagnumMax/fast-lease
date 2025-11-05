-- Client documents storage and access control

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'client-documents',
    'client-documents',
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

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_category text,
  title text,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  status text not null default 'uploaded',
  metadata jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default timezone('utc', now()),
  uploaded_by uuid references auth.users(id),
  verified_at timestamptz,
  verified_by uuid references auth.users(id)
);

create index if not exists idx_client_documents_client on public.client_documents (client_id);
create index if not exists idx_client_documents_type on public.client_documents (document_type);

grant select, insert, update, delete on public.client_documents to authenticated;

alter table public.client_documents enable row level security;
alter table public.client_documents force row level security;

drop policy if exists "Client documents staff read" on public.client_documents;
create policy "Client documents staff read" on public.client_documents
  for select
  using (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE','SUPPORT']));

drop policy if exists "Client documents staff manage" on public.client_documents;
create policy "Client documents staff manage" on public.client_documents
  for all
  using (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE']))
  with check (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE']));

drop policy if exists "Client documents read" on storage.objects;
create policy "Client documents read" on storage.objects
  for select
  using (
    bucket_id = 'client-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE','SUPPORT'])
  );

drop policy if exists "Client documents upload" on storage.objects;
create policy "Client documents upload" on storage.objects
  for insert
  with check (
    bucket_id = 'client-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );

drop policy if exists "Client documents update" on storage.objects;
create policy "Client documents update" on storage.objects
  for update
  using (
    bucket_id = 'client-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  )
  with check (
    bucket_id = 'client-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );

drop policy if exists "Client documents delete" on storage.objects;
create policy "Client documents delete" on storage.objects
  for delete
  using (
    bucket_id = 'client-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );
