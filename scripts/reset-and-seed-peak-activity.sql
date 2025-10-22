-- Reset and seed Fast Lease database with peak-activity scenario data

begin;

set session_replication_role = 'replica';

do $$
declare
  tbl text;
  tables_to_truncate text[] := array[
    'public.portfolio_activity_events',
    'public.portfolio_performance_snapshots',
    'public.portfolio_assets',
    'public.investment_portfolios',
    'public.investor_reports',
    'public.investors',
    'public.support_messages',
    'public.support_tickets',
    'public.client_notifications',
    'public.payment_transactions',
    'public.payments',
    'public.payment_schedules',
    'public.invoices',
    'public.deal_events',
    'public.deal_documents',
    'public.workflow_schedule_queue',
    'public.workflow_webhook_queue',
    'public.workflow_notification_queue',
    'public.referral_rewards',
    'public.referral_deals',
    'public.referral_events',
    'public.referral_codes',
    'public.vehicle_services',
    'public.vehicle_telematics',
    'public.vehicle_images',
    'public.vehicle_specifications',
    'public.workflow_assets',
    'public.workflow_contacts',
    'public.deals',
    'public.applications',
    'public.application_documents',
    'public.vehicles',
    'public.user_roles',
    'public.profiles',
    'public.workflow_versions'
  ];
  auth_tables text[] := array[
    'auth.mfa_amr_claims',
    'auth.mfa_challenges',
    'auth.mfa_factors',
    'auth.one_time_tokens',
    'auth.sessions',
    'auth.refresh_tokens',
    'auth.identities',
    'auth.users'
  ];
begin
  foreach tbl in array tables_to_truncate loop
    if to_regclass(tbl) is not null then
      execute format('truncate table %s restart identity cascade', tbl);
    end if;
  end loop;

  foreach tbl in array auth_tables loop
    if to_regclass(tbl) is not null then
      execute format('truncate table %s cascade', tbl);
    end if;
  end loop;
end $$;

set session_replication_role = 'origin';

commit;

-- Seed Fleet & Workflow Assets
do $$
declare
  vehicle_row record;
  vehicle_seq int := 0;
  vehicle_id uuid;
  target_asset uuid;
begin
  for vehicle_row in (
    select *
    from (values
      ('WDCPEAK00000001', 'Rolls-Royce', 'Cullinan', 'Black Badge', 2024, 'SUV', 'petrol', 'automatic', 1200, 1100000, 1050000, 32000, 1020000, 'available', jsonb_build_object('color','Obsidian','package','Executive'), jsonb_build_object('city','Dubai','warehouse','DXB-1')),
      ('ZFFPEAK00000002', 'Ferrari', 'Roma', 'Launch Edition', 2024, 'Coupe', 'petrol', 'automatic', 800, 900000, 880000, 28000, 850000, 'reserved', jsonb_build_object('color','Rosso Corsa','package','Carbon Fiber'), jsonb_build_object('city','Dubai','warehouse','DXB-2')),
      ('SCAPEAK00000003', 'Bentley', 'Bentayga', 'Azure', 2023, 'SUV', 'petrol', 'automatic', 9500, 620000, 590000, 18500, 600000, 'leased', jsonb_build_object('color','Midnight Emerald','upholstery','Linen'), jsonb_build_object('city','Abu Dhabi','warehouse','AUH-1')),
      ('YV1PEAK00000004', 'Volvo', 'XC90 Recharge', 'Ultimate', 2024, 'SUV', 'hybrid', 'automatic', 3100, 390000, 380000, 9500, 360000, 'available', jsonb_build_object('battery_range_km',600,'color','Denim Blue'), jsonb_build_object('city','Dubai','warehouse','DXB-3')),
      ('SALPEAK00000005', 'Range Rover', 'SV', 'P530', 2024, 'SUV', 'petrol', 'automatic', 1500, 780000, 760000, 23000, 740000, 'available', jsonb_build_object('color','Carpathian Grey','interior','SV Serenity'), jsonb_build_object('city','Dubai','warehouse','DXB-1')),
      ('WBAPEAK00000006', 'BMW', 'i7', 'xDrive60', 2024, 'Sedan', 'electric', 'automatic', 2400, 520000, 510000, 14500, 500000, 'available', jsonb_build_object('battery_range_km',625,'package','M Sport'), jsonb_build_object('city','Abu Dhabi','warehouse','AUH-2')),
      ('ZHWPEAK00000007', 'Lamborghini', 'Urus', 'Performante', 2023, 'SUV', 'petrol', 'automatic', 5400, 990000, 940000, 33000, 920000, 'leased', jsonb_build_object('color','Giallo Auge','package','Carbon Fiber Roof'), jsonb_build_object('city','Dubai','warehouse','DXB-2')),
      ('1HGPEAK00000008', 'Honda', 'Civic', 'LXi', 2024, 'Sedan', 'petrol', 'automatic', 1400, 85000, 83000, 1800, 82000, 'available', jsonb_build_object('color','Pearl White','package','Tech'), jsonb_build_object('city','Sharjah','warehouse','SHJ-1')),
      ('JM1PEAK00000009', 'Mazda', 'CX-90', 'Signature', 2024, 'SUV', 'petrol', 'automatic', 620, 210000, 205000, 4200, 200000, 'available', jsonb_build_object('color','Soul Red','package','Premium'), jsonb_build_object('city','Dubai','warehouse','DXB-4')),
      ('5YJPEAK00000010', 'Tesla', 'Model X', 'Plaid', 2024, 'SUV', 'electric', 'automatic', 900, 620000, 610000, 18500, 600000, 'available', jsonb_build_object('battery_range_km',560,'color','Pearl White'), jsonb_build_object('city','Dubai','warehouse','DXB-5')),
      ('WAUPEAK00000011', 'Audi', 'Q8 e-tron', '55 quattro', 2024, 'SUV', 'electric', 'automatic', 1750, 440000, 430000, 11500, 420000, 'available', jsonb_build_object('battery_range_km',505,'package','Black Optic'), jsonb_build_object('city','Abu Dhabi','warehouse','AUH-3')),
      ('JTDPEAK00000012', 'Toyota', 'Hiace', 'GL', 2023, 'Van', 'diesel', 'manual', 12400, 140000, 138000, 3200, 135000, 'leased', jsonb_build_object('color','Silver','usage','Corporate Shuttle'), jsonb_build_object('city','Dubai','warehouse','DXB-6')),
      ('JTEPEAK00000013', 'Toyota', 'Land Cruiser', 'GR Sport', 2024, 'SUV', 'petrol', 'automatic', 2100, 410000, 405000, 9500, 400000, 'reserved', jsonb_build_object('color','Graphite','package','Adventure'), jsonb_build_object('city','Dubai','warehouse','DXB-2')),
      ('KNMPEAK00000014', 'Kia', 'EV9', 'GT-Line', 2024, 'SUV', 'electric', 'automatic', 520, 290000, 285000, 7200, 280000, 'available', jsonb_build_object('battery_range_km',505,'seating','7'), jsonb_build_object('city','Dubai','warehouse','DXB-7')),
      ('YS3PEAK00000015', 'Saab', '9-5', 'Aero', 2011, 'Sedan', 'petrol', 'automatic', 98000, 65000, 50000, 1200, 45000, 'maintenance', jsonb_build_object('color','Carbon Grey','note','Classic enthusiast vehicle'), jsonb_build_object('city','Dubai','warehouse','DXB-Classic'))
    ) as v(vin, make, model, variant, year, body_type, fuel_type, transmission, mileage, purchase_price, current_value, monthly_lease_rate, residual_value, status, features, location_data)
  ) loop
    vehicle_seq := vehicle_seq + 1;

    insert into public.vehicles (vin, make, model, variant, year, body_type, fuel_type, transmission, mileage, purchase_price, current_value, monthly_lease_rate, residual_value, status, features, location_data, acquired_at)
    values (
      vehicle_row.vin,
      vehicle_row.make,
      vehicle_row.model,
      vehicle_row.variant,
      vehicle_row.year,
      vehicle_row.body_type,
      vehicle_row.fuel_type,
      vehicle_row.transmission,
      vehicle_row.mileage,
      vehicle_row.purchase_price,
      vehicle_row.current_value,
      vehicle_row.monthly_lease_rate,
      vehicle_row.residual_value,
      vehicle_row.status::public.vehicle_status,
      vehicle_row.features,
      vehicle_row.location_data,
      now() - (vehicle_seq * interval '20 days')
    )
    returning id into vehicle_id;

    insert into public.vehicle_images (vehicle_id, storage_path, label, is_primary, sort_order, metadata)
    values (
      vehicle_id,
      format('vehicles/%s-%s/hero.jpg', lower(replace(vehicle_row.make,' ','-')), lower(replace(vehicle_row.model,' ','-'))),
      'Hero view',
      true,
      1,
      jsonb_build_object('resolution','4k')
    ),
    (
      vehicle_id,
      format('vehicles/%s-%s/interior.jpg', lower(replace(vehicle_row.make,' ','-')), lower(replace(vehicle_row.model,' ','-'))),
      'Interior',
      false,
      2,
      jsonb_build_object('notes','Auto-generated seed image')
    );

    insert into public.vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
    values
      (vehicle_id, 'Performance', 'Power', (120 + vehicle_seq * 15)::text, 'hp', 1),
      (vehicle_id, 'Performance', 'Torque', (220 + vehicle_seq * 10)::text, 'Nm', 2),
      (vehicle_id, 'Dimensions', 'Wheelbase', (2800 + vehicle_seq)::text, 'mm', 3);

    insert into public.vehicle_telematics (vehicle_id, odometer, battery_health, fuel_level, tire_pressure, location, last_reported_at)
    values (
      vehicle_id,
      vehicle_row.mileage + vehicle_seq * 35,
      case when vehicle_row.fuel_type = 'electric' then 95 - vehicle_seq else 80 + vehicle_seq end,
      case when vehicle_row.fuel_type = 'electric' then null else 70 - vehicle_seq end,
      jsonb_build_object('front_left', 2.6 + vehicle_seq * 0.01, 'front_right', 2.6 + vehicle_seq * 0.01, 'rear_left', 2.7 + vehicle_seq * 0.01, 'rear_right', 2.7 + vehicle_seq * 0.01),
      vehicle_row.location_data || jsonb_build_object('lat', 25.2 + vehicle_seq * 0.01, 'lng', 55.27 + vehicle_seq * 0.005),
      now() - ((vehicle_seq * 12) * interval '1 minute')
    );

    insert into public.vehicle_services (vehicle_id, deal_id, service_type, title, description, due_date, mileage_target, status, completed_at, attachments, created_at, updated_at)
    values
      (
        vehicle_id,
        null,
        (array['inspection','delivery','maintenance','detail','telemetry'])[(vehicle_seq % 5) + 1],
        'Scheduled service check',
        'Automated service entry generated during peak-activity seed.',
        now() + ((15 + vehicle_seq) * interval '1 day'),
        vehicle_row.mileage + 500,
        (case when vehicle_row.status = 'maintenance' then 'in_progress' else 'scheduled' end)::public.service_status,
        case when vehicle_row.status = 'leased' then now() - interval '10 days' else null end,
        jsonb_build_array(),
        now() - interval '12 days',
        now()
      );

    insert into public.workflow_assets (type, vin, make, model, trim, year, supplier, price, meta)
    values (
      'VEHICLE',
      vehicle_row.vin,
      vehicle_row.make,
      vehicle_row.model,
      vehicle_row.variant,
      vehicle_row.year,
      case when vehicle_seq % 2 = 0 then 'Royal Motors' else 'DXB Motors' end,
      vehicle_row.purchase_price,
      jsonb_build_object('status', vehicle_row.status, 'location', vehicle_row.location_data)
    )
    returning id into target_asset;
  end loop;
end $$;

-- Seed Admin, Operations, Finance, Support, Investors
do $$
declare
  base_phone int := 500100000;
  emirates_seed int := 500;
  ops_first text[] := array['Omar','Layla','Farid','Rania','Hakim'];
  ops_last text[]  := array['Haddad','Rahman','Saeed','Nasser','Ismail'];
  fin_first text[] := array['Huda','Khalid','Fatima'];
  fin_last text[]  := array['Rahim','Al Farsi','Bennani'];
  sup_first text[] := array['Sara','Imran','Noor'];
  sup_last text[]  := array['Qureshi','Basel','Hassan'];
  inv_first text[] := array['Ilias','Chloe','Rashid','Ahmed'];
  inv_last text[]  := array['Karim','Dupont','Al Maktoum','El Azzar'];
  idx int;
  user_id uuid;
  admin_user_id uuid;
begin
  -- Admin
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
  values (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'amina.admin@fastlease.dev',
    crypt('Passw0rd!', gen_salt('bf', 10)),
    now(),
    '+971' || base_phone::text,
    jsonb_build_object('full_name','Amina Al Mansoori'),
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  returning id into user_id;

  insert into public.profiles (user_id, status, full_name, first_name, last_name, phone, emirates_id, nationality, residency_status, employment_info, metadata, last_login_at, marketing_opt_in)
  values (
    user_id,
    'active',
    'Amina Al Mansoori',
    'Amina',
    'Al Mansoori',
    '+971' || base_phone::text,
    format('784-1982-%06s-%s', emirates_seed, 1),
    'UAE',
    'resident',
    jsonb_build_object('company','Fast Lease','position','Head of Operations'),
    jsonb_build_object('time_zone','Asia/Dubai'),
    now() - interval '1 hour',
    true
  );

  insert into public.user_roles (user_id, role, assigned_by, metadata)
  values (user_id, 'ADMIN', user_id, jsonb_build_object('assigned_via','seed_peak'));
  admin_user_id := user_id;

  -- Operations
  for idx in 1..array_length(ops_first,1) loop
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      lower(ops_first[idx] || '.' || ops_last[idx]) || '@ops.fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now(),
      '+971' || (base_phone + idx)::text,
      jsonb_build_object('full_name', ops_first[idx] || ' ' || ops_last[idx]),
      'authenticated',
      'authenticated',
      now(),
      now()
    )
    returning id into user_id;

    insert into public.profiles (user_id, status, full_name, first_name, last_name, phone, emirates_id, nationality, residency_status, employment_info, last_login_at)
    values (
      user_id,
      'active',
      ops_first[idx] || ' ' || ops_last[idx],
      ops_first[idx],
      ops_last[idx],
      '+971' || (base_phone + idx)::text,
      format('784-1983-%06s-%s', emirates_seed + idx, idx),
      'UAE',
      'resident',
      jsonb_build_object('department','Operations','title','Account Manager'),
      now() - interval '3 hours'
    );

    insert into public.user_roles (user_id, role, assigned_by, metadata)
    values (user_id, 'OP_MANAGER', admin_user_id, jsonb_build_object('team','Leasing Desk'));
  end loop;

  -- Finance
  for idx in 1..array_length(fin_first,1) loop
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      lower(fin_first[idx] || '.' || fin_last[idx]) || '@finance.fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now(),
      '+971' || (base_phone + 20 + idx)::text,
      jsonb_build_object('full_name', fin_first[idx] || ' ' || fin_last[idx]),
      'authenticated',
      'authenticated',
      now(),
      now()
    )
    returning id into user_id;

    insert into public.profiles (user_id, status, full_name, first_name, last_name, phone, emirates_id, nationality, residency_status, employment_info)
    values (
      user_id,
      'active',
      fin_first[idx] || ' ' || fin_last[idx],
      fin_first[idx],
      fin_last[idx],
      '+971' || (base_phone + 20 + idx)::text,
      format('784-1984-%06s-%s', emirates_seed + 20 + idx, idx),
      'Morocco',
      'resident',
      jsonb_build_object('department','Finance','title','Collections Lead')
    );

    insert into public.user_roles (user_id, role, assigned_by, metadata)
    values (user_id, 'FINANCE', admin_user_id, jsonb_build_object('team','Treasury'));
  end loop;

  -- Support
  for idx in 1..array_length(sup_first,1) loop
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      lower(sup_first[idx] || '.' || sup_last[idx]) || '@support.fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now(),
      '+971' || (base_phone + 40 + idx)::text,
      jsonb_build_object('full_name', sup_first[idx] || ' ' || sup_last[idx]),
      'authenticated',
      'authenticated',
      now(),
      now()
    )
    returning id into user_id;

    insert into public.profiles (user_id, status, full_name, first_name, last_name, phone, emirates_id, nationality, residency_status, employment_info)
    values (
      user_id,
      'active',
      sup_first[idx] || ' ' || sup_last[idx],
      sup_first[idx],
      sup_last[idx],
      '+971' || (base_phone + 40 + idx)::text,
      format('784-1985-%06s-%s', emirates_seed + 40 + idx, idx),
      'Pakistan',
      'resident',
      jsonb_build_object('department','Client Support','title','Support Specialist')
    );

    insert into public.user_roles (user_id, role, assigned_by, metadata)
    values (user_id, 'SUPPORT', admin_user_id, jsonb_build_object('channel','OmniDesk'));
  end loop;

  -- Investors
  for idx in 1..array_length(inv_first,1) loop
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      lower(inv_first[idx] || '.' || inv_last[idx]) || '@invest.fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now(),
      '+971' || (base_phone + 60 + idx)::text,
      jsonb_build_object('full_name', inv_first[idx] || ' ' || inv_last[idx]),
      'authenticated',
      'authenticated',
      now(),
      now()
    )
    returning id into user_id;

    insert into public.profiles (user_id, status, full_name, first_name, last_name, phone, emirates_id, nationality, residency_status, financial_profile, metadata)
    values (
      user_id,
      'active',
      inv_first[idx] || ' ' || inv_last[idx],
      inv_first[idx],
      inv_last[idx],
      '+971' || (base_phone + 60 + idx)::text,
      format('784-1986-%06s-%s', emirates_seed + 60 + idx, idx),
      case idx when 2 then 'France' when 3 then 'UAE' else 'Greece' end,
      'non_resident',
      jsonb_build_object('aum','12M','investment_horizon','36m'),
      jsonb_build_object('investor_tier', case idx when 1 then 'strategic' when 2 then 'gold' else 'platinum' end)
    );

    insert into public.user_roles (user_id, role, assigned_by, metadata)
    values (user_id, 'INVESTOR', admin_user_id, jsonb_build_object('preferred_currency','AED'));

    insert into public.investors (user_id, investor_code, display_name, investor_type, status, total_investment, available_funds, compliance_status, onboarded_at, metadata)
    values (
      user_id,
      format('INV-%04s', idx),
      case idx when 1 then 'Ilias Capital' when 2 then 'Azure Growth Fund' when 3 then 'Royal Fleet Holdings' else 'Azzar Family Office' end,
      case idx when 2 then 'fund' when 3 then 'institutional' else 'individual' end,
      case idx when 3 then 'under_review' else 'active' end,
      2000000 * idx,
      250000 * idx,
      case idx when 3 then 'pending KYC refresh' else 'verified' end,
      now() - (idx * interval '120 days'),
      jsonb_build_object('preferred_channel','email','relationship_manager','Ahmed El Mansoori')
    );
  end loop;
end $$;

-- Seed Clients, Workflow Contacts, Applications & Documents
do $$
declare
  client_first text[] := array['Amira','Lina','Youssef','Hassan','Mariam','Omar','Aisha','Rami','Noah','Joud','Farah','Walid','Salma','Nabil','Dana','Yara','Karim','Noura','Bilal','Hiba','Samer','Jana','Adel','Hind','Ziad','Layal','Bassam','Rana','Ibrahim','Rawan'];
  client_last text[]  := array['Hamad','Faruqi','Khalifa','Rahman','Saadi','Aziz','Khatib','Saleh','Kader','Mustafa','Iskandar','Badawi','Hakim','Assaf','Barakat','Jaber','Taher','Darwish','Salem','Qadir','Nasser','Shahid','Fayyad','Haddad','Omari','Tariq','Issa','Fakih','Halabi','Qawasmi'];
  idx int;
  user_id uuid;
  contact_id uuid;
  vehicle_count int;
  ops_ids uuid[];
  assigned_ops uuid;
  application_id uuid;
  vehicle_id uuid;
  app_loop int;
  app_status text;
  status_options text[] := array['submitted','in_review','on_hold','approved','rejected','converted'];
  admin_user_id uuid;
begin
  select array_agg(id order by created_at) into ops_ids
  from auth.users where email like '%@ops.fastlease.dev';

  select count(*) into vehicle_count from public.vehicles;
  select ur.user_id into admin_user_id from public.user_roles ur where ur.role = 'ADMIN' limit 1;

  for idx in 1..array_length(client_first,1) loop
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      lower(client_first[idx] || '.' || client_last[idx]) || '@clients.fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now() - interval '6 hours',
      format('+9715%07s', 200000 + idx),
      jsonb_build_object('full_name', client_first[idx] || ' ' || client_last[idx], 'segment', case when idx % 4 = 0 then 'corporate' else 'retail' end),
      'authenticated',
      'authenticated',
      now() - interval '12 hours',
      now()
    )
    returning id into user_id;

    insert into public.profiles (user_id, status, full_name, first_name, last_name, phone, emirates_id, passport_number, nationality, residency_status, date_of_birth, address, employment_info, financial_profile, marketing_opt_in, last_login_at)
    values (
      user_id,
      'active',
      client_first[idx] || ' ' || client_last[idx],
      client_first[idx],
      client_last[idx],
      format('+9715%07s', 200000 + idx),
      format('784-19%02s-%07s-%s', 70 + (idx % 20), 200000 + idx, (idx % 7) + 1),
      format('P%06s', 700000 + idx),
      case when idx % 5 = 0 then 'Egypt' when idx % 4 = 0 then 'Jordan' else 'UAE' end,
      case when idx % 7 = 0 then 'golden_visa' else 'resident' end,
      date '1985-01-01' + (idx * interval '140 days'),
      jsonb_build_object('city','Dubai','community', case when idx % 3 = 0 then 'Dubai Hills' else 'Business Bay' end, 'country','UAE'),
      jsonb_build_object('employer', case when idx % 4 = 0 then 'Global Logistics LLC' else 'Emirates NBD' end, 'position','Senior Manager','years', 5 + idx % 6),
      jsonb_build_object('monthly_income', 30000 + idx * 1500, 'existing_loans', idx % 3),
      idx % 2 = 0,
      now() - interval '2 hours'
    );

    insert into public.user_roles (user_id, role, assigned_by, metadata)
    values (
      user_id,
      'CLIENT',
      admin_user_id,
      jsonb_build_object('segment', case when idx % 4 = 0 then 'corporate' else 'retail' end, 'acquisition_channel', (array['Website','Broker','Referral','Partner Portal','Corporate RFP'])[ (idx % 5) + 1 ])
    );

    insert into public.workflow_contacts (full_name, email, phone, emirates_id)
    values (
      client_first[idx] || ' ' || client_last[idx],
      lower(client_first[idx] || '.' || client_last[idx]) || '@clients.fastlease.dev',
      format('+9715%07s', 200000 + idx),
      format('784-19%02s-%07s-%s', 70 + (idx % 20), 200000 + idx, (idx % 7) + 1)
    )
    returning id into contact_id;

    for app_loop in 1..(2 + (idx % 2)) loop
      app_status := status_options[(idx + app_loop) % array_length(status_options,1) + 1];
      assigned_ops := ops_ids[(idx % array_length(ops_ids,1)) + 1];

      select id into vehicle_id
      from public.vehicles
      order by created_at
      offset ((idx + app_loop) % vehicle_count) limit 1;

      insert into public.applications (
        application_number,
        user_id,
        vehicle_id,
        status,
        requested_amount,
        term_months,
        down_payment,
        monthly_payment,
        interest_rate,
        personal_info,
        financial_info,
        employment_info,
        references_info,
        scoring_results,
        risk_assessment,
        assigned_to,
        submitted_at,
        approved_at,
        rejected_at,
        rejection_reason,
        residency_status
      )
      values (
        format('APP-%04s-%02s', idx, app_loop),
        user_id,
        vehicle_id,
        app_status::public.application_status,
        120000 + idx * 15000,
        24 + (idx % 12),
        20000 + idx * 1000,
        3200 + idx * 150,
        0.045 + idx * 0.0009,
        jsonb_build_object('marital_status','married','dependents',idx % 3),
        jsonb_build_object('assets', jsonb_build_array('property','savings'), 'liabilities', jsonb_build_array('credit_card')),
        jsonb_build_object('employer','Fast Tech LLC','position','Director','tenure_years', 4 + idx % 6),
        jsonb_build_object('primary_contact','Nadia Saleh'),
        jsonb_build_object('credit_score', 710 + (idx % 40)),
        jsonb_build_object('risk_grade', case when idx % 5 = 0 then 'B' else 'A' end, 'internal_flags', jsonb_build_array('income_verified')),
        assigned_ops,
        now() - (idx * interval '3 days') - (app_loop * interval '4 hours'),
        case when app_status in ('approved','converted') then now() - interval '2 days' else null end,
        case when app_status = 'rejected' then now() - interval '1 day' else null end,
        case when app_status = 'rejected' then 'Debt-to-income above 60%' else null end,
        case when idx % 7 = 0 then 'golden_visa' else 'resident' end
      )
      returning id into application_id;

      insert into public.application_documents (application_id, document_type, document_category, original_filename, stored_filename, storage_path, mime_type, file_size, status, verification_data, uploaded_at, verified_at, verified_by)
      select
        application_id,
        doc_kind,
        case doc_kind when 'passport' then 'identity' when 'salary_certificate' then 'income' else 'banking' end,
        doc_kind || '.pdf',
        format('%s-%s.pdf', doc_kind, application_id),
        format('applications/%s/%s.pdf', application_id, doc_kind),
        'application/pdf',
        400000 + idx * 1200,
        case when doc_kind = 'bank_statement' and app_status = 'on_hold' then 'pending_review' else 'verified' end,
        jsonb_build_object('ocr_score', 0.98, 'notes','Auto-verified'),
        now() - interval '7 days',
        case when doc_kind = 'bank_statement' and app_status = 'on_hold' then null else now() - interval '6 days' end,
        assigned_ops
      from unnest(array['passport','salary_certificate','bank_statement']) as doc_kind;
    end loop;
  end loop;
end $$;

-- Seed Workflow Versions, Deals & Related Events
do $$
declare
  app_record record;
  ops_ids uuid[];
  status_codes text[] := array['NEW','OFFER_PREP','VEHICLE_CHECK','DOCS_COLLECT','RISK_REVIEW','FINANCE_REVIEW','INVESTOR_PENDING','CONTRACT_PREP','SIGNING_FUNDING','VEHICLE_DELIVERY','ACTIVE','CANCELLED'];
  sources text[] := array['Website','Broker','Referral','Partner Portal','Corporate RFP'];
  wf_version_active uuid;
  wf_version_previous uuid;
  contact_id uuid;
  asset_id uuid;
  assigned_ops uuid;
  deal_id uuid;
begin
  insert into public.workflow_versions (workflow_id, version, title, description, source_yaml, template, checksum, is_active, created_by)
  values (
    'fast-lease-v1',
    '2024.08',
    'Fast Lease Workflow 2024-08',
    'Historic workflow retained for audit trail.',
    'stages:\n  - NEW\n  - OFFER_PREP',
    jsonb_build_object('stages', status_codes),
    encode(digest('fast-lease-v1-2024.08','sha256'),'hex'),
    false,
    (select user_id from public.user_roles where role = 'ADMIN' limit 1)
  )
  returning id into wf_version_previous;

  insert into public.workflow_versions (workflow_id, version, title, description, source_yaml, template, checksum, is_active, created_by)
  values (
    'fast-lease-v1',
    '2025.02-peak',
    'Fast Lease Workflow Peak Season',
    'Active workflow featuring enhanced investor review gates.',
    'stages:\n  - NEW\n  - OFFER_PREP\n  - VEHICLE_CHECK\n  - DOCS_COLLECT\n  - RISK_REVIEW\n  - FINANCE_REVIEW\n  - INVESTOR_PENDING\n  - CONTRACT_PREP\n  - SIGNING_FUNDING\n  - VEHICLE_DELIVERY\n  - ACTIVE\n  - CANCELLED',
    jsonb_build_object('stages', status_codes, 'escalations', jsonb_build_array('finance_alert','investor_notice')),
    encode(digest('fast-lease-v1-2025.02-peak','sha256'),'hex'),
    true,
    (select user_id from public.user_roles where role = 'ADMIN' limit 1)
  )
  returning id into wf_version_active;

  select array_agg(id order by created_at) into ops_ids
  from auth.users where email like '%@ops.fastlease.dev';

  for app_record in (
    select
      a.*,
      row_number() over (order by a.created_at) as rn
    from public.applications a
    where a.status <> 'draft'
  ) loop
    select wc.id into contact_id
    from public.workflow_contacts wc
    join auth.users au on au.email = wc.email
    where au.id = app_record.user_id
    limit 1;

    select wa.id into asset_id
    from public.workflow_assets wa
    join public.vehicles v on v.vin = wa.vin
    where v.id = app_record.vehicle_id
    limit 1;

    assigned_ops := ops_ids[(app_record.rn % array_length(ops_ids,1)) + 1];

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
      customer_id,
      asset_id,
      source,
      payload,
      op_manager_id
    )
    values (
      format('DEAL-%05s', app_record.rn),
      app_record.id,
      app_record.vehicle_id,
      app_record.user_id,
      status_codes[(app_record.rn % array_length(status_codes,1)) + 1]::public.deal_status,
      160000 + app_record.rn * 22000,
      280000 + app_record.rn * 23000,
      4800 + app_record.rn * 120,
      24 + (app_record.rn % 36),
      0.042 + (app_record.rn * 0.0008),
      35000 + app_record.rn * 1500,
      18000 + app_record.rn * 650,
      2500 + app_record.rn * 50,
      current_date - ((app_record.rn % 20)::int),
      current_date + (((app_record.rn % 36) + 18)::int),
      current_date + interval '30 days',
      jsonb_build_object('grace_days',5,'late_fee',250,'auto_debit',true),
      jsonb_build_object('provider','AXA','policy_number',format('AXA-%06s', app_record.rn)),
      assigned_ops,
      case when (app_record.rn % 12) >= 10 then now() - interval '20 days' else null end,
      now() - (app_record.rn * interval '5 days'),
      now() - (app_record.rn * interval '2 days'),
      'fast-lease-v1',
      wf_version_active,
      contact_id,
      asset_id,
      sources[(app_record.rn % array_length(sources,1)) + 1],
      jsonb_build_object('priority', case when (app_record.rn % 5) = 0 then 'high' else 'normal' end, 'channel','digital'),
      assigned_ops
    )
    returning id into deal_id;

    insert into public.deal_events (deal_id, event_type, payload, created_by, created_at)
    values
      (deal_id, 'status_change', jsonb_build_object('from','NEW','to',status_codes[(app_record.rn % array_length(status_codes,1)) + 1]), assigned_ops, now() - interval '4 days'),
      (deal_id, 'note_added', jsonb_build_object('body','Customer requested expedited delivery','visibility','internal'), assigned_ops, now() - interval '2 days'),
      (deal_id, 'task_completed', jsonb_build_object('task','Collect Emirates ID','completed_by',assigned_ops), assigned_ops, now() - interval '1 day');

    insert into public.deal_documents (deal_id, title, document_type, status, storage_path, signed_at, created_at)
    values
      (deal_id, 'Lease Agreement', 'contract', 'signed', format('deals/%s/contract.pdf', deal_id), now() - interval '2 days', now() - interval '3 days'),
      (deal_id, 'Insurance Policy', 'insurance', 'active', format('deals/%s/insurance.pdf', deal_id), now() - interval '2 days', now() - interval '2 days'),
      (deal_id, 'Delivery Checklist', 'delivery', 'pending_signature', format('deals/%s/delivery.pdf', deal_id), null, now() - interval '1 day');

    insert into public.workflow_notification_queue (kind, deal_id, transition_from, transition_to, template, to_roles, payload, status, action_hash, created_at)
    values (
      'NOTIFY',
      deal_id,
      'RISK_REVIEW',
      status_codes[(app_record.rn % array_length(status_codes,1)) + 1],
      'deal-status-change',
      array['OP_MANAGER','FINANCE'],
      jsonb_build_object('deal_number', format('DEAL-%05s', app_record.rn), 'status', status_codes[(app_record.rn % array_length(status_codes,1)) + 1]),
      case when (app_record.rn % 3) = 0 then 'ERROR' else 'PENDING' end,
      encode(digest(deal_id::text || '-notify','sha256'),'hex'),
      now() - interval '12 hours'
    );

    insert into public.workflow_webhook_queue (deal_id, transition_from, transition_to, endpoint, payload, status, retry_count, next_attempt_at, action_hash, created_at)
    values (
      deal_id,
      'CONTRACT_PREP',
      'SIGNING_FUNDING',
      'https://hooks.fastlease.dev/finance',
      jsonb_build_object('deal_id', deal_id, 'expected_funding_date', current_date + interval '3 days'),
      case when (app_record.rn % 4) = 0 then 'FAILED' else 'PENDING' end,
      case when (app_record.rn % 4) = 0 then 2 else 0 end,
      case when (app_record.rn % 4) = 0 then now() + interval '1 hour' else null end,
      encode(digest(deal_id::text || '-webhook','sha256'),'hex'),
      now() - interval '3 hours'
    );

    insert into public.workflow_schedule_queue (deal_id, transition_from, transition_to, job_type, cron, payload, status, action_hash, created_at)
    values (
      deal_id,
      'SIGNING_FUNDING',
      'VEHICLE_DELIVERY',
      'DELIVERY_FOLLOW_UP',
      '0 */6 * * *',
      jsonb_build_object('remind_after_hours', 24),
      'PENDING',
      encode(digest(deal_id::text || '-schedule','sha256'),'hex'),
      now() - interval '1 day'
    );
  end loop;
end $$;

-- Seed Finance Artefacts (Invoices, Payments, Schedules)
do $$
declare
  rec record;
  invoice_id uuid;
  payment_id uuid;
  invoice_counter int := 0;
  payment_counter int := 0;
begin
  for rec in (
    select d.id, row_number() over (order by d.created_at) as rn
    from public.deals d
  ) loop
    invoice_counter := invoice_counter + 1;

    insert into public.invoices (invoice_number, deal_id, invoice_type, amount, tax_amount, total_amount, currency, due_date, issue_date, status, line_items, tax_breakdown, payment_terms, paid_at, created_at, updated_at, pdf_storage_path)
    values (
      format('INV-%06s', invoice_counter),
      rec.id,
      (case when rec.rn % 4 = 0 then 'insurance' when rec.rn % 4 = 1 then 'monthly_payment' else 'processing_fee' end)::public.invoice_type,
      6500 + rec.rn * 850,
      650 + rec.rn * 85,
      7150 + rec.rn * 935,
      'AED',
      current_date + (((rec.rn % 6) - 2)::int),
      current_date - ((rec.rn % 5)::int),
      (case when rec.rn % 3 = 0 then 'overdue' when rec.rn % 3 = 1 then 'pending' else 'paid' end)::public.invoice_status,
      jsonb_build_array(jsonb_build_object('description','Lease instalment','amount',6500 + rec.rn * 850,'quantity',1)),
      jsonb_build_array(jsonb_build_object('tax','VAT','amount',650 + rec.rn * 85,'rate',0.05)),
      'Net 10 days',
      case when rec.rn % 3 = 2 then now() - interval '1 day' else null end,
      now() - interval '2 days',
      now(),
      format('invoices/%s.pdf', format('INV-%06s', invoice_counter))
    )
    returning id into invoice_id;

    if rec.rn % 3 = 2 then
      payment_counter := payment_counter + 1;
      insert into public.payments (deal_id, invoice_id, amount, currency, status, method, received_at, metadata, created_at, updated_at)
      values (
        rec.id,
        invoice_id,
        7150 + rec.rn * 935,
        'AED',
        'succeeded'::public.payment_status,
        (case when rec.rn % 2 = 0 then 'card' else 'bank_transfer' end)::public.payment_method,
        now() - interval '1 day',
        jsonb_build_object('reference', format('PAY-%06s', payment_counter), 'processed_by','stripe'),
        now() - interval '1 day',
        now()
      )
      returning id into payment_id;

      insert into public.payment_transactions (payment_id, provider, transaction_reference, amount, currency, status, payload, processed_at, created_at)
      values (
        payment_id,
        case when rec.rn % 2 = 0 then 'stripe' else 'checkout' end,
        format('TX-%08s', rec.rn),
        7150 + rec.rn * 935,
        'AED',
        'succeeded',
        jsonb_build_object('receipt_url', format('https://payments.fastlease.dev/%s', format('TX-%08s', rec.rn))),
        now() - interval '1 day',
        now()
      );
    else
      insert into public.payments (deal_id, invoice_id, amount, currency, status, method, received_at, metadata, created_at, updated_at)
      values (
        rec.id,
        invoice_id,
        7150 + rec.rn * 935,
        'AED',
        (case when rec.rn % 3 = 0 then 'failed' else 'processing' end)::public.payment_status,
        (case when rec.rn % 2 = 0 then 'wallet' else 'card' end)::public.payment_method,
        null,
        jsonb_build_object('reference', format('PAY-%06s', rec.rn), 'retry_count', case when rec.rn % 3 = 0 then 1 else 0 end),
        now() - interval '12 hours',
        now()
      );
    end if;

    insert into public.payment_schedules (deal_id, sequence, due_date, amount, status, metadata, created_at, updated_at)
    values
      (
        rec.id,
        1,
        current_date + (((rec.rn % 6) - 2)::int),
        7150 + rec.rn * 935,
        (case when rec.rn % 3 = 0 then 'overdue' when rec.rn % 3 = 1 then 'pending' else 'paid' end)::public.invoice_status,
        jsonb_build_object('auto_debit', true, 'channel','stripe_connect'),
        now() - interval '15 days',
        now() - interval '1 day'
      ),
      (
        rec.id,
        2,
        current_date + ((30 + rec.rn)::int),
        7150 + rec.rn * 935,
        'pending',
        jsonb_build_object('auto_debit', true, 'channel','stripe_connect'),
        now() - interval '2 days',
        now()
      );
  end loop;
end $$;

-- Seed Client Engagement: Notifications, Support Tickets, Referrals
do $$
declare
  rec record;
  support_ids uuid[];
  busy_deals uuid[];
  deal_id uuid;
  ref_counter int := 0;
  status_codes text[] := array['NEW','OFFER_PREP','VEHICLE_CHECK','DOCS_COLLECT','RISK_REVIEW','FINANCE_REVIEW','INVESTOR_PENDING','CONTRACT_PREP','SIGNING_FUNDING','VEHICLE_DELIVERY','ACTIVE','CANCELLED'];
begin
  select array_agg(id order by created_at) into support_ids
  from auth.users where email like '%@support.fastlease.dev';

  select array_agg(id order by created_at) into busy_deals
  from public.deals;

  for rec in (
    select u.id as client_id, u.email, row_number() over (order by u.created_at) as rn
    from auth.users u
    join public.user_roles ur on ur.user_id = u.id and ur.role = 'CLIENT'
  ) loop
    insert into public.client_notifications (client_id, title, message, icon, severity, created_at)
    values
      (rec.client_id, 'Invoice issued', 'Your new invoice is ready for review.', 'file-invoice', case when rec.rn % 4 = 0 then 'warning' else 'info' end, now() - interval '3 hours'),
      (rec.client_id, 'Vehicle telemetry update', 'Telematics report indicates optimal driving efficiency.', 'activity', 'info', now() - interval '2 hours'),
      (rec.client_id, 'Referral rewards surge', 'Two friends completed their lease applications this week.', 'gift', 'success', now() - interval '30 minutes');

    if rec.rn <= array_length(support_ids,1) * 5 and array_length(busy_deals,1) > 0 then
      insert into public.support_tickets (ticket_number, client_id, deal_id, topic, priority, status, description, attachments, last_message_at, last_message_preview, created_at, updated_at)
      values (
        format('SUP-%04s', rec.rn),
        rec.client_id,
        busy_deals[(rec.rn % array_length(busy_deals,1)) + 1],
        (array['Payment question','Vehicle issue','Account access','Contract clause','Insurance follow-up'])[(rec.rn % 5) + 1],
        (case when rec.rn % 4 = 0 then 'critical' when rec.rn % 3 = 0 then 'high' else 'medium' end)::public.support_priority,
        (case when rec.rn % 4 = 0 then 'in_progress' when rec.rn % 5 = 0 then 'waiting_client' else 'open' end)::public.support_status,
        'High-volume seed ticket generated automatically.',
        jsonb_build_array(),
        now() - interval '25 minutes',
        'We will get back to you within 2 hours.',
        now() - interval '8 hours',
        now() - interval '25 minutes'
      )
      returning id into deal_id;

      insert into public.support_messages (ticket_id, author_id, body, created_at)
      values
        (deal_id, rec.client_id, 'Need clarification on payment reconciliation for latest invoice.', now() - interval '50 minutes'),
        (deal_id, support_ids[(rec.rn % array_length(support_ids,1)) + 1], 'Payment confirmed. Please allow 30 mins for statement refresh.', now() - interval '20 minutes');
    end if;

    if rec.rn % 3 = 0 and array_length(busy_deals,1) > 0 then
      ref_counter := ref_counter + 1;
      insert into public.referral_codes (client_id, code, share_url, created_at, expires_at)
      values (
        rec.client_id,
        format('REF%s', 1000 + ref_counter),
        format('https://fastlease.dev/apply?ref=REF%s', 1000 + ref_counter),
        now() - interval '20 days',
        now() + interval '60 days'
      )
      returning id into deal_id;

      insert into public.referral_events (referral_id, event_type, metadata, occurred_at)
      values
        (deal_id, 'click', jsonb_build_object('channel','whatsapp'), now() - interval '10 days'),
        (deal_id, 'application', jsonb_build_object('application_number', format('APP-REF-%04s', ref_counter)), now() - interval '6 days'),
        (deal_id, 'deal', jsonb_build_object('deal_number', format('DEAL-REF-%04s', ref_counter)), now() - interval '2 days');

      insert into public.referral_deals (referral_id, deal_id, friend_name, status, monthly_payment, created_at)
      values (
        deal_id,
        busy_deals[(rec.rn % array_length(busy_deals,1)) + 1],
        'Friend ' || ref_counter,
        status_codes[(rec.rn % array_length(status_codes,1)) + 1]::public.deal_status,
        4200 + rec.rn * 120,
        now() - interval '2 days'
      );

      insert into public.referral_rewards (referral_id, deal_id, reward_amount, status, created_at, paid_at)
      values (
        deal_id,
        busy_deals[(rec.rn % array_length(busy_deals,1)) + 1],
        1000 + rec.rn * 50,
        (case when rec.rn % 2 = 0 then 'earned' else 'pending' end)::public.referral_reward_status,
        now() - interval '2 days',
        case when rec.rn % 2 = 0 then now() - interval '1 day' else null end
      );
    end if;
  end loop;
end $$;

-- Seed Investor Portfolios, Activity & Reports
do $$
declare
  inv_user record;
  portfolio_id uuid;
  active_deals uuid[];
  vehicle_ids uuid[];
  asset_loop int;
  inv_counter int := 0;
begin
  select array_agg(id order by created_at) into active_deals
  from public.deals
  where status = 'ACTIVE';

  select array_agg(id order by created_at) into vehicle_ids
  from public.vehicles;

  for inv_user in (
    select i.*, au.id as user_id
    from public.investors i
    join auth.users au on au.id = i.user_id
  ) loop
    inv_counter := inv_counter + 1;

    insert into public.investment_portfolios (investor_id, portfolio_name, portfolio_type, total_value, allocated_amount, available_amount, irr_percent, risk_band, performance_metrics, metadata)
    values (
      inv_user.id,
      case inv_user.investor_type when 'fund' then 'Electric Mobility MENA' when 'institutional' then 'SUV Prime' else 'Luxury Fleet UAE' end,
      case inv_user.investor_type when 'fund' then 'green-mobility' else 'lease-backed' end,
      2000000 * inv_counter,
      1800000 * inv_counter,
      200000 * inv_counter,
      0.08 + inv_counter * 0.01,
      case inv_user.status when 'under_review' then 'moderate' else 'growth' end,
      jsonb_build_object('aum', 2000000, 'yield_qtd', 0.08, 'overdue_ratio', 0.01),
      jsonb_build_object('reporting_frequency','monthly')
    )
    returning id into portfolio_id;

    if array_length(active_deals,1) is not null then
      for asset_loop in 1..least(4, array_length(active_deals,1)) loop
        insert into public.portfolio_assets (portfolio_id, deal_id, vehicle_id, asset_code, status, irr_percent, last_valuation, last_payout_amount, acquisition_cost, contract_start_date, contract_end_date, metadata)
        values (
          portfolio_id,
          active_deals[asset_loop],
          vehicle_ids[((asset_loop + random()*100)::int % array_length(vehicle_ids,1)) + 1],
          format('PA-%s-%02s', left(portfolio_id::text, 6), asset_loop),
          (case when asset_loop % 4 = 0 then 'under_review' when asset_loop % 3 = 0 then 'pending_delivery' else 'in_operation' end)::public.portfolio_asset_status,
          0.09 + asset_loop * 0.01,
          650000 + asset_loop * 50000,
          6000 + asset_loop * 500,
          600000 + asset_loop * 40000,
          current_date - (asset_loop * 40),
          current_date + (asset_loop * 40),
          jsonb_build_object('allocation_percent', 15 + asset_loop * 5)
        );
      end loop;
    end if;

    insert into public.portfolio_performance_snapshots (portfolio_id, period_start, period_end, period_label, accrued_amount, actual_amount, irr_percent)
    values
      (portfolio_id, current_date - interval '90 days', current_date - interval '60 days', 'Q4 2024', 82000, 78000, 0.084),
      (portfolio_id, current_date - interval '60 days', current_date - interval '30 days', 'Jan 2025', 61000, 62000, 0.079),
      (portfolio_id, current_date - interval '30 days', current_date, 'Feb 2025', 64000, 66000, 0.081);

    insert into public.portfolio_activity_events (portfolio_id, occurred_at, category, description, amount, currency, amount_direction, metadata)
    values
      (portfolio_id, now() - interval '12 days', 'payout', 'Monthly lease proceeds received.', 65000, 'AED', 'credit', jsonb_build_object('deal_reference', active_deals[1])),
      (portfolio_id, now() - interval '6 days', 'expense', 'Maintenance reserve funded.', 8500, 'AED', 'debit', jsonb_build_object('vehicle', vehicle_ids[1])),
      (portfolio_id, now() - interval '2 days', 'update', 'Vehicle telemetry showed above-average utilization.', null, null, 'info', jsonb_build_object('utilization','82%'));

    insert into public.investor_reports (portfolio_id, report_code, report_type, period_start, period_end, format, status, storage_path, send_copy, requested_by, generated_at, metadata)
    values
      (
        portfolio_id,
        format('RPT-%s-CF', left(portfolio_id::text, 6)),
        'cash_flow',
        current_date - interval '30 days',
        current_date,
        'pdf',
        'ready',
        format('reports/%s-cashflow.pdf', left(portfolio_id::text, 6)),
        true,
        inv_user.user_id,
        now() - interval '3 hours',
        jsonb_build_object('variance','2.5% above plan')
      ),
      (
        portfolio_id,
        format('RPT-%s-YIELD', left(portfolio_id::text, 6)),
        'portfolio_yield',
        current_date - interval '90 days',
        current_date,
        'xlsx',
        'processing',
        null,
        false,
        inv_user.user_id,
        null,
        jsonb_build_object('notes','Large dataset queued for rendering')
      );
  end loop;
end $$;
