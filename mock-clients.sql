-- =====================================================================
-- МОКОВЫЕ ДАННЫЕ КЛИЕНТОВ FASTLEASE
-- =====================================================================
-- Создано: 2025-10-30
-- Описание: Реалистичные профили клиентов-заявителей на лизинг
-- Содержит: 85 клиентов разных типов с финансовыми профилями
-- =====================================================================

-- =====================================================================
-- 1. ЧАСТНЫЕ ЛИЦА - 40 КЛИЕНТОВ
-- =====================================================================

-- =====================================================================
-- 1.1 Граждане ОАЭ с высоким доходом - 15 клиентов
-- =====================================================================

-- Клиент 1: Высокопоставленный государственный служащий
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Шейх Хамад Аль-Мактум',
    'Хамад',
    'Аль-Мактум',
    '+971501111001',
    '784-1982-1111111-1',
    'UAE',
    'citizen',
    '1982-09-15'::date,
    '{"street": "Al Safa Palace District", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00001", "villa_number": "Villa 15"}',
    '{"position": "Министр энергетики", "department": "Министерство энергетики и промышленности", "company": "Правительство ОАЭ", "start_date": "2018-01-01", "clearance_level": "top_secret"}',
    '{"monthly_income": 120000, "annual_income": 1440000, "employment_status": "government", "credit_score": 850, "debt_to_income": 0.15, "net_worth": 25000000, "liquid_assets": 5000000, "investment_portfolio": 8000000}',
    '{"client_category": "individual", "tier": "vip", "risk_profile": "low", "approval_probability": 0.98, "preferred_contact": "personal_assistant", "languages": ["Arabic", "English", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/vip/sheikh-hamad-almaktoum.jpg',
    '2025-10-30 11:45:00+04'
);

-- Клиент 2: Банкир высшего звена
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Мохаммед Аль-Хашими',
    'Мохаммед',
    'Аль-Хашими',
    '+971501111002',
    '784-1979-2222222-1',
    'UAE',
    'citizen',
    '1979-04-22'::date,
    '{"street": "Emirates Hills", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00002", "villa_number": "Villa 23"}',
    '{"position": "Исполнительный директор", "department": "Корпоративный банкинг", "company": "First Abu Dhabi Bank", "start_date": "2015-06-01", "reports_to": "CEO"}',
    '{"monthly_income": 85000, "annual_income": 1020000, "employment_status": "employed", "credit_score": 820, "debt_to_income": 0.25, "net_worth": 8500000, "liquid_assets": 2200000, "investment_portfolio": 3100000}',
    '{"client_category": "individual", "tier": "vip", "risk_profile": "low", "approval_probability": 0.95, "preferred_contact": "whatsapp", "languages": ["Arabic", "English"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/vip/mohammed-alhashimi.jpg',
    '2025-10-30 10:30:00+04'
);

-- Клиент 3: Врач-консультант
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Доктор Айша Аль-Захра',
    'Айша',
    'Аль-Захра',
    '+971501111003',
    '784-1985-3333333-1',
    'UAE',
    'citizen',
    '1985-12-08'::date,
    '{"street": "Jumeirah Beach Road", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00003", "apartment": "Penthouse 4B"}',
    '{"position": "Консультант-кардиохирург", "department": "Кардиохирургия", "company": "King Faisal Specialist Hospital", "start_date": "2012-09-01", "specialization": "Adult Cardiac Surgery", "certifications": ["FACS", "Arab Board"]}',
    '{"monthly_income": 75000, "annual_income": 900000, "employment_status": "employed", "credit_score": 790, "debt_to_income": 0.20, "net_worth": 4200000, "liquid_assets": 1800000, "investment_portfolio": 1200000}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "low", "approval_probability": 0.92, "preferred_contact": "phone", "languages": ["Arabic", "English", "Urdu"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/dr-aisha-alzahra.jpg',
    '2025-10-30 09:15:00+04'
);

-- Клиент 4: Нефтяной магнат
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
    '+971501111004',
    '784-1977-4444444-1',
    'UAE',
    'citizen',
    '1977-06-18'::date,
    '{"street": "Al Bateen", "city": "Abu Dhabi", "state": "Abu Dhabi", "country": "UAE", "postal_code": "00004", "palace": "Al Nahyan Palace"}',
    '{"position": "Председатель совета директоров", "department": "Стратегическое развитие", "company": "Al Nahyan Oil & Gas", "start_date": "2010-03-01", "company_type": "family_business"}',
    '{"monthly_income": 200000, "annual_income": 2400000, "employment_status": "business_owner", "credit_score": 880, "debt_to_income": 0.10, "net_worth": 85000000, "liquid_assets": 15000000, "investment_portfolio": 25000000}',
    '{"client_category": "individual", "tier": "ultra_vip", "risk_profile": "minimal", "approval_probability": 0.99, "preferred_contact": "personal_assistant", "languages": ["Arabic", "English"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/ultra_vip/khalifa-alnahyan.jpg',
    '2025-10-30 08:00:00+04'
);

-- Клиент 5: Технологический предприниматель
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
    '+971501111005',
    '784-1988-5555555-1',
    'UAE',
    'citizen',
    '1988-11-30'::date,
    '{"street": "Dubai Internet City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00005", "office": "Building 3, Floor 15"}',
    '{"position": "CEO и основатель", "department": "Technology", "company": "TechVision AI Solutions", "start_date": "2019-01-01", "founded_year": "2019", "employees": 150}',
    '{"monthly_income": 95000, "annual_income": 1140000, "employment_status": "business_owner", "credit_score": 810, "debt_to_income": 0.30, "net_worth": 12000000, "liquid_assets": 3500000, "investment_portfolio": 4200000}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "medium", "approval_probability": 0.90, "preferred_contact": "email", "languages": ["Arabic", "English", "Mandarin"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/sara-almatruk.jpg',
    '2025-10-29 22:30:00+04'
);

-- Клиент 6: Недвижимость и девелопмент
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Абдулла Аль-Баварди',
    'Абдулла',
    'Аль-Баварди',
    '+971501111006',
    '1980-6666666-1',
    'UAE',
    'citizen',
    '1980-03-25'::date,
    '{"street": "Business Bay", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00006", "tower": "Almas Tower, Unit 2801"}',
    '{"position": "Управляющий партнер", "department": "Development", "company": "Bawardi Real Estate Group", "start_date": "2005-08-01", "projects_completed": 25, "portfolio_value": 2500000000}',
    '{"monthly_income": 110000, "annual_income": 1320000, "employment_status": "business_owner", "credit_score": 840, "debt_to_income": 0.35, "net_worth": 35000000, "liquid_assets": 8000000, "investment_portfolio": 12000000}',
    '{"client_category": "individual", "tier": "vip", "risk_profile": "low", "approval_probability": 0.94, "preferred_contact": "phone", "languages": ["Arabic", "English", "Urdu"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/vip/abdullah-albawardi.jpg',
    '2025-10-30 07:45:00+04'
);

-- Клиент 7: Инвестиционный консультант
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Фатима Аль-Кувейти',
    'Фатима',
    'Аль-Кувейти',
    '+971501111007',
    '784-1987-7777777-1',
    'UAE',
    'citizen',
    '1987-08-12'::date,
    '{"street": "DIFC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00007", "office": "Gate Village 4, Level 12"}',
    '{"position": "Старший портфельный менеджер", "department": "Private Banking", "company": "Emirates NBD Wealth Management", "start_date": "2014-05-01", "aum_managed": 2500000000, "clients_managed": 85}',
    '{"monthly_income": 68000, "annual_income": 816000, "employment_status": "employed", "credit_score": 785, "debt_to_income": 0.22, "net_worth": 5800000, "liquid_assets": 2100000, "investment_portfolio": 1900000}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "low", "approval_probability": 0.93, "preferred_contact": "email", "languages": ["Arabic", "English"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/fatima-alkuwaiti.jpg',
    '2025-10-30 08:20:00+04'
);

-- Клиент 8: Автомобильный дилер
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Юсуф Аль-Фаласи',
    'Юсуф',
    'Аль-Фаласи',
    '+971501111008',
    '784-1983-8888888-1',
    'UAE',
    'citizen',
    '1983-01-09'::date,
    '{"street": "Sheikh Zayed Road", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00008", "showroom": "BMW Showroom, Level 2"}',
    '{"position": "Владелец дилерского центра", "department": "Automotive Sales", "company": "Falasi Motors Group", "start_date": "2010-03-01", "brands": ["BMW", "MINI", "Rolls-Royce"], "annual_revenue": 180000000}',
    '{"monthly_income": 78000, "annual_income": 936000, "employment_status": "business_owner", "credit_score": 815, "debt_to_income": 0.28, "net_worth": 18500000, "liquid_assets": 4200000, "investment_portfolio": 6800000}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "medium", "approval_probability": 0.91, "preferred_contact": "whatsapp", "languages": ["Arabic", "English"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/youssef-alfalasi.jpg',
    '2025-10-30 09:50:00+04'
);

-- Клиент 9: Архитектор
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Нур Аль-Риши',
    'Нур',
    'Аль-Риши',
    '+971501111009',
    '784-1990-9999999-1',
    'UAE',
    'citizen',
    '1990-05-17'::date,
    '{"street": "Al Quoz", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00009", "studio": "Creative Design Studio, Suite 305"}',
    '{"position": "Главный архитектор", "department": "Design", "company": "Al Rishi Architecture & Design", "start_date": "2016-02-01", "projects_completed": 45, "notable_projects": ["Dubai Opera", "Museum of the Future"]}',
    '{"monthly_income": 45000, "annual_income": 540000, "employment_status": "self_employed", "credit_score": 720, "debt_to_income": 0.25, "net_worth": 2800000, "liquid_assets": 850000, "investment_portfolio": 950000}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "medium", "approval_probability": 0.85, "preferred_contact": "email", "languages": ["Arabic", "English", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/noor-alrishi.jpg',
    '2025-10-30 06:30:00+04'
);

-- Клиент 10: Пилот Emirates
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Халид Аль-Муваллад',
    'Халид',
    'Аль-Муваллад',
    '+971501111010',
    '784-1986-1010101-1',
    'UAE',
    'citizen',
    '1986-07-23'::date,
    '{"street": "Aviation City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00010", "apartment": "Pilot Residence, Building A-15"}',
    '{"position": "Капитан Boeing 777", "department": "Flight Operations", "company": "Emirates Airline", "start_date": "2011-09-01", "flight_hours": 12500, "aircraft_type": "B777-300ER", "rank": "Captain"}',
    '{"monthly_income": 58000, "annual_income": 696000, "employment_status": "employed", "credit_score": 765, "debt_to_income": 0.20, "net_worth": 3200000, "liquid_assets": 1200000, "investment_portfolio": 1100000}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "low", "approval_probability": 0.88, "preferred_contact": "phone", "languages": ["Arabic", "English", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/khalid-almuwallad.jpg',
    '2025-10-29 23:15:00+04'
);

-- Клиент 11: IT-директор в Etisalat
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Амина Аль-Джасми',
    'Амина',
    'Аль-Джасми',
    '+971501111011',
    '784-1984-1111111-1',
    'UAE',
    'citizen',
    '1984-10-14'::date,
    '{"street": "Dubai Media City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00011", "office": "Etisalat Tower, Floor 18"}',
    '{"position": "Директор по информационным технологиям", "department": "IT Infrastructure", "company": "Etisalat", "start_date": "2008-04-01", "team_size": 250, "budget_managed": 50000000}',
    '{"monthly_income": 72000, "annual_income": 864000, "employment_status": "employed", "credit_score": 800, "debt_to_income": 0.18, "net_worth": 4800000, "liquid_assets": 1800000, "investment_portfolio": 1600000}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "low", "approval_probability": 0.92, "preferred_contact": "email", "languages": ["Arabic", "English"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/amina-aljasmi.jpg',
    '2025-10-30 08:45:00+04'
);

-- Клиент 12: Юрист в международной фирме
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
    '+971501111012',
    '784-1981-1212121-1',
    'UAE',
    'citizen',
    '1981-02-28'::date,
    '{"street": "DIFC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00012", "office": "The Gate Village 11, Level 22"}',
    '{"position": "Партнер", "department": "Корпоративное право", "company": "Baker McKenzie", "start_date": "2013-08-01", "specialization": "M&A, Private Equity", "bar_admissions": ["UAE", "England & Wales", "New York"]}',
    '{"monthly_income": 95000, "annual_income": 1140000, "employment_status": "employed", "credit_score": 835, "debt_to_income": 0.25, "net_worth": 6500000, "liquid_assets": 2800000, "investment_portfolio": 2200000}',
    '{"client_category": "individual", "tier": "vip", "risk_profile": "low", "approval_probability": 0.95, "preferred_contact": "phone", "languages": ["Arabic", "English", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/vip/isa-albahi.jpg',
    '2025-10-30 07:20:00+04'
);

-- Клиент 13: Консультант McKinsey
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Лулай Аль-Саеedi',
    'Лулай',
    'Аль-Саеedi',
    '+971501111013',
    '784-1989-1313131-1',
    'UAE',
    'citizen',
    '1989-12-05'::date,
    '{"street": "Dubai International Financial Centre", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00013", "apartment": "One Central, 2BR-1205"}',
    '{"position": "Старший консультант", "department": "Стратегический консалтинг", "company": "McKinsey & Company", "start_date": "2016-06-01", "specialization": "Digital Transformation", "education": "Harvard MBA, MIT Engineering"}',
    '{"monthly_income": 65000, "annual_income": 780000, "employment_status": "employed", "credit_score": 775, "debt_to_income": 0.30, "net_worth": 4200000, "liquid_assets": 1500000, "investment_portfolio": 1300000}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "medium", "approval_probability": 0.89, "preferred_contact": "email", "languages": ["Arabic", "English", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/loulay-alsaedi.jpg',
    '2025-10-30 09:30:00+04'
);

-- Клиент 14: Дипломат
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
    '+971501111014',
    '784-1978-1414141-1',
    'UAE',
    'citizen',
    '1978-04-11'::date,
    '{"street": "Diplomatic Quarter", "city": "Abu Dhabi", "state": "Abu Dhabi", "country": "UAE", "postal_code": "00014", "villa": "Villa 47"}',
    '{"position": "Посол в международной организации", "department": "Diplomatic Service", "company": "Ministry of Foreign Affairs", "start_date": "2005-03-01", "current_posting": "UN Geneva", "clearance_level": "top_secret"}',
    '{"monthly_income": 85000, "annual_income": 1020000, "employment_status": "government", "credit_score": 825, "debt_to_income": 0.15, "net_worth": 7200000, "liquid_assets": 2400000, "investment_portfolio": 2800000}',
    '{"client_category": "individual", "tier": "vip", "risk_profile": "minimal", "approval_probability": 0.97, "preferred_contact": "official_channel", "languages": ["Arabic", "English", "French", "Russian"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/vip/omar-alsabunchi.jpg',
    '2025-10-28 16:45:00+04'
);

-- Клиент 15: Наследник бизнес-империи
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
    '+971501111015',
    '784-1992-1515151-1',
    'UAE',
    'citizen',
    '1992-08-19'::date,
    '{"street": "Palm Jumeirah", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00015", "villa": "Signature Villa, Frond P-23"}',
    '{"position": "Наследница бизнес-империи", "department": "Family Office", "company": "Haddid Holdings", "start_date": "2018-01-01", "family_business": "Construction & Real Estate", "generations": 3}',
    '{"monthly_income": 180000, "annual_income": 2160000, "employment_status": "family_office", "credit_score": 870, "debt_to_income": 0.08, "net_worth": 150000000, "liquid_assets": 25000000, "investment_portfolio": 45000000}',
    '{"client_category": "individual", "tier": "ultra_vip", "risk_profile": "minimal", "approval_probability": 0.99, "preferred_contact": "personal_assistant", "languages": ["Arabic", "English", "French", "Italian"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/ultra_vip/maya-alhaddid.jpg',
    '2025-10-30 12:15:00+04'
);

-- =====================================================================
-- 1.2 Резиденты (экспаты) - 15 клиентов
-- =====================================================================

-- Клиент 16: Британский банкир
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'James Alexander Mitchell',
    'James',
    'Mitchell',
    '+971501112001',
    'UK-P-1620162-1',
    'United Kingdom',
    'resident',
    '1983-11-12'::date,
    '{"street": "Marina Promenade", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00016", "apartment": "Marina Heights, 3BR-2803"}',
    '{"position": "Managing Director", "department": "Corporate Banking", "company": "Standard Chartered Bank", "start_date": "2019-05-01", "previous_experience": "London, Singapore", "team_size": 45}',
    '{"monthly_income": 95000, "annual_income": 1140000, "employment_status": "employed", "credit_score": 820, "debt_to_income": 0.22, "net_worth": 6500000, "liquid_assets": 2200000, "investment_portfolio": 2800000, "currency": "USD"}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "low", "approval_probability": 0.94, "preferred_contact": "email", "languages": ["English", "Arabic"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/james-mitchell.jpg',
    '2025-10-30 08:30:00+04'
);

-- Клиент 17: Немецкий инженер
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Klaus Weber',
    'Klaus',
    'Weber',
    '+971501112002',
    'DE-P-1720172-1',
    'Germany',
    'resident',
    '1980-07-28'::date,
    '{"street": "Arabian Ranches", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00017", "villa": "Arabian Ranches II, Villa 1187"}',
    '{"position": "Chief Technology Officer", "department": "Engineering", "company": "Siemens Middle East", "start_date": "2017-03-01", "specialization": "Industrial Automation", "certifications": ["PMP", "Six Sigma Black Belt"]}',
    '{"monthly_income": 78000, "annual_income": 936000, "employment_status": "employed", "credit_score": 795, "debt_to_income": 0.25, "net_worth": 4200000, "liquid_assets": 1800000, "investment_portfolio": 1500000, "currency": "USD"}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "low", "approval_probability": 0.91, "preferred_contact": "whatsapp", "languages": ["German", "English", "Arabic"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/klaus-weber.jpg',
    '2025-10-30 07:45:00+04'
);

-- Клиент 18: Американский врач
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Dr. Sarah Elizabeth Johnson',
    'Sarah',
    'Johnson',
    '+971501112003',
    'US-P-1820182-1',
    'United States',
    'resident',
    '1986-05-14'::date,
    '{"street": "Jumeirah Golf Estates", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00018", "villa": "Fire Golf Course Villa 45"}',
    '{"position": "Consultant Anesthesiologist", "department": "Anesthesiology", "company": "American Hospital Dubai", "start_date": "2020-09-01", "board_certifications": ["American Board of Anesthesiology"], "specialization": "Cardiac Anesthesia"}',
    '{"monthly_income": 85000, "annual_income": 1020000, "employment_status": "employed", "credit_score": 840, "debt_to_income": 0.20, "net_worth": 5500000, "liquid_assets": 2100000, "investment_portfolio": 1900000, "currency": "USD"}',
    '{"client_category": "individual", "tier": "vip", "risk_profile": "low", "approval_probability": 0.95, "preferred_contact": "phone", "languages": ["English", "Arabic", "Spanish"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/vip/dr-sarah-johnson.jpg',
    '2025-10-30 10:15:00+04'
);

-- Клиент 19: Канадский IT-специалист
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'David Chen',
    'David',
    'Chen',
    '+971501112004',
    'CA-P-1920192-1',
    'Canada',
    'resident',
    '1988-09-03'::date,
    '{"street": "Dubai Sports City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00019", "apartment": "My Tower, 2BR-1507"}',
    '{"position": "Senior Software Architect", "department": "Technology", "company": "Careem (Uber)", "start_date": "2021-01-15", "specialization": "Machine Learning, Mobile Apps", "remote_work": true, "team_size": 12}',
    '{"monthly_income": 72000, "annual_income": 864000, "employment_status": "employed", "credit_score": 780, "debt_to_income": 0.28, "net_worth": 3800000, "liquid_assets": 1400000, "investment_portfolio": 1200000, "currency": "USD"}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "medium", "approval_probability": 0.87, "preferred_contact": "email", "languages": ["English", "Mandarin", "Arabic"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/david-chen.jpg',
    '2025-10-30 09:45:00+04'
);

-- Клиент 20: Австралийский финансовый консультант
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Rebecca Grace Thompson',
    'Rebecca',
    'Thompson',
    '+971501112005',
    'AU-P-2020202-1',
    'Australia',
    'resident',
    '1985-02-20'::date,
    '{"street": "Downtown Dubai", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00020", "apartment": "The Address Downtown, 3BR-PH1"}',
    '{"position": "Senior Financial Advisor", "department": "Wealth Management", "company": "UBS Wealth Management", "start_date": "2018-11-01", "certifications": ["CFA", "CFP"], "client_portfolio_value": 1800000000, "clients_served": 95}',
    '{"monthly_income": 68000, "annual_income": 816000, "employment_status": "employed", "credit_score": 810, "debt_to_income": 0.24, "net_worth": 4800000, "liquid_assets": 1900000, "investment_portfolio": 1700000, "currency": "USD"}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "low", "approval_probability": 0.92, "preferred_contact": "email", "languages": ["English", "Arabic"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/rebecca-thompson.jpg',
    '2025-10-30 08:00:00+04'
);

-- Клиент 21: Индийский бизнесмен
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Raj Patel',
    'Raj',
    'Patel',
    '+971501112006',
    'IN-P-2121212-1',
    'India',
    'resident',
    '1979-12-08'::date,
    '{"street": "Discovery Gardens", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00021", "villa": "Garden Villas, Villa 234"}',
    '{"position": "Owner & Managing Director", "department": "Import/Export", "company": "Patel Trading Group", "start_date": "2005-01-01", "business_type": "FMCG Distribution", "employees": 320, "annual_revenue": 85000000}',
    '{"monthly_income": 95000, "annual_income": 1140000, "employment_status": "business_owner", "credit_score": 825, "debt_to_income": 0.35, "net_worth": 18000000, "liquid_assets": 4500000, "investment_portfolio": 6200000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "vip", "risk_profile": "medium", "approval_probability": 0.90, "preferred_contact": "whatsapp", "languages": ["Hindi", "English", "Arabic", "Gujarati"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/vip/raj-patel.jpg',
    '2025-10-30 11:30:00+04'
);

-- Клиент 22: Южноафриканский пилот
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Captain Michael Johnson',
    'Michael',
    'Johnson',
    '+971501112007',
    'ZA-P-2222222-1',
    'South Africa',
    'resident',
    '1984-06-16'::date,
    '{"street": "Aviation City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00022", "apartment": "Pilot Accommodation, Block B-12"}',
    '{"position": "Senior First Officer", "department": "Flight Operations", "company": "flydubai", "start_date": "2014-08-01", "aircraft_type": "Boeing 737 MAX", "flight_hours": 8500, "licenses": ["ATPL", "B737 Type Rating"]}',
    '{"monthly_income": 42000, "annual_income": 504000, "employment_status": "employed", "credit_score": 720, "debt_to_income": 0.30, "net_worth": 1800000, "liquid_assets": 650000, "investment_portfolio": 580000, "currency": "USD"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "medium", "approval_probability": 0.82, "preferred_contact": "phone", "languages": ["English", "Arabic", "Afrikaans"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/captain-michael-johnson.jpg',
    '2025-10-29 18:20:00+04'
);

-- Клиент 23: Пакистанский врач
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Dr. Ahmed Hassan',
    'Ahmed',
    'Hassan',
    '+971501112008',
    'PK-P-2323232-1',
    'Pakistan',
    'resident',
    '1982-04-09'::date,
    '{"street": "Al Qusais", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00023", "apartment": "Al Qusais Villas, Villa 89"}',
    '{"position": "Consultant Orthopedic Surgeon", "department": "Orthopedics", "company": "Saudi German Hospital", "start_date": "2016-09-01", "specialization": "Joint Replacement Surgery", "qualifications": ["FCPS", "Fellowship in Arthroplasty"]}',
    '{"monthly_income": 58000, "annual_income": 696000, "employment_status": "employed", "credit_score": 780, "debt_to_income": 0.22, "net_worth": 3800000, "liquid_assets": 1500000, "investment_portfolio": 1200000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "low", "approval_probability": 0.88, "preferred_contact": "whatsapp", "languages": ["Urdu", "English", "Arabic", "Punjabi"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/dr-ahmed-hassan.jpg',
    '2025-10-30 07:15:00+04'
);

-- Клиент 24: Итальянский архитектор
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Marco Alessandro Rossi',
    'Marco',
    'Rossi',
    '+971501112009',
    'IT-P-2424242-1',
    'Italy',
    'resident',
    '1986-11-25'::date,
    '{"street": "Design District", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00024", "studio": "Rossi Design Studio, Loft 15"}',
    '{"position": "Senior Architect", "department": "Architecture", "company": "Foster + Partners Middle East", "start_date": "2019-04-01", "specialization": "Sustainable Architecture", "projects": ["Dubai Creek Tower", "Masdar City"]}',
    '{"monthly_income": 52000, "annual_income": 624000, "employment_status": "employed", "credit_score": 750, "debt_to_income": 0.28, "net_worth": 2800000, "liquid_assets": 950000, "investment_portfolio": 850000, "currency": "EUR"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "medium", "approval_probability": 0.84, "preferred_contact": "email", "languages": ["Italian", "English", "Arabic", "French"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/marco-rossi.jpg',
    '2025-10-30 09:00:00+04'
);

-- Клиент 25: Японский инженер
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Takeshi Yamamoto',
    'Takeshi',
    'Yamamoto',
    '+971501112010',
    'JP-P-2525252-1',
    'Japan',
    'resident',
    '1981-08-13'::date,
    '{"street": "Jumeirah Village Circle", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00025", "apartment": "JVC Apartments, 1BR-903"}',
    '{"position": "Chief Engineer", "department": "Infrastructure", "company": "JGC Corporation", "start_date": "2015-02-01", "specialization": "Petrochemical Plants", "certifications": ["P.Eng", "Project Management"]}',
    '{"monthly_income": 65000, "annual_income": 780000, "employment_status": "employed", "credit_score": 795, "debt_to_income": 0.20, "net_worth": 4200000, "liquid_assets": 1800000, "investment_portfolio": 1400000, "currency": "JPY"}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "low", "approval_probability": 0.91, "preferred_contact": "email", "languages": ["Japanese", "English", "Arabic"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/takeshi-yamamoto.jpg',
    '2025-10-30 08:45:00+04'
);

-- Клиент 26: Российский бизнесмен
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Aleksandr Volkov',
    'Aleksandr',
    'Volkov',
    '+971501112011',
    'RU-P-2626262-1',
    'Russia',
    'resident',
    '1977-03-07'::date,
    '{"street": "Marina Walk", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00026", "apartment": "Marina Heights, 4BR-PH1"}',
    '{"position": "CEO & Founder", "department": "Technology", "company": "VolkovTech Solutions", "start_date": "2012-01-01", "industry": "Software Development", "employees": 180, "annual_revenue": 25000000}',
    '{"monthly_income": 120000, "annual_income": 1440000, "employment_status": "business_owner", "credit_score": 850, "debt_to_income": 0.25, "net_worth": 28000000, "liquid_assets": 8500000, "investment_portfolio": 12000000, "currency": "USD"}',
    '{"client_category": "individual", "tier": "vip", "risk_profile": "medium", "approval_probability": 0.93, "preferred_contact": "whatsapp", "languages": ["Russian", "English", "Arabic"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/vip/aleksandr-volkov.jpg',
    '2025-10-30 10:30:00+04'
);

-- Клиент 27: Бразильский футболист
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Carlos Eduardo Santos',
    'Carlos',
    'Santos',
    '+971501112012',
    'BR-P-2727272-1',
    'Brazil',
    'resident',
    '1992-10-22'::date,
    '{"street": "Sports City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00027", "villa": "Sports City Villas, Villa 67"}',
    '{"position": "Professional Footballer", "department": "First Team", "company": "Al Ahli FC", "start_date": "2021-08-01", "position": "Midfielder", "previous_clubs": ["Santos FC", "Fluminense"], "national_team": "Brazil U-23"}',
    '{"monthly_income": 85000, "annual_income": 1020000, "employment_status": "employed", "credit_score": 720, "debt_to_income": 0.35, "net_worth": 5200000, "liquid_assets": 2100000, "investment_portfolio": 1800000, "currency": "USD"}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "medium", "approval_probability": 0.85, "preferred_contact": "phone", "languages": ["Portuguese", "English", "Arabic"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/carlos-santos.jpg',
    '2025-10-30 12:00:00+04'
);

-- Клиент 28: Китайский бизнесмен
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Li Wei Zhang',
    'Li Wei',
    'Zhang',
    '+971501112013',
    'CN-P-2828282-1',
    'China',
    'resident',
    '1985-06-11'::date,
    '{"street": "Business Bay", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00028", "office": "Bay Square, Office 1205"}',
    '{"position": "Regional Director", "department": "International Trade", "company": "China Construction Bank Middle East", "start_date": "2018-03-01", "trade_volume": 500000000, "clients": 150}',
    '{"monthly_income": 78000, "annual_income": 936000, "employment_status": "employed", "credit_score": 805, "debt_to_income": 0.22, "net_worth": 5200000, "liquid_assets": 2200000, "investment_portfolio": 1800000, "currency": "CNY"}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "low", "approval_probability": 0.90, "preferred_contact": "email", "languages": ["Mandarin", "English", "Arabic"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/li-wei-zhang.jpg',
    '2025-10-30 09:15:00+04'
);

-- Клиент 29: Нигерийский банкир
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Adunni Adeyemi',
    'Adunni',
    'Adeyemi',
    '+971501112014',
    'NG-P-2929292-1',
    'Nigeria',
    'resident',
    '1983-12-19'::date,
    '{"street": "Dubai Investment Park", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00029", "apartment": "DIP Villa, Villa 156"}',
    '{"position": "Head of Corporate Banking", "department": "Banking", "company": "First Bank of Nigeria Middle East", "start_date": "2017-07-01", "portfolio_value": 3200000000, "corporate_clients": 85}',
    '{"monthly_income": 68000, "annual_income": 816000, "employment_status": "employed", "credit_score": 785, "debt_to_income": 0.28, "net_worth": 4200000, "liquid_assets": 1600000, "investment_portfolio": 1400000, "currency": "USD"}',
    '{"client_category": "individual", "tier": "premium", "risk_profile": "medium", "approval_probability": 0.88, "preferred_contact": "phone", "languages": ["English", "Yoruba", "Arabic", "Hausa"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/premium/adunni-adeyemi.jpg',
    '2025-10-30 07:30:00+04'
);

-- Клиент 30: Лейборист из Великобритании
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Robert James Taylor',
    'Robert',
    'Taylor',
    '+971501112015',
    'UK-P-3030303-1',
    'United Kingdom',
    'resident',
    '1990-04-06'::date,
    '{"street": "Al Furjan", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00030", "villa": "Al Furjan West, Villa 289"}',
    '{"position": "Construction Project Manager", "department": "Construction", "company": "Al Nabooda Construction LLC", "start_date": "2020-09-01", "certifications": ["PMP", "PRINCE2", "LEED AP"], "projects_completed": 12}',
    '{"monthly_income": 28000, "annual_income": 336000, "employment_status": "employed", "credit_score": 695, "debt_to_income": 0.40, "net_worth": 850000, "liquid_assets": 350000, "investment_portfolio": 280000, "currency": "GBP"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "high", "approval_probability": 0.72, "preferred_contact": "phone", "languages": ["English", "Arabic"]}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/robert-taylor.jpg',
    '2025-10-30 06:45:00+04'
);

-- =====================================================================
-- 1.3 Молодые специалисты - 10 клиентов
-- =====================================================================

-- Клиент 31: Выпускник университета
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Мохаммед Аль-Амири',
    'Мохаммед',
    'Аль-Амири',
    '+971501113001',
    '784-1999-1234567-1',
    'UAE',
    'resident',
    '1999-05-18'::date,
    '{"street": "Al Nahda", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00031", "apartment": "Al Nahda Towers, 1BR-504"}',
    '{"position": "Junior Software Developer", "department": "Technology", "company": "Noon.com", "start_date": "2024-06-01", "education": "Computer Science, UAE University", "graduate_program": true}',
    '{"monthly_income": 12000, "annual_income": 144000, "employment_status": "employed", "credit_score": 680, "debt_to_income": 0.25, "net_worth": 85000, "liquid_assets": 25000, "student_loans": 45000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "high", "approval_probability": 0.65, "preferred_contact": "whatsapp", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/mohammed-alamiri.jpg',
    '2025-10-30 10:20:00+04'
);

-- Клиент 32: Молодой маркетолог
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Айша Аль-Шамси',
    'Айша',
    'Аль-Шамси',
    '+971501113002',
    '784-1998-2345678-1',
    'UAE',
    'resident',
    '1998-09-27'::date,
    '{"street": "JVT", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00032", "apartment": "JVT Studio Apartments, Studio 310"}',
    '{"position": "Marketing Executive", "department": "Digital Marketing", "company": "Ounass", "start_date": "2024-03-01", "education": "Marketing, American University of Sharjah", "certifications": ["Google Ads", "Facebook Blueprint"]}',
    '{"monthly_income": 15000, "annual_income": 180000, "employment_status": "employed", "credit_score": 710, "debt_to_income": 0.30, "net_worth": 120000, "liquid_assets": 45000, "student_loans": 25000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "medium", "approval_probability": 0.75, "preferred_contact": "whatsapp", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/aisha-alshamsi.jpg',
    '2025-10-30 09:30:00+04'
);

-- Клиент 33: Новая медсестра
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Фатима Аль-Кетби',
    'Фатима',
    'Аль-Кетби',
    '+971501113003',
    '784-1997-3456789-1',
    'UAE',
    'resident',
    '1997-11-14'::date,
    '{"street": "Al Qusais", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00033", "apartment": "Al Qusais Residential, 1BR-208"}',
    '{"position": "Staff Nurse", "department": "Emergency Department", "company": "Dubai Hospital", "start_date": "2024-08-01", "education": "Bachelor of Nursing, UAE Nursing College", "license": "DHA Nursing License"}',
    '{"monthly_income": 18000, "annual_income": 216000, "employment_status": "employed", "credit_score": 695, "debt_to_income": 0.35, "net_worth": 150000, "liquid_assets": 55000, "student_loans": 35000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "medium", "approval_probability": 0.78, "preferred_contact": "phone", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/fatima-alketbi.jpg',
    '2025-10-30 07:45:00+04'
);

-- Клиент 34: Молодой учитель
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Халид Аль-Балуши',
    'Халид',
    'Аль-Балуши',
    '+971501113004',
    '784-1999-4567890-1',
    'UAE',
    'resident',
    '1999-03-22'::date,
    '{"street": "Muhaisnah", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00034", "apartment": "Muhaisnah Apartments, 2BR-1503"}',
    '{"position": "Primary School Teacher", "department": "Grade 4", "company": "Dubai International School", "start_date": "2024-09-01", "education": "Education Degree, UAE University", "subjects": ["Mathematics", "Science"]}',
    '{"monthly_income": 14000, "annual_income": 168000, "employment_status": "employed", "credit_score": 670, "debt_to_income": 0.45, "net_worth": 95000, "liquid_assets": 35000, "student_loans": 55000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "high", "approval_probability": 0.68, "preferred_contact": "phone", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/khalid-albalushi.jpg',
    '2025-10-30 08:00:00+04'
);

-- Клиент 35: Стажер в банке
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Сара Аль-Мухайри',
    'Сара',
    'Аль-Мухайри',
    '+971501113005',
    '784-2000-5678901-1',
    'UAE',
    'resident',
    '2000-08-08'::date,
    '{"street": "Al Majaz", "city": "Sharjah", "state": "Sharjah", "country": "UAE", "postal_code": "00035", "apartment": "Al Majaz Tower, 1BR-805"}',
    '{"position": "Bank Trainee", "department": "Corporate Banking", "company": "Abu Dhabi Commercial Bank", "start_date": "2024-07-01", "education": "Finance, American University of Sharjah", "trainee_program": true}',
    '{"monthly_income": 10000, "annual_income": 120000, "employment_status": "employed", "credit_score": 650, "debt_to_income": 0.50, "net_worth": 65000, "liquid_assets": 20000, "student_loans": 40000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "high", "approval_probability": 0.60, "preferred_contact": "whatsapp", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/sara-almuhairi.jpg',
    '2025-10-30 09:15:00+04'
);

-- Клиент 36: Начинающий архитектор
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Юсуф Аль-Захра',
    'Юсуф',
    'Аль-Захра',
    '+971501113006',
    '784-1998-6789012-1',
    'UAE',
    'resident',
    '1998-12-30'::date,
    '{"street": "Karama", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00036", "apartment": "Karama Complex, Studio 402"}',
    '{"position": "Junior Architect", "department": "Design", "company": "ArchDX", "start_date": "2024-05-01", "education": "Architecture, UAE University", "portfolio": "5 small-scale projects"}',
    '{"monthly_income": 13000, "annual_income": 156000, "employment_status": "employed", "credit_score": 685, "debt_to_income": 0.40, "net_worth": 80000, "liquid_assets": 30000, "student_loans": 45000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "high", "approval_probability": 0.70, "preferred_contact": "email", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/youssef-alzahra.jpg',
    '2025-10-30 07:30:00+04'
);

-- Клиент 37: Молодой HR-специалист
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Нур Аль-Аззави',
    'Нур',
    'Аль-Аззави',
    '+971501113007',
    '784-1999-7890123-1',
    'UAE',
    'resident',
    '1999-06-17'::date,
    '{"street": "Discovery Gardens", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00037", "apartment": "Discovery Gardens Studio, Studio 250"}',
    '{"position": "HR Coordinator", "department": "Human Resources", "company": "Majid Al Futtaim", "start_date": "2024-04-01", "education": "Business Administration, UAE University", "specialization": "Recruitment"}',
    '{"monthly_income": 13500, "annual_income": 162000, "employment_status": "employed", "credit_score": 690, "debt_to_income": 0.35, "net_worth": 75000, "liquid_assets": 28000, "student_loans": 35000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "medium", "approval_probability": 0.73, "preferred_contact": "whatsapp", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/noor-alazzawi.jpg',
    '2025-10-30 10:45:00+04'
);

-- Клиент 38: Ассистент менеджера
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Абдулла Аль-Фаласи',
    'Абдулла',
    'Аль-Фаласи',
    '+971501113008',
    '784-1997-8901234-1',
    'UAE',
    'resident',
    '1997-01-25'::date,
    '{"street": "Al Barsha", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00038", "apartment": "Al Barsha Residency, 1BR-1205"}',
    '{"position": "Assistant Manager", "department": "Operations", "company": "Alshaya Group", "start_date": "2024-01-15", "education": "Business Management, Zayed University", "promotion_ready": true}',
    '{"monthly_income": 16000, "annual_income": 192000, "employment_status": "employed", "credit_score": 705, "debt_to_income": 0.32, "net_worth": 95000, "liquid_assets": 35000, "student_loans": 30000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "medium", "approval_probability": 0.76, "preferred_contact": "phone", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/abdullah-alfalasi.jpg',
    '2025-10-30 08:15:00+04'
);

-- Клиент 39: Начинающий дизайнер
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Майа Аль-Марук',
    'Майа',
    'Аль-Марук',
    '+971501113009',
    '784-2000-9012345-1',
    'UAE',
    'resident',
    '2000-04-11'::date,
    '{"street": "Motor City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00039", "apartment": "Motor City Apartments, Studio 809"}',
    '{"position": "Graphic Designer", "department": "Creative", "company": "Leo Burnett Middle East", "start_date": "2024-06-01", "education": "Graphic Design, Dubai Institute of Design", "portfolio_projects": 15}',
    '{"monthly_income": 11000, "annual_income": 132000, "employment_status": "employed", "credit_score": 660, "debt_to_income": 0.48, "net_worth": 55000, "liquid_assets": 18000, "student_loans": 42000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "high", "approval_probability": 0.62, "preferred_contact": "email", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/maya-almaruk.jpg',
    '2025-10-30 09:00:00+04'
);

-- Клиент 40: Ассистент в рекламном агентстве
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Рашид Аль-Кетби',
    'Рашид',
    'Аль-Кетби',
    '+971501113010',
    '784-1998-0123456-1',
    'UAE',
    'resident',
    '1998-07-29'::date,
    '{"street": "International City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00040", "apartment": "International City, 1BR-1805"}',
    '{"position": "Account Assistant", "department": "Client Services", "company": "FP7/McCann Dubai", "start_date": "2024-02-01", "education": "Marketing Communications, Dubai Media College", "clients_assigned": 3}',
    '{"monthly_income": 12500, "annual_income": 150000, "employment_status": "employed", "credit_score": 675, "debt_to_income": 0.38, "net_worth": 70000, "liquid_assets": 25000, "student_loans": 38000, "currency": "AED"}',
    '{"client_category": "individual", "tier": "standard", "risk_profile": "high", "approval_probability": 0.69, "preferred_contact": "whatsapp", "languages": ["Arabic", "English"], "first_time_buyer": true}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/standard/rashid-alketbi.jpg',
    '2025-10-30 11:30:00+04'
);

-- =====================================================================
-- ПРОДОЛЖЕНИЕ В СЛЕДУЮЩЕМ СООБЩЕНИИ
-- =====================================================================
-- =====================================================================
-- 2. МАЛЫЙ БИЗНЕС - 20 КЛИЕНТОВ
-- =====================================================================

-- =====================================================================
-- 2.1 Торговые компании - 8 клиентов
-- =====================================================================

-- Клиент 41: Торговля продуктами питания
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Ахмед Аль-Риши',
    'Ахмед',
    'Аль-Риши',
    '+971501114001',
    '784-1984-1234567-1',
    'UAE',
    'resident',
    '1984-11-22'::date,
    '{"street": "Al Ras", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00041", "shop": "Al Rishi Grocery Store, Shop 12"}',
    '{"position": "Владелец", "company": "Al Rishi Food Trading LLC", "business_type": "Food Distribution", "start_date": "2015-06-01", "employees": 12, "license_number": "CN-123456"}',
    '{"monthly_income": 35000, "annual_revenue": 420000, "employment_status": "business_owner", "credit_score": 720, "debt_to_income": 0.45, "net_worth": 2500000, "business_assets": 1800000, "inventory_value": 350000}',
    '{"client_category": "small_business", "business_name": "Al Rishi Food Trading LLC", "annual_revenue": 420000, "years_in_business": 10, "employees": 12, "risk_profile": "medium", "approval_probability": 0.82}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/business/ahmed-alrishi.jpg',
    '2025-10-30 10:15:00+04'
);

-- Клиент 42: Торговля электроникой
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Фатима Аль-Бадду',
    'Фатима',
    'Аль-Бадду',
    '+971501114002',
    '784-1986-2345678-1',
    'UAE',
    'resident',
    '1986-03-14'::date,
    '{"street": "Al Fahidi", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00042", "shop": "Baddu Electronics, Al Fahidi Street"}',
    '{"position": "Владелица", "company": "Baddu Electronics Trading", "business_type": "Electronics Retail", "start_date": "2018-09-01", "employees": 8, "license_number": "CN-234567"}',
    '{"monthly_income": 28000, "annual_revenue": 336000, "employment_status": "business_owner", "credit_score": 695, "debt_to_income": 0.40, "net_worth": 1800000, "business_assets": 1200000, "inventory_value": 280000}',
    '{"client_category": "small_business", "business_name": "Baddu Electronics Trading", "annual_revenue": 336000, "years_in_business": 7, "employees": 8, "risk_profile": "medium", "approval_probability": 0.78}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/business/fatima-albaddu.jpg',
    '2025-10-30 09:45:00+04'
);

-- Клиент 43: Торговля автозапчастями
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Юсуф Аль-Мухайри',
    'Юсуф',
    'Аль-Мухайри',
    '+971501114003',
    '784-1983-3456789-1',
    'UAE',
    'resident',
    '1983-08-07'::date,
    '{"street": "Al Quoz Industrial", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00043", "warehouse": "Al Muhairi Auto Parts, Warehouse 15B"}',
    '{"position": "Владелец", "company": "Al Muhairi Auto Parts LLC", "business_type": "Auto Parts Distribution", "start_date": "2012-03-01", "employees": 15, "license_number": "CN-345678"}',
    '{"monthly_income": 42000, "annual_revenue": 504000, "employment_status": "business_owner", "credit_score": 750, "debt_to_income": 0.35, "net_worth": 3200000, "business_assets": 2500000, "inventory_value": 580000}',
    '{"client_category": "small_business", "business_name": "Al Muhairi Auto Parts LLC", "annual_revenue": 504000, "years_in_business": 13, "employees": 15, "risk_profile": "low", "approval_probability": 0.88}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/business/youssef-almuhairi.jpg',
    '2025-10-30 08:30:00+04'
);

-- Клиент 44: Торговля текстилем
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Салим Аль-Кассими',
    'Салим',
    'Аль-Кассими',
    '+971501114004',
    '784-1987-4567890-1',
    'UAE',
    'resident',
    '1987-12-19'::date,
    '{"street": "Bur Dubai", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00044", "shop": "Kassimi Textiles, Shop 8-9"}',
    '{"position": "Владелец", "company": "Kassimi Textiles Trading", "business_type": "Textile Import/Export", "start_date": "2019-01-15", "employees": 6, "license_number": "CN-456789"}',
    '{"monthly_income": 22000, "annual_revenue": 264000, "employment_status": "business_owner", "credit_score": 680, "debt_to_income": 0.42, "net_worth": 1200000, "business_assets": 850000, "inventory_value": 180000}',
    '{"client_category": "small_business", "business_name": "Kassimi Textiles Trading", "annual_revenue": 264000, "years_in_business": 6, "employees": 6, "risk_profile": "medium", "approval_probability": 0.75}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/business/salim-alkassimi.jpg',
    '2025-10-30 11:00:00+04'
);

-- Клиент 45: Торговля косметикой
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Айша Аль-Захра',
    'Айша',
    'Аль-Захра',
    '+971501114005',
    '784-1989-5678901-1',
    'UAE',
    'resident',
    '1989-06-08'::date,
    '{"street": "Deira Gold Souk", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00045", "shop": "Al Zahra Beauty, Shop 24"}',
    '{"position": "Владелица", "company": "Al Zahra Beauty Products LLC", "business_type": "Beauty Products Retail", "start_date": "2020-03-01", "employees": 4, "license_number": "CN-567890"}',
    '{"monthly_income": 18000, "annual_revenue": 216000, "employment_status": "business_owner", "credit_score": 665, "debt_to_income": 0.38, "net_worth": 950000, "business_assets": 650000, "inventory_value": 120000}',
    '{"client_category": "small_business", "business_name": "Al Zahra Beauty Products LLC", "annual_revenue": 216000, "years_in_business": 5, "employees": 4, "risk_profile": "medium", "approval_probability": 0.72}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/business/aisha-alzahra.jpg',
    '2025-10-30 09:30:00+04'
);

-- Клиент 46: Торговля спорттоварами
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Халид Аль-Хатими',
    'Халид',
    'Аль-Хатими',
    '+971501114006',
    '784-1985-6789012-1',
    'UAE',
    'resident',
    '1985-10-30'::date,
    '{"street": "Al Karama", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00046", "shop": "Al Hatimi Sports, Shop 15"}',
    '{"position": "Владелец", "company": "Al Hatimi Sports Equipment Trading", "business_type": "Sports Equipment Retail", "start_date": "2017-08-01", "employees": 10, "license_number": "CN-678901"}',
    '{"monthly_income": 32000, "annual_revenue": 384000, "employment_status": "business_owner", "credit_score": 710, "debt_to_income": 0.40, "net_worth": 2100000, "business_assets": 1600000, "inventory_value": 320000}',
    '{"client_category": "small_business", "business_name": "Al Hatimi Sports Equipment Trading", "annual_revenue": 384000, "years_in_business": 8, "employees": 10, "risk_profile": "medium", "approval_probability": 0.80}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/business/khalid-alhatimi.jpg',
    '2025-10-30 07:45:00+04'
);

-- Клиент 47: Торговля игрушками
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Фатима Аль-Сувайди',
    'Фатима',
    'Аль-Сувайди',
    '+971501114007',
    '784-1991-7890123-1',
    'UAE',
    'resident',
    '1991-04-16'::date,
    '{"street": "Al Satwa", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00047", "shop": "Al Suwaidi Kids World, Shop 7"}',
    '{"position": "Владелица", "company": "Al Suwaidi Kids Toys LLC", "business_type": "Toys Retail", "start_date": "2021-11-01", "employees": 5, "license_number": "CN-789012"}',
    '{"monthly_income": 16000, "annual_revenue": 192000, "employment_status": "business_owner", "credit_score": 640, "debt_to_income": 0.45, "net_worth": 720000, "business_assets": 480000, "inventory_value": 95000}',
    '{"client_category": "small_business", "business_name": "Al Suwaidi Kids Toys LLC", "annual_revenue": 192000, "years_in_business": 4, "employees": 5, "risk_profile": "high", "approval_probability": 0.68}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/business/fatima-alsuwaidi.jpg',
    '2025-10-30 10:45:00+04'
);

-- Клиент 48: Торговля канцелярскими товарами
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Мохаммед Аль-Кетби',
    'Мохаммед',
    'Аль-Кетби',
    '+971501114008',
    '784-1988-8901234-1',
    'UAE',
    'resident',
    '1988-02-23'::date,
    '{"street": "Oud Metha", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00048", "shop": "Al Ketbi Office Supplies, Shop 11"}',
    '{"position": "Владелец", "company": "Al Ketbi Office Supplies Trading", "business_type": "Office Supplies B2B", "start_date": "2016-05-01", "employees": 7, "license_number": "CN-890123"}',
    '{"monthly_income": 26000, "annual_revenue": 312000, "employment_status": "business_owner", "credit_score": 700, "debt_to_income": 0.35, "net_worth": 1600000, "business_assets": 1150000, "inventory_value": 180000}',
    '{"client_category": "small_business", "business_name": "Al Ketbi Office Supplies Trading", "annual_revenue": 312000, "years_in_business": 9, "employees": 7, "risk_profile": "medium", "approval_probability": 0.79}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/business/mohammed-alketbi.jpg',
    '2025-10-30 08:15:00+04'
);

-- =====================================================================
-- 2.2 Сервисные компании - 7 клиентов
-- =====================================================================

-- Клиент 49: Автосервис
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Абдулла Аль-Мактум',
    'Абдулла',
    'Аль-Мактум',
    '+971501115001',
    '784-1982-9012345-1',
    'UAE',
    'resident',
    '1982-07-11'::date,
    '{"street": "Al Quoz Industrial", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00049", "workshop": "Al Maktoum Auto Service, Workshop 8"}',
    '{"position": "Владелец", "company": "Al Maktoum Auto Service LLC", "business_type": "Automotive Repair", "start_date": "2013-04-01", "employees": 14, "license_number": "SR-901234"}',
    '{"monthly_income": 38000, "annual_revenue": 456000, "employment_status": "business_owner", "credit_score": 735, "debt_to_income": 0.38, "net_worth": 2800000, "business_assets": 2200000, "equipment_value": 450000}',
    '{"client_category": "small_business", "business_name": "Al Maktoum Auto Service LLC", "annual_revenue": 456000, "years_in_business": 12, "employees": 14, "risk_profile": "low", "approval_probability": 0.85}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/service/abdullah-almaktoum.jpg',
    '2025-10-30 09:00:00+04'
);

-- Клиент 50: Салон красоты
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
    '+971501115002',
    '784-1987-0123456-1',
    'UAE',
    'resident',
    '1987-09-05'::date,
    '{"street": "Jumeirah", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00050", "salon": "Al Farasi Beauty Salon, Villa 45"}',
    '{"position": "Владелица", "company": "Al Farasi Beauty & Wellness", "business_type": "Beauty & Wellness", "start_date": "2019-02-01", "employees": 8, "license_number": "SR-012345"}',
    '{"monthly_income": 24000, "annual_revenue": 288000, "employment_status": "business_owner", "credit_score": 690, "debt_to_income": 0.35, "net_worth": 1500000, "business_assets": 1100000, "equipment_value": 280000}',
    '{"client_category": "small_business", "business_name": "Al Farasi Beauty & Wellness", "annual_revenue": 288000, "years_in_business": 6, "employees": 8, "risk_profile": "medium", "approval_probability": 0.77}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/service/noor-alfarasi.jpg',
    '2025-10-30 11:20:00+04'
);

-- Клиент 51: Клининговая служба
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Юсуф Аль-Муваллад',
    'Юсуф',
    'Аль-Муваллад',
    '+971501115003',
    '784-1985-1234567-1',
    'UAE',
    'resident',
    '1985-12-18'::date,
    '{"street": "Al Qusais", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00051", "office": "Al Muwallad Cleaning Services, Office 305"}',
    '{"position": "Владелец", "company": "Al Muwallad Cleaning Services LLC", "business_type": "Commercial Cleaning", "start_date": "2016-08-01", "employees": 35, "license_number": "SR-123456"}',
    '{"monthly_income": 45000, "annual_revenue": 540000, "employment_status": "business_owner", "credit_score": 755, "debt_to_income": 0.30, "net_worth": 4200000, "business_assets": 3500000, "equipment_value": 320000}',
    '{"client_category": "small_business", "business_name": "Al Muwallad Cleaning Services LLC", "annual_revenue": 540000, "years_in_business": 9, "employees": 35, "risk_profile": "low", "approval_probability": 0.87}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/service/youssef-almuwallad.jpg',
    '2025-10-30 08:45:00+04'
);

-- Клиент 52: IT-услуги
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Амина Аль-Джасми',
    'Амина',
    'Аль-Джасми',
    '+971501115004',
    '784-1990-2345678-1',
    'UAE',
    'resident',
    '1990-05-27'::date,
    '{"street": "Dubai Internet City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00052", "office": "Al Jasmi IT Solutions, Office 1807"}',
    '{"position": "CEO", "company": "Al Jasmi IT Solutions FZE", "business_type": "IT Services & Support", "start_date": "2018-10-01", "employees": 12, "license_number": "SR-234567"}',
    '{"monthly_income": 35000, "annual_revenue": 420000, "employment_status": "business_owner", "credit_score": 720, "debt_to_income": 0.32, "net_worth": 2200000, "business_assets": 1800000, "equipment_value": 150000}',
    '{"client_category": "small_business", "business_name": "Al Jasmi IT Solutions FZE", "annual_revenue": 420000, "years_in_business": 7, "employees": 12, "risk_profile": "low", "approval_probability": 0.83}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/service/amina-aljasmi.jpg',
    '2025-10-30 10:30:00+04'
);

-- Клиент 53: Логистические услуги
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
    '+971501115005',
    '784-1986-3456789-1',
    'UAE',
    'resident',
    '1986-01-14'::date,
    '{"street": "Jebel Ali", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00053", "warehouse": "Al Bahi Logistics, Warehouse 12"}',
    '{"position": "Владелец", "company": "Al Bahi Logistics LLC", "business_type": "Cargo & Logistics", "start_date": "2014-06-01", "employees": 18, "license_number": "SR-345678", "fleet_size": 8}',
    '{"monthly_income": 52000, "annual_revenue": 624000, "employment_status": "business_owner", "credit_score": 770, "debt_to_income": 0.40, "net_worth": 4800000, "business_assets": 4000000, "fleet_value": 1200000}',
    '{"client_category": "small_business", "business_name": "Al Bahi Logistics LLC", "annual_revenue": 624000, "years_in_business": 11, "employees": 18, "risk_profile": "medium", "approval_probability": 0.86}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/service/isa-albahi.jpg',
    '2025-10-30 07:20:00+04'
);

-- Клиент 54: Образовательные услуги
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Лулай Аль-Саеedi',
    'Лулай',
    'Аль-Саеedi',
    '+971501115006',
    '784-1988-4567890-1',
    'UAE',
    'resident',
    '1988-08-03'::date,
    '{"street": "Al Safa", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00054", "center": "Al Saeedi Learning Center, Villa 28"}',
    '{"position": "Директор", "company": "Al Saeedi Educational Services", "business_type": "Tutoring & Training", "start_date": "2020-01-15", "employees": 6, "license_number": "SR-456789", "students_enrolled": 85}',
    '{"monthly_income": 20000, "annual_revenue": 240000, "employment_status": "business_owner", "credit_score": 680, "debt_to_income": 0.35, "net_worth": 1100000, "business_assets": 850000, "equipment_value": 120000}',
    '{"client_category": "small_business", "business_name": "Al Saeedi Educational Services", "annual_revenue": 240000, "years_in_business": 5, "employees": 6, "risk_profile": "medium", "approval_probability": 0.74}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/service/loulay-alsaedi.jpg',
    '2025-10-30 09:15:00+04'
);

-- Клиент 55: Ветеринарные услуги
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
    '+971501115007',
    '784-1989-5678901-1',
    'UAE',
    'resident',
    '1989-11-29'::date,
    '{"street": "Arabian Ranches", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00055", "clinic": "Al Sabunchi Veterinary Clinic, Unit 5"}',
    '{"position": "Ветеринарный врач", "company": "Al Sabunchi Veterinary Services", "business_type": "Veterinary Care", "start_date": "2021-05-01", "employees": 4, "license_number": "SR-567890", "qualifications": ["DVM", "UAE Veterinary License"]}',
    '{"monthly_income": 28000, "annual_revenue": 336000, "employment_status": "business_owner", "credit_score": 710, "debt_to_income": 0.30, "net_worth": 1800000, "business_assets": 1400000, "equipment_value": 350000}',
    '{"client_category": "small_business", "business_name": "Al Sabunchi Veterinary Services", "annual_revenue": 336000, "years_in_business": 4, "employees": 4, "risk_profile": "medium", "approval_probability": 0.79}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/service/omar-alsabunchi.jpg',
    '2025-10-30 11:45:00+04'
);

-- =====================================================================
-- 2.3 Производственные - 5 клиентов
-- =====================================================================

-- Клиент 56: Пекарня
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
    '+971501116001',
    '784-1985-6789012-1',
    'UAE',
    'resident',
    '1985-03-07'::date,
    '{"street": "Al Ras", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00056", "bakery": "Al Haddid Bakery, Al Mina Road"}',
    '{"position": "Владелица", "company": "Al Haddid Bakery LLC", "business_type": "Food Manufacturing", "start_date": "2011-09-01", "employees": 22, "license_number": "MF-678901"}',
    '{"monthly_income": 48000, "annual_revenue": 576000, "employment_status": "business_owner", "credit_score": 745, "debt_to_income": 0.38, "net_worth": 4200000, "business_assets": 3600000, "equipment_value": 850000}',
    '{"client_category": "small_business", "business_name": "Al Haddid Bakery LLC", "annual_revenue": 576000, "years_in_business": 14, "employees": 22, "risk_profile": "low", "approval_probability": 0.84}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/manufacturing/maya-alhaddid.jpg',
    '2025-10-30 06:30:00+04'
);

-- Клиент 57: Производство строительных материалов
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
    '+971501116002',
    '784-1983-7890123-1',
    'UAE',
    'resident',
    '1983-06-25'::date,
    '{"street": "Al Quoz Industrial", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00057", "plant": "Al Nahyan Construction Materials, Factory 18"}',
    '{"position": "Владелец", "company": "Al Nahyan Construction Materials LLC", "business_type": "Construction Materials Manufacturing", "start_date": "2009-02-01", "employees": 45, "license_number": "MF-789012", "capacity": "5000 tons/month"}',
    '{"monthly_income": 65000, "annual_revenue": 780000, "employment_status": "business_owner", "credit_score": 795, "debt_to_income": 0.42, "net_worth": 8500000, "business_assets": 7500000, "equipment_value": 3200000}',
    '{"client_category": "small_business", "business_name": "Al Nahyan Construction Materials LLC", "annual_revenue": 780000, "years_in_business": 16, "employees": 45, "risk_profile": "medium", "approval_probability": 0.88}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/manufacturing/khalifa-alnahyan.jpg',
    '2025-10-30 07:15:00+04'
);

-- Клиент 58: Мебельная фабрика
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
    '+971501116003',
    '784-1987-8901234-1',
    'UAE',
    'resident',
    '1987-10-12'::date,
    '{"street": "Ras Al Khor", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00058", "factory": "Al Matruk Furniture Factory, Unit 25"}',
    '{"position": "Владелица", "company": "Al Matruk Custom Furniture LLC", "business_type": "Furniture Manufacturing", "start_date": "2015-06-01", "employees": 28, "license_number": "MF-890123", "specialization": "Custom Office Furniture"}',
    '{"monthly_income": 42000, "annual_revenue": 504000, "employment_status": "business_owner", "credit_score": 730, "debt_to_income": 0.35, "net_worth": 3200000, "business_assets": 2800000, "equipment_value": 1200000}',
    '{"client_category": "small_business", "business_name": "Al Matruk Custom Furniture LLC", "annual_revenue": 504000, "years_in_business": 10, "employees": 28, "risk_profile": "low", "approval_probability": 0.82}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/manufacturing/sara-almatruk.jpg',
    '2025-10-30 08:00:00+04'
);

-- Клиент 59: Упаковка
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Абдулла Аль-Хейри',
    'Абдулла',
    'Аль-Хейри',
    '+971501116004',
    '784-1984-9012345-1',
    'UAE',
    'resident',
    '1984-01-08'::date,
    '{"street": "Jebel Ali Industrial", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00059", "plant": "Al Heyari Packaging Solutions, Unit 42"}',
    '{"position": "Владелец", "company": "Al Heyari Packaging Solutions LLC", "business_type": "Packaging Manufacturing", "start_date": "2013-11-01", "employees": 32, "license_number": "MF-901234", "products": ["Plastic Packaging", "Cardboard Boxes"]}',
    '{"monthly_income": 55000, "annual_revenue": 660000, "employment_status": "business_owner", "credit_score": 765, "debt_to_income": 0.40, "net_worth": 5800000, "business_assets": 5000000, "equipment_value": 2800000}',
    '{"client_category": "small_business", "business_name": "Al Heyari Packaging Solutions LLC", "annual_revenue": 660000, "years_in_business": 12, "employees": 32, "risk_profile": "medium", "approval_probability": 0.85}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/manufacturing/abdullah-alheyari.jpg',
    '2025-10-30 09:45:00+04'
);

-- Клиент 60: Химическое производство
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Фатима Аль-Аззави',
    'Фатима',
    'Аль-Аззави',
    '+971501116005',
    '784-1986-0123456-1',
    'UAE',
    'resident',
    '1986-05-21'::date,
    '{"street": "Ras Al Khor Industrial", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00060", "plant": "Al Azzawi Chemical Manufacturing, Unit 67"}',
    '{"position": "Владелица", "company": "Al Azzawi Chemical Manufacturing LLC", "business_type": "Chemical Products Manufacturing", "start_date": "2018-03-01", "employees": 16, "license_number": "MF-012345", "certifications": ["ISO 9001", "Environmental Compliance"]}',
    '{"monthly_income": 38000, "annual_revenue": 456000, "employment_status": "business_owner", "credit_score": 710, "debt_to_income": 0.35, "net_worth": 2800000, "business_assets": 2400000, "equipment_value": 1800000}',
    '{"client_category": "small_business", "business_name": "Al Azzawi Chemical Manufacturing LLC", "annual_revenue": 456000, "years_in_business": 7, "employees": 16, "risk_profile": "medium", "approval_probability": 0.81}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/manufacturing/fatima-alazzawi.jpg',
    '2025-10-30 10:30:00+04'
);

-- =====================================================================
-- ПРОДОЛЖЕНИЕ В СЛЕДУЮЩЕМ СООБЩЕНИИ
-- =====================================================================
-- =====================================================================
-- 3. СРЕДНИЙ БИЗНЕС - 15 КЛИЕНТОВ
-- =====================================================================

-- =====================================================================
-- 3.1 Технологические компании - 5 клиентов
-- =====================================================================

-- Клиент 61: IT-решения для бизнеса
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Дэвид Джон Смит',
    'David John',
    'Smith',
    '+971501117001',
    'UK-P-4012345-1',
    'United Kingdom',
    'resident',
    '1982-12-15'::date,
    '{"street": "DIFC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00061", "office": "Emirates Towers, Level 25"}',
    '{"position": "CEO & Founder", "company": "TechForward Solutions Middle East", "business_type": "Enterprise Software Solutions", "start_date": "2010-03-01", "employees": 85, "license_number": "MED-401234"}',
    '{"monthly_income": 85000, "annual_revenue": 2400000, "employment_status": "business_owner", "credit_score": 820, "debt_to_income": 0.35, "net_worth": 15000000, "business_assets": 12000000, "revenue_growth": "15% annually"}',
    '{"client_category": "medium_business", "business_name": "TechForward Solutions Middle East", "annual_revenue": 2400000, "years_in_business": 15, "employees": 85, "risk_profile": "low", "approval_probability": 0.92}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/medium_business/david-smith.jpg',
    '2025-10-30 09:30:00+04'
);

-- Клиент 62: Кибербезопасность
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Алекс Томсон',
    'Alex',
    'Thompson',
    '+971501117002',
    'AU-P-4023456-1',
    'Australia',
    'resident',
    '1985-08-22'::date,
    '{"street": "Dubai Internet City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00062", "office": "Tech Hub Building, Floor 12"}',
    '{"position": "Managing Director", "company": "SecureNet Middle East", "business_type": "Cybersecurity Services", "start_date": "2015-07-01", "employees": 120, "license_number": "MED-402345", "certifications": ["ISO 27001", "SOC 2"]}',
    '{"monthly_income": 75000, "annual_revenue": 2100000, "employment_status": "business_owner", "credit_score": 810, "debt_to_income": 0.30, "net_worth": 12000000, "business_assets": 9500000, "annual_contracts": 45}',
    '{"client_category": "medium_business", "business_name": "SecureNet Middle East", "annual_revenue": 2100000, "years_in_business": 10, "employees": 120, "risk_profile": "low", "approval_probability": 0.90}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/medium_business/alex-thompson.jpg',
    '2025-10-30 08:45:00+04'
);

-- Клиент 63: Мобильные приложения
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Рикардо Фернандес',
    'Ricardo',
    'Fernandez',
    '+971501117003',
    'ES-P-4034567-1',
    'Spain',
    'resident',
    '1987-05-10'::date,
    '{"street": "Dubai Media City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00063", "office": "Media City Tower, Office 1803"}',
    '{"position": "Founder & CTO", "company": "AppVenture Studios", "business_type": "Mobile App Development", "start_date": "2018-01-01", "employees": 65, "license_number": "MED-403456", "apps_launched": 120}',
    '{"monthly_income": 62000, "annual_revenue": 1680000, "employment_status": "business_owner", "credit_score": 790, "debt_to_income": 0.38, "net_worth": 8500000, "business_assets": 6800000, "project_pipeline": "18 months"}',
    '{"client_category": "medium_business", "business_name": "AppVenture Studios", "annual_revenue": 1680000, "years_in_business": 7, "employees": 65, "risk_profile": "medium", "approval_probability": 0.85}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/medium_business/ricardo-fernandez.jpg',
    '2025-10-30 11:15:00+04'
);

-- Клиент 64: Data Science и AI
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Прийа Шарма',
    'Priya',
    'Sharma',
    '+971501117004',
    'IN-P-4045678-1',
    'India',
    'resident',
    '1984-09-14'::date,
    '{"street": "Knowledge Village", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00064", "office": "AI Research Center, Building A"}',
    '{"position": "CEO", "company": "DataMind Analytics FZE", "business_type": "AI & Data Science Consulting", "start_date": "2016-06-01", "employees": 45, "license_number": "MED-404567", "partnerships": ["Google", "Microsoft"]}',
    '{"monthly_income": 68000, "annual_revenue": 1950000, "employment_status": "business_owner", "credit_score": 805, "debt_to_income": 0.32, "net_worth": 9800000, "business_assets": 7800000, "research_projects": 25}',
    '{"client_category": "medium_business", "business_name": "DataMind Analytics FZE", "annual_revenue": 1950000, "years_in_business": 9, "employees": 45, "risk_profile": "low", "approval_probability": 0.88}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/medium_business/priya-sharma.jpg',
    '2025-10-30 10:00:00+04'
);

-- Клиент 65: E-commerce платформа
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Маркус Вайс',
    'Marcus',
    'Weiss',
    '+971501117005',
    'DE-P-4056789-1',
    'Germany',
    'resident',
    '1981-03-28'::date,
    '{"street": "Dubai South", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00065", "warehouse": "E-Commerce Hub, Unit 85"}',
    '{"position": "Founder & CEO", "company": "TradeHub Middle East", "business_type": "E-commerce Platform", "start_date": "2012-11-01", "employees": 95, "license_number": "MED-405678", "gmv": "250M AED annually"}',
    '{"monthly_income": 72000, "annual_revenue": 2200000, "employment_status": "business_owner", "credit_score": 825, "debt_to_income": 0.40, "net_worth": 13200000, "business_assets": 10500000, "active_merchants": 1500}',
    '{"client_category": "medium_business", "business_name": "TradeHub Middle East", "annual_revenue": 2200000, "years_in_business": 13, "employees": 95, "risk_profile": "medium", "approval_probability": 0.89}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/medium_business/marcus-weiss.jpg',
    '2025-10-30 07:30:00+04'
);

-- =====================================================================
-- 3.2 Консалтинговые услуги - 4 клиента
-- =====================================================================

-- Клиент 66: Управленческий консалтинг
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Сара Андерсон',
    'Sarah',
    'Anderson',
    '+971501118001',
    'US-P-5012345-1',
    'United States',
    'resident',
    '1983-11-05'::date,
    '{"street": "DIFC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00066", "office": "The Gate Village 9, Level 15"}',
    '{"position": "Managing Partner", "company": "Strategic Solutions MENA", "business_type": "Management Consulting", "start_date": "2014-09-01", "employees": 78, "license_number": "CONS-501234", "clients_served": 200}',
    '{"monthly_income": 78000, "annual_revenue": 2850000, "employment_status": "business_owner", "credit_score": 835, "debt_to_income": 0.28, "net_worth": 18500000, "business_assets": 15000000, "client_retention": "95%"}',
    '{"client_category": "medium_business", "business_name": "Strategic Solutions MENA", "annual_revenue": 2850000, "years_in_business": 11, "employees": 78, "risk_profile": "low", "approval_probability": 0.93}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/consulting/sarah-anderson.jpg',
    '2025-10-30 09:45:00+04'
);

-- Клиент 67: Финансовый консалтинг
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Мохаммед Аль-Захра',
    'Mohammed',
    'Al-Zahra',
    '+971501118002',
    '784-1985-5023456-1',
    'UAE',
    'resident',
    '1985-06-12'::date,
    '{"street": "Business Bay", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00067", "office": "Business Bay Tower, Suite 2005"}',
    '{"position": "Managing Director", "company": "Al Zahra Financial Advisory", "business_type": "Financial Advisory & Wealth Management", "start_date": "2017-04-01", "employees": 35, "license_number": "CONS-502345", "aum": "500M AED"}',
    '{"monthly_income": 85000, "annual_revenue": 3200000, "employment_status": "business_owner", "credit_score": 840, "debt_to_income": 0.25, "net_worth": 22000000, "business_assets": 18000000, "clients_wealth": 500000000}',
    '{"client_category": "medium_business", "business_name": "Al Zahra Financial Advisory", "annual_revenue": 3200000, "years_in_business": 8, "employees": 35, "risk_profile": "low", "approval_probability": 0.95}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/consulting/mohammed-alzahra.jpg',
    '2025-10-30 08:20:00+04'
);

-- Клиент 68: HR-консалтинг
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Линда Кларк',
    'Linda',
    'Clark',
    '+971501118003',
    'UK-P-5034567-1',
    'United Kingdom',
    'resident',
    '1986-02-20'::date,
    '{"street": "Downtown Dubai", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00068", "office": "Emaar Square, Office 2401"}',
    '{"position": "Founder & CEO", "company": "People First Consulting", "business_type": "Human Resources Consulting", "start_date": "2018-08-01", "employees": 42, "license_number": "CONS-503456", "specialization": "Executive Search & Leadership Development"}',
    '{"monthly_income": 65000, "annual_revenue": 1800000, "employment_status": "business_owner", "credit_score": 795, "debt_to_income": 0.32, "net_worth": 9500000, "business_assets": 7500000, "placements_annually": 150}',
    '{"client_category": "medium_business", "business_name": "People First Consulting", "annual_revenue": 1800000, "years_in_business": 7, "employees": 42, "risk_profile": "low", "approval_probability": 0.87}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/consulting/linda-clark.jpg',
    '2025-10-30 10:30:00+04'
);

-- Клиент 69: Маркетинговый консалтинг
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Карлос Рамирез',
    'Carlos',
    'Ramirez',
    '+971501118004',
    'MX-P-5045678-1',
    'Mexico',
    'resident',
    '1984-08-18'::date,
    '{"street": "Dubai Media City", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00069", "office": "Media City Tower, Office 1207"}',
    '{"position": "Managing Partner", "company": "Brand Dynamics MENA", "business_type": "Brand Strategy & Digital Marketing", "start_date": "2016-02-01", "employees": 55, "license_number": "CONS-504567", "campaigns_managed": 300}',
    '{"monthly_income": 58000, "annual_revenue": 1650000, "employment_status": "business_owner", "credit_score": 775, "debt_to_income": 0.35, "net_worth": 7800000, "business_assets": 6200000, "client_portfolio": 85}',
    '{"client_category": "medium_business", "business_name": "Brand Dynamics MENA", "annual_revenue": 1650000, "years_in_business": 9, "employees": 55, "risk_profile": "medium", "approval_probability": 0.84}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/consulting/carlos-ramirez.jpg',
    '2025-10-30 11:00:00+04'
);

-- =====================================================================
-- 3.3 Логистика и транспорт - 3 клиента
-- =====================================================================

-- Клиент 70: Международная логистика
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Франц Мюллер',
    'Franz',
    'Mueller',
    '+971501119001',
    'DE-P-6012345-1',
    'Germany',
    'resident',
    '1980-04-16'::date,
    '{"street": "Jebel Ali Free Zone", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00070", "warehouse": "JAFZA South, Warehouse Complex A"}',
    '{"position": "General Manager", "company": "Global Freight Solutions LLC", "business_type": "International Freight & Logistics", "start_date": "2011-08-01", "employees": 180, "license_number": "LOG-601234", "fleet_size": 25, "warehouses": 3}',
    '{"monthly_income": 95000, "annual_revenue": 4200000, "employment_status": "business_owner", "credit_score": 820, "debt_to_income": 0.38, "net_worth": 28000000, "business_assets": 24000000, "shipments_monthly": 850}',
    '{"client_category": "medium_business", "business_name": "Global Freight Solutions LLC", "annual_revenue": 4200000, "years_in_business": 14, "employees": 180, "risk_profile": "medium", "approval_probability": 0.91}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/logistics/franz-mueller.jpg',
    '2025-10-30 07:45:00+04'
);

-- Клиент 71: Авиаперевозки
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Рахим Ахмед Хан',
    'Rahim Ahmed',
    'Khan',
    '+971501119002',
    'PK-P-6023456-1',
    'Pakistan',
    'resident',
    '1982-12-30'::date,
    '{"street": "Dubai International Airport", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00071", "hangar": "Airport Cargo Complex, Hangar 15"}',
    '{"position": "CEO", "company": "SkyCargo Express Middle East", "business_type": "Air Freight Services", "start_date": "2013-05-01", "employees": 125, "license_number": "LOG-602345", "aircraft_leased": 8, "destinations": 45}',
    '{"monthly_income": 88000, "annual_revenue": 3800000, "employment_status": "business_owner", "credit_score": 805, "debt_to_income": 0.42, "net_worth": 25000000, "business_assets": 21000000, "cargo_volume": "12,000 tons/month"}',
    '{"client_category": "medium_business", "business_name": "SkyCargo Express Middle East", "annual_revenue": 3800000, "years_in_business": 12, "employees": 125, "risk_profile": "medium", "approval_probability": 0.88}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/logistics/rahim-khan.jpg',
    '2025-10-30 09:15:00+04'
);

-- Клиент 72: Транспортная компания
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Сергей Петров',
    'Sergey',
    'Petrov',
    '+971501119003',
    'RU-P-6034567-1',
    'Russia',
    'resident',
    '1986-07-11'::date,
    '{"street": "Al Quoz Industrial", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00072", "fleet_center": "Al Quoz Fleet Center, Depot 5"}',
    '{"position": "Владелец", "company": "TransPro Logistics FZE", "business_type": "Road Transportation Services", "start_date": "2019-02-01", "employees": 95, "license_number": "LOG-603456", "fleet_size": 65, "routes": 120}',
    '{"monthly_income": 72000, "annual_revenue": 2400000, "employment_status": "business_owner", "credit_score": 780, "debt_to_income": 0.40, "net_worth": 15800000, "business_assets": 13000000, "fuel_efficiency": "8.5L/100km"}',
    '{"client_category": "medium_business", "business_name": "TransPro Logistics FZE", "annual_revenue": 2400000, "years_in_business": 6, "employees": 95, "risk_profile": "medium", "approval_probability": 0.85}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/logistics/sergey-petrov.jpg',
    '2025-10-30 08:30:00+04'
);

-- =====================================================================
-- 3.4 Строительство - 3 клиента
-- =====================================================================

-- Клиент 73: Генеральный подрядчик
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Ахмед Аль-Сувайди',
    'Ahmed',
    'Al-Suwaidi',
    '+971501120001',
    '784-1979-7012345-1',
    'UAE',
    'resident',
    '1979-01-23'::date,
    '{"street": "Al Quoz Industrial", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00073", "office": "Construction Tower, Floor 10"}',
    '{"position": "Chairman", "company": "Al Suwaidi General Contracting", "business_type": "General Construction", "start_date": "2008-04-01", "employees": 250, "license_number": "CONST-701234", "projects_completed": 150, "current_projects": 12}',
    '{"monthly_income": 120000, "annual_revenue": 6500000, "employment_status": "business_owner", "credit_score": 850, "debt_to_income": 0.35, "net_worth": 45000000, "business_assets": 38000000, "project_value": 120000000}',
    '{"client_category": "medium_business", "business_name": "Al Suwaidi General Contracting", "annual_revenue": 6500000, "years_in_business": 17, "employees": 250, "risk_profile": "low", "approval_probability": 0.94}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/construction/ahmed-alsuwaidi.jpg',
    '2025-10-30 07:00:00+04'
);

-- Клиент 74: Специализированное строительство
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Юсуф Аль-Музафар',
    'Youssef',
    'Al-Muzafar',
    '+971501120002',
    '784-1982-7023456-1',
    'UAE',
    'resident',
    '1982-09-17'::date,
    '{"street": "Business Bay", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00074", "office": "Business Bay Square, Office 1805"}',
    '{"position": "Managing Director", "company": "Al Muzafar MEP Contractors", "business_type": "MEP (Mechanical, Electrical, Plumbing)", "start_date": "2015-11-01", "employees": 180, "license_number": "CONST-702345", "specialization": "Commercial & Industrial Projects"}',
    '{"monthly_income": 88000, "annual_revenue": 4200000, "employment_status": "business_owner", "credit_score": 815, "debt_to_income": 0.38, "net_worth": 28000000, "business_assets": 23000000, "projects_value": 85000000}',
    '{"client_category": "medium_business", "business_name": "Al Muzafar MEP Contractors", "annual_revenue": 4200000, "years_in_business": 10, "employees": 180, "risk_profile": "low", "approval_probability": 0.90}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/construction/youssef-almuzafar.jpg',
    '2025-10-30 08:45:00+04'
);

-- Клиент 75: Архитектурно-строительная компания
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Майа Аль-Бахи',
    'Maya',
    'Al-Bahi',
    '+971501120003',
    '784-1987-7034567-1',
    'UAE',
    'resident',
    '1987-05-09'::date,
    '{"street": "Design District", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00075", "studio": "d3 Building, Studio 8-12"}',
    '{"position": "Principal Architect", "company": "Al Bahi Design & Construction", "business_type": "Architecture & Construction", "start_date": "2017-06-01", "employees": 75, "license_number": "CONST-703456", "awards": ["LEED Gold", "Arab Architecture Award"]}',
    '{"monthly_income": 75000, "annual_revenue": 2800000, "employment_status": "business_owner", "credit_score": 800, "debt_to_income": 0.32, "net_worth": 18000000, "business_assets": 15000000, "design_projects": 85}',
    '{"client_category": "medium_business", "business_name": "Al Bahi Design & Construction", "annual_revenue": 2800000, "years_in_business": 8, "employees": 75, "risk_profile": "low", "approval_probability": 0.88}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/construction/maya-albahi.jpg',
    '2025-10-30 10:15:00+04'
);

-- =====================================================================
-- 4. КРУПНЫЕ КОРПОРАЦИИ - 10 КЛИЕНТОВ
-- =====================================================================

-- =====================================================================
-- 4.1 Международные компании - 4 клиента
-- =====================================================================

-- Клиент 76: Многонациональная технологическая корпорация
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Роберт Тейлор',
    'Robert',
    'Taylor',
    '+971501121001',
    'US-P-8012345-1',
    'United States',
    'resident',
    '1978-08-14'::date,
    '{"street": "Dubai International Financial Centre", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00076", "office": "Emirates Towers, Level 45-50"}',
    '{"position": "Regional President Middle East & Africa", "company": "TechCorp International Inc.", "business_type": "Technology & Software Solutions", "start_date": "2016-01-01", "employees": 450, "license_number": "CORP-801234", "subsidiaries": 8}',
    '{"monthly_income": 180000, "annual_revenue": 25000000, "employment_status": "corporate_executive", "credit_score": 880, "debt_to_income": 0.20, "net_worth": 85000000, "corporate_assets": 200000000, "regional_revenue": "450M USD"}',
    '{"client_category": "large_corporation", "business_name": "TechCorp International Inc. - MENA", "annual_revenue": 25000000, "years_in_uae": 9, "employees": 450, "risk_profile": "minimal", "approval_probability": 0.98}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/corporate/robert-taylor.jpg',
    '2025-10-30 09:00:00+04'
);

-- Клиент 77: Международная консалтинговая компания
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Элизабет Мёрфи',
    'Elizabeth',
    'Murphy',
    '+971501121002',
    'IE-P-8023456-1',
    'Ireland',
    'resident',
    '1980-03-22'::date,
    '{"street": "DIFC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00077", "office": "The Gate Village 2, Levels 10-15"}',
    '{"position": "Managing Partner MENA", "company": "Global Advisory Partners LLP", "business_type": "Management Consulting", "start_date": "2014-09-01", "employees": 320, "license_number": "CORP-802345", "offices": 5, "clients": 200}',
    '{"monthly_income": 150000, "annual_revenue": 18500000, "employment_status": "corporate_executive", "credit_score": 865, "debt_to_income": 0.18, "net_worth": 68000000, "corporate_assets": 150000000, "annual_fee_revenue": "380M USD"}',
    '{"client_category": "large_corporation", "business_name": "Global Advisory Partners LLP - MENA", "annual_revenue": 18500000, "years_in_uae": 11, "employees": 320, "risk_profile": "minimal", "approval_probability": 0.97}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/corporate/elizabeth-murphy.jpg',
    '2025-10-30 08:30:00+04'
);

-- Клиент 78: Глобальная производственная корпорация
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Ханс Вебер',
    'Hans',
    'Weber',
    '+971501121003',
    'DE-P-8034567-1',
    'Germany',
    'resident',
    '1975-12-05'::date,
    '{"street": "Jebel Ali Industrial", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00078", "plant": "Weber Manufacturing Complex, Industrial Zone 2"}',
    '{"position": "CEO Middle East Operations", "company": "Weber Industries AG", "business_type": "Manufacturing & Industrial Solutions", "start_date": "2012-05-01", "employees": 680, "license_number": "CORP-803456", "production_facilities": 3, "export_markets": 25}',
    '{"monthly_income": 165000, "annual_revenue": 32000000, "employment_status": "corporate_executive", "credit_score": 890, "debt_to_income": 0.15, "net_worth": 95000000, "corporate_assets": 280000000, "production_capacity": "50K units/month"}',
    '{"client_category": "large_corporation", "business_name": "Weber Industries AG - MENA", "annual_revenue": 32000000, "years_in_uae": 13, "employees": 680, "risk_profile": "minimal", "approval_probability": 0.99}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/corporate/hans-weber.jpg',
    '2025-10-30 07:15:00+04'
);

-- Клиент 79: Международная финансовая группа
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Анна Ларссон',
    'Anna',
    'Larsson',
    '+971501121004',
    'SE-P-8045678-1',
    'Sweden',
    'resident',
    '1983-06-18'::date,
    '{"street": "DIFC", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00079", "office": "DIFC Square, Levels 20-25"}',
    '{"position": "Regional Head of Corporate Banking", "company": "Nordic Banking Group", "business_type": "Banking & Financial Services", "start_date": "2018-03-01", "employees": 280, "license_number": "CORP-804567", "clients": 500, "assets_under_management": "15B USD"}',
    '{"monthly_income": 140000, "annual_revenue": 15800000, "employment_status": "corporate_executive", "credit_score": 875, "debt_to_income": 0.12, "net_worth": 72000000, "corporate_assets": 1200000000, "loan_portfolio": "2.8B USD"}',
    '{"client_category": "large_corporation", "business_name": "Nordic Banking Group - MENA", "annual_revenue": 15800000, "years_in_uae": 7, "employees": 280, "risk_profile": "minimal", "approval_probability": 0.98}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/corporate/anna-larsson.jpg',
    '2025-10-30 10:45:00+04'
);

-- =====================================================================
-- 4.2 Крупные местные корпорации - 3 клиента
-- =====================================================================

-- Клиент 80: Крупная местная инвестиционная группа
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Шейх Салман Аль-Мактум',
    'Salman',
    'Al-Maktoum',
    '+971501122001',
    '784-1975-9001234-1',
    'UAE',
    'citizen',
    '1975-11-10'::date,
    '{"street": "Al Safa Palace District", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00080", "tower": "Maktoum Tower, Penthouse Office"}',
    '{"position": "Chairman & Managing Director", "company": "Al Maktoum Investment Group", "business_type": "Investment & Diversified Holdings", "start_date": "2005-01-01", "employees": 1200, "license_number": "CORP-900123", "portfolio_companies": 45, "industries": ["Real Estate", "Hospitality", "Technology", "Energy"]}',
    '{"monthly_income": 250000, "annual_revenue": 75000000, "employment_status": "corporate_executive", "credit_score": 920, "debt_to_income": 0.08, "net_worth": 500000000, "corporate_assets": 2000000000, "portfolio_value": "15B AED"}',
    '{"client_category": "large_corporation", "business_name": "Al Maktoum Investment Group", "annual_revenue": 75000000, "years_in_business": 20, "employees": 1200, "risk_profile": "minimal", "approval_probability": 0.999}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/corporate/salman-almaktoum.jpg',
    '2025-10-30 11:30:00+04'
);

-- Клиент 81: Крупная местная строительная корпорация
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Шейх Ахмед Аль-Нахайyan',
    'Ahmed',
    'Al-Nahyan',
    '+971501122002',
    '784-1972-9012345-1',
    'UAE',
    'citizen',
    '1972-04-28'::date,
    '{"street": "Abu Dhabi Capital District", "city": "Abu Dhabi", "state": "Abu Dhabi", "country": "UAE", "postal_code": "00081", "headquarters": "Nahyan Building, Executive Floor"}',
    '{"position": "CEO", "company": "Nahyan Construction Corporation", "business_type": "Infrastructure & Construction", "start_date": "2008-06-01", "employees": 2500, "license_number": "CORP-901234", "projects": 150, "ongoing_projects": 25, "completed_value": "25B AED"}',
    '{"monthly_income": 200000, "annual_revenue": 55000000, "employment_status": "corporate_executive", "credit_score": 900, "debt_to_income": 0.10, "net_worth": 350000000, "corporate_assets": 1200000000, "order_book": "8B AED"}',
    '{"client_category": "large_corporation", "business_name": "Nahyan Construction Corporation", "annual_revenue": 55000000, "years_in_business": 17, "employees": 2500, "risk_profile": "minimal", "approval_probability": 0.995}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/corporate/ahmed-alnahyan.jpg',
    '2025-10-30 08:00:00+04'
);

-- Клиент 82: Крупная местная торговая группа
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Шейха Фатима Аль-Баварди',
    'Fatima',
    'Al-Bawardi',
    '+971501122003',
    '784-1978-9023456-1',
    'UAE',
    'citizen',
    '1978-09-16'::date,
    '{"street": "Business Bay", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00082", "headquarters": "Bawardi Tower, Executive Offices"}',
    '{"position": "Managing Director", "company": "Bawardi Trading Group", "business_type": "Import, Export & Distribution", "start_date": "2010-03-01", "employees": 850, "license_number": "CORP-902345", "brands": 180, "distribution_centers": 12, "retail_outlets": 65}',
    '{"monthly_income": 180000, "annual_revenue": 42000000, "employment_status": "corporate_executive", "credit_score": 885, "debt_to_income": 0.12, "net_worth": 280000000, "corporate_assets": 850000000, "annual_turnover": "2.8B AED"}',
    '{"client_category": "large_corporation", "business_name": "Bawardi Trading Group", "annual_revenue": 42000000, "years_in_business": 15, "employees": 850, "risk_profile": "minimal", "approval_probability": 0.99}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/corporate/fatima-albawardi.jpg',
    '2025-10-30 09:45:00+04'
);

-- =====================================================================
-- 4.3 Государственные структуры - 3 клиента
-- =====================================================================

-- Клиент 83: Министерство энергетики
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Сухейль Аль-Аззави',
    'Suheil',
    'Al-Azzawi',
    '+971501123001',
    '784-1980-1001234-1',
    'UAE',
    'citizen',
    '1980-02-14'::date,
    '{"street": "Al Markaziyah", "city": "Abu Dhabi", "state": "Abu Dhabi", "country": "UAE", "postal_code": "00083", "ministry": "Ministry of Energy and Industry, Cabinet Affairs"}',
    '{"position": "Deputy Minister of Energy", "department": "Oil & Gas Affairs", "company": "UAE Ministry of Energy and Industry", "start_date": "2015-08-01", "department_staff": 250, "budget_managed": "50B AED annually"}',
    '{"monthly_income": 95000, "annual_budget": 50000000000, "employment_status": "government_official", "credit_score": 850, "debt_to_income": 0.05, "net_worth": 25000000, "government_pension": 4500000, "allowances": 1200000}',
    '{"client_category": "government_entity", "business_name": "UAE Ministry of Energy and Industry", "annual_budget": 50000000000, "years_in_government": 10, "employees": 250, "risk_profile": "minimal", "approval_probability": 0.99}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/government/suheil-alazzawi.jpg',
    '2025-10-30 10:20:00+04'
);

-- Клиент 84: Агентство по развитию инфраструктуры
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Халида Аль-Хатими',
    'Khalida',
    'Al-Hatimi',
    '+971501123002',
    '784-1976-1012345-1',
    'UAE',
    'citizen',
    '1976-07-09'::date,
    '{"street": "Dubai World Trade Centre", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00084", "agency": "Dubai Infrastructure Development Agency"}',
    '{"position": "Director General", "company": "Dubai Infrastructure Development Agency", "start_date": "2017-04-01", "employees": 450, "projects_managed": 85, "budget": "15B AED", "portfolio_value": "45B AED"}',
    '{"monthly_income": 85000, "annual_budget": 15000000000, "employment_status": "government_official", "credit_score": 840, "debt_to_income": 0.08, "net_worth": 32000000, "government_pension": 5200000, "allowances": 1800000}',
    '{"client_category": "government_entity", "business_name": "Dubai Infrastructure Development Agency", "annual_budget": 15000000000, "years_in_government": 8, "employees": 450, "risk_profile": "minimal", "approval_probability": 0.99}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/government/khalida-alhatimi.jpg',
    '2025-10-30 08:45:00+04'
);

-- Клиент 85: Образовательное агентство
INSERT INTO profiles (
    id, user_id, status, full_name, first_name, last_name, phone, emirates_id,
    nationality, residency_status, date_of_birth, address, employment_info,
    financial_profile, metadata, timezone, avatar_url, last_login_at
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(),
    'active',
    'Мохаммед Аль-Муваллад',
    'Mohammed',
    'Al-Muwallad',
    '+971501123003',
    '784-1979-1023456-1',
    'UAE',
    'citizen',
    '1979-12-03'::date,
    '{"street": "Knowledge Village", "city": "Dubai", "state": "Dubai", "country": "UAE", "postal_code": "00085", "authority": "Dubai Knowledge and Human Development Authority"}',
    '{"position": "Executive Director", "company": "Dubai Knowledge and Human Development Authority", "start_date": "2019-01-01", "employees": 380, "institutions_licensed": 650, "students_enrolled": 350000, "budget": "8B AED"}',
    '{"monthly_income": 78000, "annual_budget": 8000000000, "employment_status": "government_official", "credit_score": 830, "debt_to_income": 0.10, "net_worth": 28000000, "government_pension": 4800000, "allowances": 1500000}',
    '{"client_category": "government_entity", "business_name": "Dubai Knowledge and Human Development Authority", "annual_budget": 8000000000, "years_in_government": 6, "employees": 380, "risk_profile": "minimal", "approval_probability": 0.99}',
    'Asia/Dubai',
    'https://avatar.fastlease.dev/government/mohammed-almuwallad.jpg',
    '2025-10-30 11:15:00+04'
);

-- =====================================================================
-- ПРИВЯЗКА РОЛЕЙ КЛИЕНТОВ
-- =====================================================================

-- Привязка всех клиентов к роли CLIENT
INSERT INTO user_roles (user_id, role, assigned_by, metadata)
SELECT 
    p.user_id,
    'CLIENT',
    (SELECT user_id FROM profiles WHERE full_name = 'Ахмед Аль-Мансури' LIMIT 1),
    '{"source": "mock_data", "created_date": "2025-10-30", "auto_assigned": true}'
FROM profiles p
WHERE p.metadata->>'client_category' IS NOT NULL;