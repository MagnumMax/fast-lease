-- Re-introduce missing profiles.source column used by operations queries

alter table public.profiles
  add column if not exists source text;
