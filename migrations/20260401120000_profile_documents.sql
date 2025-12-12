-- Profile documents storage and access control

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'profile-documents',
    'profile-documents',
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

create table if not exists public.profile_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
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

create index if not exists idx_profile_documents_profile on public.profile_documents (profile_id);
create index if not exists idx_profile_documents_type on public.profile_documents (document_type);

grant select, insert, update, delete on public.profile_documents to authenticated;

alter table public.profile_documents enable row level security;
alter table public.profile_documents force row level security;

-- Policies

drop policy if exists "Profile documents staff read" on public.profile_documents;
create policy "Profile documents staff read" on public.profile_documents
  for select
  using (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE','SUPPORT']));

drop policy if exists "Profile documents staff manage" on public.profile_documents
  for all
  using (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE']))
  with check (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE']));

drop policy if exists "Profile owner read" on public.profile_documents;
create policy "Profile owner read" on public.profile_documents
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = profile_documents.profile_id
      and profiles.user_id = auth.uid()
    )
  );

-- Storage policies

drop policy if exists "Profile documents read" on storage.objects;
create policy "Profile documents read" on storage.objects
  for select
  using (
    bucket_id = 'profile-documents'
    and (
      public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE','SUPPORT'])
      or exists (
        -- This is tricky for storage because we only have name (path).
        -- We assume path starts with profile_id or we rely on application logic signed URLs.
        -- For simplicity, let's allow staff full read.
        -- Owner read via signed URLs usually bypasses RLS if signed by service key, but here we use authenticated client.
        -- Let's stick to staff for now.
        false
      )
    )
  );

drop policy if exists "Profile documents upload" on storage.objects;
create policy "Profile documents upload" on storage.objects
  for insert
  with check (
    bucket_id = 'profile-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );

drop policy if exists "Profile documents update" on storage.objects;
create policy "Profile documents update" on storage.objects
  for update
  using (
    bucket_id = 'profile-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );
