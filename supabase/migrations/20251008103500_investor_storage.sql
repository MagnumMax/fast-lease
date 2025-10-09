-- Stage 8 • Migration 11: storage bucket for investor reports

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'investor-reports',
  'investor-reports',
  false,
  52428800,
  array['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
