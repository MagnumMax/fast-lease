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
  application_id_secondary uuid;
  application_id_third uuid;
  contact_michael_id uuid;
  contact_aisha_id uuid;
  contact_noah_id uuid;
  rolls_deal_id uuid;
  lambo_deal_id uuid;
  volvo_deal_id uuid;
  workflow_version_id uuid;
  support_ticket_id uuid;
  referral_id uuid;
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

  insert into public.profiles (user_id, status, full_name, phone, emirates_id, nationality, residency_status)
  values
    (client_id, 'active', 'Amira Client', '+971500000001', '784-1987-1234567-1', 'UAE', 'resident');

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

  insert into public.applications (application_number, client_id, vehicle_id, status, submitted_at, created_at, updated_at, source, car_preferences, financial_snapshot)
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
      jsonb_build_object('creditScore', 725, 'income', 45000)
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

  insert into public.vehicles (vin, make, model, variant, year, body_type, fuel_type, transmission, mileage, status, features)
  values
    ('WDC12345678900001', 'Rolls-Royce', 'Cullinan', 'Black Badge', 2024, 'SUV', 'petrol', 'automatic', 1200, 'available', jsonb_build_object('batteryRange', 'N/A', 'color', 'Obsidian'))
  returning id into rolls_id;

  insert into public.vehicles (vin, make, model, variant, year, body_type, fuel_type, transmission, mileage, status, features)
  values
    ('ZHW12345678900002', 'Lamborghini', 'Huracán', 'EVO AWD', 2023, 'Coupe', 'petrol', 'automatic', 3400, 'reserved', jsonb_build_object('acceleration', '2.9s 0-100'))
  returning id into lambo_id;

  insert into public.vehicles (vin, make, model, variant, year, body_type, fuel_type, transmission, mileage, status, features)
  values
    ('YV1H1234567890003', 'Volvo', 'XC40 Recharge', 'Twin Motor', 2024, 'SUV', 'electric', 'automatic', 560, 'available', jsonb_build_object('batteryRange', '450 km', 'drive', 'AWD'))
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

  insert into public.applications (application_number, client_id, vehicle_id, status, submitted_at, created_at, updated_at, source, car_preferences, financial_snapshot)
  values
    (
      'APP-2025-0002',
      client_id,
      lambo_id,
      'in_review',
      now() - interval '28 days',
      now() - interval '32 days',
      now() - interval '3 days',
      'Broker',
      jsonb_build_object('budget', 42000, 'usage', 'business'),
      jsonb_build_object('creditScore', 705, 'income', 52000)
    )
  returning id into application_id_secondary;

  insert into public.application_documents (application_id, document_type, document_category, original_filename, stored_filename, storage_path, mime_type, file_size, status, verification_data, uploaded_at, verified_at, verified_by)
  values
    (
      application_id_secondary,
      'residency_permit',
      'identity',
      'residency-permit.pdf',
      'residency-permit.pdf',
      'applications/a0000001/residency-permit.pdf',
      'application/pdf',
      436912,
      'pending_review',
      jsonb_build_object('notes', 'Awaiting verification'),
      now() - interval '30 days',
      null,
      null
    );

  insert into public.applications (application_number, client_id, vehicle_id, status, submitted_at, created_at, updated_at, source, car_preferences, financial_snapshot)
  values
    (
      'APP-2025-0003',
      client_id,
      volvo_id,
      'approved',
      now() - interval '18 days',
      now() - interval '20 days',
      now() - interval '2 days',
      'Referral',
      jsonb_build_object('budget', 15000, 'usage', 'family'),
      jsonb_build_object('creditScore', 742, 'income', 38000)
    )
  returning id into application_id_third;

  insert into public.application_documents (application_id, document_type, document_category, original_filename, stored_filename, storage_path, mime_type, file_size, status, verification_data, uploaded_at, verified_at, verified_by)
  values
    (
      application_id_third,
      'bank_statement',
      'financial',
      'bank-statement.pdf',
      'bank-statement.pdf',
      'applications/a0000002/bank-statement.pdf',
      'application/pdf',
      512004,
      'verified',
      jsonb_build_object('notes', 'Validated by operations'),
      now() - interval '19 days',
      now() - interval '18 days',
      ops_id
    );

  insert into public.workflow_contacts (full_name, email, phone, emirates_id)
  values
    ('Michael Adams', 'michael.adams@fastlease.dev', '+971 50 111 2233', '784-1987-2233445-1'),
    ('Aisha Khan', 'aisha.khan@fastlease.dev', '+971 50 555 7890', '784-1990-9876543-2'),
    ('Noah Lee', 'noah.lee@fastlease.dev', '+971 52 333 4477', '784-1992-4455667-3');

  select id
    into contact_michael_id
  from public.workflow_contacts
  where full_name = 'Michael Adams'
  limit 1;

  select id
    into contact_aisha_id
  from public.workflow_contacts
  where full_name = 'Aisha Khan'
  limit 1;

  select id
    into contact_noah_id
  from public.workflow_contacts
  where full_name = 'Noah Lee'
  limit 1;

  insert into public.workflow_assets (type, vin, make, model, trim, year, supplier, price, meta)
  values
    ('VEHICLE', 'WF-ROLLS-001', 'Rolls-Royce', 'Cullinan', 'Black Badge', 2024, 'DXB Motors', 985000, jsonb_build_object('color', 'Obsidian', 'battery', 'N/A')),
    ('VEHICLE', 'WF-LAMBO-002', 'Lamborghini', 'Huracán', 'EVO AWD', 2023, 'Elite Motors', 720000, jsonb_build_object('color', 'Verde Mantis', 'feature', 'Launch control')),
    ('VEHICLE', 'WF-VOLVO-003', 'Volvo', 'XC40 Recharge', 'Twin Motor', 2024, 'Nordic Auto', 149000, jsonb_build_object('color', 'Cloud Blue', 'batteryRange', '450 km'));

  select id
    into workflow_version_id
  from public.workflow_versions
  order by created_at desc
  limit 1;

  insert into public.vehicle_services (vehicle_id, deal_id, service_type, title, description, due_date, mileage_target, status, completed_at, attachments, created_at, updated_at)
  values
    (
      rolls_id,
      null,
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
      null,
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
      null,
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

  insert into public.deals (
    deal_number,
    application_id,
    vehicle_id,
    client_id,
    status,
    principal_amount,
    total_amount,
    monthly_payment,
    monthly_lease_rate,
    monthly_lease_rate,
    monthly_lease_rate,
    term_months,
    interest_rate,
    down_payment_amount,
    security_deposit,
    processing_fee,
    contract_start_date,
    contract_end_date,
    first_payment_date,
    contract_terms,
    insurance_details,
    assigned_account_manager,
    activated_at,
    created_at,
    updated_at,
    workflow_id,
    workflow_version_id,
    asset_id,
    source,
    payload,
    op_manager_id
  )
  values (
    'LTR-151025-0001',
    application_id,
    rolls_id,
    client_id,
    'CONTRACT_PREP',
    865000,
    1025000,
    29800,
    29800,
    36,
    0.045,
    195000,
    85000,
    5500,
    current_date - interval '15 days',
    current_date + interval '26 months',
    current_date + interval '12 days',
    jsonb_build_object('grace_days', 5, 'late_fee', 250, 'auto_debit', true),
    jsonb_build_object(
      'provider', 'AXA',
      'policy_number', 'AXA-ROLLS-2025',
      'policy_type', 'comprehensive',
      'premium_amount', 28500,
      'payment_frequency', 'monthly',
      'next_payment_due', to_char(current_date + interval '25 days', 'YYYY-MM-DD'),
      'coverage_start', to_char(current_date - interval '1 month', 'YYYY-MM-DD'),
      'coverage_end', to_char(current_date + interval '11 months', 'YYYY-MM-DD'),
      'deductible', 1000,
      'last_payment_status', 'paid',
      'last_payment_date', to_char(current_date - interval '5 days', 'YYYY-MM-DD')
    ),
    ops_id,
    null,
    now() - interval '30 days',
    now() - interval '1 days',
    'fast-lease-v1',
    workflow_version_id,
    (select id from public.workflow_assets where vin = 'WF-ROLLS-001' limit 1),
    'Website',
    jsonb_build_object(
      'source_label', 'Website',
      'guard_tasks', jsonb_build_object(
        'legal.contractReady', jsonb_build_object('fulfilled', true, 'completed_at', now() - interval '2 days')
      )
    ),
    ops_id
  )
  returning id into rolls_deal_id;

  insert into public.deals (
    deal_number,
    application_id,
    vehicle_id,
    client_id,
    status,
    principal_amount,
    total_amount,
    monthly_payment,
    term_months,
    interest_rate,
    down_payment_amount,
    security_deposit,
    processing_fee,
    contract_start_date,
    contract_end_date,
    first_payment_date,
    contract_terms,
    insurance_details,
    assigned_account_manager,
    activated_at,
    created_at,
    updated_at,
    workflow_id,
    workflow_version_id,
    asset_id,
    source,
    payload,
    op_manager_id
  )
  values (
    'LTR-151025-0002',
    application_id_secondary,
    lambo_id,
    client_id,
    'SIGNING_FUNDING',
    540000,
    690000,
    24500,
    24500,
    30,
    0.052,
    120000,
    62000,
    4800,
    current_date - interval '22 days',
    current_date + interval '24 months',
    current_date + interval '7 days',
    jsonb_build_object('grace_days', 3, 'late_fee', 220, 'auto_debit', true),
    jsonb_build_object(
      'provider', 'RSA',
      'policy_number', 'RSA-LAMBO-2025',
      'policy_type', 'comprehensive',
      'premium_amount', 32500,
      'payment_frequency', 'monthly',
      'next_payment_due', to_char(current_date + interval '18 days', 'YYYY-MM-DD'),
      'coverage_start', to_char(current_date - interval '20 days', 'YYYY-MM-DD'),
      'coverage_end', to_char(current_date + interval '10 months', 'YYYY-MM-DD'),
      'deductible', 1500,
      'last_payment_status', 'pending',
      'last_payment_date', to_char(current_date - interval '32 days', 'YYYY-MM-DD')
    ),
    ops_id,
    now() - interval '14 days',
    now() - interval '40 days',
    now() - interval '3 days',
    'fast-lease-v1',
    workflow_version_id,
    (select id from public.workflow_assets where vin = 'WF-LAMBO-002' limit 1),
    'Broker',
    jsonb_build_object(
      'source_label', 'Broker',
      'guard_tasks', jsonb_build_object(
        'esign.allSigned', jsonb_build_object('fulfilled', false),
        'payments.advanceReceived', jsonb_build_object('fulfilled', true, 'completed_at', now() - interval '1 days'),
        'payments.supplierPaid', jsonb_build_object('fulfilled', false)
      )
    ),
    ops_id
  )
  returning id into lambo_deal_id;

  insert into public.deals (
    deal_number,
    application_id,
    vehicle_id,
    client_id,
    status,
    principal_amount,
    total_amount,
    monthly_payment,
    term_months,
    interest_rate,
    down_payment_amount,
    security_deposit,
    processing_fee,
    contract_start_date,
    contract_end_date,
    first_payment_date,
    contract_terms,
    insurance_details,
    assigned_account_manager,
    activated_at,
    created_at,
    updated_at,
    workflow_id,
    workflow_version_id,
    asset_id,
    source,
    payload,
    op_manager_id
  )
  values (
    'LTR-151025-0003',
    application_id_third,
    volvo_id,
    client_id,
    'DOCS_COLLECT',
    185000,
    225000,
    3250,
    3250,
    24,
    0.038,
    35000,
    18000,
    2500,
    current_date - interval '12 days',
    current_date + interval '18 months',
    current_date + interval '5 days',
    jsonb_build_object('grace_days', 4, 'late_fee', 150, 'auto_debit', true),
    jsonb_build_object(
      'provider', 'Zurich',
      'policy_number', 'ZUR-VOLVO-2025',
      'policy_type', 'comprehensive',
      'premium_amount', 12800,
      'payment_frequency', 'monthly',
      'next_payment_due', to_char(current_date + interval '12 days', 'YYYY-MM-DD'),
      'coverage_start', to_char(current_date - interval '5 days', 'YYYY-MM-DD'),
      'coverage_end', to_char(current_date + interval '11 months', 'YYYY-MM-DD'),
      'deductible', 750,
      'last_payment_status', 'paid',
      'last_payment_date', to_char(current_date - interval '18 days', 'YYYY-MM-DD')
    ),
    ops_id,
    null,
    now() - interval '18 days',
    now() - interval '4 days',
    'fast-lease-v1',
    workflow_version_id,
    (select id from public.workflow_assets where vin = 'WF-VOLVO-003' limit 1),
    'Referral',
    jsonb_build_object(
      'source_label', 'Referral',
      'guard_tasks', jsonb_build_object(
        'docs.required.allUploaded', jsonb_build_object('fulfilled', false),
        'risk.approved', jsonb_build_object('fulfilled', false)
      )
    ),
    ops_id
  )
  returning id into volvo_deal_id;

  insert into public.deal_documents (deal_id, title, document_type, status, storage_path, signed_at, created_at)
  values
    (
      rolls_deal_id,
      'Lease Agreement (Signed 2/2)',
      'legal.contractReady',
      'signed',
      format('%s/lease-agreement.pdf', rolls_deal_id),
      now() - interval '1 days',
      now() - interval '2 days'
    ),
    (
      rolls_deal_id,
      'Insurance Policy - AXA',
      'insurance.policy',
      'active',
      format('%s/insurance-policy.pdf', rolls_deal_id),
      now() - interval '2 days',
      now() - interval '3 days'
    ),
    (
      rolls_deal_id,
      'Vehicle Delivery Checklist',
      'delivery.confirmed',
      'pending_signature',
      format('%s/delivery-checklist.pdf', rolls_deal_id),
      null,
      now() - interval '1 days'
    ),
    (
      lambo_deal_id,
      'E-sign Envelope',
      'esign.allSigned',
      'pending_signature',
      format('%s/esign-envelope.pdf', lambo_deal_id),
      null,
      now() - interval '2 days'
    ),
    (
      lambo_deal_id,
      'Advance Payment Receipt',
      'payments.advanceReceived',
      'recorded',
      format('%s/advance-payment.pdf', lambo_deal_id),
      now() - interval '1 days',
      now() - interval '2 days'
    ),
    (
      lambo_deal_id,
      'Supplier Invoice',
      'payments.supplierPaid',
      'pending',
      format('%s/supplier-invoice.pdf', lambo_deal_id),
      null,
      now() - interval '1 days'
    ),
    (
      volvo_deal_id,
      'KYC Passport Upload',
      'docs.required.allUploaded',
      'uploaded',
      format('%s/passport.pdf', volvo_deal_id),
      null,
      now() - interval '5 days'
    ),
    (
      volvo_deal_id,
      'Proof of Address (DEWA)',
      'kyc.proofOfAddress',
      'uploaded',
      format('%s/proof-of-address.pdf', volvo_deal_id),
      null,
      now() - interval '4 days'
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
    null,
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
    (referral_id, 'deal', jsonb_build_object('deal_number', 'LTR-151025-2011'), now() - interval '2 days');

  insert into public.referral_deals (referral_id, deal_id, friend_name, status, monthly_payment, created_at)
  values
    (referral_id, null, 'Ivan Petrov', 'ACTIVE', 2260, now() - interval '2 days'),
    (referral_id, null, 'Olga Sidorova', 'SIGNING_FUNDING', 3460, now() - interval '15 days');

  insert into public.referral_rewards (referral_id, deal_id, reward_amount, status, created_at, paid_at)
  values
    (referral_id, null, 9500, 'earned', now() - interval '2 days', null);
end $$;

commit;
