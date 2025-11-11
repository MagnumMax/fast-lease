-- Extend user_roles with portal context
alter table public.user_roles
  add column portal public.portal_code not null default 'app';

update public.user_roles
set portal = case
  when role in ('ADMIN','OP_MANAGER','SUPPORT','FINANCE','TECH_SPECIALIST','RISK_MANAGER','LEGAL','ACCOUNTING') then 'app'
  when role = 'INVESTOR' then 'investor'
  when role = 'CLIENT' then 'client'
  else 'app'
end::public.portal_code;

alter table public.user_roles
  drop constraint if exists user_roles_user_id_role_key;

alter table public.user_roles
  add constraint user_roles_user_id_role_portal_key unique (user_id, role, portal);

create index idx_user_roles_portal on public.user_roles(portal);
