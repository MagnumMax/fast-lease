begin;

create table if not exists public.deal_companies (
  code text primary key,
  name text not null,
  prefix text not null check (char_length(prefix) between 2 and 10),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.deal_companies (code, name, prefix)
values
  ('SND', 'Sunday', 'SND'),
  ('FLS', 'FastLease', 'FLS'),
  ('ENT', 'Entire', 'ENT')
on conflict (code) do update
set name = excluded.name,
    prefix = excluded.prefix,
    is_active = true;

alter table public.deals
  add column if not exists company_code text references public.deal_companies(code);

update public.deals
   set company_code = coalesce(company_code, 'FLS');

alter table public.deals
  alter column company_code set default 'FLS';

alter table public.deals
  alter column company_code set not null;

create index if not exists deals_company_code_idx on public.deals(company_code);

commit;
