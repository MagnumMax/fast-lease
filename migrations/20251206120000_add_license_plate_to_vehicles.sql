alter table public.vehicles
  add column if not exists license_plate text;

with candidate as (
  select
    id,
    coalesce(
      nullif(trim((features->>'license_plate')), ''),
      nullif(trim((features->'import_info'->>'license_plate')), ''),
      nullif(trim((features->'import_info'->'raw_vehicle'->>'license_plate')), ''),
      case
        when jsonb_typeof(features) = 'array' then (
          select nullif(
            trim(regexp_replace(elem, '^(?i)license\\s*plate\\s*[:\\-–]?\\s*', '', 1, 0)),
            ''
          )
          from jsonb_array_elements_text(features) as elem
          where elem ~* '^license\\s*plate'
          limit 1
        )
        else null
      end
    ) as license_plate
  from public.vehicles
)
update public.vehicles as v
set license_plate = candidate.license_plate
from candidate
where v.id = candidate.id
  and candidate.license_plate is not null
  and coalesce(v.license_plate, '') = '';
