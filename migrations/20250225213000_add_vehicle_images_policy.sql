-- Allow authenticated users to upload vehicle images via Storage API

drop policy if exists "vehicle-images insert" on storage.objects;
create policy "vehicle-images insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'vehicle-images');
