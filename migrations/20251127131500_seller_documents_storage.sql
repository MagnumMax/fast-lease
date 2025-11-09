-- Storage bucket and policies for seller documents

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'seller-documents',
    'seller-documents',
    false,
    52428800,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg'
    ]
  )
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies to align with operational roles
drop policy if exists "Seller documents read" on storage.objects;
create policy "Seller documents read" on storage.objects
  for select
  using (
    bucket_id = 'seller-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE','SUPPORT'])
  );

drop policy if exists "Seller documents upload" on storage.objects;
create policy "Seller documents upload" on storage.objects
  for insert
  with check (
    bucket_id = 'seller-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );

drop policy if exists "Seller documents update" on storage.objects;
create policy "Seller documents update" on storage.objects
  for update
  using (
    bucket_id = 'seller-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  )
  with check (
    bucket_id = 'seller-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );

drop policy if exists "Seller documents delete" on storage.objects;
create policy "Seller documents delete" on storage.objects
  for delete
  using (
    bucket_id = 'seller-documents'
    and public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE'])
  );
