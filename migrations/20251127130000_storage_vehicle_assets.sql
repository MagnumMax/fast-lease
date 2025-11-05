-- Storage buckets for operational assets

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'deal-documents',
    'deal-documents',
    false,
    52428800,
    array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg']
  )
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'vehicle-images',
    'vehicle-images',
    false,
    20971520,
    array['image/png','image/jpeg','image/webp']
  )
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'vehicle-services',
    'vehicle-services',
    false,
    52428800,
    array['application/pdf','image/png','image/jpeg','image/webp']
  )
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Allow authenticated users to insert into vehicle-images bucket via storage API
insert into storage.policies (
  bucket_id,
  name,
  definition,
  action,
  check,
  enabled
) values (
  'vehicle-images',
  'allow_vehicle_images_insert',
  '((auth.role() = ''authenticated'') or (auth.role() = ''service_role''))',
  'write',
  'true',
  true
)
on conflict (bucket_id, name, action) do update set
  definition = excluded.definition,
  check = excluded.check,
  enabled = excluded.enabled;
