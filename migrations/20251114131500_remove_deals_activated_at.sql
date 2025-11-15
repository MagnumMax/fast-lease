-- Context: duplicated lifecycle date between contract_start_date and activated_at.
-- We already pivoted analytics/UI to contract_start_date, so this migration
-- backfills missing values from activated_at and then removes the redundant column.

begin;

update public.deals
set contract_start_date = coalesce(contract_start_date, activated_at::date)
where contract_start_date is null
  and activated_at is not null;

alter table public.deals
  drop column if exists activated_at;

commit;
