-- Switch FastLease deal prefix to FST and realign existing numbers.

begin;

update public.deal_companies
   set prefix = 'FST'
 where code = 'FLS';

update public.deals
   set deal_number = regexp_replace(deal_number, '^FLS-', 'FST-'),
       payload = case
         when coalesce(payload, '{}'::jsonb) ? 'company'
           then jsonb_set(coalesce(payload, '{}'::jsonb), '{company,prefix}', to_jsonb('FST'::text), true)
         else coalesce(payload, '{}'::jsonb)
       end,
       updated_at = timezone('utc', now())
 where company_code = 'FLS'
   and deal_number like 'FLS-%';

commit;
