-- Seed user_portals based on existing user_roles
insert into public.user_portals (user_id, portal, status)
select distinct user_id,
  case
    when role in ('ADMIN','OP_MANAGER','SUPPORT','FINANCE','TECH_SPECIALIST','RISK_MANAGER','LEGAL','ACCOUNTING') then 'app'
    when role = 'INVESTOR' then 'investor'
    when role = 'CLIENT' then 'client'
    else 'app'
  end::public.portal_code as portal,
  'active'
from public.user_roles
on conflict (user_id, portal) do nothing;
