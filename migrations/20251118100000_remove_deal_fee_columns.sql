-- Remove obsolete monetary fields from deals
alter table public.deals
  drop column if exists security_deposit,
  drop column if exists processing_fee;
