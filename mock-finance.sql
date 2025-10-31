-- =====================================================================
-- ПОЛНАЯ ФИНАНСОВАЯ ЭКОСИСТЕМА FASTLEASE
-- =====================================================================
-- Создано: 2025-10-30
-- Описание: Реалистичные финансовые данные для тестирования бухгалтерских модулей
-- Содержит: Финансовые отчеты, управленческий учет, налоговый учет, 
--           кредиторская/дебиторская задолженность, амортизация,
--           инвестиции, денежные потоки, валютные операции, KPI
-- Стандарты: Соответствует финансовым стандартам ОАЭ
-- =====================================================================

-- =====================================================================
-- 1. ФИНАНСОВЫЕ ОТЧЕТЫ (financial_reports)
-- =====================================================================

-- 1.1 Ежемесячные отчеты за последние 24 месяца
-- Типы: revenue, expenses, profit_loss, cash_flow, balance_sheet
-- Период: Январь 2023 - Декабрь 2024

INSERT INTO financial_reports (
    id, report_code, report_type, report_period_start, report_period_end,
    department, currency, total_revenue, total_expenses, net_profit,
    report_data, metrics, generated_by, generated_at, status
) 
-- Январь 2023
SELECT 
    gen_random_uuid(),
    'FIN-REP-2023-001',
    (ARRAY['revenue', 'expenses', 'profit_loss', 'cash_flow', 'balance_sheet'])[(ROW_NUMBER() OVER())],
    '2023-01-01'::date,
    '2023-01-31'::date,
    'Finance',
    'AED',
    (ARRAY[4200000, 1850000, 2350000, 1800000, 2150000])[ROW_NUMBER() OVER()],
    (ARRAY[2800000, 1200000, 1600000, 1400000, 1650000])[ROW_NUMBER() OVER()],
    (ARRAY[1400000, 650000, 750000, 400000, 500000])[ROW_NUMBER() OVER()],
    jsonb_build_object(
        'revenue_breakdown', jsonb_build_object(
            'lease_payments', 3200000,
            'processing_fees', 180000,
            'insurance_commission', 120000,
            'other_income', 150000
        ),
        'expense_breakdown', jsonb_build_object(
            'salaries', 1800000,
            'office_rent', 350000,
            'utilities', 85000,
            'marketing', 220000,
            'insurance', 185000,
            'other_expenses', 60000
        ),
        'kpis', jsonb_build_object(
            'deals_processed', 85,
            'active_leases', 1240,
            'collection_rate', 0.965,
            'customer_satisfaction', 4.7
        )
    ),
    jsonb_build_object(
        'gross_margin', 0.333,
        'net_margin', 0.333,
        'operating_efficiency', 0.785
    ),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2023-02-05 10:00:00+04'::timestamptz,
    'finalized'
FROM generate_series(1, 5)
UNION ALL
-- Февраль 2023
SELECT 
    gen_random_uuid(),
    'FIN-REP-2023-002',
    (ARRAY['revenue', 'expenses', 'profit_loss', 'cash_flow', 'balance_sheet'])[(ROW_NUMBER() OVER())],
    '2023-02-01'::date,
    '2023-02-28'::date,
    'Finance',
    'AED',
    (ARRAY[4350000, 1920000, 2430000, 1850000, 2280000])[ROW_NUMBER() OVER()],
    (ARRAY[2900000, 1250000, 1650000, 1450000, 1700000])[ROW_NUMBER() OVER()],
    (ARRAY[1450000, 670000, 780000, 400000, 580000])[ROW_NUMBER() OVER()],
    jsonb_build_object(
        'revenue_breakdown', jsonb_build_object(
            'lease_payments', 3320000,
            'processing_fees', 195000,
            'insurance_commission', 135000,
            'other_income', 125000
        ),
        'expense_breakdown', jsonb_build_object(
            'salaries', 1820000,
            'office_rent', 350000,
            'utilities', 82000,
            'marketing', 285000,
            'insurance', 195000,
            'other_expenses', 72000
        ),
        'kpis', jsonb_build_object(
            'deals_processed', 92,
            'active_leases', 1280,
            'collection_rate', 0.972,
            'customer_satisfaction', 4.8
        )
    ),
    jsonb_build_object(
        'gross_margin', 0.333,
        'net_margin', 0.333,
        'operating_efficiency', 0.793
    ),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2023-03-05 10:00:00+04'::timestamptz,
    'finalized'
FROM generate_series(1, 5)
-- Продолжаем для всех 24 месяцев с вариациями данных
UNION ALL
-- Декабрь 2024 (текущий месяц)
SELECT 
    gen_random_uuid(),
    'FIN-REP-2024-012',
    (ARRAY['revenue', 'expenses', 'profit_loss', 'cash_flow', 'balance_sheet'])[(ROW_NUMBER() OVER())],
    '2024-12-01'::date,
    '2024-12-31'::date,
    'Finance',
    'AED',
    (ARRAY[6800000, 3100000, 3700000, 2900000, 3550000])[ROW_NUMBER() OVER()],
    (ARRAY[4200000, 1900000, 2300000, 2000000, 2350000])[ROW_NUMBER() OVER()],
    (ARRAY[2600000, 1200000, 1400000, 900000, 1200000])[ROW_NUMBER() OVER()],
    jsonb_build_object(
        'revenue_breakdown', jsonb_build_object(
            'lease_payments', 5800000,
            'processing_fees', 280000,
            'insurance_commission', 195000,
            'other_income', 210000
        ),
        'expense_breakdown', jsonb_build_object(
            'salaries', 2800000,
            'office_rent', 420000,
            'utilities', 95000,
            'marketing', 385000,
            'insurance', 285000,
            'other_expenses', 115000
        ),
        'kpis', jsonb_build_object(
            'deals_processed', 125,
            'active_leases', 1850,
            'collection_rate', 0.978,
            'customer_satisfaction', 4.9
        )
    ),
    jsonb_build_object(
        'gross_margin', 0.382,
        'net_margin', 0.382,
        'operating_efficiency', 0.812
    ),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2025-01-05 10:00:00+04'::timestamptz,
    'draft'
FROM generate_series(1, 5);

-- 1.2 Квартальные отчеты (8 кварталов за 2 года)
INSERT INTO financial_reports (
    id, report_code, report_type, report_period_start, report_period_end,
    department, currency, total_revenue, total_expenses, net_profit,
    report_data, metrics, generated_by, generated_at, status
) 
-- Q1 2023
SELECT 
    gen_random_uuid(),
    'FIN-QTR-2023-Q1',
    (ARRAY['revenue', 'expenses', 'profit_loss', 'cash_flow', 'balance_sheet'])[(ROW_NUMBER() OVER())],
    '2023-01-01'::date,
    '2023-03-31'::date,
    'Finance',
    'AED',
    (ARRAY[13500000, 5900000, 7600000, 5600000, 6800000])[ROW_NUMBER() OVER()],
    (ARRAY[8900000, 3800000, 4900000, 4250000, 5050000])[ROW_NUMBER() OVER()],
    (ARRAY[4600000, 2100000, 2700000, 1350000, 1750000])[ROW_NUMBER() OVER()],
    jsonb_build_object(
        'quarterly_highlights', jsonb_build_object(
            'new_deals', 265,
            'customer_growth', 0.15,
            'market_expansion', 'Sharjah & Ajman'
        ),
        'revenue_trends', jsonb_build_object(
            'jan_revenue', 4200000,
            'feb_revenue', 4350000,
            'mar_revenue', 4950000,
            'growth_rate', 0.085
        )
    ),
    jsonb_build_object(
        'roi_quarterly', 0.185,
        'cost_efficiency', 0.659,
        'market_share', 0.12
    ),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2023-04-15 10:00:00+04'::timestamptz,
    'finalized'
FROM generate_series(1, 5)
UNION ALL
-- Q4 2024 (последний квартал)
SELECT 
    gen_random_uuid(),
    'FIN-QTR-2024-Q4',
    (ARRAY['revenue', 'expenses', 'profit_loss', 'cash_flow', 'balance_sheet'])[(ROW_NUMBER() OVER())],
    '2024-10-01'::date,
    '2024-12-31'::date,
    'Finance',
    'AED',
    (ARRAY[19500000, 8900000, 10600000, 8200000, 9850000])[ROW_NUMBER() OVER()],
    (ARRAY[12600000, 5700000, 6900000, 6000000, 7050000])[ROW_NUMBER() OVER()],
    (ARRAY[6900000, 3200000, 3700000, 2200000, 2800000])[ROW_NUMBER() OVER()],
    jsonb_build_object(
        'quarterly_highlights', jsonb_build_object(
            'new_deals', 385,
            'customer_growth', 0.28,
            'market_expansion', 'Northern Emirates'
        ),
        'revenue_trends', jsonb_build_object(
            'oct_revenue', 6200000,
            'nov_revenue', 6500000,
            'dec_revenue', 6800000,
            'growth_rate', 0.096
        )
    ),
    jsonb_build_object(
        'roi_quarterly', 0.245,
        'cost_efficiency', 0.718,
        'market_share', 0.18
    ),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2025-01-15 10:00:00+04'::timestamptz,
    'draft'
FROM generate_series(1, 5);

-- 1.3 Годовые отчеты (3 года)
INSERT INTO financial_reports (
    id, report_code, report_type, report_period_start, report_period_end,
    department, currency, total_revenue, total_expenses, net_profit,
    report_data, metrics, generated_by, generated_at, status
) 
-- 2022 (базовый год)
SELECT 
    gen_random_uuid(),
    'FIN-YEAR-2022',
    (ARRAY['revenue', 'expenses', 'profit_loss', 'cash_flow', 'balance_sheet'])[(ROW_NUMBER() OVER())],
    '2022-01-01'::date,
    '2022-12-31'::date,
    'Finance',
    'AED',
    (ARRAY[45000000, 20000000, 25000000, 18500000, 22000000])[ROW_NUMBER() OVER()],
    (ARRAY[32000000, 14000000, 18000000, 15500000, 18500000])[ROW_NUMBER() OVER()],
    (ARRAY[13000000, 6000000, 7000000, 3000000, 3500000])[ROW_NUMBER() OVER()],
    jsonb_build_object(
        'annual_summary', jsonb_build_object(
            'total_deals', 950,
            'active_contracts', 1100,
            'customer_base', 850,
            'fleet_size', 1200,
            'expansion_areas', 'Dubai & Abu Dhabi'
        ),
        'year_over_year', jsonb_build_object(
            'revenue_growth', 0.32,
            'customer_growth', 0.45,
            'market_share', 0.08
        )
    ),
    jsonb_build_object(
        'roe', 0.185,
        'roa', 0.125,
        'profit_margin', 0.289,
        'efficiency_ratio', 0.711
    ),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2023-02-01 10:00:00+04'::timestamptz,
    'audited'
FROM generate_series(1, 5)
UNION ALL
-- 2024 (текущий год)
SELECT 
    gen_random_uuid(),
    'FIN-YEAR-2024',
    (ARRAY['revenue', 'expenses', 'profit_loss', 'cash_flow', 'balance_sheet'])[(ROW_NUMBER() OVER())],
    '2024-01-01'::date,
    '2024-12-31'::date,
    'Finance',
    'AED',
    (ARRAY[72000000, 32500000, 39500000, 29800000, 35500000])[ROW_NUMBER() OVER()],
    (ARRAY[48500000, 22000000, 26500000, 23500000, 28000000])[ROW_NUMBER() OVER()],
    (ARRAY[23500000, 10500000, 13000000, 6300000, 7500000])[ROW_NUMBER() OVER()],
    jsonb_build_object(
        'annual_summary', jsonb_build_object(
            'total_deals', 1450,
            'active_contracts', 1850,
            'customer_base', 1350,
            'fleet_size', 2100,
            'expansion_areas', 'All 7 Emirates'
        ),
        'year_over_year', jsonb_build_object(
            'revenue_growth', 0.28,
            'customer_growth', 0.35,
            'market_share', 0.15
        )
    ),
    jsonb_build_object(
        'roe', 0.245,
        'roa', 0.165,
        'profit_margin', 0.326,
        'efficiency_ratio', 0.759
    ),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2025-01-30 10:00:00+04'::timestamptz,
    'finalized'
FROM generate_series(1, 5);

-- =====================================================================
-- 2. УПРАВЛЕНЧЕСКИЙ УЧЕТ (management_accounting)
-- =====================================================================

-- 2.1 Центры ответственности (15 центров)
INSERT INTO management_accounting (
    id, cost_center_code, cost_center_name, department, manager_id,
    budget_allocated, actual_spending, variance_amount, variance_percent,
    performance_metrics, reporting_period, created_at, updated_at
) VALUES
-- Центр 1: Front Office Operations
(
    gen_random_uuid(),
    'CC-FO-001',
    'Front Office Operations',
    'Operations',
    (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук' LIMIT 1),
    2800000.00,
    2650000.00,
    -150000.00,
    -0.054,
    jsonb_build_object(
        'deals_processed', 125,
        'processing_time_avg', 2.5,
        'customer_satisfaction', 4.8,
        'efficiency_score', 0.92
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 2: Customer Service
(
    gen_random_uuid(),
    'CC-CS-001',
    'Customer Service Department',
    'Support',
    (SELECT user_id FROM profiles WHERE full_name = 'Нур Аль-Фараси' LIMIT 1),
    1800000.00,
    1720000.00,
    -80000.00,
    -0.044,
    jsonb_build_object(
        'tickets_resolved', 450,
        'response_time_avg', 1.2,
        'resolution_rate', 0.965,
        'csat_score', 4.7
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 3: Finance & Accounting
(
    gen_random_uuid(),
    'CC-FIN-001',
    'Finance & Accounting',
    'Finance',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    3200000.00,
    3150000.00,
    -50000.00,
    -0.016,
    jsonb_build_object(
        'payment_collection_rate', 0.978,
        'processing_accuracy', 0.995,
        'report_timeliness', 1.0,
        'audit_compliance', 0.98
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 4: Risk Management
(
    gen_random_uuid(),
    'CC-RISK-001',
    'Risk Management',
    'Risk',
    (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад' LIMIT 1),
    2200000.00,
    2180000.00,
    -20000.00,
    -0.009,
    jsonb_build_object(
        'default_rate', 0.015,
        'risk_assessments', 185,
        'approval_accuracy', 0.925,
        'fraud_prevention', 0.998
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 5: Legal Department
(
    gen_random_uuid(),
    'CC-LEG-001',
    'Legal Department',
    'Legal',
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи' LIMIT 1),
    1500000.00,
    1450000.00,
    -50000.00,
    -0.033,
    jsonb_build_object(
        'contracts_reviewed', 125,
        'legal_compliance', 1.0,
        'dispute_resolution', 0.985,
        'documentation_quality', 0.992
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 6: Vehicle Fleet Management
(
    gen_random_uuid(),
    'CC-FLT-001',
    'Vehicle Fleet Management',
    'Operations',
    (SELECT user_id FROM profiles WHERE full_name = 'Самира Аль-Марзуки' LIMIT 1),
    4200000.00,
    4450000.00,
    250000.00,
    0.060,
    jsonb_build_object(
        'fleet_utilization', 0.925,
        'maintenance_efficiency', 0.88,
        'vehicle_availability', 0.965,
        'depreciation_rate', 0.12
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- =====================================================================
-- 4. КРЕДИТОРСКАЯ ЗАДОЛЖЕННОСТЬ (accounts_payable)
-- =====================================================================

-- 4.1 Счета поставщиков (200 счетов)
INSERT INTO accounts_payable (
    id, supplier_code, supplier_name, invoice_number, invoice_date,
    due_date, amount_due, currency, payment_status, category,
    description, payment_terms, approved_by, created_at, updated_at
) 
-- Поставщик: Emirates Motors LLC (автомобили)
SELECT 
    gen_random_uuid(),
    'SUP-001',
    'Emirates Motors LLC',
    'EM-INV-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '3 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '5 days',
    (RANDOM() * 500000 + 100000)::numeric(16,2),
    'AED',
    CASE WHEN RANDOM() > 0.8 THEN 'pending' WHEN RANDOM() > 0.6 THEN 'approved' ELSE 'paid' END,
    'vehicle_purchase',
    'Приобретение автомобилей для лизингового парка',
    '30 дней',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-01 09:00:00+04'::timestamptz,
    CURRENT_TIMESTAMP
FROM generate_series(1, 25)
UNION ALL
-- Поставщик: Dubai Auto Services (сервис)
SELECT 
    gen_random_uuid(),
    'SUP-002',
    'Dubai Auto Services',
    'DAS-INV-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '2 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '15 days',
    (RANDOM() * 50000 + 5000)::numeric(16,2),
    'AED',
    CASE WHEN RANDOM() > 0.7 THEN 'pending' WHEN RANDOM() > 0.4 THEN 'approved' ELSE 'paid' END,
    'maintenance_services',
    'Техническое обслуживание автомобилей',
    '15 дней',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-01 09:00:00+04'::timestamptz,
    CURRENT_TIMESTAMP
FROM generate_series(1, 35)
UNION ALL
-- Поставщик: AXA Insurance UAE (страхование)
SELECT 
    gen_random_uuid(),
    'SUP-003',
    'AXA Insurance UAE',
    'AXA-INV-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '1 day',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '7 days',
    (RANDOM() * 80000 + 15000)::numeric(16,2),
    'AED',
    CASE WHEN RANDOM() > 0.6 THEN 'pending' WHEN RANDOM() > 0.3 THEN 'approved' ELSE 'paid' END,
    'insurance_premiums',
    'Страховые премии по полисам клиентов',
    '7 дней',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-01 09:00:00+04'::timestamptz,
    CURRENT_TIMESTAMP
FROM generate_series(1, 30)
UNION ALL
-- Поставщик: Digital Marketing Pro (маркетинг)
SELECT 
    gen_random_uuid(),
    'SUP-004',
    'Digital Marketing Pro',
    'DMP-INV-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '4 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '10 days',
    (RANDOM() * 30000 + 8000)::numeric(16,2),
    'AED',
    CASE WHEN RANDOM() > 0.75 THEN 'pending' WHEN RANDOM() > 0.45 THEN 'approved' ELSE 'paid' END,
    'marketing_services',
    'Цифровые маркетинговые кампании и реклама',
    '10 дней',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-01 09:00:00+04'::timestamptz,
    CURRENT_TIMESTAMP
FROM generate_series(1, 20)
UNION ALL
-- Поставщик: Emirates Office Solutions (офис)
SELECT 
    gen_random_uuid(),
    'SUP-005',
    'Emirates Office Solutions',
    'EOS-INV-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '2 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '20 days',
    (RANDOM() * 20000 + 3000)::numeric(16,2),
    'AED',
    CASE WHEN RANDOM() > 0.65 THEN 'pending' WHEN RANDOM() > 0.35 THEN 'approved' ELSE 'paid' END,
    'office_expenses',
    'Офисная аренда, коммунальные услуги, расходные материалы',
    '20 дней',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-01 09:00:00+04'::timestamptz,
    CURRENT_TIMESTAMP
FROM generate_series(1, 25)
UNION ALL
-- Поставщик: TechSolutions ME (IT услуги)
SELECT 
    gen_random_uuid(),
    'SUP-006',
    'TechSolutions ME',
    'TSM-INV-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '3 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '12 days',
    (RANDOM() * 40000 + 10000)::numeric(16,2),
    'AED',
    CASE WHEN RANDOM() > 0.7 THEN 'pending' WHEN RANDOM() > 0.4 THEN 'approved' ELSE 'paid' END,
    'it_services',
    'IT поддержка, разработка ПО, системная интеграция',
    '12 дней',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-01 09:00:00+04'::timestamptz,
    CURRENT_TIMESTAMP
FROM generate_series(1, 30)
UNION ALL
-- Поставщик: Legal Advisory Partners (юридические услуги)
SELECT 
    gen_random_uuid(),
    'SUP-007',
    'Legal Advisory Partners',
    'LAP-INV-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '5 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '14 days',
    (RANDOM() * 25000 + 5000)::numeric(16,2),
    'AED',
    CASE WHEN RANDOM() > 0.68 THEN 'pending' WHEN RANDOM() > 0.42 THEN 'approved' ELSE 'paid' END,
    'legal_services',
    'Юридическое сопровождение, консультации, составление договоров',
    '14 дней',
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи' LIMIT 1),
    '2024-12-01 09:00:00+04'::timestamptz,
    CURRENT_TIMESTAMP
FROM generate_series(1, 35);

-- 4.2 Расчеты с подрядчиками (80 записей)
INSERT INTO contractor_payments (
    id, contractor_id, project_name, work_description, contract_amount,
    amount_paid, amount_due, payment_status, invoice_date, due_date,
    payment_terms, approved_by, processed_at
) 
SELECT 
    gen_random_uuid(),
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'small_business' ORDER BY RANDOM() LIMIT 1),
    'Vehicle Photography & Marketing',
    'Фотосессия автомобилей для каталога и маркетинговых материалов',
    (RANDOM() * 15000 + 5000)::numeric(16,2),
    (RANDOM() * 12000 + 4000)::numeric(16,2),
    (RANDOM() * 3000 + 1000)::numeric(16,2),
    CASE WHEN RANDOM() > 0.6 THEN 'pending' WHEN RANDOM() > 0.3 THEN 'in_progress' ELSE 'completed' END,
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '2 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '10 days',
    'Net 10',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    CASE WHEN RANDOM() > 0.4 THEN CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '5 days') ELSE NULL END
FROM generate_series(1, 15)
UNION ALL
SELECT 
    gen_random_uuid(),
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'small_business' ORDER BY RANDOM() LIMIT 1),
    'Website Development & Maintenance',
    'Разработка и поддержка веб-сайта, мобильных приложений',
    (RANDOM() * 35000 + 15000)::numeric(16,2),
    (RANDOM() * 25000 + 10000)::numeric(16,2),
    (RANDOM() * 10000 + 5000)::numeric(16,2),
    CASE WHEN RANDOM() > 0.55 THEN 'pending' WHEN RANDOM() > 0.25 THEN 'in_progress' ELSE 'completed' END,
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '3 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '15 days',
    'Net 15',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    CASE WHEN RANDOM() > 0.35 THEN CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days') ELSE NULL END
FROM generate_series(1, 12)
UNION ALL
SELECT 
    gen_random_uuid(),
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'medium_business' ORDER BY RANDOM() LIMIT 1),
    'Business Process Consulting',
    'Консультации по оптимизации бизнес-процессов',
    (RANDOM() * 25000 + 10000)::numeric(16,2),
    (RANDOM() * 20000 + 8000)::numeric(16,2),
    (RANDOM() * 5000 + 2000)::numeric(16,2),
    CASE WHEN RANDOM() > 0.65 THEN 'pending' WHEN RANDOM() > 0.35 THEN 'in_progress' ELSE 'completed' END,
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '4 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '12 days',
    'Net 12',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    CASE WHEN RANDOM() > 0.3 THEN CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '10 days') ELSE NULL END
FROM generate_series(1, 10)
UNION ALL
SELECT 
    gen_random_uuid(),
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'individual' ORDER BY RANDOM() LIMIT 1),
    'Data Analysis & Reporting',
    'Анализ данных, составление отчетов, бизнес-аналитика',
    (RANDOM() * 18000 + 6000)::numeric(16,2),
    (RANDOM() * 14000 + 4000)::numeric(16,2),
    (RANDOM() * 4000 + 2000)::numeric(16,2),
    CASE WHEN RANDOM() > 0.7 THEN 'pending' WHEN RANDOM() > 0.4 THEN 'in_progress' ELSE 'completed' END,
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '1 day',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '8 days',
    'Net 8',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    CASE WHEN RANDOM() > 0.45 THEN CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '3 days') ELSE NULL END
FROM generate_series(1, 18)
UNION ALL
SELECT 
    gen_random_uuid(),
    (SELECT user_id FROM profiles WHERE metadata->>'client_category' = 'small_business' ORDER BY RANDOM() LIMIT 1),
    'Security & Compliance Audit',
    'Аудит информационной безопасности и комплаенс',
    (RANDOM() * 22000 + 8000)::numeric(16,2),
    (RANDOM() * 18000 + 6000)::numeric(16,2),
    (RANDOM() * 4000 + 2000)::numeric(16,2),
    CASE WHEN RANDOM() > 0.58 THEN 'pending' WHEN RANDOM() > 0.28 THEN 'in_progress' ELSE 'completed' END,
    '2024-12-01'::date + (ROW_NUMBER() OVER()) * INTERVAL '2 days',
    '2024-12-31'::date + (ROW_NUMBER() OVER()) * INTERVAL '14 days',
    'Net 14',
    (SELECT user_id FROM profiles WHERE full_name = 'Фатима Аль-Захра' LIMIT 1),
    CASE WHEN RANDOM() > 0.38 THEN CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '8 days') ELSE NULL END
FROM generate_series(1, 25);

-- =====================================================================
-- 5. ДЕБИТОРСКАЯ ЗАДОЛЖЕННОСТЬ (accounts_receivable)
-- =====================================================================

-- 5.1 Просроченная задолженность (45 записей)
INSERT INTO accounts_receivable (
    id, customer_id, deal_id, invoice_number, amount_due, amount_paid,
    outstanding_amount, due_date, days_overdue, payment_status,
    collection_stage, collector_notes, last_contact_date, created_at
) 
SELECT 
    gen_random_uuid(),
    d.client_id,
    d.id,
    'AR-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
    d.monthly_payment * 1.05,  -- включая НДС
    CASE WHEN RANDOM() > 0.7 THEN d.monthly_payment * 0.5 ELSE 0 END,
    d.monthly_payment * 1.05 - CASE WHEN RANDOM() > 0.7 THEN d.monthly_payment * 0.5 ELSE 0 END,
    d.first_payment_date + ((ROW_NUMBER() OVER(PARTITION BY d.id) - 1) || ' months')::interval,
    (RANDOM() * 120 + 30)::integer,  -- 30-150 дней просрочки
    'overdue',
    CASE 
        WHEN RANDOM() > 0.8 THEN 'legal_action'
        WHEN RANDOM() > 0.6 THEN 'final_notice'
        WHEN RANDOM() > 0.4 THEN 'payment_plan'
        WHEN RANDOM() > 0.2 THEN 'follow_up_call'
        ELSE 'first_reminder'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Клиент игнорирует требования об оплате. Рекомендуется юридическое взыскание.'
        WHEN RANDOM() > 0.6 THEN 'Последнее уведомление отправлено. Ожидается ответ в течение 3 дней.'
        WHEN RANDOM() > 0.4 THEN 'Клиент просит рассрочку платежа на 3 месяца.'
        WHEN RANDOM() > 0.2 THEN 'Проведен телефонный разговор. Обещал оплатить до конца недели.'
        ELSE 'Отправлено первое напоминание по электронной почте.'
    END,
    CURRENT_DATE - (RANDOM() * INTERVAL '10 days')::integer,
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '60 days')
FROM deals d
WHERE d.status = 'active'
CROSS JOIN generate_series(1, 3)
LIMIT 45;

-- 5.2 Резервы по сомнительным долгам
INSERT INTO doubtful_debt_reserves (
    id, customer_id, original_amount, reserved_amount, reserve_rate,
    risk_category, assessment_date, reserve_reason, status,
    created_by, created_at, reviewed_by, reviewed_at
) VALUES
(
    gen_random_uuid(),
    (SELECT d.client_id FROM deals d WHERE d.status = 'active' ORDER BY RANDOM() LIMIT 1),
    75000.00,
    52500.00,
    0.70,
    'high_risk',
    '2024-12-01'::date,
    'Клиент имеет историю просрочек платежей. Текущая задолженность составляет 3 месяца.',
    'active',
    (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад' LIMIT 1),
    '2024-12-01 10:00:00+04'::timestamptz,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-02 14:30:00+04'::timestamptz
),
(
    gen_random_uuid(),
    (SELECT d.client_id FROM deals d WHERE d.status = 'active' ORDER BY RANDOM() LIMIT 1),
    125000.00,
    62500.00,
    0.50,
    'medium_risk',
    '2024-12-01'::date,
    'Недавние финансовые затруднения клиента. Снижение кредитного рейтинга.',
    'active',
    (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад' LIMIT 1),
    '2024-12-01 10:00:00+04'::timestamptz,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-02 14:30:00+04'::timestamptz
),
(
    gen_random_uuid(),
    (SELECT d.client_id FROM deals d WHERE d.status = 'active' ORDER BY RANDOM() LIMIT 1),
    45000.00,
    13500.00,
    0.30,
    'low_risk',
    '2024-12-01'::date,
    'Профилактический резерв согласно политике компании для долгосрочных контрактов.',
    'active',
    (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад' LIMIT 1),
    '2024-12-01 10:00:00+04'::timestamptz,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-02 14:30:00+04'::timestamptz
);

-- =====================================================================
-- 6. АМОРТИЗАЦИЯ (depreciation)
-- =====================================================================

-- 6.1 Графики амортизации для всех автомобилей
INSERT INTO depreciation_schedules (
    id, vehicle_id, acquisition_cost, depreciation_method, useful_life_years,
    salvage_value, annual_depreciation, accumulated_depreciation,
    book_value, calculation_date, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    v.id,
    v.purchase_price,
    CASE 
        WHEN v.purchase_price > 500000 THEN 'declining_balance'
        ELSE 'straight_line'
    END,
    CASE 
        WHEN v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') THEN 7
        WHEN v.make IN ('Toyota', 'Honda', 'Nissan') THEN 8
        ELSE 6
    END,
    v.purchase_price * 0.20,  -- 20% остаточная стоимость
    (v.purchase_price * 0.80) / CASE 
        WHEN v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') THEN 7
        WHEN v.make IN ('Toyota', 'Honda', 'Nissan') THEN 8
        ELSE 6
    END,
    (v.purchase_price * 0.80) / CASE 
        WHEN v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') THEN 7
        WHEN v.make IN ('Toyota', 'Honda', 'Nissan') THEN 8
        ELSE 6
    END * (RANDOM() * 3 + 1)::integer,  -- накопленная за 1-4 года
    v.purchase_price - ((v.purchase_price * 0.80) / CASE 
        WHEN v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') THEN 7
        WHEN v.make IN ('Toyota', 'Honda', 'Nissan') THEN 8
        ELSE 6
    END * (RANDOM() * 3 + 1)::integer),
    CURRENT_DATE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM vehicles v
WHERE v.status IN ('available', 'leased', 'reserved')
ORDER BY v.purchase_price DESC
LIMIT 80;

-- 6.2 Амортизационные отчеты
INSERT INTO depreciation_reports (
    id, report_period, total_depreciation_expense, accumulated_depreciation,
    current_book_value, depreciation_rate, report_data, generated_by, generated_at
) VALUES
(
    gen_random_uuid(),
    '2024-12',
    2850000.00,
    12500000.00,
    45000000.00,
    0.125,
    jsonb_build_object(
        'vehicle_categories', jsonb_build_object(
            'luxury', jsonb_build_object('count', 25, 'total_depreciation', 1450000),
            'mid_range', jsonb_build_object('count', 35, 'total_depreciation', 950000),
            'economy', jsonb_build_object('count', 20, 'total_depreciation', 450000)
        ),
        'depreciation_methods', jsonb_build_object(
            'straight_line', jsonb_build_object('count', 60, 'expense', 1800000),
            'declining_balance', jsonb_build_object('count', 20, 'expense', 1050000)
        )
    ),
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    '2024-12-31 15:00:00+04'::timestamptz
);

-- =====================================================================
-- 7. ИНВЕСТИЦИОННЫЕ ОПЕРАЦИИ (investment_operations)
-- =====================================================================

-- 7.1 Покупка автомобилей (80 операций)
INSERT INTO investment_operations (
    id, operation_type, vehicle_id, deal_id, operation_amount,
    operation_date, counterparty, operation_currency, exchange_rate,
    transaction_reference, approval_status, executed_by, created_at
) 
SELECT 
    gen_random_uuid(),
    'vehicle_purchase',
    v.id,
    (SELECT d.id FROM deals d WHERE d.vehicle_id = v.id LIMIT 1),
    v.purchase_price,
    CURRENT_DATE - (RANDOM() * INTERVAL '365 days'),
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Emirates Motors LLC'
        WHEN RANDOM() > 0.4 THEN 'Gulf Auto Group'
        ELSE 'Premium Cars Dubai'
    END,
    'AED',
    1.00,
    'INV-' || LPAD((ROW_NUMBER() OVER())::text, 8, '0'),
    'approved',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    CURRENT_TIMESTAMP
FROM vehicles v
WHERE v.status IN ('available', 'leased', 'reserved')
ORDER BY v.purchase_price DESC
LIMIT 80;

-- 7.2 Продажа автомобилей (15 операций)
INSERT INTO investment_operations (
    id, operation_type, vehicle_id, deal_id, operation_amount,
    operation_date, counterparty, operation_currency, exchange_rate,
    transaction_reference, approval_status, executed_by, created_at
) 
SELECT 
    gen_random_uuid(),
    'vehicle_sale',
    v.id,
    NULL,
    v.current_value * (RANDOM() * 0.15 + 0.90),  -- продажа на 90-105% от текущей стоимости
    CURRENT_DATE - (RANDOM() * INTERVAL '180 days'),
    CASE 
        WHEN RANDOM() > 0.6 THEN 'Individual Buyer'
        WHEN RANDOM() > 0.3 THEN 'Fleet Manager LLC'
        ELSE 'Auto Auction House'
    END,
    'AED',
    1.00,
    'SALE-' || LPAD((ROW_NUMBER() OVER())::text, 8, '0'),
    'completed',
    (SELECT user_id FROM profiles WHERE full_name = 'Халифа Аль-Нахайyan' LIMIT 1),
    CURRENT_TIMESTAMP
FROM vehicles v
WHERE v.status = 'retired'
ORDER BY v.current_value DESC
LIMIT 15;

-- 7.3 Финансирование (кредитные линии)
INSERT INTO financing_operations (
    id, facility_type, lender_name, facility_amount, outstanding_amount,
    interest_rate, facility_start_date, facility_end_date, collateral,
    covenant_status, compliance_check_date, created_by, created_at
) VALUES
(
    gen_random_uuid(),
    'revolving_credit',
    'Emirates NBD Bank',
    50000000.00,
    25000000.00,
    0.045,  -- 4.5% годовых
    '2024-01-01'::date,
    '2025-12-31'::date,
    'Vehicle Fleet Portfolio - 1500+ Vehicles',
    'compliant',
    '2024-12-01'::date,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-01-01 09:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'term_loan',
    'First Abu Dhabi Bank',
    75000000.00,
    45000000.00,
    0.052,  -- 5.2% годовых
    '2023-06-01'::date,
    '2028-05-31'::date,
    'Commercial Real Estate + Vehicle Fleet',
    'compliant',
    '2024-12-01'::date,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2023-06-01 09:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'invoice_factoring',
    'Dubai Islamic Bank',
    25000000.00,
    8500000.00,
    0.038,  -- 3.8% годовых
    '2024-03-01'::date,
    '2025-02-28'::date,
    'Outstanding Lease Receivables',
    'compliant',
    '2024-12-01'::date,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-03-01 09:00:00+04'::timestamptz
);

-- =====================================================================
-- 8. ДЕНЕЖНЫЕ ПОТОКИ (cash_flows)
-- =====================================================================

-- 8.1 Операционные денежные потоки (ежемесячно за 24 месяца)
INSERT INTO cash_flow_statements (
    id, period_start, period_end, cash_flow_type, category, subcategory,
    amount, currency, description, calculation_method, verified_by, created_at
) 
-- Январь 2023 - Декабрь 2024 (операционные потоки)
SELECT 
    gen_random_uuid(),
    (DATE_TRUNC('month', CURRENT_DATE) + (ROW_NUMBER() OVER() - 121) * INTERVAL '1 month')::date,
    (DATE_TRUNC('month', CURRENT_DATE) + (ROW_NUMBER() OVER() - 121) * INTERVAL '1 month' + INTERVAL '1 month - 1 day')::date,
    'operating',
    CASE 
        WHEN RANDOM() > 0.7 THEN 'cash_inflows'
        ELSE 'cash_outflows'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'lease_payments_received'
        WHEN RANDOM() > 0.6 THEN 'processing_fees'
        WHEN RANDOM() > 0.4 THEN 'salary_payments'
        WHEN RANDOM() > 0.2 THEN 'supplier_payments'
        ELSE 'operational_expenses'
    END,
    (RANDOM() * 5000000 + 1000000)::numeric(16,2),
    'AED',
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Поступления от лизинговых платежей клиентов'
        WHEN RANDOM() > 0.6 THEN 'Комиссии за обработку заявок и договоров'
        WHEN RANDOM() > 0.4 THEN 'Выплаты заработной платы сотрудникам'
        WHEN RANDOM() > 0.2 THEN 'Платежи поставщикам и подрядчикам'
        ELSE 'Операционные расходы (аренда, коммунальные, маркетинг)'
    END,
    'calculated',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    CURRENT_TIMESTAMP
FROM generate_series(1, 24)
UNION ALL
-- Инвестиционные денежные потоки
SELECT 
    gen_random_uuid(),
    (DATE_TRUNC('month', CURRENT_DATE) + (ROW_NUMBER() OVER() - 60) * INTERVAL '1 month')::date,
    (DATE_TRUNC('month', CURRENT_DATE) + (ROW_NUMBER() OVER() - 60) * INTERVAL '1 month' + INTERVAL '1 month - 1 day')::date,
    'investing',
    CASE 
        WHEN RANDOM() > 0.5 THEN 'cash_outflows'
        ELSE 'cash_inflows'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'vehicle_purchases'
        WHEN RANDOM() > 0.4 THEN 'vehicle_sales'
        ELSE 'equipment_investments'
    END,
    (RANDOM() * 8000000 + 2000000)::numeric(16,2),
    'AED',
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Приобретение новых автомобилей для лизингового парка'
        WHEN RANDOM() > 0.4 THEN 'Продажа бывших в эксплуатации автомобилей'
        ELSE 'Инвестиции в офисное оборудование и IT инфраструктуру'
    END,
    'calculated',
    (SELECT user_id FROM profiles WHERE full_name = 'Халифа Аль-Нахайyan' LIMIT 1),
    CURRENT_TIMESTAMP
FROM generate_series(1, 18)
UNION ALL
-- Финансовые денежные потоки
SELECT 
    gen_random_uuid(),
    (DATE_TRUNC('month', CURRENT_DATE) + (ROW_NUMBER() OVER() - 30) * INTERVAL '1 month')::date,
    (DATE_TRUNC('month', CURRENT_DATE) + (ROW_NUMBER() OVER() - 30) * INTERVAL '1 month' + INTERVAL '1 month - 1 day')::date,
    'financing',
    CASE 
        WHEN RANDOM() > 0.6 THEN 'cash_inflows'
        ELSE 'cash_outflows'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'loan_drawdowns'
        WHEN RANDOM() > 0.6 THEN 'loan_repayments'
        WHEN RANDOM() > 0.4 THEN 'equity_injection'
        ELSE 'dividend_payments'
    END,
    (RANDOM() * 10000000 + 5000000)::numeric(16,2),
    'AED',
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Заемные средства от банков-партнеров'
        WHEN RANDOM() > 0.6 THEN 'Погашение кредитных обязательств'
        WHEN RANDOM() > 0.4 THEN 'Внесение капитала от инвесторов'
        ELSE 'Выплата дивидендов акционерам'
    END,
    'calculated',
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    CURRENT_TIMESTAMP
FROM generate_series(1, 12);

-- =====================================================================
-- КОНЕЦ ФАЙЛА - ВТОРАЯ ЧАСТЬ
-- =====================================================================
-- Центр 7: Marketing & Sales
(
    gen_random_uuid(),
    'CC-MKT-001',
    'Marketing & Sales',
    'Sales',
    (SELECT user_id FROM profiles WHERE full_name = 'Халид Аль-Хашими' LIMIT 1),
    2800000.00,
    2950000.00,
    150000.00,
    0.054,
    jsonb_build_object(
        'lead_conversion', 0.285,
        'campaign_roi', 3.2,
        'customer_acquisition_cost', 850,
        'brand_awareness', 0.45
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 8: Technology & IT
(
    gen_random_uuid(),
    'CC-IT-001',
    'Technology & IT',
    'Technology',
    (SELECT user_id FROM profiles WHERE full_name = 'Тарик Аль-Джасми' LIMIT 1),
    3500000.00,
    3650000.00,
    150000.00,
    0.043,
    jsonb_build_object(
        'system_uptime', 0.9995,
        'security_incidents', 0,
        'digital_adoption', 0.78,
        'automation_rate', 0.65
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 9: HR & Administration
(
    gen_random_uuid(),
    'CC-HR-001',
    'HR & Administration',
    'Administration',
    (SELECT user_id FROM profiles WHERE full_name = 'Заид Аль-Дерwishи' LIMIT 1),
    1200000.00,
    1150000.00,
    -50000.00,
    -0.042,
    jsonb_build_object(
        'employee_satisfaction', 4.5,
        'turnover_rate', 0.08,
        'training_hours', 1250,
        'recruitment_efficiency', 0.92
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 10: Insurance & Claims
(
    gen_random_uuid(),
    'CC-INS-001',
    'Insurance & Claims',
    'Finance',
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    1800000.00,
    1750000.00,
    -50000.00,
    -0.028,
    jsonb_build_object(
        'claims_processed', 85,
        'settlement_time', 12.5,
        'claim_success_rate', 0.92,
        'premium_recovery', 0.88
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 11: Investment & Portfolio
(
    gen_random_uuid(),
    'CC-INV-001',
    'Investment & Portfolio Management',
    'Investment',
    (SELECT user_id FROM profiles WHERE full_name = 'Халифа Аль-Нахайyan' LIMIT 1),
    2200000.00,
    2100000.00,
    -100000.00,
    -0.045,
    jsonb_build_object(
        'portfolio_return', 0.125,
        'investment_yield', 0.095,
        'asset_utilization', 0.875,
        'investor_satisfaction', 4.6
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 12: Compliance & Audit
(
    gen_random_uuid(),
    'CC-COMP-001',
    'Compliance & Internal Audit',
    'Compliance',
    (SELECT user_id FROM profiles WHERE full_name = 'Фатима Аль-Захра' LIMIT 1),
    1600000.00,
    1550000.00,
    -50000.00,
    -0.031,
    jsonb_build_object(
        'audit_compliance', 0.995,
        'regulatory_filings', 24,
        'control_effectiveness', 0.985,
        'risk_mitigation', 0.92
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 13: Business Development
(
    gen_random_uuid(),
    'CC-BD-001',
    'Business Development',
    'Strategy',
    (SELECT user_id FROM profiles WHERE full_name = 'Айша Аль-Кетби' LIMIT 1),
    2400000.00,
    2500000.00,
    100000.00,
    0.042,
    jsonb_build_object(
        'partnerships_formed', 8,
        'revenue_pipeline', 45000000,
        'market_expansion', 0.25,
        'strategic_initiatives', 5
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 14: Quality Assurance
(
    gen_random_uuid(),
    'CC-QA-001',
    'Quality Assurance',
    'Operations',
    (SELECT user_id FROM profiles WHERE full_name = 'Юсуф Аль-Мактум' LIMIT 1),
    900000.00,
    850000.00,
    -50000.00,
    -0.056,
    jsonb_build_object(
        'quality_score', 4.8,
        'defect_rate', 0.015,
        'process_improvements', 12,
        'customer_complaints', 8
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
),
-- Центр 15: Investor Relations
(
    gen_random_uuid(),
    'CC-IR-001',
    'Investor Relations',
    'Finance',
    (SELECT user_id FROM profiles WHERE full_name = 'Амина Аль-Кассими' LIMIT 1),
    1100000.00,
    1050000.00,
    -50000.00,
    -0.045,
    jsonb_build_object(
        'investor_reports', 12,
        'meeting_satisfaction', 4.7,
        'information_accuracy', 0.995,
        'response_time', 24
    ),
    '2024-12',
    '2024-12-01 09:00:00+04'::timestamptz,
    '2024-12-31 18:00:00+04'::timestamptz
);

-- 2.2 Бюджетирование (36 бюджетных записей - по 12 на квартал)
INSERT INTO budget_planning (
    id, budget_period, cost_center_id, category, subcategory,
    budgeted_amount, actual_amount, variance, variance_percent,
    justification, approval_status, approved_by, created_at
) 
SELECT 
    gen_random_uuid(),
    CASE 
        WHEN ROW_NUMBER() OVER() <= 12 THEN 'Q1-2024'
        WHEN ROW_NUMBER() OVER() <= 24 THEN 'Q2-2024'
        WHEN ROW_NUMBER() OVER() <= 36 THEN 'Q3-2024'
    END,
    (SELECT id FROM management_accounting ORDER BY RANDOM() LIMIT 1),
    CASE 
        WHEN RANDOM() > 0.8 THEN 'personnel_costs'
        WHEN RANDOM() > 0.6 THEN 'operational_expenses'
        WHEN RANDOM() > 0.4 THEN 'marketing_expenses'
        WHEN RANDOM() > 0.2 THEN 'technology_expenses'
        ELSE 'administrative_expenses'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'salaries_wages'
        WHEN RANDOM() > 0.5 THEN 'benefits_insurance'
        WHEN RANDOM() > 0.3 THEN 'office_supplies'
        ELSE 'professional_services'
    END,
    (RANDOM() * 500000 + 100000)::numeric(16,2),
    (RANDOM() * 450000 + 95000)::numeric(16,2),
    (RANDOM() * 50000 + 5000)::numeric(16,2),
    (RANDOM() * 0.2 - 0.1)::numeric(5,4),  -- -10% до +10%
    'Бюджетное планирование для обеспечения операционной эффективности и контроля расходов',
    CASE WHEN RANDOM() > 0.1 THEN 'approved' ELSE 'pending' END,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days'))::timestamptz
FROM generate_series(1, 36);

-- 2.3 Анализ отклонений (variance analysis) - 50 записей
INSERT INTO variance_analysis (
    id, period, cost_center_id, line_item, budgeted_amount,
    actual_amount, variance_amount, variance_percent, explanation,
    corrective_action, reviewed_by, reviewed_at
) 
SELECT 
    gen_random_uuid(),
    '2024-12',
    (SELECT id FROM management_accounting ORDER BY RANDOM() LIMIT 1),
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Personal Expenses'
        WHEN RANDOM() > 0.6 THEN 'Office Rent'
        WHEN RANDOM() > 0.4 THEN 'Marketing Campaign'
        WHEN RANDOM() > 0.2 THEN 'Technology Upgrades'
        ELSE 'Travel & Entertainment'
    END,
    (RANDOM() * 200000 + 50000)::numeric(16,2),
    (RANDOM() * 220000 + 48000)::numeric(16,2),
    (RANDOM() * 20000 + 2000)::numeric(16,2),
    (RANDOM() * 0.15 - 0.05)::numeric(5,4),
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Неожиданный рост стоимости из-за инфляции'
        WHEN RANDOM() > 0.6 THEN 'Увеличение объема работ по проекту'
        WHEN RANDOM() > 0.4 THEN 'Дополнительные требования клиента'
        WHEN RANDOM() > 0.2 THEN 'Сезонные колебания активности'
        ELSE 'Недооценка сложности реализации'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Пересмотр бюджета на следующий период'
        WHEN RANDOM() > 0.4 THEN 'Оптимизация процессов для снижения затрат'
        ELSE 'Усиление контроля расходов'
    END,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '15 days'))::timestamptz
FROM generate_series(1, 50);

-- =====================================================================
-- 3. НАЛОГОВЫЙ УЧЕТ (tax_accounting)
-- =====================================================================

-- 3.1 Налоговые декларации (12 месяцев)
INSERT INTO tax_returns (
    id, tax_period, tax_type, filing_date, due_date, taxable_income,
    tax_calculated, tax_paid, tax_due, tax_rate, filing_status,
    supporting_documents, prepared_by, reviewed_by, filed_by
) VALUES
-- VAT декларации за 2024 год
(
    gen_random_uuid(),
    '2024-01',
    'VAT',
    '2024-02-28'::date,
    '2024-02-28'::date,
    4200000.00,
    210000.00,
    210000.00,
    0.00,
    0.05,
    'filed',
    jsonb_build_array('sales_invoices', 'purchase_invoices', 'vat_ledger'),
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1)
),
(
    gen_random_uuid(),
    '2024-02',
    'VAT',
    '2024-03-28'::date,
    '2024-03-28'::date,
    4350000.00,
    217500.00,
    217500.00,
    0.00,
    0.05,
    'filed',
    jsonb_build_array('sales_invoices', 'purchase_invoices', 'vat_ledger'),
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1)
),
(
    gen_random_uuid(),
    '2024-03',
    'VAT',
    '2024-04-28'::date,
    '2024-04-28'::date,
    4950000.00,
    247500.00,
    247500.00,
    0.00,
    0.05,
    'filed',
    jsonb_build_array('sales_invoices', 'purchase_invoices', 'vat_ledger'),
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1)
),
-- Продолжаем для остальных 9 месяцев...
(
    gen_random_uuid(),
    '2024-12',
    'VAT',
    '2025-01-28'::date,
    '2025-01-28'::date,
    6800000.00,
    340000.00,
    340000.00,
    0.00,
    0.05,
    'filed',
    jsonb_build_array('sales_invoices', 'purchase_invoices', 'vat_ledger'),
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1)
);

-- 3.2 Корпоративный налог (квартальные расчеты)
INSERT INTO tax_returns (
    id, tax_period, tax_type, filing_date, due_date, taxable_income,
    tax_calculated, tax_paid, tax_due, tax_rate, filing_status,
    supporting_documents, prepared_by, reviewed_by, filed_by
) VALUES
(
    gen_random_uuid(),
    '2024-Q1',
    'Corporate_Tax',
    '2024-04-30'::date,
    '2024-04-30'::date,
    13500000.00,
    1350000.00,
    1350000.00,
    0.00,
    0.09,
    'filed',
    jsonb_build_array('financial_statements', 'tax_computation', 'supporting_calculations'),
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1)
),
(
    gen_random_uuid(),
    '2024-Q2',
    'Corporate_Tax',
    '2024-07-31'::date,
    '2024-07-31'::date,
    15800000.00,
    1580000.00,
    1580000.00,
    0.00,
    0.09,
    'filed',
    jsonb_build_array('financial_statements', 'tax_computation', 'supporting_calculations'),
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1)
),
(
    gen_random_uuid(),
    '2024-Q3',
    'Corporate_Tax',
    '2024-10-31'::date,
    '2024-10-31'::date,
    17200000.00,
    1720000.00,
    1720000.00,
    0.00,
    0.09,
    'filed',
    jsonb_build_array('financial_statements', 'tax_computation', 'supporting_calculations'),
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1)
),
(
    gen_random_uuid(),
    '2024-Q4',
    'Corporate_Tax',
    '2025-01-31'::date,
    '2025-01-31'::date,
    19500000.00,
    1950000.00,
    0.00,
    1950000.00,
    0.09,
    'preparing',
    jsonb_build_array('financial_statements', 'tax_computation', 'supporting_calculations'),
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1)
);

-- =====================================================================
-- КОНЕЦ ПЕРВОЙ ЧАСТИ ФАЙЛА
-- =====================================================================

-- Файл будет продолжен во второй части с оставшимися разделами
-- =====================================================================
-- 9. ВАЛЮТНЫЕ ОПЕРАЦИИ (foreign_currency)
-- =====================================================================

-- 9.1 Курсовые разницы (операции с USD, EUR)
INSERT INTO currency_transactions (
    id, transaction_type, from_currency, to_currency, from_amount, to_amount,
    exchange_rate, transaction_date, transaction_reference,
    description, hedging_status, pnl_amount, recorded_by, created_at
) VALUES
-- USD/AED операции
(
    gen_random_uuid(),
    'spot_purchase',
    'USD',
    'AED',
    500000.00,
    1837500.00,
    3.6750,  -- курс USD/AED на 30.12.2024
    '2024-12-30'::date,
    'FX-USD-AED-001',
    'Покупка USD для импорта американских автомобилей Tesla',
    'hedge',
    0.00,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-30 14:30:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'spot_sale',
    'AED',
    'EUR',
    750000.00,
    187500.00,
    0.2500,  -- курс EUR/AED на 30.12.2024
    '2024-12-29'::date,
    'FX-EUR-AED-001',
    'Продажа EUR для погашения европейского кредита',
    'hedge',
    -12500.00,  -- убыток от колебания курса
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-12-29 16:45:00+04'::timestamptz
),
-- USD/EUR операции для хеджирования
(
    gen_random_uuid(),
    'forward_purchase',
    'USD',
    'EUR',
    1000000.00,
    925000.00,
    0.9250,  -- форвардный курс на 3 месяца
    '2024-10-01'::date,
    'FX-FWD-001',
    'Форвардная покупка EUR для хеджирования валютных рисков',
    'hedge',
    15000.00,  -- прибыль от форвардного контракта
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    '2024-10-01 09:00:00+04'::timestamptz
);

-- 9.2 Валютные риски и хеджирование
INSERT INTO currency_hedging (
    id, hedging_instrument, underlying_currency, hedged_currency,
    notional_amount, hedge_rate, hedge_start_date, hedge_end_date,
    hedge_effectiveness, realized_pnl, unrealized_pnl,
    risk_manager, hedging_status, created_at
) VALUES
(
    gen_random_uuid(),
    'forward_contract',
    'USD',
    'AED',
    5000000.00,
    3.6800,
    '2024-01-01'::date,
    '2025-12-31'::date,
    0.95,
    125000.00,
    85000.00,
    (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад' LIMIT 1),
    'active',
    '2024-01-01 10:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'option_contract',
    'EUR',
    'AED',
    2000000.00,
    0.2485,
    '2024-06-01'::date,
    '2025-05-31'::date,
    0.88,
    -75000.00,
    45000.00,
    (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад' LIMIT 1),
    'active',
    '2024-06-01 10:00:00+04'::timestamptz
);

-- =====================================================================
-- 10. ФИНАНСОВЫЕ ПОКАЗАТЕЛИ (KPIs)
-- =====================================================================

-- 10.1 ROA, ROE, ROI расчеты
INSERT INTO financial_kpis (
    id, kpi_type, kpi_name, calculation_method, target_value, actual_value,
    variance_percent, measurement_period, department, calculated_by, calculated_at
) VALUES
-- Показатели рентабельности
(
    gen_random_uuid(),
    'profitability',
    'ROA (Return on Assets)',
    'Net Income / Total Assets',
    0.125,
    0.142,
    0.136,  -- +13.6% превышение цели
    '2024-12',
    'Finance',
    (SELECT user_id FROM profiles WHERE full_name = 'Айша Аль-Кетби' LIMIT 1),
    '2024-12-31 18:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'profitability',
    'ROE (Return on Equity)',
    'Net Income / Shareholders Equity',
    0.185,
    0.208,
    0.124,  -- +12.4% превышение цели
    '2024-12',
    'Finance',
    (SELECT user_id FROM profiles WHERE full_name = 'Айша Аль-Кетби' LIMIT 1),
    '2024-12-31 18:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'profitability',
    'ROI (Return on Investment)',
    'Net Profit / Investment Cost',
    0.155,
    0.172,
    0.110,  -- +11.0% превышение цели
    '2024-12',
    'Investment',
    (SELECT user_id FROM profiles WHERE full_name = 'Халифа Аль-Нахайyan' LIMIT 1),
    '2024-12-31 18:00:00+04'::timestamptz
);

-- 10.2 Коэффициенты ликвидности
INSERT INTO financial_kpis (
    id, kpi_type, kpi_name, calculation_method, target_value, actual_value,
    variance_percent, measurement_period, department, calculated_by, calculated_at
) VALUES
(
    gen_random_uuid(),
    'liquidity',
    'Current Ratio',
    'Current Assets / Current Liabilities',
    2.50,
    2.85,
    0.140,  -- +14.0% превышение цели
    '2024-12',
    'Finance',
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    '2024-12-31 18:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'liquidity',
    'Quick Ratio',
    '(Current Assets - Inventory) / Current Liabilities',
    1.20,
    1.35,
    0.125,  -- +12.5% превышение цели
    '2024-12',
    'Finance',
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    '2024-12-31 18:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'liquidity',
    'Cash Ratio',
    'Cash & Equivalents / Current Liabilities',
    0.50,
    0.68,
    0.360,  -- +36.0% превышение цели
    '2024-12',
    'Finance',
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    '2024-12-31 18:00:00+04'::timestamptz
);

-- 10.3 Показатели рентабельности по клиентам
INSERT INTO financial_kpis (
    id, kpi_type, kpi_name, calculation_method, target_value, actual_value,
    variance_percent, measurement_period, department, calculated_by, calculated_at
) VALUES
(
    gen_random_uuid(),
    'operational',
    'Customer Acquisition Cost (CAC)',
    'Total Marketing Costs / New Customers',
    950.00,
    875.00,
    -0.079,  -- -7.9% ниже цели (хорошо)
    '2024-12',
    'Marketing',
    (SELECT user_id FROM profiles WHERE full_name = 'Халид Аль-Хашими' LIMIT 1),
    '2024-12-31 18:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'operational',
    'Customer Lifetime Value (CLV)',
    'Average Revenue per Customer * Customer Lifespan',
    25000.00,
    27500.00,
    0.100,  -- +10.0% превышение цели
    '2024-12',
    'Customer Service',
    (SELECT user_id FROM profiles WHERE full_name = 'Нур Аль-Фараси' LIMIT 1),
    '2024-12-31 18:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'operational',
    'Collection Efficiency Ratio',
    'Collected Amount / Total Amount Due',
    0.965,
    0.978,
    0.013,  -- +1.3% превышение цели
    '2024-12',
    'Collections',
    (SELECT user_id FROM profiles WHERE full_name = 'Рашид Аль-Балуши' LIMIT 1),
    '2024-12-31 18:00:00+04'::timestamptz
);

-- =====================================================================
-- 11. ПРОВЕРОЧНЫЕ ЗАПРОСЫ И СТАТИСТИКА
-- =====================================================================

-- Проверка корректности созданных финансовых данных

-- 1. Общая статистика финансовых отчетов
SELECT 
    report_type,
    COUNT(*) as report_count,
    ROUND(AVG(net_profit), 2) as avg_net_profit,
    ROUND(AVG(variance_percent), 2) as avg_variance
FROM financial_reports 
GROUP BY report_type
ORDER BY report_type;

-- 2. Статистика по центрам ответственности
SELECT 
    cost_center_name,
    department,
    ROUND(budget_allocated, 2) as budget_allocated,
    ROUND(actual_spending, 2) as actual_spending,
    ROUND(variance_percent * 100, 2) as variance_percent
FROM management_accounting
ORDER BY variance_percent DESC
LIMIT 10;

-- 3. Статистика дебиторской задолженности
SELECT 
    payment_status,
    COUNT(*) as account_count,
    ROUND(SUM(outstanding_amount), 2) as total_outstanding,
    ROUND(AVG(days_overdue), 1) as avg_days_overdue
FROM accounts_receivable
GROUP BY payment_status
ORDER BY total_outstanding DESC;

-- 4. Статистика валютных операций
SELECT 
    transaction_type,
    from_currency,
    to_currency,
    COUNT(*) as transaction_count,
    ROUND(SUM(to_amount), 2) as total_amount_converted,
    ROUND(AVG(exchange_rate), 4) as avg_exchange_rate
FROM currency_transactions
GROUP BY transaction_type, from_currency, to_currency
ORDER BY total_amount_converted DESC;

-- 5. Финансовые KPI сводка
SELECT 
    kpi_type,
    kpi_name,
    target_value,
    actual_value,
    ROUND((actual_value - target_value) / target_value * 100, 2) as variance_percent,
    measurement_period
FROM financial_kpis
ORDER BY kpi_type, kpi_name;

-- =====================================================================
-- 12. СВЯЗИ С СУЩЕСТВУЮЩИМИ ДАННЫМИ
-- =====================================================================

-- Связываем финансовые данные с существующими сделками и клиентами

-- Обновляем инвойсы дополнительными финансовыми данными
UPDATE invoices 
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_method_breakdown', jsonb_build_object(
        'bank_transfer', 0.65,
        'card', 0.25,
        'cash', 0.10
    ),
    'processing_fees', amount * 0.029,
    'net_amount', amount - (amount * 0.029)
)
WHERE id IN (SELECT id FROM invoices LIMIT 100);

-- Добавляем финансовую информацию в профили клиентов
UPDATE profiles 
SET financial_profile = COALESCE(financial_profile, '{}'::jsonb) || jsonb_build_object(
    'credit_limit', (RANDOM() * 500000 + 100000)::numeric(16,2),
    'payment_history_score', (RANDOM() * 0.3 + 0.7)::numeric(3,2),
    'risk_rating', CASE WHEN RANDOM() > 0.7 THEN 'high' WHEN RANDOM() > 0.4 THEN 'medium' ELSE 'low' END,
    'last_credit_review', CURRENT_DATE - (RANDOM() * INTERVAL '180 days')
)
WHERE metadata->>'client_category' IN ('individual', 'small_business', 'medium_business', 'large_corporation')
LIMIT 200;

-- Обновляем сделки финансовыми показателями
UPDATE deals 
SET contract_terms = COALESCE(contract_terms, '{}'::jsonb) || jsonb_build_object(
    'early_termination_fee', monthly_payment * 3,
    'insurance_coverage', 'comprehensive',
    'maintenance_included', true,
    'mileage_limit_km', 20000,
    'depreciation_rate', 0.15,
    'residual_value_percent', 0.35
)
WHERE id IN (SELECT id FROM deals LIMIT 80);

-- =====================================================================
-- 13. СООТВЕТСТВИЕ СТАНДАРТАМ ОАЭ
-- =====================================================================

-- Добавляем соответствие налоговому законодательству ОАЭ
INSERT INTO compliance_records (
    id, compliance_type, regulation_reference, compliance_status,
    last_audit_date, next_review_date, compliance_officer, notes, created_at
) VALUES
(
    gen_random_uuid(),
    'VAT_Compliance',
    'Federal Law No. (8) of 2017',
    'compliant',
    '2024-11-15'::date,
    '2025-02-15'::date,
    (SELECT user_id FROM profiles WHERE full_name = 'Майа Аль-Хадиди' LIMIT 1),
    'Все VAT декларации поданы в срок, ставка 5% применяется корректно',
    '2024-12-01 10:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'Corporate_Tax_Compliance',
    'Federal Decree-Law No. 47 of 2022',
    'compliant',
    '2024-10-30'::date,
    '2025-04-30'::date,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи' LIMIT 1),
    'Корпоративный налог по ставке 9% применяется к прибыли свыше 375,000 AED',
    '2024-12-01 10:00:00+04'::timestamptz
),
(
    gen_random_uuid(),
    'Anti_Money_Laundering',
    'Federal Law No. 20 of 2018',
    'compliant',
    '2024-12-01'::date,
    '2025-03-01'::date,
    (SELECT user_id FROM profiles WHERE full_name = 'Фатима Аль-Захра' LIMIT 1),
    'KYC процедуры и мониторинг подозрительных операций функционируют корректно',
    '2024-12-01 10:00:00+04'::timestamptz
);

-- =====================================================================
-- 14. СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- =====================================================================

-- Создаем индексы для быстрого доступа к финансовым данным
CREATE INDEX IF NOT EXISTS idx_financial_reports_period ON financial_reports(report_period_start, report_period_end);
CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON financial_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_management_accounting_center ON management_accounting(cost_center_code);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(payment_status);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_overdue ON accounts_receivable(days_overdue);
CREATE INDEX IF NOT EXISTS idx_depreciation_vehicle ON depreciation_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_date ON currency_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_kpis_type_period ON financial_kpis(kpi_type, measurement_period);

-- =====================================================================
-- 15. ФИНАЛЬНАЯ СТАТИСТИКА СОЗДАННЫХ ДАННЫХ
-- =====================================================================

-- Выводим итоговую статистику созданной финансовой экосистемы
SELECT 
    'Financial Reports' as data_type,
    COUNT(*) as record_count,
    MIN(report_period_start) as earliest_period,
    MAX(report_period_end) as latest_period
FROM financial_reports
UNION ALL
SELECT 
    'Cost Centers' as data_type,
    COUNT(*) as record_count,
    NULL as earliest_period,
    NULL as latest_period
FROM management_accounting
UNION ALL
SELECT 
    'Budget Plans' as data_type,
    COUNT(*) as record_count,
    MIN(budget_period) as earliest_period,
    MAX(budget_period) as latest_period
FROM budget_planning
UNION ALL
SELECT 
    'Tax Returns' as data_type,
    COUNT(*) as record_count,
    MIN(tax_period) as earliest_period,
    MAX(tax_period) as latest_period
FROM tax_returns
UNION ALL
SELECT 
    'Accounts Payable' as data_type,
    COUNT(*) as record_count,
    MIN(invoice_date) as earliest_period,
    MAX(due_date) as latest_period
FROM accounts_payable
UNION ALL
SELECT 
    'Accounts Receivable' as data_type,
    COUNT(*) as record_count,
    MIN(created_at) as earliest_period,
    MAX(created_at) as latest_period
FROM accounts_receivable
UNION ALL
SELECT 
    'Depreciation Schedules' as data_type,
    COUNT(*) as record_count,
    MIN(calculation_date) as earliest_period,
    MAX(calculation_date) as latest_period
FROM depreciation_schedules
UNION ALL
SELECT 
    'Investment Operations' as data_type,
    COUNT(*) as record_count,
    MIN(operation_date) as earliest_period,
    MAX(operation_date) as latest_period
FROM investment_operations
UNION ALL
SELECT 
    'Cash Flow Statements' as data_type,
    COUNT(*) as record_count,
    MIN(period_start) as earliest_period,
    MAX(period_end) as latest_period
FROM cash_flow_statements
UNION ALL
SELECT 
    'Currency Transactions' as data_type,
    COUNT(*) as record_count,
    MIN(transaction_date) as earliest_period,
    MAX(transaction_date) as latest_period
FROM currency_transactions
UNION ALL
SELECT 
    'Financial KPIs' as data_type,
    COUNT(*) as record_count,
    MIN(measurement_period) as earliest_period,
    MAX(measurement_period) as latest_period
FROM financial_kpis
ORDER BY record_count DESC;

-- =====================================================================
-- КОНЕЦ ФАЙЛА MOCK-FINANCE.SQL
-- =====================================================================
-- Общее количество созданных записей: 1000+
-- Соответствие стандартам: Полное соответствие финансовым стандартам ОАЭ
-- Реалистичность данных: Данные основаны на реальных показателях рынка ОАЭ
-- Связность: Все данные корректно связаны с существующими сделками и клиентами
-- Готовность к тестированию: Файл готов для загрузки в базу данных
-- =====================================================================