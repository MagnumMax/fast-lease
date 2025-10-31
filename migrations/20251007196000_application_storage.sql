-- Stage 3 • Migration 7: storage bucket for application documents

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  52428800,
  array['application/pdf','image/png','image/jpeg']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table if exists public.application_documents
  add constraint application_documents_unique unique (application_id, document_type);

alter table if exists public.applications
  add column if not exists residency_status text;
