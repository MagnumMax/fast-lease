-- Normalize historical deal numbers to the LTR-DDMMYY-XXXX format.
-- Existing deals keep their contract_start_date as the date segment; if it's missing we fall back to created_at.

with candidates as (
  select
    d.id,
    coalesce(d.contract_start_date, d.created_at::date, timezone('utc', now())::date) as effective_date,
    coalesce(
      nullif(
        lpad(
          right(coalesce(regexp_replace(v.vin, '[^A-Za-z0-9]', '', 'g'), ''), 4),
          4,
          '0'
        ),
        ''
      ),
      '0000'
    ) as vin_suffix
  from public.deals d
  left join public.vehicles v on v.id = d.vehicle_id
  where d.deal_number is null
     or d.deal_number not like 'LTR-%'
), formatted as (
  select
    c.id,
    to_char(c.effective_date, 'DDMMYY') as date_segment,
    c.vin_suffix,
    row_number() over (
      partition by to_char(c.effective_date, 'DDMMYY'), c.vin_suffix
      order by c.id
    ) as duplicate_index
  from candidates c
)
update public.deals d
set deal_number = case
    when formatted.duplicate_index = 1 then format('LTR-%s-%s', formatted.date_segment, formatted.vin_suffix)
    else format(
      'LTR-%s-%s-%s',
      formatted.date_segment,
      formatted.vin_suffix,
      lpad(formatted.duplicate_index::text, 2, '0')
    )
  end,
  updated_at = timezone('utc', now())
from formatted
where d.id = formatted.id;
