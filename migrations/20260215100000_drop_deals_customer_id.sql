-- Remove deprecated customer_id column from deals now that client_id is authoritative.

alter table public.deals
  drop column if exists customer_id;
