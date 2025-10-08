-- Stage 3 seed data for Fast Lease

begin;

truncate table public.payment_transactions restart identity cascade;
truncate table public.payments restart identity cascade;
truncate table public.payment_schedules restart identity cascade;
truncate table public.invoices restart identity cascade;
truncate table public.deal_events restart identity cascade;
truncate table public.deals restart identity cascade;
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
  admin_id uuid;
  rolls_id uuid;
  lambo_id uuid;
  volvo_id uuid;
  application_id uuid;
  deal_id uuid;
  invoice_overdue_id uuid;
  invoice_pending_id uuid;
  payment_id uuid;
begin
  -- Auth users
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
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'lina.admin@fastlease.dev', crypt('Passw0rd!', gen_salt('bf', 10)), now(), '+971500000003', jsonb_build_object('full_name', 'Lina Admin'), 'authenticated', 'authenticated', now(), now())
  returning id into admin_id;

  -- Profiles
  insert into public.profiles (user_id, status, full_name, phone, emirates_id, nationality, residency_status, marketing_opt_in)
  values
    (client_id, 'active', 'Amira Client', '+971500000001', '784-1987-1234567-1', 'UAE', 'resident', true);

  insert into public.profiles (user_id, status, full_name, phone, nationality, residency_status, marketing_opt_in)
  values
    (ops_id, 'active', 'Omar Operations', '+971500000002', 'UAE', 'resident', false);

  insert into public.profiles (user_id, status, full_name, phone, nationality, residency_status, marketing_opt_in)
  values
    (admin_id, 'active', 'Lina Admin', '+971500000003', 'UAE', 'resident', false);

  -- Roles
  insert into public.user_roles (user_id, role, metadata)
  values
    (client_id, 'client', jsonb_build_object('scope', 'frontend')),
    (ops_id, 'operator', jsonb_build_object('team', 'operations')),
    (ops_id, 'ops_manager', jsonb_build_object('team', 'operations')),
    (admin_id, 'admin', jsonb_build_object('scope', 'platform'));

  -- Vehicles
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

  -- Applications
  insert into public.applications (application_number, user_id, vehicle_id, status, requested_amount, term_months, down_payment, monthly_payment, interest_rate, personal_info, financial_info, employment_info, references_info, scoring_results, risk_assessment, assigned_to, submitted_at, created_at, updated_at)
  values
    (
      'APP-2025-0001',
      client_id,
      rolls_id,
      'approved',
      950000,
      48,
      95000,
      30000,
      0.045,
      jsonb_build_object('fullName', 'Amira Client', 'emiratesId', '784-1987-1234567-1'),
      jsonb_build_object('monthlyIncome', 85000, 'liabilities', 12000),
      jsonb_build_object('employmentType', 'employed', 'company', 'Dubai Holdings'),
      jsonb_build_object('references', jsonb_build_array()),
      jsonb_build_object('score', 812, 'grade', 'A'),
      jsonb_build_object('riskLevel', 'low'),
      ops_id,
      now() - interval '35 days',
      now() - interval '40 days',
      now() - interval '5 days'
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

  -- Deals
  insert into public.deals (deal_number, application_id, vehicle_id, client_id, status, principal_amount, total_amount, monthly_payment, term_months, interest_rate, down_payment_amount, security_deposit, processing_fee, contract_start_date, contract_end_date, first_payment_date, contract_terms, insurance_details, assigned_account_manager, activated_at, created_at, updated_at)
  values
    (
      'DEAL-2025-0001',
      application_id,
      rolls_id,
      client_id,
      'active',
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
      jsonb_build_object('from', 'pending_activation', 'to', 'active'),
      ops_id,
      now() - interval '12 days'
    );

  -- Finance
  insert into public.invoices (invoice_number, deal_id, invoice_type, amount, tax_amount, total_amount, currency, due_date, issue_date, status, line_items, tax_breakdown, payment_terms, paid_at, created_at, updated_at)
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
      now() - interval '20 days',
      now() - interval '27 days',
      now() - interval '3 days'
    )
  returning id into invoice_overdue_id;

  insert into public.invoices (invoice_number, deal_id, invoice_type, amount, tax_amount, total_amount, currency, due_date, issue_date, status, line_items, tax_breakdown, payment_terms, created_at, updated_at)
  values
    (
      'INV-2025-0002',
      deal_id,
      'monthly_payment',
      30000,
      1500,
      31500,
      'AED',
      current_date + interval '33 days',
      current_date + interval '3 days',
      'pending',
      jsonb_build_array(jsonb_build_object('description', 'Monthly lease payment', 'amount', 30000)),
      jsonb_build_array(jsonb_build_object('name', 'VAT', 'amount', 1500)),
      'Payment due within 5 days of issue',
      now(),
      now()
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

end $$;

commit;
