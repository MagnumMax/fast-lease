-- Создание тестовых данных для Fast Lease

-- 1. Покупатели
-- Предполагается, что покупатели уже существуют в auth.users/profiles.
-- При необходимости создайте их отдельным сидом, чтобы deals опирались на реальных покупателей.

-- 2. Создание автомобилей (workflow_assets)
INSERT INTO workflow_assets (type, vin, make, model, trim, year, supplier, price, meta) VALUES
    ('VEHICLE', 'VIN001', 'BMW', 'X5', 'xDrive40i', 2024, 'ABC Motors', 320000.00, '{"color": "Black", "mileage": 15000}'),
    ('VEHICLE', 'VIN002', 'Mercedes-Benz', 'GLE', '450 4MATIC', 2024, 'Premium Cars LLC', 380000.00, '{"color": "White", "mileage": 8500}'),
    ('VEHICLE', 'VIN003', 'Audi', 'Q8', '55 TFSI', 2024, 'Luxury Auto Group', 310000.00, '{"color": "Grey", "mileage": 12000}'),
    ('VEHICLE', 'VIN004', 'Range Rover', 'Sport', 'PHEV', 2024, 'British Motors', 420000.00, '{"color": "Blue", "mileage": 6800}'),
    ('VEHICLE', 'VIN005', 'Tesla', 'Model X', 'Plaid', 2024, 'Tesla Dubai', 450000.00, '{"color": "Pearl White", "mileage": 3200}'),
    ('VEHICLE', 'VIN006', 'Porsche', 'Cayenne', 'Turbo GT', 2024, 'Sports Cars LLC', 520000.00, '{"color": "Red", "mileage": 4100}'),
    ('VEHICLE', 'VIN007', 'Lamborghini', 'Urus', 'Performante', 2024, 'Exotic Motors', 680000.00, '{"color": "Yellow", "mileage": 1800}'),
    ('VEHICLE', 'VIN008', 'Bentley', 'Flying Spur', 'V8', 2024, 'Luxury Cars Ltd', 720000.00, '{"color": "Silver", "mileage": 2900}'),
    ('VEHICLE', 'VIN009', 'Ferrari', 'Roma', 'Base', 2024, 'Italian Motors', 850000.00, '{"color": "Rosso Corsa", "mileage": 1200}'),
    ('VEHICLE', 'VIN010', 'Rolls-Royce', 'Cullinan', 'Black Badge', 2024, 'Royal Motors', 1200000.00, '{"color": "Black", "mileage": 800}'),
    ('VEHICLE', 'VIN011', 'Maserati', 'Levante', 'Trofeo', 2024, 'Mediterranean Cars', 390000.00, '{"color": "Blue", "mileage": 5600}'),
    ('VEHICLE', 'VIN012', 'McLaren', '720S', 'Spider', 2024, 'Supercar Dubai', 950000.00, '{"color": "Orange", "mileage": 2100}'),
    ('VEHICLE', 'VIN013', 'Aston Martin', 'DBX', '707', 2024, 'British Luxury', 780000.00, '{"color": "Green", "mileage": 3400}'),
    ('VEHICLE', 'VIN014', 'Jaguar', 'F-PACE', 'SVR', 2024, 'Jaguar Land Rover', 350000.00, '{"color": "Burgundy", "mileage": 7200}'),
    ('VEHICLE', 'VIN015', 'Lexus', 'LX', '600', 2024, 'Toyota Premium', 410000.00, '{"color": "Pearl", "mileage": 9300}');

-- 3. Создание сделок (deals)
WITH source_data AS (
  SELECT
    c.user_id AS client_id,
    a.id AS asset_id,
    a.vin,
    ROW_NUMBER() OVER () AS global_seq,
    ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY c.user_id) AS vin_seq
  FROM profiles c
  CROSS JOIN workflow_assets a
  WHERE c.user_id IN (SELECT user_id FROM profiles LIMIT 10)
    AND a.id IN (SELECT id FROM workflow_assets LIMIT 10)
), numbered AS (
  SELECT
    sd.*,
    to_char(timezone('utc', now())::date, 'DDMMYY') AS deal_date_part,
    LPAD(
      RIGHT(COALESCE(regexp_replace(sd.vin, '[^A-Za-z0-9]', '', 'g'), ''), 4),
      4,
      '0'
    ) AS vin_part
  FROM source_data sd
)
INSERT INTO deals (
  deal_number,
  client_id,
  asset_id,
  status,
  source,
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
  op_manager_id
)
SELECT
  CASE
    WHEN numbered.vin_seq = 1 THEN format('LTR-%s-%s', numbered.deal_date_part, numbered.vin_part)
    ELSE format(
      'LTR-%s-%s-%s',
      numbered.deal_date_part,
      numbered.vin_part,
      LPAD(numbered.vin_seq::text, 2, '0')
    )
  END,
  numbered.client_id,
  numbered.asset_id,
  (ARRAY['NEW', 'OFFER_PREP', 'VEHICLE_CHECK', 'DOCS_COLLECT_BUYER', 'RISK_REVIEW', 'FINANCE_REVIEW', 'INVESTOR_PENDING', 'CONTRACT_PREP', 'DOC_SIGNING', 'SIGNING_FUNDING', 'VEHICLE_DELIVERY', 'ACTIVE', 'CANCELLED'])[(RANDOM() * 12 + 1)::int],
  (ARRAY['Website', 'Broker', 'Referral', 'Partner'])[(RANDOM() * 3 + 1)::int],
  (RANDOM() * 500000 + 100000)::numeric,
  (RANDOM() * 800000 + 200000)::numeric,
  (RANDOM() * 20000 + 5000)::numeric,
  (RANDOM() * 48 + 12)::int,
  (RANDOM() * 0.15 + 0.05)::numeric,
  (RANDOM() * 100000 + 20000)::numeric,
  (RANDOM() * 50000 + 10000)::numeric,
  (RANDOM() * 10000 + 2000)::numeric,
  CURRENT_DATE + (RANDOM() * 30)::int * INTERVAL '1 day',
  CURRENT_DATE + (RANDOM() * 365 + 30)::int * INTERVAL '1 day',
  CURRENT_DATE + (RANDOM() * 60 + 30)::int * INTERVAL '1 day',
  '{"payment_day": 15, "grace_period": 5}',
  format('{"provider": "Dubai Insurance", "policy_number": "INS2024%04s"}', numbered.global_seq)::jsonb,
  (SELECT id FROM user_roles WHERE role = 'OP_MANAGER' LIMIT 1)
FROM numbered;

-- 4. Создание платежей (payments)
INSERT INTO payments (deal_id, amount, currency, status, method, metadata)
SELECT
    d.id,
    d.monthly_payment,
    'AED',
    (ARRAY['initiated', 'processing', 'succeeded', 'failed'])[(RANDOM() * 3 + 1)::int],
    (ARRAY['card', 'bank_transfer', 'cash'])[(RANDOM() * 2 + 1)::int],
    '{"reference": "PAY-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0"), "processed_by": "bank_api"}'
FROM deals d
WHERE d.status IN ('ACTIVE', 'SIGNING_FUNDING', 'VEHICLE_DELIVERY');

-- 5. Создание инвойсов (invoices)
INSERT INTO invoices (deal_id, invoice_type, amount, total_amount, currency, due_date, issue_date, status, line_items, payment_terms)
SELECT
    d.id,
    'monthly_payment',
    d.monthly_payment,
    d.monthly_payment * 1.05,
    'AED',
    CURRENT_DATE + (RANDOM() * 30 + 15)::int * INTERVAL '1 day',
    CURRENT_DATE,
    (ARRAY['draft', 'pending', 'overdue', 'paid'])[(RANDOM() * 3 + 1)::int],
    '[{"description": "Monthly lease payment", "amount": ' || d.monthly_payment || ', "quantity": 1}]',
    'Net 15 days'
FROM deals d
WHERE d.status IN ('ACTIVE', 'SIGNING_FUNDING', 'VEHICLE_DELIVERY');
