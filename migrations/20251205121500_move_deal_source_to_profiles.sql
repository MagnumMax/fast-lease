-- Move deal source tracking from deals to client profiles

alter table public.profiles
  add column if not exists source text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'deals'
      and column_name = 'source'
  ) then
    with ranked_sources as (
      select
        client_id,
        nullif(trim(source), '') as source,
        row_number() over (
          partition by client_id
          order by created_at desc nulls last
        ) as rn
      from public.deals
      where source is not null
        and length(trim(source)) > 0
    )
    update public.profiles p
    set source = ranked_sources.source
    from ranked_sources
    where ranked_sources.rn = 1
      and ranked_sources.source is not null
      and p.user_id = ranked_sources.client_id
      and coalesce(trim(p.source), '') = '';
  end if;
end $$;

with payload_sources as (
  select
    client_id,
    nullif(trim(payload ->> 'source'), '') as source,
    row_number() over (
      partition by client_id
      order by created_at desc nulls last
    ) as rn
  from public.deals
  where payload ->> 'source' is not null
    and length(trim(payload ->> 'source')) > 0
)
update public.profiles p
set source = payload_sources.source
from payload_sources
where payload_sources.rn = 1
  and payload_sources.source is not null
  and p.user_id = payload_sources.client_id
  and coalesce(trim(p.source), '') = '';

alter table public.deals
  drop column if exists source;
