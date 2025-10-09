-- Stage 6 • Client portal grants for authenticated role

grant select, insert, update, delete on public.support_tickets to authenticated;
grant select, insert, update, delete on public.support_messages to authenticated;
grant select, insert, update, delete on public.referral_codes to authenticated;
grant select, insert, update, delete on public.referral_events to authenticated;
grant select, insert, update, delete on public.referral_deals to authenticated;
grant select, insert, update, delete on public.referral_rewards to authenticated;
grant select, insert, update, delete on public.deal_documents to authenticated;
grant select, insert, update, delete on public.client_notifications to authenticated;
grant select, insert, update, delete on public.vehicle_services to authenticated;
grant select, insert, update, delete on public.vehicle_telematics to authenticated;
