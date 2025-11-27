-- Mock Data для пользователей и ролей FastLease
-- Генерация тестовых данных для всех ролей в системе
-- Создано: 2025-10-30

-- =====================================================================
-- 1. СИСТЕМНЫЕ АДМИНИСТРАТОРЫ (ADMIN) - 3 пользователя
-- =====================================================================

-- Главный администратор системы
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Ахмед Аль-Мансури',
    'Ахмед',
    'Аль-Мансури',
    '+971501234001',
    '784-1985-1234567-1',
    'UAE',
    'citizen',
    '1985-03-15'::date,
    '{"street": "Sheikh Zayed Road", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00000"}',
    '{"position": "Главный системный администратор", "department": "IT", "company": "FastLease Technologies", "start_date": "2022-01-01"}',
    '{"department": "IT", "access_level": "super_admin", "last_security_review": "2025-09-15"}',
    '{"department": "IT", "certifications": ["CISSP", "CEH", "AWS Solutions Architect"], "emergency_contact": "+971501234002"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/admin/ahmed-almansouri.jpg',
    '2025-10-30 09:15:00+04'
);

-- Администратор по безопасности
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Фатима Аль-Захра',
    'Фатима',
    'Аль-Захра',
    '+971501234003',
    '784-1987-2345678-1',
    'UAE',
    'resident',
    '1987-07-22'::date,
    '{"street": "Marina Walk", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00001"}',
    '{"position": "Администратор по безопасности", "department": "Security", "company": "FastLease Technologies", "start_date": "2022-06-01"}',
    '{"department": "Security", "access_level": "security_admin", "last_training": "2025-08-20"}',
    '{"department": "Security", "certifications": ["CISM", "Security+", "ISO 27001"], "shift": "day", "clearance_level": "confidential"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/admin/fatima-alzahra.jpg',
    '2025-10-30 08:45:00+04'
);

-- Администратор базы данных
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Мохаммед Аль-Рашид',
    'Мохаммед',
    'Аль-Рашид',
    '+971501234004',
    '784-1983-3456789-1',
    'UAE',
    'resident',
    '1983-11-08'::date,
    '{"street": "Business Bay", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00002"}',
    '{"position": "Администратор базы данных", "department": "Database Administration", "company": "FastLease Technologies", "start_date": "2021-03-15"}',
    '{"department": "Database", "access_level": "dba_admin", "certification_level": "senior"}',
    '{"department": "Database Administration", "specializations": ["PostgreSQL", "MongoDB", "Redis"], "on_call": true, "certifications": ["OCP", "MongoDB Certified"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/admin/mohammed-alrashid.jpg',
    '2025-10-30 07:30:00+04'
);

-- Привязка ролей администраторов
INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'ADMIN', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"department": "IT", "access_level": "full"}' FROM profiles WHERE full_name LIKE '%Аль-Мансури';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'ADMIN', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"department": "Security", "access_level": "security"}' FROM profiles WHERE full_name = 'Фатима Аль-Захра';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'ADMIN', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"department": "Database", "access_level": "dba"}' FROM profiles WHERE full_name = 'Мохаммед Аль-Рашид';

-- =====================================================================
-- 2. ОПЕРАЦИОННЫЕ МЕНЕДЖЕРЫ (OP_MANAGER) - 5 пользователей
-- =====================================================================

-- Руководитель операционного отдела
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Сара Аль-Матрук',
    'Сара',
    'Аль-Матрук',
    '+971501234005',
    '784-1986-4567890-1',
    'UAE',
    'resident',
    '1986-05-12'::date,
    '{"street": "Jumeirah Beach Road", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00003"}',
    '{"position": "Руководитель операционного отдела", "department": "Operations", "company": "FastLease", "start_date": "2022-01-15"}',
    '{"department": "Operations", "level": "senior_manager", "team_size": 12}',
    '{"department": "Operations", "specializations": ["Process Optimization", "Team Management", "Workflow"], "languages": ["Arabic", "English", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/ops/sara-almatruk.jpg',
    '2025-10-30 09:00:00+04'
);

-- Специалист по сделкам
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Халид Аль-Хашими',
    'Халид',
    'Аль-Хашими',
    '+971501234006',
    '784-1988-5678901-1',
    'UAE',
    'resident',
    '1988-09-25'::date,
    '{"street": "Downtown Dubai", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00004"}',
    '{"position": "Специалист по сделкам", "department": "Operations", "company": "FastLease", "start_date": "2023-02-01"}',
    '{"department": "Operations", "level": "specialist", "expertise": "deal_management"}',
    '{"department": "Operations", "specializations": ["Deal Structuring", "Contract Analysis", "Risk Assessment"], "performance_rating": "excellent"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/ops/khalid-alhashimi.jpg',
    '2025-10-29 17:30:00+04'
);

-- Менеджер по покупательскому сервису
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Нур Аль-Фараси',
    'Нур',
    'Аль-Фараси',
    '+971501234007',
    '784-1990-6789012-1',
    'UAE',
    'resident',
    '1990-12-03'::date,
    '{"street": "Dubai Marina", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00005"}',
    '{"position": "Менеджер по покупательскому сервису", "department": "Customer Service", "company": "FastLease", "start_date": "2023-06-01"}',
    '{"department": "Customer Service", "level": "manager", "clients_managed": 45}',
    '{"department": "Customer Service", "specializations": ["Customer Retention", "Complaint Resolution", "Communication"], "languages": ["Arabic", "English", "Hindi"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/ops/noor-alfarasi.jpg',
    '2025-10-30 08:45:00+04'
);

-- Координатор процессов
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Юсуф Аль-Мактум',
    'Юсуф',
    'Аль-Мактум',
    '+971501234008',
    '784-1984-7890123-1',
    'UAE',
    'resident',
    '1984-02-18'::date,
    '{"street": "Al Barsha", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00006"}',
    '{"position": "Координатор процессов", "department": "Operations", "company": "FastLease", "start_date": "2022-09-01"}',
    '{"department": "Operations", "level": "coordinator", "workflows_managed": 8}',
    '{"department": "Operations", "specializations": ["Process Coordination", "Workflow Management", "Automation"], "efficiency_improvement": "15%"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/ops/youssef-almaktoum.jpg',
    '2025-10-30 07:15:00+04'
);

-- Аналитик операций
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Лейла Аль-Саеedi',
    'Лейла',
    'Аль-Саеedi',
    '+971501234009',
    '784-1992-8901234-1',
    'UAE',
    'resident',
    '1992-04-07'::date,
    '{"street": "JVC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00007"}',
    '{"position": "Аналитик операций", "department": "Operations", "company": "FastLease", "start_date": "2024-01-15"}',
    '{"department": "Operations", "level": "analyst", "reports_monthly": 12}',
    '{"department": "Operations", "specializations": ["Data Analysis", "Performance Metrics", "Process Improvement"], "tools": ["Tableau", "Power BI", "SQL"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/ops/layla-alsaedi.jpg',
    '2025-10-29 16:20:00+04'
);

-- Привязка ролей операционных менеджеров
INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'OP_MANAGER', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"department": "Operations", "level": "director"}' FROM profiles WHERE full_name = 'Сара Аль-Матрук';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'OP_MANAGER', (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук'), 
       '{"department": "Operations", "level": "specialist"}' FROM profiles WHERE full_name = 'Халид Аль-Хашими';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'OP_MANAGER', (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук'), 
       '{"department": "Customer Service", "level": "manager"}' FROM profiles WHERE full_name = 'Нур Аль-Фараси';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'OP_MANAGER', (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук'), 
       '{"department": "Operations", "level": "coordinator"}' FROM profiles WHERE full_name = 'Юсуф Аль-Мактум';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'OP_MANAGER', (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук'), 
       '{"department": "Operations", "level": "analyst"}' FROM profiles WHERE full_name = 'Лейла Аль-Саеedi';

-- =====================================================================
-- 3. ФИНАНСОВЫЕ СПЕЦИАЛИСТЫ (FINANCE, ACCOUNTING) - 4 пользователя
-- =====================================================================

-- Финансовый директор
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Абдулла Аль-Накхи',
    'Абдулла',
    'Аль-Накхи',
    '+971501234010',
    '784-1980-9012345-1',
    'UAE',
    'resident',
    '1980-08-14'::date,
    '{"street": "Emirates Hills", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00008"}',
    '{"position": "Финансовый директор", "department": "Finance", "company": "FastLease", "start_date": "2021-05-01"}',
    '{"department": "Finance", "level": "director", "team_size": 8, "budget_managed": 50000000}',
    '{"department": "Finance", "certifications": ["CFA", "CPA", "FRM"], "expertise": ["Financial Planning", "Risk Management", "Strategic Planning"], "languages": ["Arabic", "English", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/finance/abdullah-alnakhli.jpg',
    '2025-10-30 09:30:00+04'
);

-- Бухгалтер по лизингу
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Майа Аль-Хадиди',
    'Майа',
    'Аль-Хадиди',
    '+971501234011',
    '784-1987-0123456-1',
    'UAE',
    'resident',
    '1987-01-20'::date,
    '{"street": "Meydan", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00009"}',
    '{"position": "Бухгалтер по лизингу", "department": "Accounting", "company": "FastLease", "start_date": "2022-03-15"}',
    '{"department": "Accounting", "level": "senior_accountant", "specialization": "leasing_accounting"}',
    '{"department": "Accounting", "specializations": ["Leasing Accounting", "IFRS", "Tax Compliance"], "software_expertise": ["SAP", "Oracle", "QuickBooks"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/finance/maya-alhaddid.jpg',
    '2025-10-30 08:00:00+04'
);

-- Специалист по платежам
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Рашид Аль-Балуши',
    'Рашид',
    'Аль-Балуши',
    '+971501234012',
    '784-1989-1234567-1',
    'UAE',
    'resident',
    '1989-06-30'::date,
    '{"street": "Dubai Investment Park", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00010"}',
    '{"position": "Специалист по платежам", "department": "Finance", "company": "FastLease", "start_date": "2023-01-10"}',
    '{"department": "Finance", "level": "specialist", "payment_volume_monthly": 2500000}',
    '{"department": "Finance", "specializations": ["Payment Processing", "Banking Integration", "Cash Flow Management"], "certifications": ["Payment Card Industry", "Anti-Money Laundering"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/finance/rashid-albalushi.jpg',
    '2025-10-30 07:45:00+04'
);

-- Финансовый аналитик
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Айша Аль-Кетби',
    'Айша',
    'Аль-Кетби',
    '+971501234013',
    '784-1991-2345678-1',
    'UAE',
    'resident',
    '1991-10-11'::date,
    '{"street": "Motor City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00011"}',
    '{"position": "Финансовый аналитик", "department": "Finance", "company": "FastLease", "start_date": "2023-08-01"}',
    '{"department": "Finance", "level": "analyst", "reports_generated_monthly": 15}',
    '{"department": "Finance", "specializations": ["Financial Modeling", "Market Analysis", "Investment Research"], "tools": ["Bloomberg", "Excel VBA", "Python", "R"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/finance/aisha-alketbi.jpg',
    '2025-10-29 18:15:00+04'
);

-- Привязка ролей финансовых специалистов
INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'FINANCE', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"department": "Finance", "level": "director"}' FROM profiles WHERE full_name = 'Абдулла Аль-Накхи';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'ACCOUNTING', (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи'), 
       '{"department": "Accounting", "level": "senior"}' FROM profiles WHERE full_name = 'Майа Аль-Хадиди';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'FINANCE', (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи'), 
       '{"department": "Finance", "level": "specialist"}' FROM profiles WHERE full_name = 'Рашид Аль-Балуши';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'FINANCE', (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи'), 
       '{"department": "Finance", "level": "analyst"}' FROM profiles WHERE full_name = 'Айша Аль-Кетби';

-- =====================================================================
-- 4. СПЕЦИАЛИСТЫ ТЕХНИЧЕСКОЙ ПОДДЕРЖКИ (SUPPORT, TECH_SPECIALIST) - 4 пользователя
-- =====================================================================

-- Руководитель поддержки
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Омар Аль-Сабунчи',
    'Омар',
    'Аль-Сабунчи',
    '+971501234014',
    '784-1985-3456789-1',
    'UAE',
    'resident',
    '1985-11-26'::date,
    '{"street": "Jumeirah Village Circle", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00012"}',
    '{"position": "Руководитель поддержки", "department": "Support", "company": "FastLease", "start_date": "2022-04-01"}',
    '{"department": "Support", "level": "manager", "team_size": 6, "csat_score": 4.8}',
    '{"department": "Support", "certifications": ["ITIL", "Customer Service Excellence"], "languages": ["Arabic", "English", "Urdu"], "shift_management": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/support/omar-alsabunchi.jpg',
    '2025-10-30 09:20:00+04'
);

-- Технический специалист
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Самира Аль-Марзуки',
    'Самира',
    'Аль-Марзуки',
    '+971501234015',
    '784-1988-4567890-1',
    'UAE',
    'resident',
    '1988-03-09'::date,
    '{"street": "Arabian Ranches", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00013"}',
    '{"position": "Технический специалист", "department": "Technical Support", "company": "FastLease", "start_date": "2023-03-20"}',
    '{"department": "Technical Support", "level": "senior_specialist", "tickets_resolved_monthly": 120}',
    '{"department": "Technical Support", "specializations": ["System Integration", "API Support", "Database Queries"], "certifications": ["CompTIA A+", "Microsoft Certified"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/support/samira-almarzouqi.jpg',
    '2025-10-30 08:30:00+04'
);

-- Специалист покупательской поддержки
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Мансур Аль-Кувейти',
    'Мансур',
    'Аль-Кувейти',
    '+971501234016',
    '784-1990-5678901-1',
    'UAE',
    'resident',
    '1990-07-17'::date,
    '{"street": "Discovery Gardens", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00014"}',
    '{"position": "Специалист покупательской поддержки", "department": "Customer Support", "company": "FastLease", "start_date": "2023-09-01"}',
    '{"department": "Customer Support", "level": "specialist", "customer_satisfaction": 4.6}',
    '{"department": "Customer Support", "specializations": ["Customer Communication", "Issue Resolution", "Product Knowledge"], "languages": ["Arabic", "English", "Tagalog"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/support/mansour-alkuwaiti.jpg',
    '2025-10-30 07:50:00+04'
);

-- Инженер по интеграциям
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Тарик Аль-Джасми',
    'Тарик',
    'Аль-Джасми',
    '+971501234017',
    '784-1986-6789012-1',
    'UAE',
    'resident',
    '1986-12-05'::date,
    '{"street": "International City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00015"}',
    '{"position": "Инженер по интеграциям", "department": "Technical Support", "company": "FastLease", "start_date": "2022-11-01"}',
    '{"department": "Technical Support", "level": "senior_engineer", "integrations_managed": 12}',
    '{"department": "Technical Support", "specializations": ["API Development", "Third-party Integrations", "System Architecture"], "certifications": ["AWS Certified", "Docker", "Kubernetes"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/support/tariq-aljasmi.jpg',
    '2025-10-29 19:10:00+04'
);

-- Привязка ролей специалистов поддержки
INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'SUPPORT', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"department": "Support", "level": "manager"}' FROM profiles WHERE full_name = 'Омар Аль-Сабунчи';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'TECH_SPECIALIST', (SELECT user_id FROM profiles WHERE full_name = 'Омар Аль-Сабунчи'), 
       '{"department": "Technical Support", "level": "senior"}' FROM profiles WHERE full_name = 'Самира Аль-Марзуки';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'SUPPORT', (SELECT user_id FROM profiles WHERE full_name = 'Омар Аль-Сабунчи'), 
       '{"department": "Customer Support", "level": "specialist"}' FROM profiles WHERE full_name = 'Мансур Аль-Кувейти';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'TECH_SPECIALIST', (SELECT user_id FROM profiles WHERE full_name = 'Омар Аль-Сабунчи'), 
       '{"department": "Technical Support", "level": "senior_engineer"}' FROM profiles WHERE full_name = 'Тарик Аль-Джасми';

-- =====================================================================
-- 5. ИНВЕСТОРЫ (INVESTOR) - 3 пользователя
-- =====================================================================

-- Крупный институциональный инвестор
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Халифа Аль-Нахайyan',
    'Халифа',
    'Аль-Нахайyan',
    '+971501234018',
    '784-1978-7890123-1',
    'UAE',
    'citizen',
    '1978-04-28'::date,
    '{"street": "Al Reem Island", "city": "Abu Dhabi", "state": "Abu Dhabi", "country": "UAE", "postal_code": "00016"}',
    '{"position": "Инвестиционный директор", "department": "Investment", "company": "Emirates Investment Group", "start_date": "2015-01-01"}',
    '{"department": "Investment", "portfolio_value": 150000000, "investment_focus": "automotive_leasing"}',
    '{"department": "Investment", "investor_type": "institutional", "investment_criteria": {"min_deal_size": 5000000, "max_risk": "medium"}, "certifications": ["CFA", "CAIA"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/investor/khalifa-alnahyan.jpg',
    '2025-10-29 15:45:00+04'
);

-- Частный инвестор
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Мохаммед Аль-Баварди',
    'Мохаммед',
    'Аль-Баварди',
    '+971501234019',
    '784-1982-8901234-1',
    'UAE',
    'resident',
    '1982-09-13'::date,
    '{"street": "Palm Jumeirah", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00017"}',
    '{"position": "Частный инвестор", "department": "Private Investment", "company": "Al Bawardi Holdings", "start_date": "2018-06-01"}',
    '{"department": "Private Investment", "portfolio_value": 25000000, "investment_focus": "leasing_assets"}',
    '{"department": "Investment", "investor_type": "individual", "investment_criteria": {"min_deal_size": 500000, "max_risk": "low"}, "investment_history": "real_estate,automotive"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/investor/mohammed-albawardi.jpg',
    '2025-10-30 06:30:00+04'
);

-- Инвестиционный фонд
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Амина Аль-Кассими',
    'Амина',
    'Аль-Кассими',
    '+971501234020',
    '784-1984-9012345-1',
    'UAE',
    'resident',
    '1984-01-07'::date,
    '{"street": " DIFC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00018"}',
    '{"position": "Портфельный менеджер", "department": "Fund Management", "company": "Gulf Capital Growth Fund", "start_date": "2019-03-15"}',
    '{"department": "Fund Management", "aum": 750000000, "fund_focus": "alternative_investments"}',
    '{"department": "Investment", "investor_type": "fund", "fund_size": "large", "specialization": "alternative_investments", "due_diligence": "comprehensive"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/investor/amina-alkassimi.jpg',
    '2025-10-29 14:20:00+04'
);

-- Привязка ролей инвесторов
INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'INVESTOR', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"investor_type": "institutional", "portfolio_value": 150000000}' FROM profiles WHERE full_name = 'Халифа Аль-Нахайyan';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'INVESTOR', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"investor_type": "individual", "portfolio_value": 25000000}' FROM profiles WHERE full_name = 'Мохаммед Аль-Баварди';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'INVESTOR', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"investor_type": "fund", "aum": 750000000}' FROM profiles WHERE full_name = 'Амина Аль-Кассими';

-- =====================================================================
-- 6. РИСК-МЕНЕДЖЕРЫ (RISK_MANAGER) - 3 пользователя
-- =====================================================================

-- Главный риск-менеджер
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Султан Аль-Муваллад',
    'Султан',
    'Аль-Муваллад',
    '+971501234021',
    '784-1979-0123456-1',
    'UAE',
    'resident',
    '1979-05-21'::date,
    '{"street": "Al Safa", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00019"}',
    '{"position": "Главный риск-менеджер", "department": "Risk Management", "company": "FastLease", "start_date": "2020-08-01"}',
    '{"department": "Risk Management", "level": "chief_risk_officer", "portfolio_at_risk": 2.3}',
    '{"department": "Risk Management", "certifications": ["FRM", "PRM", "CFA"], "expertise": ["Credit Risk", "Operational Risk", "Market Risk"], "languages": ["Arabic", "English", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/risk/sultan-almuwallad.jpg',
    '2025-10-30 09:45:00+04'
);

-- Специалист по оценке кредитных рисков
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Фарда Аль-Джувайди',
    'Фарда',
    'Аль-Джувайди',
    '+971501234022',
    '784-1987-1234567-1',
    'UAE',
    'resident',
    '1987-08-30'::date,
    '{"street": "Town Square", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00020"}',
    '{"position": "Специалист по оценке кредитных рисков", "department": "Credit Risk", "company": "FastLease", "start_date": "2022-01-10"}',
    '{"department": "Credit Risk", "level": "senior_analyst", "applications_reviewed_monthly": 85}',
    '{"department": "Credit Risk", "specializations": ["Credit Scoring", "Financial Analysis", "Default Prediction"], "certifications": ["Credit Risk Certification"], "model_expertise": "statistical"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/risk/farda-aljuwaidi.jpg',
    '2025-10-30 08:15:00+04'
);

-- Аналитик рисков
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Рубайя Аль-Шамси',
    'Рубайя',
    'Аль-Шамси',
    '+971501234023',
    '784-1992-2345678-1',
    'UAE',
    'resident',
    '1992-02-14'::date,
    '{"street": "Dubai South", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00021"}',
    '{"position": "Аналитик рисков", "department": "Risk Analysis", "company": "FastLease", "start_date": "2024-02-01"}',
    '{"department": "Risk Analysis", "level": "analyst", "reports_generated_monthly": 20}',
    '{"department": "Risk Analysis", "specializations": ["Risk Modeling", "Stress Testing", "Regulatory Compliance"], "tools": ["SAS", "R", "Python", "Excel"], "certifications": ["Financial Risk Manager"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/risk/rubayya-alshamsi.jpg',
    '2025-10-29 17:45:00+04'
);

-- Привязка ролей риск-менеджеров
INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'RISK_MANAGER', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"department": "Risk Management", "level": "chief"}' FROM profiles WHERE full_name = 'Султан Аль-Муваллад';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'RISK_MANAGER', (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад'), 
       '{"department": "Credit Risk", "level": "senior_analyst"}' FROM profiles WHERE full_name = 'Фарда Аль-Джувайди';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'RISK_MANAGER', (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад'), 
       '{"department": "Risk Analysis", "level": "analyst"}' FROM profiles WHERE full_name = 'Рубайя Аль-Шамси';

-- =====================================================================
-- 7. ЮРИСТЫ (LEGAL) - 2 пользователя
-- =====================================================================

-- Главный юрист
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Иса Аль-Бахи',
    'Иса',
    'Аль-Бахи',
    '+971501234024',
    '784-1977-3456789-1',
    'UAE',
    'resident',
    '1977-11-10'::date,
    '{"street": "DIFC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00022"}',
    '{"position": "Главный юрист", "department": "Legal", "company": "FastLease", "start_date": "2020-01-15"}',
    '{"department": "Legal", "level": "general_counsel", "contracts_reviewed_monthly": 150}',
    '{"department": "Legal", "specializations": ["Corporate Law", "Banking Law", "Contract Law"], "bar_admissions": ["UAE", "England & Wales"], "languages": ["Arabic", "English", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/legal/isa-albahi.jpg',
    '2025-10-30 09:10:00+04'
);

-- Специалист по договорам
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Лулай Аль-Фаласи',
    'Лулай',
    'Аль-Фаласи',
    '+971501234025',
    '784-1989-4567890-1',
    'UAE',
    'resident',
    '1989-06-18'::date,
    '{"street": "Business Bay", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00023"}',
    '{"position": "Специалист по договорам", "department": "Legal", "company": "FastLease", "start_date": "2021-09-01"}',
    '{"department": "Legal", "level": "senior_associate", "contracts_drafted_monthly": 45}',
    '{"department": "Legal", "specializations": ["Contract Drafting", "Legal Review", "Compliance"], "certifications": ["UAE Bar"], "expertise": "contract_management"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/legal/loulay-alfalasi.jpg',
    '2025-10-30 08:20:00+04'
);

-- Привязка ролей юристов
INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'LEGAL', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"department": "Legal", "level": "general_counsel"}' FROM profiles WHERE full_name = 'Иса Аль-Бахи';

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'LEGAL', (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи'), 
       '{"department": "Legal", "level": "senior_associate"}' FROM profiles WHERE full_name = 'Лулай Аль-Фаласи';

-- =====================================================================
-- 8. ПОКУПАТЕЛИ (CLIENT) - 10 пользователей
-- =====================================================================

-- Частные лица (5)
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
-- Покупатель 1
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Ахмед Аль-Хатими',
    'Ахмед',
    'Аль-Хатими',
    '+971501234026',
    '784-1990-5678901-1',
    'UAE',
    'resident',
    '1990-08-22'::date,
    '{"street": "Jumeirah 1", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00024"}',
    '{"position": "Менеджер по продажам", "company": "Emirates Group", "monthly_income": 15000}',
    '{"monthly_income": 15000, "employment_status": "employed", "credit_score": 720, "debt_to_income": 0.25}',
    '{"client_type": "individual", "lease_history": "first_time", "preferred_contact": "whatsapp"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/ahmed-alhatimi.jpg',
    '2025-10-30 10:00:00+04'
),
-- Покупатель 2
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Фатима Аль-Сувайди',
    'Фатима',
    'Аль-Сувайди',
    '+971501234027',
    '784-1992-6789012-1',
    'UAE',
    'resident',
    '1992-03-15'::date,
    '{"street": "Marina", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00025"}',
    '{"position": "Врач", "company": "Dubai Health Authority", "monthly_income": 25000}',
    '{"monthly_income": 25000, "employment_status": "employed", "credit_score": 780, "debt_to_income": 0.15}',
    '{"client_type": "individual", "lease_history": "returning", "preferred_contact": "email"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/fatima-alsuwaidi.jpg',
    '2025-10-29 19:30:00+04'
),
-- Покупатель 3
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Халид Аль-Кетби',
    'Халид',
    'Аль-Кетби',
    '+971501234028',
    '784-1988-7890123-1',
    'UAE',
    'resident',
    '1988-12-08'::date,
    '{"street": "Downtown", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00026"}',
    '{"position": "IT-специалист", "company": "ADNOC", "monthly_income": 18000}',
    '{"monthly_income": 18000, "employment_status": "employed", "credit_score": 695, "debt_to_income": 0.30}',
    '{"client_type": "individual", "lease_history": "first_time", "preferred_contact": "phone"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/khalid-alketbi.jpg',
    '2025-10-30 08:45:00+04'
),
-- Покупатель 4
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Айша Аль-Мактум',
    'Айша',
    'Аль-Мактум',
    '+971501234029',
    '784-1993-8901234-1',
    'UAE',
    'resident',
    '1993-05-27'::date,
    '{"street": "JVC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00027"}',
    '{"position": "Дизайнер", "company": "Freelance", "monthly_income": 12000}',
    '{"monthly_income": 12000, "employment_status": "self_employed", "credit_score": 665, "debt_to_income": 0.20}',
    '{"client_type": "individual", "lease_history": "first_time", "preferred_contact": "email"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/aisha-almaktoum.jpg',
    '2025-10-29 20:15:00+04'
),
-- Покупатель 5
(
    gen_random_uuid(),
    gen_random_uuid(),
    'suspended',
    'Мохаммед Аль-Амири',
    'Мохаммед',
    'Аль-Амири',
    '+971501234030',
    '784-1985-9012345-1',
    'UAE',
    'resident',
    '1985-10-12'::date,
    '{"street": "Al Nahda", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00028"}',
    '{"position": "Инженер", "company": "Dubai Municipality", "monthly_income": 16000}',
    '{"monthly_income": 16000, "employment_status": "employed", "credit_score": 580, "debt_to_income": 0.45}',
    '{"client_type": "individual", "lease_history": "previous_default", "preferred_contact": "phone", "suspension_reason": "payment_delays"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/mohammed-alamiri.jpg',
    '2025-10-25 14:30:00+04'
);

-- Малый бизнес (3)
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
-- Малый бизнес 1
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Салим Аль-Риши',
    'Салим',
    'Аль-Риши',
    '+971501234031',
    '784-1983-0123456-1',
    'UAE',
    'resident',
    '1983-01-19'::date,
    '{"street": "Al Quoz", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00029"}',
    '{"position": "Владелец бизнеса", "company": "Al Rishi Trading LLC", "monthly_income": 22000}',
    '{"monthly_income": 22000, "employment_status": "business_owner", "company_type": "LLC", "years_in_business": 5}',
    '{"client_type": "small_business", "business_name": "Al Rishi Trading LLC", "employees": 8, "annual_revenue": 500000}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/salim-alrishi.jpg',
    '2025-10-30 09:15:00+04'
),
-- Малый бизнес 2
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Нур Аль-Бадду',
    'Нур',
    'Аль-Бадду',
    '+971501234032',
    '784-1986-1234567-1',
    'UAE',
    'resident',
    '1986-07-03'::date,
    '{"street": "Deira", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00030"}',
    '{"position": "Владелица бизнеса", "company": "Nour Beauty Salon", "monthly_income": 14000}',
    '{"monthly_income": 14000, "employment_status": "business_owner", "company_type": "Sole Proprietorship", "years_in_business": 3}',
    '{"client_type": "small_business", "business_name": "Nour Beauty Salon", "employees": 4, "annual_revenue": 200000}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/noor-albaddu.jpg',
    '2025-10-29 16:45:00+04'
),
-- Малый бизнес 3
(
    gen_random_uuid(),
    gen_random_uuid(),
    'pending',
    'Юсуф Аль-Мухайри',
    'Юсуф',
    'Аль-Мухайри',
    '+971501234033',
    '784-1989-2345678-1',
    'UAE',
    'resident',
    '1989-11-28'::date,
    '{"street": "Karama", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00031"}',
    '{"position": "Владелец бизнеса", "company": "Al Muhairi Auto Repair", "monthly_income": 19000}',
    '{"monthly_income": 19000, "employment_status": "business_owner", "company_type": "Partnership", "years_in_business": 2}',
    '{"client_type": "small_business", "business_name": "Al Muhairi Auto Repair", "employees": 6, "annual_revenue": 350000, "pending_reason": "document_verification"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/youssef-almuhairi.jpg',
    '2025-10-28 11:20:00+04'
);

-- Средний бизнес (2)
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
-- Средний бизнес 1
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Абдулла Аль-Хейри',
    'Абдулла',
    'Аль-Хейри',
    '+971501234034',
    '784-1978-3456789-1',
    'UAE',
    'resident',
    '1978-04-16'::date,
    '{"street": "Jebel Ali", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00032"}',
    '{"position": "Генеральный директор", "company": "Al Heyari Construction LLC", "monthly_income": 35000}',
    '{"monthly_income": 35000, "employment_status": "business_owner", "company_type": "LLC", "years_in_business": 12}',
    '{"client_type": "medium_business", "business_name": "Al Heyari Construction LLC", "employees": 45, "annual_revenue": 2500000, "credit_line": 500000}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/abdullah-alheyari.jpg',
    '2025-10-30 07:30:00+04'
),
-- Средний бизнес 2
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Фатима Аль-Аззави',
    'Фатима',
    'Аль-Аззави',
    '+971501234035',
    '784-1980-4567890-1',
    'UAE',
    'resident',
    '1980-09-11'::date,
    '{"street": "DIFC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00033"}',
    '{"position": "Исполнительный директор", "company": "Al Azzawi Logistics FZE", "monthly_income": 40000}',
    '{"monthly_income": 40000, "employment_status": "business_owner", "company_type": "FZE", "years_in_business": 8}',
    '{"client_type": "medium_business", "business_name": "Al Azzawi Logistics FZE", "employees": 85, "annual_revenue": 4200000, "credit_line": 800000}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/clients/fatima-alazzawi.jpg',
    '2025-10-29 13:15:00+04'
);

-- Привязка ролей всех покупателей
INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'CLIENT', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"client_category": "individual"}' FROM profiles WHERE full_name IN (
           'Ахмед Аль-Хатими', 'Фатима Аль-Сувайди', 'Халид Аль-Кетби', 
           'Айша Аль-Мактум', 'Мохаммед Аль-Амири'
       );

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'CLIENT', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"client_category": "small_business"}' FROM profiles WHERE full_name IN (
           'Салим Аль-Риши', 'Нур Аль-Бадду', 'Юсуф Аль-Мухайри'
       );

INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'CLIENT', (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури'), 
       '{"client_category": "medium_business"}' FROM profiles WHERE full_name IN (
           'Абдулла Аль-Хейри', 'Фатима Аль-Аззави'
       );

-- =====================================================================
-- ДОПОЛНИТЕЛЬНЫЕ РОЛИ ДЛЯ ПЕРСОНАЛА (если требуется)
-- =====================================================================

-- Операторы (для обработки заявок)
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Заид Аль-Дерwishи',
    'Заид',
    'Аль-Дерwishи',
    '+971501234036',
    '784-1991-5678901-1',
    'UAE',
    'resident',
    '1991-06-25'::date,
    '{"street": "Al Satwa", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00034"}',
    '{"position": "Оператор обработки заявок", "department": "Operations", "company": "FastLease", "start_date": "2024-03-01"}',
    '{"department": "Operations", "level": "operator", "applications_processed_monthly": 95}',
    '{"department": "Operations", "specializations": ["Application Processing", "Data Entry", "Document Verification"], "performance_rating": "good"}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/ops/zaid-aldurwish.jpg',
    '2025-10-30 08:00:00+04'
);

-- Привязка роли оператора
INSERT INTO user_roles (user_id, role, assigned_by, metadata) 
SELECT user_id, 'OPERATOR', (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук'), 
       '{"department": "Operations", "level": "operator"}' FROM profiles WHERE full_name = 'Заид Аль-Дерwishи';

-- =====================================================================
-- СВОДНАЯ СТАТИСТИКА СОЗДАННЫХ ДАННЫХ
-- =====================================================================

-- Проверочные запросы для подтверждения корректности данных

-- Общее количество профилей
SELECT 'profiles_count' as metric, COUNT(*) as count FROM profiles;

-- Количество пользователей по ролям
SELECT role, COUNT(*) as user_count 
FROM user_roles 
GROUP BY role 
ORDER BY role;

-- Количество профилей по статусам
SELECT status, COUNT(*) as profile_count 
FROM profiles 
GROUP BY status 
ORDER BY status;

-- Количество пользователей по национальности
SELECT nationality, COUNT(*) as profile_count 
FROM profiles 
GROUP BY nationality 
ORDER BY nationality DESC;

-- Количество пользователей по резидентному статусу
SELECT residency_status, COUNT(*) as profile_count 
FROM profiles 
GROUP BY residency_status 
ORDER BY residency_status;

-- =====================================================================
-- КОНЕЦ ФАЙЛА MOCK-USERS-ROLES.SQL
-- =====================================================================
