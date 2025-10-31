-- Unify deal statuses with workflow template and reset existing workflow data

do $block$
begin
  -- Очистка связанных данных, чтобы не мигрировать старые статусы
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'referral_deals') then
    execute 'truncate table public.referral_deals restart identity cascade';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'deal_events') then
    execute 'truncate table public.deal_events restart identity cascade';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'deal_documents') then
    execute 'truncate table public.deal_documents restart identity cascade';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'deals') then
    execute 'truncate table public.deals restart identity cascade';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workflow_notification_queue') then
    execute 'truncate table public.workflow_notification_queue restart identity cascade';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workflow_action_queue') then
    execute 'truncate table public.workflow_action_queue restart identity cascade';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workflow_deal_audit_log') then
    execute 'truncate table public.workflow_deal_audit_log restart identity cascade';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workflow_contacts') then
    execute 'truncate table public.workflow_contacts restart identity cascade';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workflow_assets') then
    execute 'truncate table public.workflow_assets restart identity cascade';
  end if;
end;
$block$;

-- Подготовка колонок к смене enum
alter table public.deals
  alter column status drop default,
  alter column status type text using status::text;

alter table public.referral_deals
  alter column status type text using status::text;

-- Переопределяем enum согласно workflow_template
drop type if exists public.deal_status;

create type public.deal_status as enum (
  'NEW',
  'OFFER_PREP',
  'VEHICLE_CHECK',
  'DOCS_COLLECT',
  'RISK_REVIEW',
  'FINANCE_REVIEW',
  'INVESTOR_PENDING',
  'CONTRACT_PREP',
  'SIGNING_FUNDING',
  'VEHICLE_DELIVERY',
  'ACTIVE',
  'CANCELLED'
);

-- Привязываем колонки обратно к enum
alter table public.deals
  alter column status type public.deal_status using status::public.deal_status,
  alter column status set default 'NEW';

alter table public.referral_deals
  alter column status type public.deal_status using status::public.deal_status;
