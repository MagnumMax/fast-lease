-- Stage 6 • Invoice document path

alter table public.invoices
  add column if not exists pdf_storage_path text;
