-- Создание тестовых пользователей для Fast Lease
-- Запускается после очистки базы данных

DO $$
DECLARE
  client_user_id UUID;
  ops_user_id UUID;
  tech_user_id UUID;
  admin_user_id UUID;
  support_user_id UUID;
  investor_user_id UUID;
  finance_user_id UUID;
BEGIN
  -- Создаем пользователей auth.users и профили для клиентов (50 человек)
  FOR i IN 1..50 LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'client' || i || '@fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now() - (random() * interval '365 days'),
      '+97150' || LPAD((1000000 + (random() * 999999)::int)::text, 7, '0'),
      jsonb_build_object('full_name', 'Клиент ' || i),
      'authenticated',
      'authenticated',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    )
    RETURNING id INTO client_user_id;

    INSERT INTO public.profiles (
      user_id, status, full_name, first_name, last_name, phone, emirates_id, nationality,
      residency_status, date_of_birth, address, employment_info, financial_profile,
      timezone, created_at, updated_at
    ) VALUES (
      client_user_id,
      CASE WHEN random() > 0.1 THEN 'active' ELSE 'pending' END,
      'Клиент ' || i,
      'Имя' || i,
      'Фамилия' || i,
      '+97150' || LPAD((1000000 + (random() * 999999)::int)::text, 7, '0'),
      '784-1987-' || LPAD((1000000 + (random() * 999999)::int)::text, 7, '0'),
      (ARRAY['UAE', 'Россия', 'США', 'Великобритания', 'Германия', 'Франция'])[(random() * 6 + 1)::int],
      (ARRAY['resident', 'non_resident', 'citizen'])[(random() * 3 + 1)::int],
      now() - (random() * interval '40 years') - interval '18 years',
      jsonb_build_object(
        'city', (ARRAY['Дубай', 'Абу-Даби', 'Шарджа', 'Аджман'])[(random() * 4 + 1)::int],
        'country', 'ОАЭ',
        'postal_code', '00000'
      ),
      jsonb_build_object(
        'employer', (ARRAY['Emirates Airlines', 'Dubai Mall', 'Jumeirah Group', 'Emaar Properties', 'Noon', 'Careem'])[(random() * 6 + 1)::int],
        'position', (ARRAY['Менеджер', 'Инженер', 'Аналитик', 'Консультант', 'Директор', 'Специалист'])[(random() * 6 + 1)::int],
        'monthly_income', 15000 + (random() * 50000)::int
      ),
      jsonb_build_object(
        'credit_score', 650 + (random() * 200)::int,
        'monthly_expenses', 5000 + (random() * 15000)::int,
        'assets_value', 50000 + (random() * 500000)::int
      ),
      'Asia/Dubai',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    );

    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (client_user_id, 'CLIENT', now() - (random() * interval '365 days'));
  END LOOP;

  RAISE NOTICE 'Клиенты созданы: 50 пользователей';

  -- Создаем операционных менеджеров (5 человек)
  FOR i IN 1..5 LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'operator' || i || '@fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now() - (random() * interval '365 days'),
      '+97150' || LPAD((2000000 + (random() * 999999)::int)::text, 7, '0'),
      jsonb_build_object('full_name', 'Оператор ' || i),
      'authenticated',
      'authenticated',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    )
    RETURNING id INTO ops_user_id;

    INSERT INTO public.profiles (
      user_id, status, full_name, phone, nationality, residency_status,
      employment_info, timezone, created_at, updated_at
    ) VALUES (
      ops_user_id,
      'active',
      'Оператор ' || i,
      '+97150' || LPAD((2000000 + (random() * 999999)::int)::text, 7, '0'),
      'UAE',
      'resident',
      jsonb_build_object(
        'department', 'Operations',
        'position', 'Operations Manager',
        'employee_id', 'OPS-' || LPAD(i::text, 3, '0')
      ),
      'Asia/Dubai',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    );

    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES
      (ops_user_id, 'OP_MANAGER', now() - (random() * interval '365 days'));
  END LOOP;

  RAISE NOTICE 'Операционные менеджеры созданы: 5 пользователей';

  -- Создаем технических специалистов (3 человека)
  FOR i IN 1..3 LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'tech' || i || '@fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now() - (random() * interval '365 days'),
      '+97150' || LPAD((2500000 + (random() * 999999)::int)::text, 7, '0'),
      jsonb_build_object('full_name', 'Тех специалист ' || i),
      'authenticated',
      'authenticated',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    )
    RETURNING id INTO tech_user_id;

    INSERT INTO public.profiles (
      user_id, status, full_name, phone, nationality, residency_status,
      employment_info, timezone, created_at, updated_at
    ) VALUES (
      tech_user_id,
      'active',
      'Тех специалист ' || i,
      '+97150' || LPAD((2500000 + (random() * 999999)::int)::text, 7, '0'),
      'UAE',
      'resident',
      jsonb_build_object(
        'department', 'Fleet Operations',
        'position', 'Technical Specialist',
        'employee_id', 'TECH-' || LPAD(i::text, 3, '0')
      ),
      'Asia/Dubai',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    );

    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES
      (tech_user_id, 'TECH_SPECIALIST', now() - (random() * interval '365 days'));
  END LOOP;

  RAISE NOTICE 'Технические специалисты созданы: 3 пользователя';

  -- Создаем администраторов (3 человека)
  FOR i IN 1..3 LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin' || i || '@fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now() - (random() * interval '365 days'),
      '+97150' || LPAD((3000000 + (random() * 999999)::int)::text, 7, '0'),
      jsonb_build_object('full_name', 'Администратор ' || i),
      'authenticated',
      'authenticated',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    )
    RETURNING id INTO admin_user_id;

    INSERT INTO public.profiles (
      user_id, status, full_name, phone, nationality, residency_status,
      employment_info, timezone, created_at, updated_at
    ) VALUES (
      admin_user_id,
      'active',
      'Администратор ' || i,
      '+97150' || LPAD((3000000 + (random() * 999999)::int)::text, 7, '0'),
      'UAE',
      'resident',
      jsonb_build_object(
        'department', 'Administration',
        'position', 'System Administrator',
        'employee_id', 'ADM-' || LPAD(i::text, 3, '0')
      ),
      'Asia/Dubai',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    );

    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (admin_user_id, 'ADMIN', now() - (random() * interval '365 days'));
  END LOOP;

  RAISE NOTICE 'Администраторы созданы: 3 пользователя';

  -- Создаем сотрудников поддержки (4 человека)
  FOR i IN 1..4 LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'support' || i || '@fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now() - (random() * interval '365 days'),
      '+97150' || LPAD((4000000 + (random() * 999999)::int)::text, 7, '0'),
      jsonb_build_object('full_name', 'Поддержка ' || i),
      'authenticated',
      'authenticated',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    )
    RETURNING id INTO support_user_id;

    INSERT INTO public.profiles (
      user_id, status, full_name, phone, nationality, residency_status,
      employment_info, timezone, created_at, updated_at
    ) VALUES (
      support_user_id,
      'active',
      'Поддержка ' || i,
      '+97150' || LPAD((4000000 + (random() * 999999)::int)::text, 7, '0'),
      'UAE',
      'resident',
      jsonb_build_object(
        'department', 'Customer Support',
        'position', 'Support Specialist',
        'employee_id', 'SUP-' || LPAD(i::text, 3, '0')
      ),
      'Asia/Dubai',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    );

    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (support_user_id, 'SUPPORT', now() - (random() * interval '365 days'));
  END LOOP;

  RAISE NOTICE 'Сотрудники поддержки созданы: 4 пользователя';

  -- Создаем инвесторов (10 человек)
  FOR i IN 1..10 LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'investor' || i || '@fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now() - (random() * interval '365 days'),
      '+97150' || LPAD((5000000 + (random() * 999999)::int)::text, 7, '0'),
      jsonb_build_object('full_name', 'Инвестор ' || i),
      'authenticated',
      'authenticated',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    )
    RETURNING id INTO investor_user_id;

    INSERT INTO public.profiles (
      user_id, status, full_name, phone, nationality, residency_status,
      employment_info, timezone, created_at, updated_at
    ) VALUES (
      investor_user_id,
      'active',
      'Инвестор ' || i,
      '+97150' || LPAD((5000000 + (random() * 999999)::int)::text, 7, '0'),
      (ARRAY['UAE', 'США', 'Великобритания', 'Швейцария', 'Германия'])[(random() * 5 + 1)::int],
      'resident',
      jsonb_build_object(
        'investor_type', (ARRAY['Individual', 'Family Office', 'Institution'])[(random() * 3 + 1)::int],
        'experience_years', (random() * 20 + 1)::int
      ),
      'Asia/Dubai',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    );

    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (investor_user_id, 'INVESTOR', now() - (random() * interval '365 days'));

    INSERT INTO public.investors (
      user_id, investor_code, display_name, investor_type, status,
      total_investment, available_funds, compliance_status, onboarded_at, metadata
    ) VALUES (
      investor_user_id,
      'INV-' || LPAD(i::text, 4, '0'),
      'Инвестор ' || i,
      (ARRAY['individual', 'institutional', 'fund'])[(random() * 3 + 1)::int],
      'active',
      (random() * 10000000 + 100000)::numeric,
      (random() * 5000000 + 50000)::numeric,
      'verified',
      now() - (random() * interval '300 days'),
      jsonb_build_object(
        'risk_tolerance', (ARRAY['conservative', 'moderate', 'aggressive'])[(random() * 3 + 1)::int],
        'preferred_assets', ARRAY['luxury_vehicles', 'commercial_vehicles', 'electric_vehicles']
      )
    );
  END LOOP;

  RAISE NOTICE 'Инвесторы созданы: 10 пользователей';

  -- Создаем финансовых сотрудников (3 человека)
  FOR i IN 1..3 LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'finance' || i || '@fastlease.dev',
      crypt('Passw0rd!', gen_salt('bf', 10)),
      now() - (random() * interval '365 days'),
      '+97150' || LPAD((6000000 + (random() * 999999)::int)::text, 7, '0'),
      jsonb_build_object('full_name', 'Финансист ' || i),
      'authenticated',
      'authenticated',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    )
    RETURNING id INTO finance_user_id;

    INSERT INTO public.profiles (
      user_id, status, full_name, phone, nationality, residency_status,
      employment_info, timezone, created_at, updated_at
    ) VALUES (
      finance_user_id,
      'active',
      'Финансист ' || i,
      '+97150' || LPAD((6000000 + (random() * 999999)::int)::text, 7, '0'),
      'UAE',
      'resident',
      jsonb_build_object(
        'department', 'Finance',
        'position', 'Finance Manager',
        'employee_id', 'FIN-' || LPAD(i::text, 3, '0')
      ),
      'Asia/Dubai',
      now() - (random() * interval '365 days'),
      now() - (random() * interval '30 days')
    );

    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (finance_user_id, 'FINANCE', now() - (random() * interval '365 days'));
  END LOOP;

  RAISE NOTICE 'Финансовые сотрудники созданы: 3 пользователя';

END $$;

SELECT 'Все пользователи успешно созданы!' as status;
