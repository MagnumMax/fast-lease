-- Stage 3 seed data for Fast Lease

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

  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'sara.support@fastlease.dev', crypt('Passw0rd!', gen_salt('bf', 10)), now(), '+971500000004', jsonb_build_object('full_name', 'Sara Support'), 'authenticated', 'authenticated', now(), now())
  returning id into support_id;

  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'ilias.investor@fastlease.dev', crypt('Passw0rd!', gen_salt('bf', 10)), now(), '+971500000005', jsonb_build_object('full_name', 'Ilias Investor'), 'authenticated', 'authenticated', now(), now())
  returning id into investor_user_id;

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

  insert into public.profiles (user_id, status, full_name, phone, nationality, residency_status, marketing_opt_in)
  values
    (support_id, 'active', 'Sara Support', '+971500000004', 'UAE', 'resident', false);

  insert into public.profiles (user_id, status, full_name, phone, nationality, residency_status, marketing_opt_in)
  values
    (investor_user_id, 'active', 'Ilias Investor', '+971500000005', 'Greece', 'resident', false);

  -- Roles
  insert into public.user_roles (user_id, role, metadata)
  values
    (client_id, 'client', jsonb_build_object('scope', 'frontend')),
    (ops_id, 'operator', jsonb_build_object('team', 'operations')),
    (ops_id, 'ops_manager', jsonb_build_object('team', 'operations')),
    (admin_id, 'admin', jsonb_build_object('scope', 'platform')),
    (support_id, 'support', jsonb_build_object('team', 'cx')),
    (investor_user_id, 'investor', jsonb_build_object('segment', 'premium'));

  -- Investors
  insert into public.investors (user_id, investor_code, display_name, investor_type, status, total_investment, available_funds, compliance_status, onboarded_at, metadata)
  values
    (
      investor_user_id,
      'INV-2025-0001',
      'Ilias Capital Partners',
      'institutional',
      'active',
      4560000,
      320000,
      'verified',
      now() - interval '180 days',
      jsonb_build_object('preferred_currency', 'AED', 'contact_person', 'Ilias Georgiou')
    )
  returning id into investor_record_id;

  insert into public.investment_portfolios (investor_id, portfolio_name, portfolio_type, total_value, allocated_amount, available_amount, irr_percent, risk_band, performance_metrics, metadata)
  values
    (
      investor_record_id,
      'Luxury Fleet UAE',
      'lease-backed',
      4560000,
      4240000,
      320000,
      0.084,
      'moderate',
      jsonb_build_object(
        'aum', 4560000,
        'yield_ytd', 0.084,
        'overdue_ratio', 0,
        'status_breakdown', jsonb_build_array(
          jsonb_build_object('status', 'in_operation', 'count', 18),
          jsonb_build_object('status', 'pending_delivery', 'count', 4),
          jsonb_build_object('status', 'under_review', 'count', 2),
          jsonb_build_object('status', 'attention_required', 'count', 0)
        )
      ),
      jsonb_build_object('primary_currency', 'AED')
    )
  returning id into investor_portfolio_id;

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

  -- Investor portfolio assets & performance
  insert into public.portfolio_assets (
    portfolio_id,
    deal_id,
    vehicle_id,
    asset_code,
    vin,
    vehicle_make,
    vehicle_model,
    vehicle_variant,
    status,
    irr_percent,
    last_valuation,
    last_payout_amount,
    last_payout_currency,
    last_payout_date,
    payout_frequency,
    acquisition_cost,
    contract_start_date,
    contract_end_date,
    metadata
  )
  values
    (
      investor_portfolio_id,
      null,
      null,
      'R1T-2204',
      'R1T-2204',
      'Bentley',
      'Continental GT',
      'Azure',
      'in_operation',
      0.104,
      1120000,
      4400,
      'AED',
      current_date - interval '7 days',
      'monthly',
      985000,
      current_date - interval '380 days',
      current_date + interval '24 months',
      jsonb_build_object('link', '/investor/assets/asset-001', 'location', 'Dubai Marina')
    ),
    (
      investor_portfolio_id,
      deal_id,
      rolls_id,
      'AAX-341',
      'AAX-341',
      'Rolls-Royce',
      'Cullinan',
      'Black Badge',
      'pending_delivery',
      0.089,
      1080000,
      3080,
      'AED',
      current_date - interval '12 days',
      'monthly',
      1000000,
      current_date - interval '45 days',
      current_date + interval '35 months',
      jsonb_build_object('link', '/investor/assets/asset-002', 'handoverSlot', 'Next week')
    ),
    (
      investor_portfolio_id,
      null,
      null,
      'BMW-I4-88',
      'BMW-I4-88',
      'Ferrari',
      '488 Spider',
      'Rosso Corsa',
      'in_operation',
      0.096,
      860000,
      2680,
      'AED',
      current_date - interval '18 days',
      'monthly',
      815000,
      current_date - interval '300 days',
      current_date + interval '18 months',
      jsonb_build_object('link', '/investor/assets/asset-003', 'assignedManager', 'Maria G.')
    ),
    (
      investor_portfolio_id,
      null,
      lambo_id,
      'TES-3P-04',
      'TES-3P-04',
      'Lamborghini',
      'Huracan',
      'EVO AWD',
      'attention_required',
      0.078,
      720000,
      2530,
      'AED',
      current_date - interval '25 days',
      'monthly',
      705000,
      current_date - interval '220 days',
      current_date + interval '20 months',
      jsonb_build_object('link', '/investor/assets/asset-004', 'alert', 'Maintenance follow-up')
    ),
    (
      investor_portfolio_id,
      null,
      null,
      'VOL-XC40-12',
      'VOL-XC40-12',
      'Bentley',
      'Bentayga',
      'V8 Azure',
      'in_operation',
      0.091,
      780000,
      2170,
      'AED',
      current_date - interval '9 days',
      'monthly',
      765000,
      current_date - interval '150 days',
      current_date + interval '28 months',
      jsonb_build_object('link', '/investor/assets/asset-005', 'insurer', 'Allianz')
    );

  insert into public.portfolio_performance_snapshots (
    portfolio_id,
    period_start,
    period_end,
    period_label,
    accrued_amount,
    actual_amount,
    irr_percent
  )
  values
    (
      investor_portfolio_id,
      date '2024-12-01',
      date '2024-12-31',
      'Dec',
      42000,
      41000,
      0.082
    ),
    (
      investor_portfolio_id,
      date '2025-01-01',
      date '2025-01-31',
      'Jan',
      48000,
      48000,
      0.083
    ),
    (
      investor_portfolio_id,
      date '2025-02-01',
      date '2025-02-28',
      'Feb',
      55000,
      53000,
      0.084
    ),
    (
      investor_portfolio_id,
      date '2025-03-01',
      date '2025-03-31',
      'Mar',
      52000,
      51000,
      0.083
    ),
    (
      investor_portfolio_id,
      date '2025-04-01',
      date '2025-04-30',
      'Apr',
      58000,
      58000,
      0.085
    ),
    (
      investor_portfolio_id,
      date '2025-05-01',
      date '2025-05-31',
      'May',
      62000,
      61000,
      0.086
    );

  insert into public.portfolio_activity_events (portfolio_id, occurred_at, category, description, amount, currency, amount_direction, metadata)
  values
    (
      investor_portfolio_id,
      now() - interval '2 hours',
      'payout',
      'Payment settled for asset R1T-2204 (Bentley Continental GT)',
      4400,
      'AED',
      'credit',
      jsonb_build_object('asset_code', 'R1T-2204')
    ),
    (
      investor_portfolio_id,
      now() - interval '1 day',
      'contract',
      'Rolls-Royce Cullinan contract extended by 6 months',
      1540,
      'AED',
      'credit',
      jsonb_build_object('asset_code', 'AAX-341')
    ),
    (
      investor_portfolio_id,
      now() - interval '3 days',
      'maintenance',
      'Maintenance report received for Ferrari 488 Spider',
      null,
      'AED',
      'neutral',
      jsonb_build_object('asset_code', 'BMW-I4-88')
    );

  insert into public.investor_reports (
    portfolio_id,
    report_code,
    report_type,
    period_start,
    period_end,
    format,
    status,
    storage_path,
    send_copy,
    requested_by,
    generated_at,
    metadata,
    created_at
  )
  values
    (
      investor_portfolio_id,
      'REP-2025-004',
      'portfolio_yield',
      date '2024-12-01',
      date '2025-01-31',
      'pdf',
      'ready',
      'investor-reports/INV-2025-0001/REP-2025-004.pdf',
      true,
      investor_user_id,
      now() - interval '2 days',
      jsonb_build_object('signature', 'automated'),
      now() - interval '2 days'
    ),
    (
      investor_portfolio_id,
      'REP-2024-099',
      'payment_schedule',
      date '2024-11-01',
      date '2024-12-31',
      'xlsx',
      'ready',
      'investor-reports/INV-2025-0001/REP-2024-099.xlsx',
      false,
      investor_user_id,
      now() - interval '32 days',
      jsonb_build_object('notes', 'Monthly schedule export'),
      now() - interval '32 days'
    ),
    (
      investor_portfolio_id,
      'REP-2024-083',
      'cash_flow',
      date '2024-10-01',
      date '2024-11-30',
      'csv',
      'ready',
      'investor-reports/INV-2025-0001/REP-2024-083.csv',
      false,
      investor_user_id,
      now() - interval '68 days',
      jsonb_build_object('notes', 'Sent to accounting'),
      now() - interval '68 days'
    );

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
      now() - interval '20 days',
      now() - interval '27 days',
      now() - interval '3 days',
      'finance/invoices/INV-2025-0001.pdf'
    )
  returning id into invoice_overdue_id;

  insert into public.invoices (invoice_number, deal_id, invoice_type, amount, tax_amount, total_amount, currency, due_date, issue_date, status, line_items, tax_breakdown, payment_terms, created_at, updated_at, pdf_storage_path)
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
      now(),
      'finance/invoices/INV-2025-0002.pdf'
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

  -- Vehicle telemetry & services
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

  -- Deal documents & notifications
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
      'finance',
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
      'Lease agreement generated. We will notify you when it\'s ready for signature.',
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

  -- Support tickets & messages
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

  -- Referral program
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
    (referral_id, null, 'Ivan Petrov', 'active', 2260, now() - interval '2 days'),
    (referral_id, null, 'Olga Sidorova', 'pending_activation', 3460, now() - interval '15 days');

  insert into public.referral_rewards (referral_id, deal_id, reward_amount, status, created_at, paid_at)
  values
    (referral_id, null, 9500, 'earned', now() - interval '2 days', null);

end $$;

commit;
