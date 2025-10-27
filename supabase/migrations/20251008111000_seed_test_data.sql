-- Seed data aligned with workflow statuses

begin;

truncate table public.investor_reports restart identity cascade;
truncate table public.portfolio_activity_events restart identity cascade;
truncate table public.portfolio_performance_snapshots restart identity cascade;
truncate table public.portfolio_assets restart identity cascade;
truncate table public.investment_portfolios restart identity cascade;
truncate table public.investors restart identity cascade;
truncate table public.support_messages restart identity cascade;
truncate table public.support_tickets restart identity cascade;
truncate table public.client_notifications restart identity cascade;
truncate table public.deal_documents restart identity cascade;
truncate table public.referral_rewards restart identity cascade;
truncate table public.referral_deals restart identity cascade;
truncate table public.referral_events restart identity cascade;
truncate table public.referral_codes restart identity cascade;
truncate table public.vehicle_telematics restart identity cascade;
truncate table public.vehicle_services restart identity cascade;
truncate table public.payment_transactions restart identity cascade;
truncate table public.payments restart identity cascade;
truncate table public.payment_schedules restart identity cascade;
truncate table public.invoices restart identity cascade;
truncate table public.deal_events restart identity cascade;
truncate table public.deals restart identity cascade;
truncate table public.workflow_deal_audit_log restart identity cascade;
truncate table public.workflow_action_queue restart identity cascade;
truncate table public.workflow_notification_queue restart identity cascade;
truncate table public.workflow_assets restart identity cascade;
truncate table public.workflow_contacts restart identity cascade;
truncate table public.application_documents restart identity cascade;
truncate table public.applications restart identity cascade;
truncate table public.vehicle_images restart identity cascade;
truncate table public.vehicle_specifications restart identity cascade;
truncate table public.vehicles restart identity cascade;
truncate table public.user_roles restart identity cascade;
truncate table public.profiles restart identity cascade;

truncate table auth.mfa_amr_claims cascade;
truncate table auth.mfa_challenges cascade;
truncate table auth.one_time_tokens cascade;
truncate table auth.sessions cascade;
truncate table auth.identities cascade;
truncate table auth.refresh_tokens cascade;
truncate table auth.mfa_factors cascade;

do $$
declare
  client_id uuid;
  ops_id uuid;
  tech_id uuid;
  admin_id uuid;
  support_id uuid;
  investor_user_id uuid;
  investor_record_id uuid;
  investor_portfolio_id uuid;
  rolls_id uuid;
  lambo_id uuid;
  volvo_id uuid;
  application_id uuid;
  deal_id uuid;
  invoice_overdue_id uuid;
  invoice_pending_id uuid;
  payment_id uuid;
  support_ticket_id uuid;
  referral_id uuid;
  status_codes text[];
  source_options text[];
begin
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'amira.client@fastlease.dev', crypt('Passw0rd!', gen_salt('bf', 10)), now(), '+971500000001', jsonb_build_object('full_name', 'Amira Client'), 'authenticated', 'authenticated', now(), now())
  returning id into client_id;

  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'omar.ops@fastlease.dev', crypt('Passw0rd!', gen_salt('bf', 10)), now(), '+971500000002', jsonb_build_object('full_name', 'Omar Ops'), 'authenticated', 'authenticated', now(), now())
  returning id into ops_id;

  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'tariq.tech@fastlease.dev', crypt('Passw0rd!', gen_salt('bf', 10)), now(), '+971500000006', jsonb_build_object('full_name', 'Tariq Tech'), 'authenticated', 'authenticated', now(), now())
  returning id into tech_id;

  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'lina.admin@fastlease.dev', crypt('Passw0rd!', gen_salt('bf', 10)), now(), '+971500000003', jsonb_build_object('full_name', 'Lina Admin'), 'authenticated', 'authenticated', now(), now())
  returning id into admin_id;

  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'sara.support@fastlease.dev', crypt('Passw0rd!', gen_salt('bf', 10)), now(), '+971500000004', jsonb_build_object('full_name', 'Sara Support'), 'authenticated', 'authenticated', now(), now())
  returning id into support_id;

  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'ilias.investor@fastlease.dev', crypt('Passw0rd!', gen_salt('bf', 10)), now(), '+971500000005', jsonb_build_object('full_name', 'Ilias Investor'), 'authenticated', 'authenticated', now(), now())
  returning id into investor_user_id;

  insert into public.profiles (user_id, status, full_name, phone, emirates_id, nationality, residency_status, marketing_opt_in)
  values
    (client_id, 'active', 'Amira Client', '+971500000001', '784-1987-1234567-1', 'UAE', 'resident', true);

  insert into public.profiles (user_id, status, full_name, phone, nationality, residency_status)
  values
    (ops_id, 'active', 'Omar Operations', '+971500000002', 'UAE', 'resident');

  insert into public.profiles (user_id, status, full_name, phone, nationality, residency_status)
  values
    (tech_id, 'active', 'Tariq Tech', '+971500000006', 'UAE', 'resident');

  insert into public.profiles (user_id, status, full_name, phone, nationality, residency_status)
  values
    (admin_id, 'active', 'Lina Admin', '+971500000003', 'UAE', 'resident');

  insert into public.profiles (user_id, status, full_name, phone, nationality, residency_status)
  values
    (support_id, 'active', 'Sara Support', '+971500000004', 'UAE', 'resident');

  insert into public.profiles (user_id, status, full_name, phone, nationality, residency_status)
  values
    (investor_user_id, 'active', 'Ilias Investor', '+971500000005', 'Greece', 'resident');

  insert into public.user_roles (user_id, role)
  values
    (client_id, 'CLIENT'),
    (ops_id, 'OP_MANAGER'),
    (tech_id, 'TECH_SPECIALIST'),
    (admin_id, 'ADMIN'),
    (support_id, 'SUPPORT'),
    (investor_user_id, 'INVESTOR');

  insert into public.applications (application_number, client_id, vehicle_id, status, submitted_at, created_at, updated_at, source, car_preferences, financial_snapshot, marketing_opt_in)
  values
    (
      'APP-2025-0001',
      client_id,
      null,
      'submitted',
      now() - interval '35 days',
      now() - interval '40 days',
      now() - interval '5 days',
      'Website',
      jsonb_build_object('budget', 30000, 'usage', 'personal'),
      jsonb_build_object('creditScore', 725, 'income', 45000),
      true
    )
  returning id into application_id;

  insert into public.application_documents (application_id, document_type, document_category, original_filename, stored_filename, storage_path, mime_type, file_size, status, verification_data, uploaded_at, verified_at, verified_by)
  values
    (
      application_id,
      'passport',
      'identity',
      'passport.pdf',
      'passport.pdf',
      'applications/a0000000/passport.pdf',
      'application/pdf',
      524288,
      'verified',
      jsonb_build_object('notes', 'Verified via OCR'),
      now() - interval '38 days',
      now() - interval '37 days',
      ops_id
    );

  insert into public.vehicles (vin, make, model, variant, year, body_type, fuel_type, transmission, mileage, purchase_price, current_value, monthly_lease_rate, residual_value, status, features, location_data, acquired_at)
  values
    ('WDC12345678900001', 'Rolls-Royce', 'Cullinan', 'Black Badge', 2024, 'SUV', 'petrol', 'automatic', 1200, 1000000, 985000, 30000, 1000000, 'available', jsonb_build_object('batteryRange', 'N/A', 'color', 'Obsidian'), jsonb_build_object('city', 'Dubai', 'warehouse', 'DXB-1'), now() - interval '120 days')
  returning id into rolls_id;

  insert into public.vehicles (vin, make, model, variant, year, body_type, fuel_type, transmission, mileage, purchase_price, current_value, monthly_lease_rate, residual_value, status, features, location_data, acquired_at)
  values
    ('ZHW12345678900002', 'Lamborghini', 'Huracán', 'EVO AWD', 2023, 'Coupe', 'petrol', 'automatic', 3400, 750000, 720000, 25000, 750000, 'reserved', jsonb_build_object('acceleration', '2.9s 0-100'), jsonb_build_object('city', 'Dubai', 'warehouse', 'DXB-1'), now() - interval '200 days')
  returning id into lambo_id;

  insert into public.vehicles (vin, make, model, variant, year, body_type, fuel_type, transmission, mileage, purchase_price, current_value, monthly_lease_rate, residual_value, status, features, location_data, acquired_at)
  values
    ('YV1H1234567890003', 'Volvo', 'XC40 Recharge', 'Twin Motor', 2024, 'SUV', 'electric', 'automatic', 560, 150000, 149000, 1750, 150000, 'available', jsonb_build_object('batteryRange', '450 km', 'drive', 'AWD'), jsonb_build_object('city', 'Abu Dhabi', 'warehouse', 'AUH-1'), now() - interval '90 days')
  returning id into volvo_id;

  insert into public.vehicle_images (vehicle_id, storage_path, label, is_primary, sort_order)
  values
    (rolls_id, 'vehicles/rolls-royce-cullinan/hero.jpg', 'Exterior', true, 1),
    (lambo_id, 'vehicles/lamborghini-huracan/hero.jpg', 'Exterior', true, 1),
    (volvo_id, 'vehicles/volvo-xc40/hero.jpg', 'Exterior', true, 1);

  insert into public.vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
  values
    (rolls_id, 'Performance', 'Power', '563', 'hp', 1),
    (rolls_id, 'Dimensions', 'Wheelbase', '3295', 'mm', 2),
    (lambo_id, 'Performance', 'Power', '631', 'hp', 1),
    (volvo_id, 'Battery', 'Capacity', '78', 'kWh', 1);

  insert into public.workflow_contacts (full_name, email, phone, emirates_id)
  values
    ('Michael Adams', 'michael.adams@fastlease.dev', '+971 50 111 2233', '784-1987-2233445-1'),
    ('Aisha Khan', 'aisha.khan@fastlease.dev', '+971 50 555 7890', '784-1990-9876543-2'),
    ('Noah Lee', 'noah.lee@fastlease.dev', '+971 52 333 4477', '784-1992-4455667-3');

  insert into public.workflow_assets (type, vin, make, model, trim, year, supplier, price, meta)
  values
    ('VEHICLE', 'WF-ROLLS-001', 'Rolls-Royce', 'Cullinan', 'Black Badge', 2024, 'DXB Motors', 985000, jsonb_build_object('color', 'Obsidian', 'battery', 'N/A')),
    ('VEHICLE', 'WF-LAMBO-002', 'Lamborghini', 'Huracán', 'EVO AWD', 2023, 'Elite Motors', 720000, jsonb_build_object('color', 'Verde Mantis', 'feature', 'Launch control')),
    ('VEHICLE', 'WF-VOLVO-003', 'Volvo', 'XC40 Recharge', 'Twin Motor', 2024, 'Nordic Auto', 149000, jsonb_build_object('color', 'Cloud Blue', 'batteryRange', '450 km'));

  insert into public.deals (deal_number, application_id, vehicle_id, client_id, status, principal_amount, total_amount, monthly_payment, term_months, interest_rate, down_payment_amount, security_deposit, processing_fee, contract_start_date, contract_end_date, first_payment_date, contract_terms, insurance_details, assigned_account_manager, activated_at, created_at, updated_at)
  values
    (
      'DEAL-2025-0001',
      application_id,
      rolls_id,
      client_id,
      'ACTIVE',
      855000,
      1440000,
      30000,
      48,
      0.045,
      95000,
      50000,
      5000,
      current_date - 14,
      current_date + interval '34 months',
      current_date - 14 + interval '30 days',
      jsonb_build_object('lateFee', 250, 'gracePeriodDays', 5),
      jsonb_build_object('provider', 'AXA', 'policyNumber', 'POL-AXA-889123'),
      ops_id,
      now() - interval '12 days',
      now() - interval '40 days',
      now() - interval '2 days'
    )
  returning id into deal_id;

  insert into public.deal_events (deal_id, event_type, payload, created_by, created_at)
  values
    (
      deal_id,
      'status_change',
      jsonb_build_object('from', 'SIGNING_FUNDING', 'to', 'ACTIVE'),
      ops_id,
      now() - interval '12 days'
    );

  status_codes := array[
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
  ];

  source_options := array['Website', 'Broker', 'Referral'];

  for idx in array_lower(status_codes, 1)..array_upper(status_codes, 1) loop
    insert into public.deals (
      deal_number,
      application_id,
      vehicle_id,
      client_id,
      status,
      customer_id,
      asset_id,
      source,
      payload,
      created_at,
      updated_at
    )
    values (
      format('DEAL-STAGE-%s', replace(status_codes[idx], '_', '-')),
      application_id,
      case mod(idx, 3)
        when 1 then rolls_id
        when 2 then lambo_id
        else volvo_id
      end,
      client_id,
      status_codes[idx],
      (select id from public.workflow_contacts order by random() limit 1),
      (select id from public.workflow_assets order by random() limit 1),
      source_options[(mod(idx - 1, array_length(source_options, 1)) + 1)],
      jsonb_build_object(
        'reference', format('WF-SEED-%s', status_codes[idx]),
        'generated', true
      ),
      now() - (idx || ' days')::interval,
      now() - (idx || ' days')::interval
    );
  end loop;

  insert into public.invoices (invoice_number, deal_id, invoice_type, amount, tax_amount, total_amount, currency, due_date, issue_date, status, line_items, tax_breakdown, payment_terms, paid_at, created_at, updated_at, pdf_storage_path)
  values
    (
      'INV-2025-0001',
      deal_id,
      'monthly_payment',
      30000,
      1500,
      31500,
      'AED',
      current_date - interval '2 days',
      current_date - interval '27 days',
      'overdue',
      jsonb_build_array(jsonb_build_object('description', 'Monthly lease payment', 'amount', 30000)),
      jsonb_build_array(jsonb_build_object('name', 'VAT', 'amount', 1500)),
      'Payment due within 5 days of issue',
      null,
      now() - interval '27 days',
      now() - interval '2 days',
      'invoices/INV-2025-0001.pdf'
    )
  returning id into invoice_overdue_id;

  insert into public.invoices (invoice_number, deal_id, invoice_type, amount, tax_amount, total_amount, currency, due_date, issue_date, status, line_items, tax_breakdown, payment_terms, paid_at, created_at, updated_at, pdf_storage_path)
  values
    (
      'INV-2025-0002',
      deal_id,
      'monthly_payment',
      30000,
      1500,
      31500,
      'AED',
      current_date + interval '28 days',
      current_date - interval '2 days',
      'issued',
      jsonb_build_array(jsonb_build_object('description', 'Monthly lease payment', 'amount', 30000)),
      jsonb_build_array(jsonb_build_object('name', 'VAT', 'amount', 1500)),
      'Payment due within 5 days of issue',
      null,
      now() - interval '2 days',
      now(),
      'invoices/INV-2025-0002.pdf'
    )
  returning id into invoice_pending_id;

  insert into public.payments (deal_id, invoice_id, amount, currency, status, method, received_at, metadata, created_at, updated_at)
  values
    (
      deal_id,
      invoice_overdue_id,
      31500,
      'AED',
      'succeeded',
      'card',
      now() - interval '20 days',
      jsonb_build_object('note', 'Auto-collected via Stripe'),
      now() - interval '20 days',
      now() - interval '20 days'
    )
  returning id into payment_id;

  insert into public.payment_transactions (payment_id, provider, transaction_reference, amount, currency, status, payload, processed_at, created_at)
  values
    (
      payment_id,
      'stripe',
      'stripe_tx_123456',
      31500,
      'AED',
      'succeeded',
      jsonb_build_object('receipt_url', 'https://payments.example/stripe_tx_123456'),
      now() - interval '20 days',
      now() - interval '20 days'
    );

  insert into public.payment_schedules (deal_id, sequence, due_date, amount, status, metadata, created_at, updated_at)
  values
    (
      deal_id,
      1,
      current_date - interval '2 days',
      31500,
      'paid',
      jsonb_build_object('source', 'seed'),
      now() - interval '40 days',
      now() - interval '20 days'
    ),
    (
      deal_id,
      2,
      current_date + interval '28 days',
      31500,
      'pending',
      jsonb_build_object('source', 'seed'),
      now(),
      now()
    );

  insert into public.vehicle_telematics (vehicle_id, odometer, battery_health, fuel_level, tire_pressure, location, last_reported_at)
  values (
    rolls_id,
    18420,
    98.5,
    82.0,
    jsonb_build_object('front_left', 2.6, 'front_right', 2.6, 'rear_left', 2.7, 'rear_right', 2.7),
    jsonb_build_object('city', 'Dubai', 'lat', 25.2048, 'lng', 55.2708),
    now() - interval '5 minutes'
  )
  on conflict (vehicle_id) do update
    set odometer = excluded.odometer,
        battery_health = excluded.battery_health,
        fuel_level = excluded.fuel_level,
        tire_pressure = excluded.tire_pressure,
        location = excluded.location,
        last_reported_at = excluded.last_reported_at;

  insert into public.vehicle_services (vehicle_id, deal_id, service_type, title, description, due_date, mileage_target, status, completed_at, attachments, created_at, updated_at)
  values
    (
      rolls_id,
      deal_id,
      'inspection',
      'Initial inspection',
      'Delivery inspection completed by Aurora Service Center.',
      current_date - interval '30 days',
      null,
      'completed',
      current_date - interval '30 days',
      jsonb_build_array(jsonb_build_object('label', 'Inspection report', 'storage_path', 'services/deal-2025-0001/inspection.pdf')),
      now() - interval '40 days',
      now() - interval '30 days'
    ),
    (
      rolls_id,
      deal_id,
      'maintenance',
      'Scheduled maintenance',
      'Routine maintenance visit with oil change and diagnostics.',
      current_date + interval '25 days',
      22000,
      'scheduled',
      null,
      jsonb_build_array(),
      now() - interval '10 days',
      now() - interval '10 days'
    ),
    (
      rolls_id,
      deal_id,
      'telemetry',
      'Upload service photos',
      'Provide updated vehicle photos before maintenance visit.',
      current_date + interval '7 days',
      null,
      'in_progress',
      null,
      jsonb_build_array(),
      now() - interval '2 days',
      now() - interval '1 days'
    );

  insert into public.deal_documents (deal_id, title, document_type, status, storage_path, signed_at, created_at)
  values
    (
      deal_id,
      'Lease agreement',
      'contract',
      'signed on ' || to_char(current_date - interval '12 days', 'DD Mon YYYY'),
      'deals/deal-2025-0001/lease-agreement.pdf',
      current_date - interval '12 days',
      now() - interval '12 days'
    ),
    (
      deal_id,
      'Payment schedule (v02/2025)',
      'FINANCE',
      'active',
      'deals/deal-2025-0001/payment-schedule-v02.pdf',
      null,
      now() - interval '5 days'
    ),
    (
      deal_id,
      'Delivery acceptance form',
      'delivery',
      'signature pending',
      'deals/deal-2025-0001/delivery-acceptance.pdf',
      null,
      now() - interval '3 days'
    ),
    (
      deal_id,
      'Insurance policy',
      'insurance',
      'valid until ' || to_char(current_date + interval '11 months', 'Mon YYYY'),
      'deals/deal-2025-0001/insurance-policy.pdf',
      current_date - interval '12 days',
      now() - interval '12 days'
    );

  insert into public.client_notifications (client_id, title, message, icon, severity, created_at)
  values
    (
      client_id,
      'Service report finalization',
      'Aurora service center uploaded diagnostic results for your Cullinan.',
      'wrench',
      'info',
      now() - interval '15 minutes'
    ),
    (
      client_id,
      'Contract signing',
      'Lease agreement generated. We will notify you when it''s ready for signature.',
      'file-text',
      'info',
      now() - interval '1 hour'
    ),
    (
      client_id,
      'Potential overdue',
      'Upcoming payment falls on a weekend. We proposed automatic debit on Friday.',
      'calendar-clock',
      'warning',
      now() - interval '1 day'
    );

  insert into public.support_tickets (ticket_number, client_id, deal_id, topic, priority, status, description, attachments, last_message_at, last_message_preview, created_at, updated_at)
  values (
    'SUP-3051',
    client_id,
    deal_id,
    'Payment question',
    'high',
    'in_progress',
    'Clarify why upcoming payment shows warning flag.',
    jsonb_build_array(),
    now() - interval '30 minutes',
    'We noticed a warning about payment timing...',
    now() - interval '2 days',
    now() - interval '30 minutes'
  )
  returning id into support_ticket_id;

  insert into public.support_messages (ticket_id, author_id, body, created_at)
  values
    (
      support_ticket_id,
      client_id,
      'We noticed a warning about payment timing. Can you confirm if auto-debit will happen on Friday?',
      now() - interval '2 hours'
    ),
    (
      support_ticket_id,
      support_id,
      'Hi Amira! Yes, we pre-scheduled the debit for Friday 18:00 GST to avoid the weekend cut-off.',
      now() - interval '30 minutes'
    );

  insert into public.referral_codes (client_id, code, share_url, created_at)
  values
    (
      client_id,
      'ABC123',
      'https://fastlease.dev/apply?ref=ABC123',
      now() - interval '45 days'
    )
  returning id into referral_id;

  insert into public.referral_events (referral_id, event_type, metadata, occurred_at)
  values
    (referral_id, 'click', jsonb_build_object('source', 'whatsapp'), now() - interval '10 days'),
    (referral_id, 'application', jsonb_build_object('application_number', 'APP-2025-0025'), now() - interval '8 days'),
    (referral_id, 'deal', jsonb_build_object('deal_number', 'DEAL-2025-2011'), now() - interval '2 days');

  insert into public.referral_deals (referral_id, deal_id, friend_name, status, monthly_payment, created_at)
  values
    (referral_id, null, 'Ivan Petrov', 'ACTIVE', 2260, now() - interval '2 days'),
    (referral_id, null, 'Olga Sidorova', 'SIGNING_FUNDING', 3460, now() - interval '15 days');

  insert into public.referral_rewards (referral_id, deal_id, reward_amount, status, created_at, paid_at)
  values
    (referral_id, null, 9500, 'earned', now() - interval '2 days', null);
end $$;

commit;
