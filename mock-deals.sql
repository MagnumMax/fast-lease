-- =====================================================================
-- МОКОВЫЕ ДАННЫЕ ПО СДЕЛКАМ И ЗАЯВКАМ FASTLEASE
-- =====================================================================
-- Создано: 2025-10-30
-- Описание: Реалистичные лизинговые сделки с полным жизненным циклом
-- Содержит: Заявки (150), Сделки (80), Документы, Платежи, Процессы одобрения
-- =====================================================================

-- =====================================================================
-- 1. ЗАЯВКИ НА ЛИЗИНГ (APPLICATIONS) - 150 заявок
-- =====================================================================

-- Функция для генерации номеров заявок
-- Номера: APP-2025-0001 до APP-2025-0150

-- =====================================================================
-- 1.1 ОДОБРЕННЫЕ ЗАЯВКИ - 80 заявок (53%)
-- =====================================================================

-- Заявки 1-80: Одобренные заявки (будут преобразованы в сделки)

INSERT INTO applications (
    id, application_number, user_id, vehicle_id, status, requested_amount,
    term_months, down_payment, monthly_payment, interest_rate,
    personal_info, financial_info, employment_info, references_info,
    scoring_results, risk_assessment, assigned_to, submitted_at, approved_at
) VALUES 
-- Заявка 1: BMW X7 для корпоративного покупателя
(
    gen_random_uuid(),
    'APP-2025-0001',
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'large_corporation' LIMIT 1 OFFSET 0),
    (SELECT id FROM vehicles WHERE make = 'BMW' AND model = 'X7' LIMIT 1),
    'approved',
    450000.00,
    36,
    90000.00,
    11500.00,
    0.0650,
    '{"full_name": "Шейх Салман Аль-Мактум", "emirates_id": "784-1975-9001234-1", "date_of_birth": "1975-11-10", "nationality": "UAE"}',
    '{"monthly_income": 250000, "net_worth": 500000000, "credit_score": 920, "debt_to_income": 0.08, "liquid_assets": 50000000}',
    '{"position": "Chairman & Managing Director", "company": "Al Maktoum Investment Group", "years_employed": 20, "employment_type": "executive"}',
    '{"bank_reference": "Emirates NBD - счет 001-234567-001", "credit_references": 3, "business_references": 2}',
    '{"score": 950, "grade": "AAA", "approval_probability": 0.99, "automated_decision": true, "credit_model": "corporate_v3"}',
    '{"risk_level": "minimal", "default_probability": 0.001, "recommended_term": 36, "max_approved_amount": 750000}',
    (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук' LIMIT 1),
    '2025-09-15 10:30:00+04'::timestamptz,
    '2025-09-16 14:15:00+04'::timestamptz
),
-- Заявка 2: Tesla Model S для частного лица
(
    gen_random_uuid(),
    'APP-2025-0002',
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'individual' LIMIT 1 OFFSET 0),
    (SELECT id FROM vehicles WHERE make = 'Tesla' AND model = 'Model S' LIMIT 1),
    'approved',
    180000.00,
    24,
    36000.00,
    6500.00,
    0.0520,
    '{"full_name": "Ахмед Аль-Хатими", "emirates_id": "784-1990-5678901-1", "date_of_birth": "1990-08-22", "nationality": "UAE"}',
    '{"monthly_income": 15000, "net_worth": 800000, "credit_score": 720, "debt_to_income": 0.25, "liquid_assets": 45000}',
    '{"position": "Менеджер по продажам", "company": "Emirates Group", "years_employed": 3, "employment_type": "salaried"}',
    '{"bank_reference": "ADCB - счет 002-345678-001", "credit_references": 2, "employment_verified": true}',
    '{"score": 735, "grade": "A+", "approval_probability": 0.87, "automated_decision": true, "credit_model": "individual_v2"}',
    '{"risk_level": "low", "default_probability": 0.015, "recommended_term": 24, "max_approved_amount": 200000}',
    (SELECT user_id FROM profiles WHERE full_name = 'Халид Аль-Хашими' LIMIT 1),
    '2025-09-18 09:45:00+04'::timestamptz,
    '2025-09-19 11:20:00+04'::timestamptz
),
-- Заявка 3: Mercedes-Benz GLS для среднего бизнеса
(
    gen_random_uuid(),
    'APP-2025-0003',
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'medium_business' LIMIT 1 OFFSET 0),
    (SELECT id FROM vehicles WHERE make = 'Mercedes-Benz' AND model = 'GLS' LIMIT 1),
    'approved',
    380000.00,
    48,
    76000.00,
    7500.00,
    0.0580,
    '{"full_name": "Дэвид Джон Смит", "emirates_id": "UK-P-4012345-1", "date_of_birth": "1982-12-15", "nationality": "United Kingdom"}',
    '{"monthly_income": 85000, "net_worth": 15000000, "credit_score": 820, "debt_to_income": 0.35, "business_revenue": 2400000}',
    '{"position": "CEO & Founder", "company": "TechForward Solutions Middle East", "years_employed": 15, "employment_type": "business_owner"}',
    '{"bank_reference": "HSBC - счет 003-456789-001", "business_bank": "Emirates NBD", "credit_references": 3, "business_years": 15}',
    '{"score": 810, "grade": "AA", "approval_probability": 0.92, "automated_decision": true, "credit_model": "business_v3"}',
    '{"risk_level": "low", "default_probability": 0.008, "recommended_term": 48, "max_approved_amount": 450000}',
    (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук' LIMIT 1),
    '2025-09-20 14:20:00+04'::timestamptz,
    '2025-09-21 16:45:00+04'::timestamptz
),
-- Заявка 4: Audi Q8 для индивидуального предпринимателя
(
    gen_random_uuid(),
    'APP-2025-0004',
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'small_business' LIMIT 1 OFFSET 0),
    (SELECT id FROM vehicles WHERE make = 'Audi' AND model = 'Q8' LIMIT 1),
    'approved',
    320000.00,
    36,
    64000.00,
    8500.00,
    0.0600,
    '{"full_name": "Салим Аль-Риши", "emirates_id": "784-1983-0123456-1", "date_of_birth": "1983-01-19", "nationality": "UAE"}',
    '{"monthly_income": 22000, "net_worth": 1800000, "credit_score": 740, "debt_to_income": 0.30, "business_revenue": 500000}',
    '{"position": "Владелец бизнеса", "company": "Al Rishi Trading LLC", "years_employed": 5, "employment_type": "business_owner"}',
    '{"bank_reference": "ADCB - счет 004-567890-001", "business_bank": "ADCB", "credit_references": 2, "business_years": 5}',
    '{"score": 745, "grade": "A+", "approval_probability": 0.84, "automated_decision": true, "credit_model": "small_business_v2"}',
    '{"risk_level": "medium", "default_probability": 0.025, "recommended_term": 36, "max_approved_amount": 350000}',
    (SELECT user_id FROM profiles WHERE full_name = 'Нур Аль-Фараси' LIMIT 1),
    '2025-09-22 11:15:00+04'::timestamptz,
    '2025-09-23 13:30:00+04'::timestamptz
),
-- Заявка 5: Range Rover Sport для частного лица
(
    gen_random_uuid(),
    'APP-2025-0005',
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'individual' LIMIT 1 OFFSET 1),
    (SELECT id FROM vehicles WHERE make = 'Land Rover' AND model = 'Range Rover Sport' LIMIT 1),
    'approved',
    280000.00,
    36,
    56000.00,
    7500.00,
    0.0570,
    '{"full_name": "Фатима Аль-Сувайди", "emirates_id": "784-1992-6789012-1", "date_of_birth": "1992-03-15", "nationality": "UAE"}',
    '{"monthly_income": 25000, "net_worth": 1200000, "credit_score": 780, "debt_to_income": 0.15, "liquid_assets": 60000}',
    '{"position": "Врач", "company": "Dubai Health Authority", "years_employed": 4, "employment_type": "salaried"}',
    '{"bank_reference": "FAB - счет 005-678901-001", "credit_references": 2, "employment_verified": true}',
    '{"score": 790, "grade": "AA-", "approval_probability": 0.89, "automated_decision": true, "credit_model": "individual_v2"}',
    '{"risk_level": "low", "default_probability": 0.012, "recommended_term": 36, "max_approved_amount": 300000}',
    (SELECT user_id FROM profiles WHERE full_name = 'Халид Аль-Хашими' LIMIT 1),
    '2025-09-25 15:40:00+04'::timestamptz,
    '2025-09-26 09:15:00+04'::timestamptz
);

-- Добавляем еще 75 одобренных заявок (всего 80)
INSERT INTO applications (
    id, application_number, user_id, vehicle_id, status, requested_amount,
    term_months, down_payment, monthly_payment, interest_rate,
    personal_info, financial_info, employment_info, references_info,
    scoring_results, risk_assessment, assigned_to, submitted_at, approved_at
) 
SELECT 
    gen_random_uuid(),
    'APP-2025-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' IN ('individual', 'small_business', 'medium_business', 'large_corporation') ORDER BY RANDOM() LIMIT 1),
    (SELECT id FROM vehicles WHERE status = 'available' ORDER BY RANDOM() LIMIT 1),
    'approved',
    (RANDOM() * 700000 + 50000)::numeric(16,2),  -- от 50,000 до 750,000
    (RANDOM() * 48 + 12)::integer,  -- от 12 до 60 месяцев
    (RANDOM() * 200000 + 10000)::numeric(16,2),  -- первоначальный взнос 10-30%
    (RANDOM() * 25000 + 2000)::numeric(16,2),  -- ежемесячный платеж 2,000-27,000
    (RANDOM() * 0.044 + 0.045)::numeric(8,4),  -- процентная ставка 4.5%-8.9%
    jsonb_build_object(
        'full_name', (SELECT full_name FROM profiles WHERE user_id = applications.user_id LIMIT 1),
        'emirates_id', (SELECT emirates_id FROM profiles WHERE user_id = applications.user_id LIMIT 1),
        'nationality', (SELECT nationality FROM profiles WHERE user_id = applications.user_id LIMIT 1)
    ),
    jsonb_build_object(
        'credit_score', (RANDOM() * 350 + 600)::integer,
        'debt_to_income', (RANDOM() * 0.4 + 0.1)::numeric(3,2)
    ),
    jsonb_build_object('employment_verified', true),
    jsonb_build_object('credit_references', (RANDOM() * 3 + 1)::integer),
    jsonb_build_object(
        'score', (RANDOM() * 300 + 650)::integer,
        'grade', CASE WHEN RANDOM() > 0.8 THEN 'AAA' WHEN RANDOM() > 0.6 THEN 'AA' WHEN RANDOM() > 0.3 THEN 'A' ELSE 'B' END,
        'approval_probability', (RANDOM() * 0.4 + 0.6)::numeric(3,2)
    ),
    jsonb_build_object('risk_level', CASE WHEN RANDOM() > 0.7 THEN 'high' WHEN RANDOM() > 0.4 THEN 'medium' ELSE 'low' END),
    (SELECT user_id FROM profiles WHERE full_name IN ('Сара Аль-Матрук', 'Халид Аль-Хашими', 'Нур Аль-Фараси') ORDER BY RANDOM() LIMIT 1),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '25 days'))::timestamptz
FROM generate_series(6, 80) as applications;

-- =====================================================================
-- 1.2 ЗАЯВКИ НА РАССМОТРЕНИИ - 35 заявок (23%)
-- =====================================================================

INSERT INTO applications (
    id, application_number, user_id, vehicle_id, status, requested_amount,
    term_months, down_payment, monthly_payment, interest_rate,
    personal_info, financial_info, employment_info, references_info,
    scoring_results, risk_assessment, assigned_to, submitted_at
) 
SELECT 
    gen_random_uuid(),
    'APP-2025-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' IN ('individual', 'small_business', 'medium_business') ORDER BY RANDOM() LIMIT 1),
    (SELECT id FROM vehicles WHERE status = 'available' ORDER BY RANDOM() LIMIT 1),
    'in_review',
    (RANDOM() * 400000 + 80000)::numeric(16,2),
    (RANDOM() * 36 + 18)::integer,
    (RANDOM() * 80000 + 16000)::numeric(16,2),
    (RANDOM() * 15000 + 3000)::numeric(16,2),
    (RANDOM() * 0.035 + 0.055)::numeric(8,4),
    jsonb_build_object(
        'full_name', (SELECT full_name FROM profiles WHERE user_id = applications.user_id LIMIT 1),
        'emirates_id', (SELECT emirates_id FROM profiles WHERE user_id = applications.user_id LIMIT 1)
    ),
    jsonb_build_object(
        'credit_score', (RANDOM() * 200 + 650)::integer,
        'income_verified', false
    ),
    jsonb_build_object('employment_type', CASE WHEN RANDOM() > 0.5 THEN 'salaried' ELSE 'business_owner' END),
    jsonb_build_object('documents_pending', true),
    jsonb_build_object('manual_review_required', true),
    jsonb_build_object('review_stage', CASE WHEN RANDOM() > 0.7 THEN 'legal' WHEN RANDOM() > 0.4 THEN 'financial' ELSE 'initial' END),
    (SELECT user_id FROM profiles WHERE full_name IN ('Сара Аль-Матрук', 'Халид Аль-Хашими', 'Нур Аль-Фараси') ORDER BY RANDOM() LIMIT 1),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '20 days'))::timestamptz
FROM generate_series(81, 115) as applications;

-- =====================================================================
-- 1.3 ОТКЛОНЕННЫЕ ЗАЯВКИ - 25 заявок (17%)
-- =====================================================================

INSERT INTO applications (
    id, application_number, user_id, vehicle_id, status, requested_amount,
    term_months, down_payment, monthly_payment, interest_rate,
    personal_info, financial_info, employment_info, references_info,
    scoring_results, risk_assessment, assigned_to, submitted_at, rejected_at, rejection_reason
) 
SELECT 
    gen_random_uuid(),
    'APP-2025-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' IN ('individual', 'small_business') ORDER BY RANDOM() LIMIT 1),
    (SELECT id FROM vehicles WHERE status = 'available' ORDER BY RANDOM() LIMIT 1),
    'rejected',
    (RANDOM() * 300000 + 40000)::numeric(16,2),
    (RANDOM() * 48 + 12)::integer,
    (RANDOM() * 60000 + 8000)::numeric(16,2),
    (RANDOM() * 12000 + 2000)::numeric(16,2),
    (RANDOM() * 0.03 + 0.06)::numeric(8,4),
    jsonb_build_object(
        'full_name', (SELECT full_name FROM profiles WHERE user_id = applications.user_id LIMIT 1)
    ),
    jsonb_build_object(
        'credit_score', (RANDOM() * 150 + 450)::integer,
        'debt_to_income', (RANDOM() * 0.3 + 0.5)::numeric(3,2)
    ),
    jsonb_build_object('employment_verified', false),
    jsonb_build_object('insufficient_references', true),
    jsonb_build_object(
        'score', (RANDOM() * 100 + 400)::integer,
        'grade', 'C',
        'approval_probability', (RANDOM() * 0.2)::numeric(3,2)
    ),
    jsonb_build_object('risk_level', 'high'),
    (SELECT user_id FROM profiles WHERE full_name IN ('Сара Аль-Матрук', 'Халид Аль-Хашими') ORDER BY RANDOM() LIMIT 1),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '45 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '40 days'))::timestamptz,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Недостаточный кредитный рейтинг'
        WHEN RANDOM() > 0.4 THEN 'Высокий уровень долговой нагрузки'
        WHEN RANDOM() > 0.2 THEN 'Неполные документы'
        ELSE 'Неудовлетворительная кредитная история'
    END
FROM generate_series(116, 140) as applications;

-- =====================================================================
-- 1.4 ОТМЕНЕННЫЕ ПОКУПАТЕЛЯМИ - 10 заявок (7%)
-- =====================================================================

INSERT INTO applications (
    id, application_number, user_id, vehicle_id, status, requested_amount,
    term_months, down_payment, monthly_payment, interest_rate,
    personal_info, financial_info, employment_info, references_info,
    scoring_results, risk_assessment, assigned_to, submitted_at, rejected_at, rejection_reason
) 
SELECT 
    gen_random_uuid(),
    'APP-2025-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' IN ('individual', 'small_business') ORDER BY RANDOM() LIMIT 1),
    (SELECT id FROM vehicles WHERE status = 'available' ORDER BY RANDOM() LIMIT 1),
    'cancelled',
    (RANDOM() * 250000 + 60000)::numeric(16,2),
    (RANDOM() * 36 + 12)::integer,
    (RANDOM() * 50000 + 12000)::numeric(16,2),
    (RANDOM() * 10000 + 2500)::numeric(16,2),
    (RANDOM() * 0.025 + 0.065)::numeric(8,4),
    jsonb_build_object(
        'full_name', (SELECT full_name FROM profiles WHERE user_id = applications.user_id LIMIT 1)
    ),
    jsonb_build_object('application_cancelled', true),
    jsonb_build_object('cancellation_reason', 'changed_mind'),
    jsonb_build_object('cancelled_by_client', true),
    jsonb_build_object('score', (RANDOM() * 200 + 600)::integer),
    jsonb_build_object('status', 'cancelled'),
    (SELECT user_id FROM profiles WHERE full_name IN ('Сара Аль-Матрук', 'Халид Аль-Хашими') ORDER BY RANDOM() LIMIT 1),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '15 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '10 days'))::timestamptz,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'Изменил решение о покупке'
        WHEN RANDOM() > 0.3 THEN 'Нашел более выгодное предложение'
        ELSE 'Изменились финансовые обстоятельства'
    END
FROM generate_series(141, 150) as applications;

-- =====================================================================
-- 2. СДЕЛКИ (DEALS) - 80 активных сделок
-- =====================================================================

-- Создаем 80 сделок на основе одобренных заявок
-- Номера сделок формируются как LTR-DDMMYY-XXXX (XXXX = последние 4 символа VIN)

WITH approved_applications AS (
    SELECT *
    FROM applications
    WHERE status = 'approved'
    ORDER BY approved_at
    LIMIT 80
), ranked_applications AS (
    SELECT
        a.*,
        v.vin,
        ROW_NUMBER() OVER () AS global_seq,
        ROW_NUMBER() OVER (PARTITION BY a.vehicle_id ORDER BY a.approved_at, a.id) AS vin_seq,
        LPAD(
            RIGHT(COALESCE(regexp_replace(v.vin, '[^A-Za-z0-9]', '', 'g'), ''), 4),
            4,
            '0'
        ) AS vin_part
    FROM approved_applications a
    JOIN vehicles v ON v.id = a.vehicle_id
)
INSERT INTO deals (
    id, deal_number, application_id, vehicle_id, client_id, status,
    principal_amount, total_amount, monthly_payment, monthly_lease_rate,
    term_months, interest_rate, down_payment_amount, security_deposit,
    processing_fee, contract_start_date, contract_end_date, first_payment_date,
    contract_terms, insurance_details, assigned_account_manager, activated_at
)
SELECT
    gen_random_uuid(),
    CASE
        WHEN ra.vin_seq = 1 THEN format('LTR-%s-%s', to_char(timezone('utc', now())::date, 'DDMMYY'), ra.vin_part)
        ELSE format('LTR-%s-%s-%s', to_char(timezone('utc', now())::date, 'DDMMYY'), ra.vin_part, LPAD(ra.vin_seq::text, 2, '0'))
    END,
    ra.id,
    ra.vehicle_id,
    ra.user_id,
    CASE
        WHEN ra.global_seq <= 25 THEN 'pending_activation'
        WHEN ra.global_seq <= 65 THEN 'active'
        ELSE 'suspended'
    END,
    (ra.requested_amount - ra.down_payment)::numeric(16,2),
    ra.requested_amount::numeric(16,2),
    ra.monthly_payment,
    (ra.monthly_payment / ra.requested_amount * 12)::numeric(16,6),
    ra.term_months,
    ra.interest_rate,
    ra.down_payment,
    (ra.monthly_payment * 2)::numeric(16,2),
    (ra.requested_amount * 0.01)::numeric(16,2),
    CURRENT_DATE + INTERVAL '7 days',
    (CURRENT_DATE + INTERVAL '7 days') + (ra.term_months || ' months')::interval,
    (CURRENT_DATE + INTERVAL '7 days') + INTERVAL '12 days',
    jsonb_build_object(
        'grace_days', 5,
        'late_fee', 250,
        'auto_debit', true,
        'early_termination_penalty', 0.05
    ),
    jsonb_build_object(
        'provider', 'AXA Insurance',
        'policy_type', 'comprehensive',
        'policy_number', format('AXA-%s', ra.vin_part),
        'premium_amount', ROUND(ra.monthly_payment * 0.35, 2),
        'payment_frequency', 'monthly',
        'next_payment_due', to_char(current_date + interval '30 days', 'YYYY-MM-DD'),
        'coverage_start', to_char(current_date - interval '15 days', 'YYYY-MM-DD'),
        'coverage_end', to_char(current_date + interval '11 months', 'YYYY-MM-DD'),
        'deductible', 500,
        'last_payment_status', 'paid',
        'last_payment_date', to_char(current_date - interval '10 days', 'YYYY-MM-DD')
    ),
    ra.assigned_to,
    CASE
        WHEN ra.global_seq <= 65 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '24 months'))::timestamptz
        ELSE NULL
    END
FROM ranked_applications ra;

-- =====================================================================
-- 3. СВЯЗАННЫЕ ТАБЛИЦЫ ДЛЯ СДЕЛОК
-- =====================================================================

-- =====================================================================
-- 3.1 ДОКУМЕНТЫ ПО ЗАЯВКАМ (application_documents)
-- =====================================================================

INSERT INTO application_documents (
    id, application_id, document_type, document_category, original_filename,
    stored_filename, storage_path, mime_type, file_size, checksum,
    status, verification_data, uploaded_at, verified_at, verified_by
) 
SELECT 
    gen_random_uuid(),
    a.id,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'doc_emirates_id_buyer'
        WHEN RANDOM() > 0.6 THEN 'doc_passport_buyer'
        WHEN RANDOM() > 0.4 THEN 'salary_certificate'
        WHEN RANDOM() > 0.2 THEN 'bank_statement'
        ELSE 'doc_driving_license_buyer'
    END,
    CASE 
        WHEN RANDOM() > 0.5 THEN 'identity'
        ELSE 'financial'
    END,
    'document_' || (ROW_NUMBER() OVER()) || '.pdf',
    'stored_' || (ROW_NUMBER() OVER()) || '.pdf',
    '/documents/' || a.application_number || '/' || (ROW_NUMBER() OVER()) || '.pdf',
    'application/pdf',
    (RANDOM() * 5000000 + 100000)::integer,
    MD5('document_' || (ROW_NUMBER() OVER()))::text,
    CASE WHEN RANDOM() > 0.1 THEN 'verified' ELSE 'pending' END,
    jsonb_build_object('verification_method', 'automated', 'confidence', (RANDOM() * 0.3 + 0.7)::numeric(3,2)),
    (a.submitted_at + (RANDOM() * INTERVAL '2 days'))::timestamptz,
    CASE WHEN RANDOM() > 0.1 THEN (a.submitted_at + (RANDOM() * INTERVAL '3 days'))::timestamptz ELSE NULL END,
    CASE WHEN RANDOM() > 0.1 THEN (SELECT user_id FROM profiles WHERE role = 'OP_MANAGER' LIMIT 1) ELSE NULL END
FROM applications a
CROSS JOIN generate_series(1, 4);  -- 4 документа на заявку

-- =====================================================================
-- 3.2 СОБЫТИЯ ПО СДЕЛКАМ (deal_events)
-- =====================================================================

INSERT INTO deal_events (
    id, deal_id, event_type, payload, created_by, created_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'application_approved'
        WHEN RANDOM() > 0.6 THEN 'contract_generated'
        WHEN RANDOM() > 0.4 THEN 'payment_received'
        WHEN RANDOM() > 0.2 THEN 'vehicle_reserved'
        ELSE 'deal_created'
    END,
    jsonb_build_object(
        'event_description', 'Событие по сделке ' || d.deal_number,
        'amount', CASE WHEN RANDOM() > 0.5 THEN d.down_payment_amount ELSE d.monthly_payment END,
        'timestamp', EXTRACT(EPOCH FROM NOW())
    ),
    d.assigned_account_manager,
    (d.created_at + (RANDOM() * INTERVAL '30 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 5);  -- 5 событий на сделку

-- =====================================================================
-- 3.3 ИНВОЙСЫ (invoices)
-- =====================================================================

-- Создаем инвойсы для всех сделок
INSERT INTO invoices (
    id, invoice_number, deal_id, invoice_type, amount, tax_amount, total_amount,
    currency, due_date, issue_date, status, line_items, tax_breakdown,
    payment_terms, paid_at
) 
SELECT 
    gen_random_uuid(),
    'INV-2025-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    d.id,
    CASE 
        WHEN ROW_NUMBER() OVER() = 1 THEN 'down_payment'
        ELSE 'monthly_payment'
    END,
    CASE 
        WHEN ROW_NUMBER() OVER() = 1 THEN d.down_payment_amount
        ELSE d.monthly_payment
    END,
    CASE 
        WHEN ROW_NUMBER() OVER() = 1 THEN (d.down_payment_amount * 0.05)::numeric(16,2)
        ELSE (d.monthly_payment * 0.05)::numeric(16,2)
    END,
    CASE 
        WHEN ROW_NUMBER() OVER() = 1 THEN (d.down_payment_amount * 1.05)::numeric(16,2)
        ELSE (d.monthly_payment * 1.05)::numeric(16,2)
    END,
    'AED',
    CASE 
        WHEN ROW_NUMBER() OVER() = 1 THEN d.contract_start_date
        ELSE d.first_payment_date + ((ROW_NUMBER() OVER() - 1) || ' months')::interval
    END,
    CASE 
        WHEN ROW_NUMBER() OVER() = 1 THEN d.contract_start_date - INTERVAL '7 days'
        ELSE d.first_payment_date + ((ROW_NUMBER() OVER() - 2) || ' months')::interval
    END,
    CASE 
        WHEN ROW_NUMBER() OVER() = 1 THEN 'paid'  -- Аванс обычно оплачен
        WHEN d.status = 'active' AND ROW_NUMBER() OVER() <= 6 THEN 'paid'  -- Последние 6 платежей оплачены
        WHEN ROW_NUMBER() OVER() <= 3 THEN 'overdue'
        ELSE 'pending'
    END,
    jsonb_build_array(
        jsonb_build_object(
            'description', CASE WHEN ROW_NUMBER() OVER() = 1 THEN 'Авансовый платеж по договору' ELSE 'Ежемесячный лизинговый платеж' END,
            'quantity', 1,
            'unit_price', CASE WHEN ROW_NUMBER() OVER() = 1 THEN d.down_payment_amount ELSE d.monthly_payment END,
            'total', CASE WHEN ROW_NUMBER() OVER() = 1 THEN d.down_payment_amount ELSE d.monthly_payment END
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'tax_rate', 0.05,
            'tax_amount', CASE WHEN ROW_NUMBER() OVER() = 1 THEN (d.down_payment_amount * 0.05)::numeric(16,2) ELSE (d.monthly_payment * 0.05)::numeric(16,2) END,
            'taxable_amount', CASE WHEN ROW_NUMBER() OVER() = 1 THEN d.down_payment_amount ELSE d.monthly_payment END
        )
    ),
    CASE 
        WHEN ROW_NUMBER() OVER() = 1 THEN 'Оплата при подписании договора'
        ELSE 'Ежемесячная оплата до 27 числа'
    END,
    CASE 
        WHEN CASE WHEN ROW_NUMBER() OVER() = 1 THEN 'paid' WHEN d.status = 'active' AND ROW_NUMBER() OVER() <= 6 THEN 'paid' ELSE 'pending' END = 'paid' 
        THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days'))::timestamptz
        ELSE NULL
    END
FROM deals d
CROSS JOIN generate_series(1, 12);  -- 12 инвойсов на сделку (аванс + 11 месяцев)

-- =====================================================================
-- 3.4 ПЛАТЕЖИ (payments)
-- =====================================================================

-- Создаем платежи для оплаченных инвойсов
INSERT INTO payments (
    id, deal_id, invoice_id, amount, currency, status, method, received_at, metadata
) 
SELECT 
    gen_random_uuid(),
    i.deal_id,
    i.id,
    i.total_amount,
    i.currency,
    i.status,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'bank_transfer'
        WHEN RANDOM() > 0.3 THEN 'card'
        ELSE 'cash'
    END,
    i.paid_at,
    jsonb_build_object(
        'transaction_id', 'TXN-' || LPAD((ROW_NUMBER() OVER())::text, 8, '0'),
        'payment_gateway', CASE WHEN RANDOM() > 0.5 THEN 'Stripe' ELSE 'Payfort' END,
        'confirmation_number', 'CONF-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0')
    )
FROM invoices i
WHERE i.status = 'paid'
AND i.paid_at IS NOT NULL;

-- =====================================================================
-- 3.5 ТРАНЗАКЦИИ ПЛАТЕЖЕЙ (payment_transactions)
-- =====================================================================

INSERT INTO payment_transactions (
    id, payment_id, provider, transaction_reference, amount, currency,
    status, payload, processed_at
) 
SELECT 
    gen_random_uuid(),
    p.id,
    p.metadata->>'payment_gateway',
    p.metadata->>'transaction_id',
    p.amount,
    p.currency,
    p.status,
    jsonb_build_object(
        'gateway_response', 'success',
        'processing_time', (RANDOM() * 5000 + 1000)::integer,
        'fee_amount', (p.amount * 0.029)::numeric(16,2),
        'net_amount', (p.amount * 0.971)::numeric(16,2)
    ),
    p.received_at + INTERVAL '2 seconds'
FROM payments p
WHERE p.status = 'succeeded';

-- =====================================================================
-- 3.6 ГРАФИКИ ПЛАТЕЖЕЙ (payment_schedules)
-- =====================================================================

INSERT INTO payment_schedules (
    id, deal_id, sequence, due_date, amount, status, metadata, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    ROW_NUMBER() OVER(PARTITION BY d.id ORDER BY due_date),
    d.first_payment_date + ((ROW_NUMBER() OVER(PARTITION BY d.id ORDER BY due_date) - 1) || ' months')::interval,
    d.monthly_payment,
    CASE 
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id ORDER BY due_date) <= 6 THEN 'paid'
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id ORDER BY due_date) <= 8 THEN 'overdue'
        ELSE 'pending'
    END,
    jsonb_build_object(
        'is_automatic', true,
        'reminder_sent', CASE WHEN ROW_NUMBER() OVER(PARTITION BY d.id ORDER BY due_date) <= 8 THEN true ELSE false END
    ),
    d.created_at,
    d.updated_at
FROM deals d
CROSS JOIN generate_series(1, d.term_months)
WHERE d.status IN ('active', 'suspended');

-- =====================================================================
-- 4. СИСТЕМА ЗАДАЧ (tasks)
-- =====================================================================

-- Создаем задачи для активных сделок
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'payment_collection'
        WHEN RANDOM() > 0.6 THEN 'document_review'
        WHEN RANDOM() > 0.4 THEN 'customer_follow_up'
        WHEN RANDOM() > 0.2 THEN 'insurance_processing'
        ELSE 'contract_amendment'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Сбор платежа по договору'
        WHEN RANDOM() > 0.6 THEN 'Проверка документов покупателя'
        WHEN RANDOM() > 0.4 THEN 'Follow-up с покупателем'
        WHEN RANDOM() > 0.2 THEN 'Обработка страхового полиса'
        ELSE 'Изменение условий договора'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'OPEN'
        WHEN RANDOM() > 0.4 THEN 'IN_PROGRESS'
        ELSE 'COMPLETED'
    END,
    'OP_MANAGER',
    d.assigned_account_manager,
    (CURRENT_TIMESTAMP + (RANDOM() * INTERVAL '7 days'))::timestamptz,
    CASE WHEN RANDOM() > 0.6 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '3 days'))::timestamptz ELSE NULL END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'ON_TRACK'
        WHEN RANDOM() > 0.5 THEN 'WARNING'
        ELSE 'BREACHED'
    END,
    jsonb_build_object(
        'priority', CASE WHEN RANDOM() > 0.7 THEN 'high' WHEN RANDOM() > 0.4 THEN 'medium' ELSE 'low' END,
        'estimated_effort', (RANDOM() * 8 + 2)::numeric(3,1),
        'deal_value', d.total_amount
    ),
    d.created_at,
    d.updated_at
FROM deals d
CROSS JOIN generate_series(1, 3);  -- 3 задачи на сделку

-- =====================================================================
-- 5. ТИКЕТЫ ПОДДЕРЖКИ (support_tickets)
-- =====================================================================

-- Создаем тикеты для покупателей со сделками
INSERT INTO support_tickets (
    id, ticket_number, client_id, deal_id, topic, priority, status,
    description, attachments, last_message_at, last_message_preview, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    'SUP-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    d.client_id,
    d.id,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Вопрос по платежу'
        WHEN RANDOM() > 0.6 THEN 'Изменение контактных данных'
        WHEN RANDOM() > 0.4 THEN 'Техническая проблема'
        WHEN RANDOM() > 0.2 THEN 'Страховой случай'
        ELSE 'Общие вопросы по договору'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'high'
        WHEN RANDOM() > 0.4 THEN 'medium'
        ELSE 'low'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'resolved'
        WHEN RANDOM() > 0.4 THEN 'in_progress'
        ELSE 'open'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'У покупателя вопрос по предстоящему платежу'
        WHEN RANDOM() > 0.6 THEN 'Необходимо обновить контактную информацию'
        WHEN RANDOM() > 0.4 THEN 'Проблема с мобильным приложением'
        WHEN RANDOM() > 0.2 THEN 'Произошел страховой случай'
        ELSE 'Общие вопросы по условиям договора лизинга'
    END,
    '[]'::jsonb,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '5 days'))::timestamptz,
    SUBSTRING(CASE 
        WHEN RANDOM() > 0.8 THEN 'Спасибо за разъяснение по платежу'
        WHEN RANDOM() > 0.6 THEN 'Контактные данные обновлены'
        WHEN RANDOM() > 0.4 THEN 'Проблема решена, спасибо'
        WHEN RANDOM() > 0.2 THEN 'Страховой случай обрабатывается'
        ELSE 'Ответ на общий вопрос получен'
    END, 1, 50),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '10 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '5 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2);  -- 2 тикета на сделку

-- =====================================================================
-- 6. УВЕДОМЛЕНИЯ ПОКУПАТЕЛЕЙ (client_notifications)
-- =====================================================================

-- Создаем уведомления для покупателей
INSERT INTO client_notifications (
    id, client_id, title, message, icon, severity, read_at, created_at
) 
SELECT 
    gen_random_uuid(),
    d.client_id,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Предстоящий платеж'
        WHEN RANDOM() > 0.6 THEN 'Изменение в договоре'
        WHEN RANDOM() > 0.4 THEN 'Напоминание о платеже'
        WHEN RANDOM() > 0.2 THEN 'Техническое обслуживание'
        ELSE 'Поздравляем с днем рождения!'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Напоминаем о предстоящем платеже по договору на сумму ' || d.monthly_payment || ' AED'
        WHEN RANDOM() > 0.6 THEN 'В ваш договор внесены изменения. Пожалуйста, ознакомьтесь с обновленными условиями'
        WHEN RANDOM() > 0.4 THEN 'До платежа осталось 3 дня. Убедитесь, что на счету достаточно средств'
        WHEN RANDOM() > 0.2 THEN 'Ваш автомобиль запланирован на техническое обслуживание на следующей неделе'
        ELSE 'Команда FastLease поздравляет вас с днем рождения! Желаем безопасных поездок!'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'payment'
        WHEN RANDOM() > 0.6 THEN 'contract'
        WHEN RANDOM() > 0.4 THEN 'reminder'
        WHEN RANDOM() > 0.2 THEN 'maintenance'
        ELSE 'celebration'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'info'
        WHEN RANDOM() > 0.4 THEN 'warning'
        ELSE 'error'
    END,
    CASE WHEN RANDOM() > 0.3 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '2 days'))::timestamptz ELSE NULL END,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 3);  -- 3 уведомления на сделку

-- =====================================================================
-- 7. ЖУРНАЛ АУДИТА (audit_log)
-- =====================================================================

-- Создаем записи аудита для сделок
INSERT INTO audit_log (
    deal_id, actor_user_id, action, from_status, to_status, metadata, created_at
) 
SELECT 
    d.id,
    d.assigned_account_manager,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'status_changed'
        WHEN RANDOM() > 0.6 THEN 'payment_processed'
        WHEN RANDOM() > 0.4 THEN 'document_uploaded'
        ELSE 'deal_created'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'draft'
        WHEN RANDOM() > 0.6 THEN 'pending'
        WHEN RANDOM() > 0.4 THEN 'review'
        ELSE NULL
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'active'
        WHEN RANDOM() > 0.6 THEN 'approved'
        WHEN RANDOM() > 0.4 THEN 'verified'
        ELSE 'created'
    END,
    jsonb_build_object(
        'ip_address', '192.168.1.' || (RANDOM() * 254 + 1)::integer,
        'user_agent', 'FastLeaseApp/1.0',
        'session_id', 'sess_' || LPAD((ROW_NUMBER() OVER())::text, 32, '0'),
        'additional_info', 'Автоматическая запись аудита'
    ),
    (d.created_at + (RANDOM() * INTERVAL '30 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 4);  -- 4 записи аудита на сделку

-- =====================================================================
-- СТАТИСТИКА И ПРОВЕРОЧНЫЕ ЗАПРОСЫ
-- =====================================================================

-- Проверочные запросы для подтверждения корректности данных

-- 1. Количество заявок по статусам
SELECT 
    status,
    COUNT(*) as application_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM applications), 2) as percentage
FROM applications 
GROUP BY status 
ORDER BY status;

-- 2. Количество сделок по статусам
SELECT 
    status,
    COUNT(*) as deal_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM deals), 2) as percentage
FROM deals 
GROUP BY status 
ORDER BY status;

-- 3. Средние финансовые показатели сделок
SELECT 
    COUNT(*) as total_deals,
    ROUND(AVG(total_amount), 2) as avg_deal_amount,
    ROUND(AVG(monthly_payment), 2) as avg_monthly_payment,
    ROUND(AVG(term_months), 1) as avg_term_months,
    ROUND(AVG(interest_rate * 100), 2) as avg_interest_rate_percent
FROM deals;

-- 4. Распределение сделок по типам покупателей
SELECT 
    p.metadata->>'client_category' as client_type,
    COUNT(*) as deal_count,
    ROUND(AVG(d.total_amount), 2) as avg_deal_amount
FROM deals d
JOIN profiles p ON d.client_id = p.user_id
GROUP BY p.metadata->>'client_category'
ORDER BY deal_count DESC;

-- 5. Финансовая статистика по платежам
SELECT 
    COUNT(*) as total_payments,
    SUM(amount) as total_amount,
    ROUND(AVG(amount), 2) as avg_payment,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
    ROUND(COUNT(CASE WHEN status = 'succeeded' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM payments;

-- 6. Статистика по задачам
SELECT 
    status,
    COUNT(*) as task_count,
    COUNT(CASE WHEN sla_status = 'BREACHED' THEN 1 END) as breached_sla
FROM tasks 
GROUP BY status
ORDER BY status;

-- =====================================================================
-- КОНЕЦ ФАЙЛА MOCK-DEALS.SQL
-- =====================================================================
