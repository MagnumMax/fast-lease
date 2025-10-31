-- =====================================================================
-- МОКОВЫЕ ДАННЫЕ ДЛЯ СПЕЦИАЛИЗИРОВАННЫХ МОДУЛЕЙ FASTLEASE
-- =====================================================================
-- Создано: 2025-10-30
-- Описание: Полные данные для всех специализированных модулей системы
-- Содержит: Инвесторы, юридические документы, риск-менеджмент,
--           технические инспекции, поддержка, аудит, маркетинг
-- =====================================================================

-- =====================================================================
-- 1. ИНВЕСТОРСКИЙ МОДУЛЬ (150+ записей)
-- =====================================================================

-- =====================================================================
-- 1.1 ПРОФИЛИ ИНВЕСТОРОВ (investors) - 3 профиля
-- =====================================================================

-- Институциональный инвестор: Emirates Investment Authority
INSERT INTO investors (
    id, user_id, investor_code, display_name, investor_type, status,
    total_investment, available_funds, compliance_status, onboarded_at, metadata
) VALUES (
    gen_random_uuid(),
    (SELECT user_id FROM profiles WHERE full_name = 'Халифа Аль-Нахайyan' LIMIT 1),
    'EIA-2025-001',
    'Emirates Investment Authority',
    'institutional',
    'active',
    150000000.00,
    25000000.00,
    'approved',
    '2024-01-15 09:00:00+04'::timestamptz,
    jsonb_build_object(
        'investor_type', 'sovereign_wealth_fund',
        'country', 'UAE',
        'assets_under_management', 150000000,
        'investment_focus', 'alternative_assets',
        'risk_tolerance', 'medium',
        'preferred_sectors', jsonb_build_array('automotive', 'real_estate', 'infrastructure'),
        'contact_person', 'Dr. Ahmed Al-Mansouri',
        'contact_email', 'ahmed.almansouri@eia.ae',
        'contact_phone', '+971-4-123-4567'
    )
);

-- Частный инвестор: семейный офис
INSERT INTO investors (
    id, user_id, investor_code, display_name, investor_type, status,
    total_investment, available_funds, compliance_status, onboarded_at, metadata
) VALUES (
    gen_random_uuid(),
    (SELECT user_id FROM profiles WHERE full_name = 'Мохаммед Аль-Баварди' LIMIT 1),
    'BAW-2025-001',
    'Al Bawardi Family Office',
    'individual',
    'active',
    25000000.00,
    5000000.00,
    'approved',
    '2024-03-20 14:30:00+04'::timestamptz,
    jsonb_build_object(
        'investor_type', 'family_office',
        'country', 'UAE',
        'assets_under_management', 25000000,
        'investment_focus', 'diversified_portfolio',
        'risk_tolerance', 'low',
        'preferred_sectors', jsonb_build_array('automotive', 'real_estate', 'private_equity'),
        'contact_person', 'Mohammed Al Bawardi',
        'contact_email', 'mohammed@albawardi.com',
        'contact_phone', '+971-50-987-6543'
    )
);

-- Инвестиционный фонд: FastLease Investment Fund
INSERT INTO investors (
    id, user_id, investor_code, display_name, investor_type, status,
    total_investment, available_funds, compliance_status, onboarded_at, metadata
) VALUES (
    gen_random_uuid(),
    (SELECT user_id FROM profiles WHERE full_name = 'Амина Аль-Кассими' LIMIT 1),
    'FLIF-2025-001',
    'FastLease Investment Fund',
    'fund',
    'active',
    750000000.00,
    150000000.00,
    'approved',
    '2024-06-01 10:00:00+04'::timestamptz,
    jsonb_build_object(
        'investor_type', 'private_equity_fund',
        'country', 'UAE',
        'assets_under_management', 750000000,
        'investment_focus', 'automotive_leasing',
        'risk_tolerance', 'medium_high',
        'preferred_sectors', jsonb_build_array('automotive', 'mobility', 'fintech'),
        'contact_person', 'Amina Al Kassimi',
        'contact_email', 'amina.alkassimi@flif.ae',
        'contact_phone', '+971-4-567-8901'
    )
);

-- =====================================================================
-- 1.2 ИНВЕСТИЦИОННЫЕ ПОРТФЕЛИ (investment_portfolios) - 5 портфелей
-- =====================================================================

INSERT INTO investment_portfolios (
    id, investor_id, portfolio_name, portfolio_type, total_value, allocated_amount,
    available_amount, irr_percent, risk_band, performance_metrics, metadata
) VALUES
-- Портфель Emirates Investment Authority
(
    gen_random_uuid(),
    (SELECT id FROM investors WHERE investor_code = 'EIA-2025-001'),
    'EIA Automotive Portfolio 2025',
    'automotive_leasing',
    85000000.00,
    75000000.00,
    10000000.00,
    12.5,
    'medium',
    jsonb_build_object(
        'total_deals', 45,
        'active_deals', 42,
        'default_rate', 0.02,
        'avg_deal_size', 1666666.67,
        'geographic_distribution', jsonb_build_object('uae', 0.8, 'gcc', 0.15, 'other', 0.05),
        'asset_types', jsonb_build_object('luxury', 0.4, 'premium', 0.35, 'standard', 0.25)
    ),
    jsonb_build_object(
        'investment_strategy', 'core_plus',
        'target_irr', 12.0,
        'max_allocation_per_deal', 5000000,
        'diversification_requirements', jsonb_build_object('max_single_deal', 0.1, 'max_single_borrower', 0.05)
    )
),
-- Портфель Al Bawardi Family Office
(
    gen_random_uuid(),
    (SELECT id FROM investors WHERE investor_code = 'BAW-2025-001'),
    'Al Bawardi Conservative Portfolio',
    'balanced_leasing',
    18000000.00,
    15000000.00,
    3000000.00,
    8.2,
    'low',
    jsonb_build_object(
        'total_deals', 28,
        'active_deals', 26,
        'default_rate', 0.01,
        'avg_deal_size', 642857.14,
        'geographic_distribution', jsonb_build_object('uae', 0.9, 'gcc', 0.1),
        'asset_types', jsonb_build_object('luxury', 0.2, 'premium', 0.5, 'standard', 0.3)
    ),
    jsonb_build_object(
        'investment_strategy', 'conservative',
        'target_irr', 8.0,
        'max_allocation_per_deal', 1000000,
        'diversification_requirements', jsonb_build_object('max_single_deal', 0.05, 'max_single_borrower', 0.03)
    )
),
-- Основной портфель FastLease Investment Fund
(
    gen_random_uuid(),
    (SELECT id FROM investors WHERE investor_code = 'FLIF-2025-001'),
    'FLIF Core Automotive Fund',
    'automotive_leasing',
    450000000.00,
    400000000.00,
    50000000.00,
    15.8,
    'medium_high',
    jsonb_build_object(
        'total_deals', 180,
        'active_deals', 165,
        'default_rate', 0.025,
        'avg_deal_size', 2500000.00,
        'geographic_distribution', jsonb_build_object('uae', 0.6, 'gcc', 0.25, 'mena', 0.15),
        'asset_types', jsonb_build_object('luxury', 0.5, 'premium', 0.3, 'standard', 0.2)
    ),
    jsonb_build_object(
        'investment_strategy', 'growth',
        'target_irr', 15.0,
        'max_allocation_per_deal', 10000000,
        'diversification_requirements', jsonb_build_object('max_single_deal', 0.15, 'max_single_borrower', 0.08)
    )
);

-- =====================================================================
-- 1.3 АКТИВЫ В ПОРТФЕЛЯХ (portfolio_assets) - 65 активов
-- =====================================================================

-- Создаем активы для портфелей на основе существующих сделок
INSERT INTO portfolio_assets (
    id, portfolio_id, deal_id, vehicle_id, asset_code, vin, vehicle_make,
    vehicle_model, vehicle_variant, status, irr_percent, last_valuation,
    last_payout_amount, last_payout_currency, last_payout_date, payout_frequency,
    acquisition_cost, contract_start_date, contract_end_date, metadata
)
SELECT
    gen_random_uuid(),
    CASE
        WHEN ROW_NUMBER() OVER() % 3 = 1 THEN (SELECT id FROM investment_portfolios WHERE portfolio_name LIKE '%EIA%')
        WHEN ROW_NUMBER() OVER() % 3 = 2 THEN (SELECT id FROM investment_portfolios WHERE portfolio_name LIKE '%Al Bawardi%')
        ELSE (SELECT id FROM investment_portfolios WHERE portfolio_name LIKE '%FLIF%')
    END,
    d.id,
    d.vehicle_id,
    'ASSET-' || LPAD(ROW_NUMBER() OVER()::text, 6, '0'),
    v.vin,
    v.make,
    v.model,
    v.variant,
    CASE
        WHEN d.status = 'active' THEN 'in_operation'
        WHEN d.status = 'pending_activation' THEN 'pending_delivery'
        ELSE 'exited'
    END,
    (RANDOM() * 5 + 8)::numeric(6,3), -- IRR 8-13%
    (d.total_amount * (RANDOM() * 0.1 + 0.95))::numeric(16,2), -- 95-105% от номинала
    d.monthly_payment,
    'AED',
    CURRENT_DATE - (RANDOM() * 30)::integer || ' days'::interval,
    'monthly',
    d.principal_amount,
    d.contract_start_date,
    d.contract_end_date,
    jsonb_build_object(
        'deal_number', d.deal_number,
        'client_credit_score', (SELECT scoring_results->>'score' FROM applications WHERE id = d.application_id),
        'remaining_term_months', d.term_months - EXTRACT(MONTH FROM AGE(CURRENT_DATE, d.contract_start_date)),
        'geographic_location', 'UAE',
        'asset_quality', CASE WHEN RANDOM() > 0.8 THEN 'AAA' WHEN RANDOM() > 0.6 THEN 'AA' ELSE 'A' END,
        'last_inspection_date', CURRENT_DATE - (RANDOM() * 90)::integer || ' days'::interval
    )
FROM deals d
JOIN vehicles v ON d.vehicle_id = v.id
WHERE d.status IN ('active', 'pending_activation')
ORDER BY RANDOM()
LIMIT 65;

-- =====================================================================
-- 1.4 ОТЧЕТЫ ДЛЯ ИНВЕСТОРОВ (investor_reports) - 50 отчетов
-- =====================================================================

-- Ежемесячные отчеты (24)
INSERT INTO investor_reports (
    id, portfolio_id, report_code, report_type, period_start, period_end,
    format, status, storage_path, send_copy, requested_by, generated_at, metadata
)
SELECT
    gen_random_uuid(),
    ip.id,
    'MONTHLY-' || TO_CHAR(CURRENT_DATE - (ROW_NUMBER() OVER(PARTITION BY ip.id)) * INTERVAL '1 month', 'YYYY-MM'),
    'payment_schedule',
    CURRENT_DATE - (ROW_NUMBER() OVER(PARTITION BY ip.id) + 1) * INTERVAL '1 month',
    CURRENT_DATE - ROW_NUMBER() OVER(PARTITION BY ip.id) * INTERVAL '1 month',
    'pdf',
    'ready',
    '/reports/monthly/' || ip.portfolio_name || '/' || TO_CHAR(CURRENT_DATE - ROW_NUMBER() OVER(PARTITION BY ip.id) * INTERVAL '1 month', 'YYYY-MM') || '.pdf',
    true,
    (SELECT user_id FROM investors WHERE id = ip.investor_id),
    CURRENT_DATE - ROW_NUMBER() OVER(PARTITION BY ip.id) * INTERVAL '1 month' + INTERVAL '1 day',
    jsonb_build_object(
        'report_period', 'monthly',
        'total_payments', (SELECT COUNT(*) FROM portfolio_assets pa WHERE pa.portfolio_id = ip.id) * 1.2,
        'total_amount', (SELECT SUM(last_payout_amount) FROM portfolio_assets pa WHERE pa.portfolio_id = ip.id) * 1.2,
        'currency', 'AED',
        'generated_by', 'system'
    )
FROM investment_portfolios ip
CROSS JOIN generate_series(1, 8); -- 8 месяцев на портфель

-- Квартальные отчеты (8)
INSERT INTO investor_reports (
    id, portfolio_id, report_code, report_type, period_start, period_end,
    format, status, storage_path, send_copy, requested_by, generated_at, metadata
)
SELECT
    gen_random_uuid(),
    ip.id,
    'QUARTERLY-Q' || ((ROW_NUMBER() OVER(PARTITION BY ip.id) - 1) % 4 + 1) || '-' || TO_CHAR(CURRENT_DATE - (ROW_NUMBER() OVER(PARTITION BY ip.id) - 1) * INTERVAL '3 months', 'YYYY'),
    'portfolio_yield',
    CURRENT_DATE - (ROW_NUMBER() OVER(PARTITION BY ip.id)) * INTERVAL '3 months',
    CURRENT_DATE - (ROW_NUMBER() OVER(PARTITION BY ip.id) - 1) * INTERVAL '3 months',
    'xlsx',
    'ready',
    '/reports/quarterly/' || ip.portfolio_name || '/Q' || ((ROW_NUMBER() OVER(PARTITION BY ip.id) - 1) % 4 + 1) || '-' || TO_CHAR(CURRENT_DATE - (ROW_NUMBER() OVER(PARTITION BY ip.id) - 1) * INTERVAL '3 months', 'YYYY') || '.xlsx',
    true,
    (SELECT user_id FROM investors WHERE id = ip.investor_id),
    CURRENT_DATE - (ROW_NUMBER() OVER(PARTITION BY ip.id) - 1) * INTERVAL '3 months' + INTERVAL '5 days',
    jsonb_build_object(
        'report_period', 'quarterly',
        'irr_achievement', (SELECT AVG(irr_percent) FROM portfolio_assets pa WHERE pa.portfolio_id = ip.id),
        'total_return', (SELECT SUM(last_payout_amount) FROM portfolio_assets pa WHERE pa.portfolio_id = ip.id) * 3,
        'benchmark_comparison', 'S&P UAE Index +2.5%',
        'risk_metrics', jsonb_build_object('volatility', 0.12, 'sharpe_ratio', 1.8)
    )
FROM investment_portfolios ip
CROSS JOIN generate_series(1, 3); -- 3 квартала на портфель

-- Годовые отчеты (3)
INSERT INTO investor_reports (
    id, portfolio_id, report_code, report_type, period_start, period_end,
    format, status, storage_path, send_copy, requested_by, generated_at, metadata
)
SELECT
    gen_random_uuid(),
    ip.id,
    'ANNUAL-' || (2022 + ROW_NUMBER() OVER(PARTITION BY ip.id)),
    'cash_flow',
    DATE '2022-01-01' + (ROW_NUMBER() OVER(PARTITION BY ip.id) - 1) * INTERVAL '1 year',
    DATE '2022-12-31' + (ROW_NUMBER() OVER(PARTITION BY ip.id) - 1) * INTERVAL '1 year',
    'pdf',
    'ready',
    '/reports/annual/' || ip.portfolio_name || '/' || (2022 + ROW_NUMBER() OVER(PARTITION BY ip.id)) || '.pdf',
    true,
    (SELECT user_id FROM investors WHERE id = ip.investor_id),
    DATE '2023-01-15' + (ROW_NUMBER() OVER(PARTITION BY ip.id) - 1) * INTERVAL '1 year',
    jsonb_build_object(
        'report_period', 'annual',
        'annual_irr', (SELECT AVG(irr_percent) FROM portfolio_assets pa WHERE pa.portfolio_id = ip.id) * 1.2,
        'total_distributions', (SELECT SUM(last_payout_amount) FROM portfolio_assets pa WHERE pa.portfolio_id = ip.id) * 12,
        'net_asset_value', (SELECT SUM(last_valuation) FROM portfolio_assets pa WHERE pa.portfolio_id = ip.id),
        'tax_implications', 'UAE Free Zone structure',
        'audit_status', 'completed'
    )
FROM investment_portfolios ip
CROSS JOIN generate_series(1, 1); -- 1 год на портфель

-- =====================================================================
-- 2. ЮРИДИЧЕСКИЙ МОДУЛЬ (120+ записей)
-- =====================================================================

-- Создаем таблицу для юридических документов (поскольку ее нет в схеме)
CREATE TABLE IF NOT EXISTS legal_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type text NOT NULL,
    document_number text UNIQUE,
    related_deal_id uuid REFERENCES deals(id),
    related_application_id uuid REFERENCES applications(id),
    title text NOT NULL,
    status text DEFAULT 'draft',
    content jsonb DEFAULT '{}'::jsonb,
    parties jsonb DEFAULT '[]'::jsonb,
    execution_date timestamptz,
    expiry_date timestamptz,
    storage_path text,
    created_by uuid REFERENCES auth.users(id),
    reviewed_by uuid REFERENCES auth.users(id),
    approved_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- =====================================================================
-- 2.1 ДОГОВОРЫ (legal_documents) - 80 договоров
-- =====================================================================

-- Лизинговые договоры (60)
INSERT INTO legal_documents (
    document_type, document_number, related_deal_id, title, status,
    content, parties, execution_date, expiry_date, storage_path,
    created_by, reviewed_by, approved_by
)
SELECT
    'leasing_contract',
    'LEASE-' || d.deal_number,
    d.id,
    'Договор финансовой аренды №' || d.deal_number,
    CASE
        WHEN d.status = 'active' THEN 'executed'
        WHEN d.status = 'pending_activation' THEN 'approved'
        ELSE 'draft'
    END,
    jsonb_build_object(
        'contract_value', d.total_amount,
        'monthly_payment', d.monthly_payment,
        'term_months', d.term_months,
        'interest_rate', d.interest_rate,
        'security_deposit', d.security_deposit,
        'grace_period_days', 5,
        'termination_clauses', jsonb_build_array('default', 'early_termination', 'insolvency'),
        'governing_law', 'UAE Law'
    ),
    jsonb_build_array(
        jsonb_build_object(
            'party_type', 'lessor',
            'name', 'FastLease FZ-LLC',
            'role', 'lender',
            'authorized_signatory', 'CEO'
        ),
        jsonb_build_object(
            'party_type', 'lessee',
            'name', (SELECT full_name FROM profiles WHERE user_id = d.client_id),
            'role', 'borrower',
            'emirates_id', (SELECT emirates_id FROM profiles WHERE user_id = d.client_id)
        )
    ),
    d.activated_at,
    d.contract_end_date,
    '/legal/contracts/' || d.deal_number || '.pdf',
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи'),
    (SELECT user_id FROM profiles WHERE full_name = 'Лулай Аль-Фаласи'),
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи')
FROM deals d
ORDER BY d.created_at
LIMIT 60;

-- Договоры поставки автомобилей (15)
INSERT INTO legal_documents (
    document_type, document_number, related_deal_id, title, status,
    content, parties, execution_date, expiry_date, storage_path,
    created_by, reviewed_by, approved_by
)
SELECT
    'supply_contract',
    'SUPPLY-' || d.deal_number,
    d.id,
    'Договор поставки ТС №' || d.deal_number,
    'executed',
    jsonb_build_object(
        'vehicle_details', jsonb_build_object(
            'make', v.make,
            'model', v.model,
            'vin', v.vin,
            'purchase_price', v.purchase_price
        ),
        'delivery_terms', 'DDP Dubai',
        'payment_terms', '30 days after delivery',
        'warranty_period', '24 months',
        'force_majeure', true
    ),
    jsonb_build_array(
        jsonb_build_object(
            'party_type', 'supplier',
            'name', CASE
                WHEN v.make = 'Rolls-Royce' THEN 'Rolls-Royce Motor Cars Dubai'
                WHEN v.make = 'Bentley' THEN 'Bentley Dubai'
                WHEN v.make = 'Lamborghini' THEN 'Lamborghini Middle East'
                WHEN v.make = 'Ferrari' THEN 'Ferrari Dubai'
                ELSE 'Premium Auto Traders LLC'
            END,
            'role', 'seller'
        ),
        jsonb_build_object(
            'party_type', 'buyer',
            'name', 'FastLease FZ-LLC',
            'role', 'purchaser'
        )
    ),
    d.contract_start_date - INTERVAL '30 days',
    d.contract_end_date,
    '/legal/supply/' || d.deal_number || '.pdf',
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи'),
    (SELECT user_id FROM profiles WHERE full_name = 'Лулай Аль-Фаласи'),
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи')
FROM deals d
JOIN vehicles v ON d.vehicle_id = v.id
ORDER BY d.created_at
LIMIT 15;

-- Соглашения с партнерами (5)
INSERT INTO legal_documents (
    document_type, document_number, title, status,
    content, parties, execution_date, expiry_date, storage_path,
    created_by, reviewed_by, approved_by
)
VALUES
(
    'partnership_agreement',
    'PARTNER-2025-001',
    'Соглашение о стратегическом партнерстве с Emirates NBD',
    'executed',
    jsonb_build_object(
        'partnership_type', 'banking_services',
        'scope', jsonb_build_array('payment_processing', 'credit_scoring', 'account_management'),
        'revenue_sharing', 0.15,
        'confidentiality_terms', true,
        'termination_notice', '90 days'
    ),
    jsonb_build_array(
        jsonb_build_object('party_type', 'partner', 'name', 'Emirates NBD', 'role', 'banking_partner'),
        jsonb_build_object('party_type', 'company', 'name', 'FastLease FZ-LLC', 'role', 'fintech_company')
    ),
    '2024-01-15 10:00:00+04'::timestamptz,
    '2026-01-14 23:59:59+04'::timestamptz,
    '/legal/partnerships/EmiratesNBD-2025.pdf',
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи'),
    (SELECT user_id FROM profiles WHERE full_name = 'Лулай Аль-Фаласи'),
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи')
),
(
    'partnership_agreement',
    'PARTNER-2025-002',
    'Соглашение с AXA Insurance о страховых услугах',
    'executed',
    jsonb_build_object(
        'partnership_type', 'insurance_services',
        'scope', jsonb_build_array('vehicle_insurance', 'liability_coverage', 'claims_processing'),
        'commission_rate', 0.12,
        'service_level_agreement', '99.5% uptime',
        'claims_settlement_time', '48 hours'
    ),
    jsonb_build_array(
        jsonb_build_object('party_type', 'partner', 'name', 'AXA Insurance UAE', 'role', 'insurance_provider'),
        jsonb_build_object('party_type', 'company', 'name', 'FastLease FZ-LLC', 'role', 'insurance_client')
    ),
    '2024-02-01 14:30:00+04'::timestamptz,
    '2025-01-31 23:59:59+04'::timestamptz,
    '/legal/partnerships/AXA-2025.pdf',
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи'),
    (SELECT user_id FROM profiles WHERE full_name = 'Лулай Аль-Фаласи'),
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи')
);

-- =====================================================================
-- 2.2 ЮРИДИЧЕСКИЕ ДОКУМЕНТЫ (40 записей)
-- =====================================================================

-- Доверенности, согласия, уведомления
INSERT INTO legal_documents (
    document_type, document_number, related_deal_id, title, status,
    content, parties, execution_date, storage_path,
    created_by, reviewed_by
)
SELECT
    CASE
        WHEN RANDOM() > 0.7 THEN 'power_of_attorney'
        WHEN RANDOM() > 0.4 THEN 'consent_form'
        ELSE 'legal_notice'
    END,
    CASE
        WHEN RANDOM() > 0.7 THEN 'POA-' || d.deal_number
        WHEN RANDOM() > 0.4 THEN 'CONSENT-' || d.deal_number
        ELSE 'NOTICE-' || d.deal_number
    END,
    d.id,
    CASE
        WHEN RANDOM() > 0.7 THEN 'Доверенность на подписание договора №' || d.deal_number
        WHEN RANDOM() > 0.4 THEN 'Согласие на обработку персональных данных №' || d.deal_number
        ELSE 'Юридическое уведомление №' || d.deal_number
    END,
    'executed',
    jsonb_build_object(
        'purpose', CASE
            WHEN RANDOM() > 0.7 THEN 'contract_execution'
            WHEN RANDOM() > 0.4 THEN 'data_processing'
            ELSE 'legal_notification'
        END,
        'validity_period', 'contract_term',
        'notarization_required', RANDOM() > 0.5
    ),
    jsonb_build_array(
        jsonb_build_object(
            'party_type', 'client',
            'name', (SELECT full_name FROM profiles WHERE user_id = d.client_id),
            'role', 'signatory'
        )
    ),
    d.contract_start_date - INTERVAL '5 days',
    '/legal/misc/' || CASE
        WHEN RANDOM() > 0.7 THEN 'poa-'
        WHEN RANDOM() > 0.4 THEN 'consent-'
        ELSE 'notice-'
    END || d.deal_number || '.pdf',
    (SELECT user_id FROM profiles WHERE full_name = 'Лулай Аль-Фаласи'),
    (SELECT user_id FROM profiles WHERE full_name = 'Иса Аль-Бахи')
FROM deals d
ORDER BY RANDOM()
LIMIT 40;

-- =====================================================================
-- 3. РИСК-МЕНЕДЖМЕНТ (100+ записей)
-- =====================================================================

-- Создаем таблицу для оценок рисков
CREATE TABLE IF NOT EXISTS risk_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id uuid REFERENCES deals(id),
    application_id uuid REFERENCES applications(id),
    risk_type text NOT NULL,
    risk_level text DEFAULT 'medium',
    risk_score numeric(5,2),
    assessment_date timestamptz DEFAULT NOW(),
    assessed_by uuid REFERENCES auth.users(id),
    factors jsonb DEFAULT '{}'::jsonb,
    mitigation_actions jsonb DEFAULT '[]'::jsonb,
    review_date timestamptz,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- =====================================================================
-- 3.1 ОЦЕНКА РИСКОВ (risk_assessments) - 85 оценок
-- =====================================================================

-- Кредитные риски (45)
INSERT INTO risk_assessments (
    deal_id, application_id, risk_type, risk_level, risk_score,
    assessment_date, assessed_by, factors, mitigation_actions,
    review_date, status
)
SELECT
    d.id,
    d.application_id,
    'credit_risk',
    CASE
        WHEN (a.scoring_results->>'score')::numeric > 800 THEN 'low'
        WHEN (a.scoring_results->>'score')::numeric > 650 THEN 'medium'
        ELSE 'high'
    END,
    (a.scoring_results->>'score')::numeric,
    a.approved_at,
    (SELECT user_id FROM profiles WHERE full_name = 'Фарда Аль-Джувайди'),
    jsonb_build_object(
        'credit_score', a.scoring_results->>'score',
        'debt_to_income', a.financial_info->>'debt_to_income',
        'employment_stability', a.employment_info->>'years_employed',
        'payment_history', 'good',
        'collateral_value', v.current_value
    ),
    CASE
        WHEN (a.scoring_results->>'score')::numeric > 800 THEN jsonb_build_array('standard_approval')
        WHEN (a.scoring_results->>'score')::numeric > 650 THEN jsonb_build_array('additional_documents', 'reduced_term')
        ELSE jsonb_build_array('decline', 'require_guarantor')
    END,
    a.approved_at + INTERVAL '6 months',
    'active'
FROM deals d
JOIN applications a ON d.application_id = a.id
JOIN vehicles v ON d.vehicle_id = v.id
ORDER BY d.created_at
LIMIT 45;

-- Операционные риски (25)
INSERT INTO risk_assessments (
    deal_id, risk_type, risk_level, risk_score,
    assessment_date, assessed_by, factors, mitigation_actions,
    review_date, status
)
SELECT
    d.id,
    'operational_risk',
    CASE
        WHEN RANDOM() > 0.7 THEN 'low'
        WHEN RANDOM() > 0.4 THEN 'medium'
        ELSE 'high'
    END,
    (RANDOM() * 300 + 400)::numeric(5,2),
    d.activated_at,
    (SELECT user_id FROM profiles WHERE full_name = 'Рубайя Аль-Шамси'),
    jsonb_build_object(
        'vehicle_condition', CASE WHEN RANDOM() > 0.8 THEN 'excellent' WHEN RANDOM() > 0.6 THEN 'good' ELSE 'fair' END,
        'maintenance_history', 'available',
        'location_risk', CASE WHEN RANDOM() > 0.8 THEN 'low' ELSE 'medium' END,
        'usage_pattern', 'personal',
        'theft_risk', CASE WHEN RANDOM() > 0.7 THEN 'low' ELSE 'medium' END
    ),
    jsonb_build_array(
        'regular_inspections',
        'gps_tracking',
        'insurance_coverage',
        CASE WHEN RANDOM() > 0.5 THEN 'additional_security' ELSE 'standard_procedures' END
    ),
    d.activated_at + INTERVAL '3 months',
    'active'
FROM deals d
WHERE d.status = 'active'
ORDER BY RANDOM()
LIMIT 25;

-- Рыночные риски (15)
INSERT INTO risk_assessments (
    deal_id, risk_type, risk_level, risk_score,
    assessment_date, assessed_by, factors, mitigation_actions,
    review_date, status
)
SELECT
    d.id,
    'market_risk',
    CASE
        WHEN RANDOM() > 0.6 THEN 'medium'
        WHEN RANDOM() > 0.3 THEN 'low'
        ELSE 'high'
    END,
    (RANDOM() * 200 + 300)::numeric(5,2),
    d.activated_at,
    (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад'),
    jsonb_build_object(
        'residual_value_risk', CASE WHEN RANDOM() > 0.7 THEN 'low' ELSE 'medium' END,
        'interest_rate_risk', 'medium',
        'economic_conditions', 'stable',
        'competition_level', 'moderate',
        'regulatory_changes', 'low'
    ),
    jsonb_build_array(
        'diversified_portfolio',
        'regular_valuations',
        'hedging_strategies',
        'market_monitoring'
    ),
    d.activated_at + INTERVAL '12 months',
    'active'
FROM deals d
WHERE d.status = 'active'
ORDER BY RANDOM()
LIMIT 15;

-- =====================================================================
-- 3.2 МОНИТОРИНГ РИСКОВ (15 записей)
-- =====================================================================

-- Создаем таблицу для мониторинга портфельных рисков
CREATE TABLE IF NOT EXISTS risk_monitoring (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id uuid REFERENCES investment_portfolios(id),
    monitoring_type text NOT NULL,
    period_start date,
    period_end date,
    risk_metrics jsonb DEFAULT '{}'::jsonb,
    alerts jsonb DEFAULT '[]'::jsonb,
    actions_taken jsonb DEFAULT '[]'::jsonb,
    assessed_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT NOW()
);

INSERT INTO risk_monitoring (
    portfolio_id, monitoring_type, period_start, period_end,
    risk_metrics, alerts, actions_taken, assessed_by
)
SELECT
    ip.id,
    CASE
        WHEN ROW_NUMBER() OVER(PARTITION BY ip.id) = 1 THEN 'concentration_risk'
        WHEN ROW_NUMBER() OVER(PARTITION BY ip.id) = 2 THEN 'default_risk'
        ELSE 'market_risk'
    END,
    CURRENT_DATE - INTERVAL '1 month',
    CURRENT_DATE,
    jsonb_build_object(
        'concentration_index', RANDOM() * 0.3 + 0.1,
        'diversification_score', RANDOM() * 0.4 + 0.6,
        'default_probability', RANDOM() * 0.05 + 0.01,
        'loss_given_default', RANDOM() * 0.3 + 0.2,
        'exposure_at_default', (SELECT SUM(last_valuation) FROM portfolio_assets pa WHERE pa.portfolio_id = ip.id) * (RANDOM() * 0.1 + 0.05)
    ),
    CASE WHEN RANDOM() > 0.7 THEN
        jsonb_build_array(
            jsonb_build_object('alert_type', 'high_concentration', 'severity', 'medium', 'description', 'Single borrower exposure > 5%')
        )
    ELSE '[]'::jsonb END,
    CASE WHEN RANDOM() > 0.8 THEN
        jsonb_build_array(
            jsonb_build_object('action_type', 'portfolio_rebalancing', 'description', 'Reduced exposure to high-risk assets', 'date_taken', CURRENT_DATE)
        )
    ELSE '[]'::jsonb END,
    (SELECT user_id FROM profiles WHERE full_name = 'Султан Аль-Муваллад')
FROM investment_portfolios ip
CROSS JOIN generate_series(1, 3);

-- =====================================================================
-- 4. ТЕХНИЧЕСКИЙ МОДУЛЬ (TECH_SPECIALIST) (90+ записей)
-- =====================================================================

-- =====================================================================
-- 4.1 ТЕХНИЧЕСКИЕ ИНСПЕКЦИИ (60 записей)
-- =====================================================================

-- Создаем таблицу для технических инспекций
CREATE TABLE IF NOT EXISTS technical_inspections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id uuid REFERENCES vehicles(id),
    deal_id uuid REFERENCES deals(id),
    inspection_type text NOT NULL,
    inspection_date timestamptz DEFAULT NOW(),
    inspector_id uuid REFERENCES auth.users(id),
    location text,
    mileage integer,
    overall_condition text,
    mechanical_condition jsonb DEFAULT '{}'::jsonb,
    body_condition jsonb DEFAULT '{}'::jsonb,
    electrical_condition jsonb DEFAULT '{}'::jsonb,
    findings jsonb DEFAULT '[]'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    next_inspection_date timestamptz,
    status text DEFAULT 'completed',
    cost numeric(10,2),
    created_at timestamptz DEFAULT NOW()
);

-- Предпродажные осмотры (30)
INSERT INTO technical_inspections (
    vehicle_id, deal_id, inspection_type, inspection_date, inspector_id,
    location, mileage, overall_condition, mechanical_condition,
    body_condition, electrical_condition, findings, recommendations,
    next_inspection_date, status, cost
)
SELECT
    d.vehicle_id,
    d.id,
    'pre_delivery',
    d.contract_start_date - INTERVAL '7 days',
    (SELECT user_id FROM profiles WHERE full_name = 'Самира Аль-Марзуки'),
    'FastLease Technical Center - Dubai',
    v.mileage + (RANDOM() * 1000)::integer,
    CASE
        WHEN RANDOM() > 0.8 THEN 'excellent'
        WHEN RANDOM() > 0.5 THEN 'good'
        ELSE 'fair'
    END,
    jsonb_build_object(
        'engine', CASE WHEN RANDOM() > 0.9 THEN 'excellent' WHEN RANDOM() > 0.7 THEN 'good' ELSE 'needs_attention' END,
        'transmission', CASE WHEN RANDOM() > 0.95 THEN 'excellent' WHEN RANDOM() > 0.8 THEN 'good' ELSE 'fair' END,
        'brakes', CASE WHEN RANDOM() > 0.9 THEN 'excellent' WHEN RANDOM() > 0.7 THEN 'good' ELSE 'needs_service' END,
        'suspension', CASE WHEN RANDOM() > 0.85 THEN 'excellent' WHEN RANDOM() > 0.6 THEN 'good' ELSE 'fair' END
    ),
    jsonb_build_object(
        'exterior', CASE WHEN RANDOM() > 0.9 THEN 'excellent' WHEN RANDOM() > 0.7 THEN 'good' ELSE 'minor_damage' END,
        'interior', CASE WHEN RANDOM() > 0.95 THEN 'excellent' WHEN RANDOM() > 0.8 THEN 'good' ELSE 'fair' END,
        'glass', 'excellent',
        'tires', CASE WHEN RANDOM() > 0.8 THEN 'good' ELSE 'needs_replacement' END
    ),
    jsonb_build_object(
        'battery', CASE WHEN RANDOM() > 0.9 THEN 'excellent' WHEN RANDOM() > 0.7 THEN 'good' ELSE 'weak' END,
        'lights', 'excellent',
        'electronics', CASE WHEN RANDOM() > 0.95 THEN 'excellent' WHEN RANDOM() > 0.8 THEN 'good' ELSE 'needs_check' END
    ),
    CASE WHEN RANDOM() > 0.7 THEN
        jsonb_build_array(
            jsonb_build_object('severity', 'minor', 'description', 'Minor wear on brake pads', 'category', 'maintenance')
        )
    ELSE '[]'::jsonb END,
    CASE WHEN RANDOM() > 0.6 THEN
        jsonb_build_array(
            jsonb_build_object('priority', 'medium', 'description', 'Schedule brake service in 3000km', 'cost_estimate', 1500)
        )
    ELSE '[]'::jsonb END,
    d.contract_start_date + INTERVAL '6 months',
    'completed',
    (RANDOM() * 2000 + 1000)::numeric(10,2)
FROM deals d
JOIN vehicles v ON d.vehicle_id = v.id
ORDER BY d.created_at
LIMIT 30;

-- Периодические проверки (20)
INSERT INTO technical_inspections (
    vehicle_id, deal_id, inspection_type, inspection_date, inspector_id,
    location, mileage, overall_condition, mechanical_condition,
    body_condition, electrical_condition, findings, recommendations,
    next_inspection_date, status, cost
)
SELECT
    d.vehicle_id,
    d.id,
    'periodic',
    d.activated_at + INTERVAL '6 months',
    (SELECT user_id FROM profiles WHERE full_name = 'Тарик Аль-Джасми'),
    'FastLease Technical Center - Dubai',
    v.mileage + 6000 + (RANDOM() * 2000)::integer,
    CASE
        WHEN RANDOM() > 0.7 THEN 'excellent'
        WHEN RANDOM() > 0.4 THEN 'good'
        ELSE 'fair'
    END,
    jsonb_build_object(
        'engine', CASE WHEN RANDOM() > 0.8 THEN 'excellent' WHEN RANDOM() > 0.6 THEN 'good' ELSE 'needs_attention' END,
        'transmission', CASE WHEN RANDOM() > 0.9 THEN 'excellent' WHEN RANDOM() > 0.7 THEN 'good' ELSE 'fair' END,
        'brakes', CASE WHEN RANDOM() > 0.8 THEN 'excellent' WHEN RANDOM() > 0.6 THEN 'good' ELSE 'needs_service' END,
        'suspension', CASE WHEN RANDOM() > 0.8 THEN 'excellent' WHEN RANDOM() > 0.5 THEN 'good' ELSE 'fair' END
    ),
    jsonb_build_object(
        'exterior', CASE WHEN RANDOM() > 0.85 THEN 'excellent' WHEN RANDOM() > 0.6 THEN 'good' ELSE 'minor_damage' END,
        'interior', CASE WHEN RANDOM() > 0.9 THEN 'excellent' WHEN RANDOM() > 0.7 THEN 'good' ELSE 'fair' END,
        'glass', 'excellent',
        'tires', CASE WHEN RANDOM() > 0.7 THEN 'good' ELSE 'needs_replacement' END
    ),
    jsonb_build_object(
        'battery', CASE WHEN RANDOM() > 0.85 THEN 'excellent' WHEN RANDOM() > 0.6 THEN 'good' ELSE 'weak' END,
        'lights', 'excellent',
        'electronics', CASE WHEN RANDOM() > 0.9 THEN 'excellent' WHEN RANDOM() > 0.7 THEN 'good' ELSE 'needs_check' END
    ),
    CASE WHEN RANDOM() > 0.5 THEN
        jsonb_build_array(
            jsonb_build_object('severity', 'medium', 'description', 'Oil change required', 'category', 'maintenance')
        )
    ELSE '[]'::jsonb END,
    jsonb_build_array(
        jsonb_build_object('priority', 'high', 'description', 'Schedule next service in 6000km', 'cost_estimate', 2500)
    ),
    d.activated_at + INTERVAL '12 months',
    'completed',
    (RANDOM() * 1500 + 500)::numeric(10,2)
FROM deals d
JOIN vehicles v ON d.vehicle_id = v.id
WHERE d.status = 'active'
ORDER BY RANDOM()
LIMIT 20;

-- Послеаварийные осмотры (10)
INSERT INTO technical_inspections (
    vehicle_id, deal_id, inspection_type, inspection_date, inspector_id,
    location, mileage, overall_condition, mechanical_condition,
    body_condition, electrical_condition, findings, recommendations,
    next_inspection_date, status, cost
)
SELECT
    d.vehicle_id,
    d.id,
    'post_accident',
    CURRENT_DATE - (RANDOM() * 60)::integer || ' days'::interval,
    (SELECT user_id FROM profiles WHERE full_name = 'Самира Аль-Марзуки'),
    'FastLease Technical Center - Dubai',
    v.mileage + (RANDOM() * 5000)::integer,
    'damaged',
    jsonb_build_object(
        'engine', CASE WHEN RANDOM() > 0.8 THEN 'operational' ELSE 'damaged' END,
        'transmission', CASE WHEN RANDOM() > 0.9 THEN 'operational' ELSE 'damaged' END,
        'brakes', 'damaged',
        'suspension', 'damaged'
    ),
    jsonb_build_object(
        'exterior', 'major_damage',
        'interior', CASE WHEN RANDOM() > 0.7 THEN 'minor_damage' ELSE 'major_damage' END,
        'glass', 'broken',
        'tires', 'damaged'
    ),
    jsonb_build_object(
        'battery', CASE WHEN RANDOM() > 0.6 THEN 'operational' ELSE 'damaged' END,
        'lights', 'damaged',
        'electronics', CASE WHEN RANDOM() > 0.8 THEN 'operational' ELSE 'damaged' END
    ),
    jsonb_build_array(
        jsonb_build_object('severity', 'critical', 'description', 'Major body damage from collision', 'category', 'accident'),
        jsonb_build_object('severity', 'high', 'description', 'Suspension damage requires replacement', 'category', 'repair')
    ),
    jsonb_build_array(
        jsonb_build_object('priority', 'critical', 'description', 'Complete body repair required', 'cost_estimate', 15000),
        jsonb_build_object('priority', 'high', 'description', 'Suspension system replacement', 'cost_estimate', 8000)
    ),
    CURRENT_DATE + INTERVAL '1 month',
    'completed',
    (RANDOM() * 5000 + 2000)::numeric(10,2)
FROM deals d
JOIN vehicles v ON d.vehicle_id = v.id
ORDER BY RANDOM()
LIMIT 10;

-- =====================================================================
-- 4.2 ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ (30 записей)
-- =====================================================================

-- Создаем таблицу для технического обслуживания
CREATE TABLE IF NOT EXISTS vehicle_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id uuid REFERENCES vehicles(id),
    deal_id uuid REFERENCES deals(id),
    service_type text NOT NULL,
    title text NOT NULL,
    description text,
    due_date date,
    mileage_target integer,
    status text DEFAULT 'scheduled',
    completed_at timestamptz,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

INSERT INTO vehicle_services (
    vehicle_id, deal_id, service_type, title, description,
    due_date, mileage_target, status, completed_at, attachments
)
SELECT
    d.vehicle_id,
    d.id,
    CASE
        WHEN RANDOM() > 0.6 THEN 'maintenance'
        WHEN RANDOM() > 0.3 THEN 'repair'
        ELSE 'inspection'
    END,
    CASE
        WHEN RANDOM() > 0.6 THEN 'Плановое техническое обслуживание'
        WHEN RANDOM() > 0.3 THEN 'Ремонт тормозной системы'
        ELSE 'Диагностическая проверка'
    END,
    CASE
        WHEN RANDOM() > 0.6 THEN 'Замена масла, фильтров, проверка систем автомобиля'
        WHEN RANDOM() > 0.3 THEN 'Замена тормозных колодок и дисков'
        ELSE 'Комплексная диагностика всех систем автомобиля'
    END,
    CURRENT_DATE + (RANDOM() * 90)::integer || ' days'::interval,
    v.mileage + (RANDOM() * 5000 + 2000)::integer,
    CASE
        WHEN RANDOM() > 0.7 THEN 'completed'
        WHEN RANDOM() > 0.4 THEN 'in_progress'
        ELSE 'scheduled'
    END,
    CASE WHEN RANDOM() > 0.7 THEN CURRENT_DATE - (RANDOM() * 30)::integer || ' days'::interval ELSE NULL END,
    CASE WHEN RANDOM() > 0.5 THEN
        jsonb_build_array(
            jsonb_build_object('filename', 'service_report.pdf', 'type', 'report'),
            jsonb_build_object('filename', 'before_photos.jpg', 'type', 'photos')
        )
    ELSE '[]'::jsonb END
FROM deals d
JOIN vehicles v ON d.vehicle_id = v.id
ORDER BY RANDOM()
LIMIT 30;

-- =====================================================================
-- 5. МОДУЛЬ ПОДДЕРЖКИ (SUPPORT) (80+ записей)
-- =====================================================================

-- =====================================================================
-- 5.1 БАЗА ЗНАНИЙ (40 записей)
-- =====================================================================

-- Создаем таблицу для базы знаний
CREATE TABLE IF NOT EXISTS knowledge_base (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    author_id uuid REFERENCES auth.users(id),
    published_at timestamptz,
    last_updated timestamptz DEFAULT NOW(),
    view_count integer DEFAULT 0,
    helpful_count integer DEFAULT 0,
    status text DEFAULT 'published',
    created_at timestamptz DEFAULT NOW()
);

INSERT INTO knowledge_base (
    category, title, content, tags, author_id, published_at,
    view_count, helpful_count, status
)
VALUES
-- Лизинг
(
    'leasing',
    'Как подать заявку на лизинг автомобиля',
    'Для подачи заявки на лизинг автомобиля вам потребуется:\n\n1. Паспорт и Emirates ID\n2. Справка о доходах за последние 3 месяца\n3. Банковская выписка\n4. Документы о собственности на недвижимость (если применимо)\n\nПроцесс занимает 2-3 рабочих дня.',
    jsonb_build_array('application', 'requirements', 'documents'),
    (SELECT user_id FROM profiles WHERE full_name = 'Омар Аль-Сабунчи'),
    '2024-01-15 10:00:00+04'::timestamptz,
    1250,
    45,
    'published'
),
(
    'leasing',
    'Требования к кредитному рейтингу для лизинга',
    'Минимальный кредитный рейтинг для одобрения лизинга:\n\n- Стандартный лизинг: 650+\n- Премиум автомобили: 700+\n- Люксовые автомобили: 750+\n\nФакторы, влияющие на рейтинг:\n- История платежей\n- Уровень задолженности\n- Длительность кредитной истории',
    jsonb_build_array('credit_score', 'requirements', 'approval'),
    (SELECT user_id FROM profiles WHERE full_name = 'Омар Аль-Сабунчи'),
    '2024-02-01 14:30:00+04'::timestamptz,
    890,
    32,
    'published'
),
-- Обслуживание
(
    'maintenance',
    'График технического обслуживания',
    'Рекомендуемый график обслуживания:\n\n- Каждые 5,000 км или 6 месяцев: замена масла и фильтров\n- Каждые 10,000 км: проверка тормозов и подвески\n- Каждые 20,000 км: комплексная диагностика\n- Ежегодно: проверка безопасности\n\nВсе работы выполняются в авторизованных сервисах.',
    jsonb_build_array('service', 'schedule', 'maintenance'),
    (SELECT user_id FROM profiles WHERE full_name = 'Самира Аль-Марзуки'),
    '2024-03-10 09:15:00+04'::timestamptz,
    675,
    28,
    'published'
),
-- Финансы
(
    'finance',
    'Как оплатить ежемесячный платеж',
    'Способы оплаты лизинговых платежей:\n\n1. Автоматический платеж с карты (рекомендуется)\n2. Банковский перевод\n3. Оплата через приложение\n4. Оплата в офисе\n\nСрок оплаты: до 27 числа каждого месяца.',
    jsonb_build_array('payment', 'billing', 'methods'),
    (SELECT user_id FROM profiles WHERE full_name = 'Рашид Аль-Балуши'),
    '2024-04-05 11:45:00+04'::timestamptz,
    1450,
    67,
    'published'
);

-- Добавляем еще 36 статей базы знаний
INSERT INTO knowledge_base (
    category, title, content, tags, author_id, published_at,
    view_count, helpful_count, status
)
SELECT
    CASE
        WHEN RANDOM() > 0.6 THEN 'leasing'
        WHEN RANDOM() > 0.3 THEN 'maintenance'
        ELSE 'finance'
    END,
    CASE
        WHEN RANDOM() > 0.6 THEN 'Руководство по ' || (ROW_NUMBER() OVER())::text
        WHEN RANDOM() > 0.3 THEN 'FAQ: ' || (ROW_NUMBER() OVER())::text
        ELSE 'Инструкция: ' || (ROW_NUMBER() OVER())::text
    END,
    'Подробное описание и инструкции по данной теме. Содержит всю необходимую информацию для решения типичных вопросов клиентов.',
    jsonb_build_array('guide', 'help', 'support'),
    (SELECT user_id FROM profiles WHERE full_name IN ('Омар Аль-Сабунчи', 'Самира Аль-Марзуки', 'Рашид Аль-Балуши') ORDER BY RANDOM() LIMIT 1),
    CURRENT_DATE - (RANDOM() * 365)::integer || ' days'::interval,
    (RANDOM() * 1000)::integer,
    (RANDOM() * 50)::integer,
    'published'
FROM generate_series(5, 40);

-- =====================================================================
-- 5.2 ОБРАТНАЯ СВЯЗЬ КЛИЕНТОВ (40 записей)
-- =====================================================================

-- Создаем таблицу для обратной связи
CREATE TABLE IF NOT EXISTS customer_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES auth.users(id),
    deal_id uuid REFERENCES deals(id),
    feedback_type text NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    title text,
    comments text,
    categories jsonb DEFAULT '[]'::jsonb,
    submitted_at timestamptz DEFAULT NOW(),
    status text DEFAULT 'new',
    response text,
    responded_at timestamptz,
    responded_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT NOW()
);

INSERT INTO customer_feedback (
    client_id, deal_id, feedback_type, rating, title, comments,
    categories, submitted_at, status, response, responded_at, responded_by
)
SELECT
    d.client_id,
    d.id,
    CASE
        WHEN RANDOM() > 0.7 THEN 'service_quality'
        WHEN RANDOM() > 0.4 THEN 'product_satisfaction'
        ELSE 'support_experience'
    END,
    (RANDOM() * 2 + 3)::integer, -- 3-5 stars
    CASE
        WHEN RANDOM() > 0.7 THEN 'Отличное обслуживание'
        WHEN RANDOM() > 0.4 THEN 'Хороший опыт'
        ELSE 'Предложения по улучшению'
    END,
    CASE
        WHEN RANDOM() > 0.7 THEN 'Очень доволен процессом лизинга. Все прошло гладко и профессионально.'
        WHEN RANDOM() > 0.4 THEN 'Хороший сервис, но можно улучшить скорость обработки документов.'
        ELSE 'Отличная команда поддержки, всегда готовы помочь.'
    END,
    jsonb_build_array('service', 'support', 'experience'),
    CURRENT_DATE - (RANDOM() * 90)::integer || ' days'::interval,
    CASE WHEN RANDOM() > 0.6 THEN 'responded' ELSE 'new' END,
    CASE WHEN RANDOM() > 0.6 THEN 'Спасибо за положительную обратную связь! Мы рады, что вам понравился наш сервис.' ELSE NULL END,
    CASE WHEN RANDOM() > 0.6 THEN CURRENT_DATE - (RANDOM() * 85)::integer || ' days'::interval ELSE NULL END,
    CASE WHEN RANDOM() > 0.6 THEN (SELECT user_id FROM profiles WHERE full_name = 'Омар Аль-Сабунчи') ELSE NULL END
FROM deals d
ORDER BY RANDOM()
LIMIT 40;

-- =====================================================================
-- 6. АУДИТ И COMPLIANCE (70+ записей)
-- =====================================================================

-- =====================================================================
-- 6.1 АУДИТОРСКИЕ ПРОВЕРКИ (30 записей)
-- =====================================================================

-- Создаем таблицу для аудиторских проверок
CREATE TABLE IF NOT EXISTS audit_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_type text NOT NULL,
    scope text NOT NULL,
    period_start date,
    period_end date,
    auditor_name text,
    auditor_firm text,
    findings jsonb DEFAULT '[]'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    severity text DEFAULT 'low',
    status text DEFAULT 'completed',
    report_date timestamptz,
    follow_up_date timestamptz,
    assigned_to uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT NOW()
);

INSERT INTO audit_reviews (
    review_type, scope, period_start, period_end, auditor_name,
    auditor_firm, findings, recommendations, severity, status,
    report_date, follow_up_date, assigned_to
)
VALUES
-- Внутренние аудиты
(
    'internal_audit',
    'Financial reporting and controls',
    '2024-01-01'::date,
    '2024-06-30'::date,
    'Ahmed Al-Rashid',
    'Internal Audit Department',
    jsonb_build_array(
        jsonb_build_object('finding', 'Minor discrepancies in expense reporting', 'impact', 'low', 'category', 'documentation'),
        jsonb_build_object('finding', 'Delayed reconciliation of bank statements', 'impact', 'medium', 'category', 'process')
    ),
    jsonb_build_array(
        jsonb_build_object('recommendation', 'Implement automated expense approval workflow', 'priority', 'high', 'timeline', '3 months'),
        jsonb_build_object('recommendation', 'Monthly bank reconciliation review', 'priority', 'medium', 'timeline', '1 month')
    ),
    'medium',
    'completed',
    '2024-08-15 10:00:00+04'::timestamptz,
    '2024-11-15 10:00:00+04'::timestamptz,
    (SELECT user_id FROM profiles WHERE full_name = 'Абдулла Аль-Накхи')
),
(
    'internal_audit',
    'IT security and data protection',
    '2024-01-01'::date,
    '2024-06-30'::date,
    'Fatima Al-Zahra',
    'Internal Audit Department',
    jsonb_build_array(
        jsonb_build_object('finding', 'Outdated firewall configurations', 'impact', 'high', 'category', 'security'),
        jsonb_build_object('finding', 'Insufficient access controls', 'impact', 'medium', 'category', 'access_management')
    ),
    jsonb_build_array(
        jsonb_build_object('recommendation', 'Upgrade firewall systems', 'priority', 'critical', 'timeline', '1 month'),
        jsonb_build_object('recommendation', 'Implement role-based access control', 'priority', 'high', 'timeline', '2 months')
    ),
    'high',
    'in_progress',
    '2024-09-01 14:30:00+04'::timestamptz,
    '2024-12-01 14:30:00+04'::timestamptz,
    (SELECT user_id FROM profiles WHERE full_name = 'Фатима Аль-Захра')
);

-- Добавляем еще 28 аудиторских проверок
INSERT INTO audit_reviews (
    review_type, scope, period_start, period_end, auditor_name,
    auditor_firm, findings, recommendations, severity, status,
    report_date, follow_up_date, assigned_to
)
SELECT
    CASE WHEN RANDOM() > 0.5 THEN 'internal_audit' ELSE 'external_audit' END,
    CASE
        WHEN RANDOM() > 0.6 THEN 'Operational processes'
        WHEN RANDOM() > 0.3 THEN 'Compliance procedures'
        ELSE 'Risk management'
    END,
    CURRENT_DATE - INTERVAL '6 months',
    CURRENT_DATE,
    CASE WHEN RANDOM() > 0.5 THEN 'Internal Team' ELSE 'External Firm' END,
    CASE WHEN RANDOM() > 0.5 THEN 'Internal Audit Department' ELSE 'Deloitte' END,
    CASE WHEN RANDOM() > 0.7 THEN
        jsonb_build_array(jsonb_build_object('finding', 'Process improvement needed', 'impact', 'low'))
    ELSE '[]'::jsonb END,
    CASE WHEN RANDOM() > 0.6 THEN
        jsonb_build_array(jsonb_build_object('recommendation', 'Enhance documentation', 'priority', 'medium'))
    ELSE '[]'::jsonb END,
    CASE WHEN RANDOM() > 0.8 THEN 'low' WHEN RANDOM() > 0.5 THEN 'medium' ELSE 'high' END,
    'completed',
    CURRENT_DATE - (RANDOM() * 30)::integer || ' days'::interval,
    CURRENT_DATE + INTERVAL '3 months',
    (SELECT user_id FROM profiles WHERE full_name IN ('Абдулла Аль-Накхи', 'Фатима Аль-Захра') ORDER BY RANDOM() LIMIT 1)
FROM generate_series(3, 30);

-- =====================================================================
-- 6.2 СООТВЕТСТВИЕ СТАНДАРТАМ (40 записей)
-- =====================================================================

-- Создаем таблицу для соответствия стандартам
CREATE TABLE IF NOT EXISTS compliance_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    standard text NOT NULL,
    status text DEFAULT 'compliant',
    last_checked timestamptz DEFAULT NOW(),
    next_check timestamptz,
    findings jsonb DEFAULT '[]'::jsonb,
    corrective_actions jsonb DEFAULT '[]'::jsonb,
    checked_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT NOW()
);

INSERT INTO compliance_checks (
    check_type, entity_type, entity_id, standard, status,
    last_checked, next_check, findings, corrective_actions, checked_by
)
SELECT
    CASE
        WHEN RANDOM() > 0.7 THEN 'aml_check'
        WHEN RANDOM() > 0.4 THEN 'kyc_update'
        ELSE 'sanctions_screening'
    END,
    'client',
    d.client_id,
    CASE
        WHEN RANDOM() > 0.7 THEN 'AML Regulations UAE'
        WHEN RANDOM() > 0.4 THEN 'KYC Standards'
        ELSE 'OFAC Sanctions'
    END,
    CASE WHEN RANDOM() > 0.95 THEN 'non_compliant' ELSE 'compliant' END,
    CURRENT_DATE - (RANDOM() * 180)::integer || ' days'::interval,
    CURRENT_DATE + INTERVAL '6 months',
    CASE WHEN RANDOM() > 0.95 THEN
        jsonb_build_array(jsonb_build_object('issue', 'Documentation update required', 'severity', 'medium'))
    ELSE '[]'::jsonb END,
    CASE WHEN RANDOM() > 0.95 THEN
        jsonb_build_array(jsonb_build_object('action', 'Update client documentation', 'deadline', CURRENT_DATE + INTERVAL '30 days'))
    ELSE '[]'::jsonb END,
    (SELECT user_id FROM profiles WHERE full_name = 'Фатима Аль-Захра')
FROM deals d
ORDER BY RANDOM()
LIMIT 40;

-- =====================================================================
-- 7. МАРКЕТИНГ И ПРОДАЖИ (60+ записей)
-- =====================================================================

-- =====================================================================
-- 7.1 МАРКЕТИНГОВЫЕ КАМПАНИИ (20 записей)
-- =====================================================================

-- Создаем таблицу для маркетинговых кампаний
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name text NOT NULL,
    campaign_type text NOT NULL,
    target_audience text,
    budget numeric(12,2),
    start_date date,
    end_date date,
    channels jsonb DEFAULT '[]'::jsonb,
    content jsonb DEFAULT '{}'::jsonb,
    metrics jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active',
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT NOW()
);

INSERT INTO marketing_campaigns (
    campaign_name, campaign_type, target_audience, budget,
    start_date, end_date, channels, content, metrics, status, created_by
)
VALUES
(
    'Luxury Leasing Launch 2025',
    'product_launch',
    'High-net-worth individuals',
    500000.00,
    '2025-01-01'::date,
    '2025-03-31'::date,
    jsonb_build_array('social_media', 'email', 'events', 'influencers'),
    jsonb_build_object(
        'headline', 'Experience Luxury on Your Terms',
        'key_message', 'Lease premium vehicles with flexible terms',
        'call_to_action', 'Apply Now'
    ),
    jsonb_build_object(
        'impressions', 250000,
        'clicks', 12500,
        'conversions', 85,
        'roi', 2.8
    ),
    'completed',
    (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук')
),
(
    'Email Nurture Campaign',
    'lead_nurturing',
    'Website visitors',
    150000.00,
    '2025-06-01'::date,
    '2025-12-31'::date,
    jsonb_build_array('email', 'website', 'crm'),
    jsonb_build_object(
        'headline', 'Your Dream Car Awaits',
        'key_message', 'Personalized leasing solutions',
        'sequence', jsonb_build_array('welcome', 'education', 'offer', 'follow_up')
    ),
    jsonb_build_object(
        'emails_sent', 45000,
        'open_rate', 0.28,
        'click_rate', 0.045,
        'applications', 125
    ),
    'active',
    (SELECT user_id FROM profiles WHERE full_name = 'Нур Аль-Фараси')
);

-- Добавляем еще 18 кампаний
INSERT INTO marketing_campaigns (
    campaign_name, campaign_type, target_audience, budget,
    start_date, end_date, channels, content, metrics, status, created_by
)
SELECT
    'Campaign ' || (ROW_NUMBER() OVER())::text,
    CASE WHEN RANDOM() > 0.5 THEN 'awareness' ELSE 'conversion' END,
    CASE WHEN RANDOM() > 0.5 THEN 'individuals' ELSE 'businesses' END,
    (RANDOM() * 200000 + 50000)::numeric(12,2),
    CURRENT_DATE - (RANDOM() * 180)::integer || ' days'::interval,
    CURRENT_DATE + (RANDOM() * 90)::integer || ' days'::interval,
    jsonb_build_array('digital', 'social'),
    jsonb_build_object('message', 'Promotional content'),
    jsonb_build_object('reach', (RANDOM() * 100000)::integer),
    CASE WHEN RANDOM() > 0.7 THEN 'active' ELSE 'completed' END,
    (SELECT user_id FROM profiles WHERE full_name IN ('Сара Аль-Матрук', 'Нур Аль-Фараси') ORDER BY RANDOM() LIMIT 1)
FROM generate_series(3, 20);

-- =====================================================================
-- 7.2 ПРОДАЖИ И КОНВЕРСИИ (40 записей)
-- =====================================================================

-- Создаем таблицу для отслеживания продаж
CREATE TABLE IF NOT EXISTS sales_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_source text NOT NULL,
    campaign_id uuid REFERENCES marketing_campaigns(id),
    client_id uuid REFERENCES auth.users(id),
    deal_id uuid REFERENCES deals(id),
    funnel_stage text NOT NULL,
    touchpoints jsonb DEFAULT '[]'::jsonb,
    conversion_value numeric(16,2),
    conversion_date timestamptz,
    attribution jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT NOW()
);

INSERT INTO sales_tracking (
    lead_source, campaign_id, client_id, deal_id, funnel_stage,
    touchpoints, conversion_value, conversion_date, attribution
)
SELECT
    CASE
        WHEN RANDOM() > 0.6 THEN 'organic_search'
        WHEN RANDOM() > 0.3 THEN 'social_media'
        ELSE 'referral'
    END,
    (SELECT id FROM marketing_campaigns ORDER BY RANDOM() LIMIT 1),
    d.client_id,
    d.id,
    CASE
        WHEN d.status = 'active' THEN 'converted'
        WHEN d.status = 'pending_activation' THEN 'application'
        ELSE 'qualified_lead'
    END,
    jsonb_build_array(
        jsonb_build_object('channel', 'website', 'timestamp', d.created_at - INTERVAL '30 days'),
        jsonb_build_object('channel', 'email', 'timestamp', d.created_at - INTERVAL '15 days')
    ),
    d.total_amount,
    d.activated_at,
    jsonb_build_object(
        'primary_source', 'digital_campaign',
        'attribution_weight', 0.7,
        'touchpoint_count', 3
    )
FROM deals d
ORDER BY RANDOM()
LIMIT 40;

-- =====================================================================
-- СТАТИСТИКА И ПРОВЕРОЧНЫЕ ЗАПРОСЫ
-- =====================================================================

-- Проверочные запросы для подтверждения корректности данных

-- 1. Количество инвесторов по типам
SELECT
    investor_type,
    COUNT(*) as investor_count
FROM investors
GROUP BY investor_type
ORDER BY investor_type;

-- 2. Количество активов в портфелях
SELECT
    COUNT(*) as total_assets,
    COUNT(CASE WHEN status = 'in_operation' THEN 1 END) as active_assets,
    AVG(irr_percent) as avg_irr,
    SUM(last_valuation) as total_valuation
FROM portfolio_assets;

-- 3. Статистика юридических документов
SELECT
    document_type,
    COUNT(*) as document_count,
    COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed_count
FROM legal_documents
GROUP BY document_type
ORDER BY document_type;

-- 4. Распределение оценок рисков
SELECT
    risk_type,
    risk_level,
    COUNT(*) as assessment_count,
    AVG(risk_score) as avg_score
FROM risk_assessments
GROUP BY risk_type, risk_level
ORDER BY risk_type, risk_level;

-- 5. Статистика технических инспекций
SELECT
    inspection_type,
    COUNT(*) as inspection_count,
    AVG(cost) as avg_cost,
    COUNT(CASE WHEN overall_condition = 'excellent' THEN 1 END) as excellent_count
FROM technical_inspections
GROUP BY inspection_type
ORDER BY inspection_type;

-- 6. Статистика базы знаний
SELECT
    category,
    COUNT(*) as article_count,
    SUM(view_count) as total_views,
    AVG(rating) as avg_rating
FROM knowledge_base
GROUP BY category
ORDER BY category;

-- 7. Обратная связь клиентов
SELECT
    feedback_type,
    AVG(rating) as avg_rating,
    COUNT(*) as feedback_count,
    COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded_count
FROM customer_feedback
GROUP BY feedback_type
ORDER BY feedback_type;

-- 8. Аудиторские проверки
SELECT
    review_type,
    severity,
    COUNT(*) as review_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
FROM audit_reviews
GROUP BY review_type, severity
ORDER BY review_type, severity;

-- 9. Соответствие стандартам
SELECT
    check_type,
    status,
    COUNT(*) as check_count
FROM compliance_checks
GROUP BY check_type, status
ORDER BY check_type, status;

-- 10. Маркетинговые кампании
SELECT
    campaign_type,
    status,
    COUNT(*) as campaign_count,
    SUM(budget) as total_budget,
    AVG(metrics->>'roi')::numeric as avg_roi
FROM marketing_campaigns
GROUP BY campaign_type, status
ORDER BY campaign_type, status;

-- =====================================================================
-- КОНЕЦ ФАЙЛА MOCK-SPECIALIZED-MODULES.SQL
-- =====================================================================