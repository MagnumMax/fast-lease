-- Stage 6 • Client portal triggers and security policies

-- Triggers for updated_at --------------------------------------------------

do $$ begin
  if exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'support_tickets'
      and trigger_name = 'trg_support_tickets_set_updated_at'
  ) then
    drop trigger trg_support_tickets_set_updated_at on public.support_tickets;
  end if;
end $$;

create trigger trg_support_tickets_set_updated_at
before update on public.support_tickets
for each row
execute function public.set_updated_at();

do $$ begin
  if exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'vehicle_services'
      and trigger_name = 'trg_vehicle_services_set_updated_at'
  ) then
    drop trigger trg_vehicle_services_set_updated_at on public.vehicle_services;
  end if;
end $$;

create trigger trg_vehicle_services_set_updated_at
before update on public.vehicle_services
for each row
execute function public.set_updated_at();

-- Support message hook -----------------------------------------------------

create or replace function public.touch_support_ticket()
returns trigger
language plpgsql
as $$
begin
  update public.support_tickets
    set last_message_at = new.created_at,
        last_message_preview = left(coalesce(new.body, ''), 140),
        updated_at = timezone('utc', now())
  where id = new.ticket_id;
  return new;
end;
$$;

do $$ begin
  if exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'support_messages'
      and trigger_name = 'trg_support_messages_touch_ticket'
  ) then
    drop trigger trg_support_messages_touch_ticket on public.support_messages;
  end if;
end $$;

create trigger trg_support_messages_touch_ticket
after insert on public.support_messages
for each row
execute function public.touch_support_ticket();

-- Enable row level security ------------------------------------------------

alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;

alter table public.support_messages enable row level security;
alter table public.support_messages force row level security;

alter table public.referral_codes enable row level security;
alter table public.referral_codes force row level security;

alter table public.referral_events enable row level security;
alter table public.referral_events force row level security;

alter table public.referral_deals enable row level security;
alter table public.referral_deals force row level security;

alter table public.referral_rewards enable row level security;
alter table public.referral_rewards force row level security;

alter table public.deal_documents enable row level security;
alter table public.deal_documents force row level security;

alter table public.client_notifications enable row level security;
alter table public.client_notifications force row level security;

alter table public.vehicle_services enable row level security;
alter table public.vehicle_services force row level security;

alter table public.vehicle_telematics enable row level security;
alter table public.vehicle_telematics force row level security;

-- Policies -----------------------------------------------------------------

drop policy if exists "Support tickets client read" on public.support_tickets;
create policy "Support tickets client read" on public.support_tickets
  for select
  using (
    client_id = auth.uid()
    or public.has_any_role(array['SUPPORT','OPERATOR','OP_MANAGER','ADMIN'])
  );

drop policy if exists "Support tickets manage" on public.support_tickets;
create policy "Support tickets manage" on public.support_tickets
  for all
  using (
    client_id = auth.uid()
    or public.has_any_role(array['SUPPORT','OPERATOR','OP_MANAGER','ADMIN'])
  )
  with check (
    client_id = auth.uid()
    or public.has_any_role(array['SUPPORT','OPERATOR','OP_MANAGER','ADMIN'])
  );

drop policy if exists "Support messages read" on public.support_messages;
create policy "Support messages read" on public.support_messages
  for select
  using (
    exists (
      select 1
      from public.support_tickets t
      where t.id = support_messages.ticket_id
        and (
          t.client_id = auth.uid()
          or public.has_any_role(array['SUPPORT','OPERATOR','OP_MANAGER','ADMIN'])
        )
    )
  );

drop policy if exists "Support messages write" on public.support_messages;
create policy "Support messages write" on public.support_messages
  for insert
  with check (
    exists (
      select 1
      from public.support_tickets t
      where t.id = support_messages.ticket_id
        and (
          t.client_id = auth.uid()
          or public.has_any_role(array['SUPPORT','OPERATOR','OP_MANAGER','ADMIN'])
        )
    )
    and author_id = auth.uid()
  );

drop policy if exists "Support messages update" on public.support_messages;
create policy "Support messages update" on public.support_messages
  for update
  using (author_id = auth.uid() or public.has_any_role(array['SUPPORT','OPERATOR','OP_MANAGER','ADMIN']))
  with check (author_id = auth.uid() or public.has_any_role(array['SUPPORT','OPERATOR','OP_MANAGER','ADMIN']));

drop policy if exists "Referral codes client access" on public.referral_codes;
create policy "Referral codes client access" on public.referral_codes
  for all
  using (client_id = auth.uid() or public.has_any_role(array['ADMIN','FINANCE','OPERATOR']))
  with check (client_id = auth.uid() or public.has_any_role(array['ADMIN','FINANCE','OPERATOR']));

create policy "Referral events client read" on public.referral_events
  for select
  using (
    exists (
      select 1 from public.referral_codes c
      where c.id = referral_events.referral_id
        and (c.client_id = auth.uid() or public.has_any_role(array['ADMIN','FINANCE','OPERATOR']))
    )
  );

create policy "Referral events manage" on public.referral_events
  for all
  using (public.has_any_role(array['ADMIN','FINANCE','OPERATOR']))
  with check (public.has_any_role(array['ADMIN','FINANCE','OPERATOR']));

create policy "Referral deals client read" on public.referral_deals
  for select
  using (
    exists (
      select 1 from public.referral_codes c
      where c.id = referral_deals.referral_id
        and (c.client_id = auth.uid() or public.has_any_role(array['ADMIN','FINANCE','OPERATOR']))
    )
  );

create policy "Referral deals manage" on public.referral_deals
  for all
  using (public.has_any_role(array['ADMIN','FINANCE','OPERATOR']))
  with check (public.has_any_role(array['ADMIN','FINANCE','OPERATOR']));

create policy "Referral rewards client read" on public.referral_rewards
  for select
  using (
    exists (
      select 1 from public.referral_codes c
      where c.id = referral_rewards.referral_id
        and (c.client_id = auth.uid() or public.has_any_role(array['ADMIN','FINANCE','OPERATOR']))
    )
  );

create policy "Referral rewards manage" on public.referral_rewards
  for all
  using (public.has_any_role(array['ADMIN','FINANCE','OPERATOR']))
  with check (public.has_any_role(array['ADMIN','FINANCE','OPERATOR']));

create policy "Deal documents client read" on public.deal_documents
  for select
  using (public.can_access_deal(deal_id));

create policy "Deal documents manage" on public.deal_documents
  for all
  using (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE']))
  with check (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','FINANCE']));

create policy "Client notifications access" on public.client_notifications
  for all
  using (client_id = auth.uid() or public.has_any_role(array['SUPPORT','OPERATOR','OP_MANAGER','ADMIN']))
  with check (client_id = auth.uid() or public.has_any_role(array['SUPPORT','OPERATOR','OP_MANAGER','ADMIN']));

create policy "Vehicle services client read" on public.vehicle_services
  for select
  using (
    public.can_access_deal(coalesce(deal_id, (
      select d.id from public.deals d where d.vehicle_id = vehicle_services.vehicle_id limit 1
    )))
  );

create policy "Vehicle services manage" on public.vehicle_services
  for all
  using (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','SUPPORT']))
  with check (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','SUPPORT']));

create policy "Vehicle telematics client read" on public.vehicle_telematics
  for select
  using (
    exists (
      select 1 from public.deals d
      where d.vehicle_id = vehicle_telematics.vehicle_id
        and public.can_access_deal(d.id)
      limit 1
    )
  );

create policy "Vehicle telematics manage" on public.vehicle_telematics
  for all
  using (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','SUPPORT']))
  with check (public.has_any_role(array['OPERATOR','OP_MANAGER','ADMIN','SUPPORT']));
