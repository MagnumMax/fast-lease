-- Дополнительные данные для автомобилей FastLease
-- Изображения, характеристики, телеметрия, документы и обслуживание
-- Создано: 2025-10-30

-- =====================================================================
-- 1. ИЗОБРАЖЕНИЯ АВТОМОБИЛЕЙ
-- =====================================================================

-- Изображения для премиум автомобилей (BMW, Mercedes-Benz, Audi, Lexus)
INSERT INTO vehicle_images (vehicle_id, storage_path, label, is_primary, sort_order, metadata)
SELECT 
    v.id,
    'vehicles/' || LOWER(v.make) || '/' || LOWER(v.model) || '/' || LOWER(REPLACE(v.variant, ' ', '-')) || '/' || v.vin || '-exterior.jpg',
    'Внешний вид',
    true,
    1,
    '{"angle": "3/4 front", "resolution": "1920x1080", "format": "jpg", "size_mb": 2.1}'
FROM vehicles v 
WHERE v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') AND v.year >= 2023;

-- Внутренние изображения
INSERT INTO vehicle_images (vehicle_id, storage_path, label, is_primary, sort_order, metadata)
SELECT 
    v.id,
    'vehicles/' || LOWER(v.make) || '/' || LOWER(v.model) || '/' || LOWER(REPLACE(v.variant, ' ', '-')) || '/' || v.vin || '-interior.jpg',
    'Салон',
    false,
    2,
    '{"angle": "front seats", "resolution": "1920x1080", "format": "jpg", "size_mb": 1.8}'
FROM vehicles v 
WHERE v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Tesla', 'Bentley', 'Rolls-Royce') AND v.year >= 2023;

-- Изображения электромобилей
INSERT INTO vehicle_images (vehicle_id, storage_path, label, is_primary, sort_order, metadata)
SELECT 
    v.id,
    'vehicles/' || LOWER(v.make) || '/' || LOWER(v.model) || '/' || LOWER(REPLACE(v.variant, ' ', '-')) || '/' || v.vin || '-charging.jpg',
    'Зарядка',
    false,
    3,
    '{"angle": "charging port", "resolution": "1920x1080", "format": "jpg", "size_mb": 1.5}'
FROM vehicles v 
WHERE v.fuel_type IN ('electric', 'hybrid') AND v.make IN ('Tesla', 'BMW', 'Nissan', 'Toyota', 'Honda');

-- Изображения внедорожников
INSERT INTO vehicle_images (vehicle_id, storage_path, label, is_primary, sort_order, metadata)
SELECT 
    v.id,
    'vehicles/' || LOWER(v.make) || '/' || LOWER(v.model) || '/' || LOWER(REPLACE(v.variant, ' ', '-')) || '/' || v.vin || '-profile.jpg',
    'Профиль',
    false,
    2,
    '{"angle": "side profile", "resolution": "1920x1080", "format": "jpg", "size_mb": 1.9}'
FROM vehicles v 
WHERE v.body_type = 'SUV';

-- Изображения коммерческого транспорта
INSERT INTO vehicle_images (vehicle_id, storage_path, label, is_primary, sort_order, metadata)
SELECT 
    v.id,
    'vehicles/' || LOWER(v.make) || '/' || LOWER(v.model) || '/' || LOWER(REPLACE(v.variant, ' ', '-')) || '/' || v.vin || '-cargo.jpg',
    'Грузовой отсек',
    false,
    2,
    '{"angle": "rear cargo", "resolution": "1920x1080", "format": "jpg", "size_mb": 1.7}'
FROM vehicles v 
WHERE v.body_type IN ('van', 'pickup');

-- =====================================================================
-- 2. ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ
-- =====================================================================

-- Основные характеристики двигателя
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Engine',
    'Displacement',
    v.engine_capacity::text,
    'L',
    1
FROM vehicles v 
WHERE v.engine_capacity > 0;

-- Количество цилиндров
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Engine',
    'Cylinders',
    CASE 
        WHEN v.engine_capacity >= 6.0 THEN 'V12'
        WHEN v.engine_capacity >= 4.0 THEN 'V8'
        WHEN v.engine_capacity >= 3.0 THEN 'V6'
        WHEN v.engine_capacity >= 2.5 THEN '4'
        WHEN v.engine_capacity >= 2.0 THEN '4'
        WHEN v.engine_capacity >= 1.5 THEN '4'
        ELSE '4'
    END,
    'cylinders',
    2
FROM vehicles v 
WHERE v.engine_capacity > 0;

-- Мощность двигателя
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Performance',
    'Horsepower',
    CASE 
        WHEN v.make = 'Tesla' AND v.model = 'Model S' THEN '1020'
        WHEN v.make = 'Rolls-Royce' AND v.model = 'Ghost' THEN '563'
        WHEN v.make = 'Bentley' AND v.model = 'Continental GT' THEN '542'
        WHEN v.make = 'Mercedes-Benz' AND v.model = 'S-Class' AND v.variant LIKE '%680%' THEN '630'
        WHEN v.make = 'BMW' AND v.model = '7 Series' AND v.variant LIKE '%760%' THEN '530'
        WHEN v.make = 'Audi' AND v.model = 'A8' THEN '335'
        WHEN v.make = 'Lexus' AND v.model = 'IS' AND v.variant LIKE '%500%' THEN '472'
        WHEN v.make = 'BMW' AND v.model = '3 Series' AND v.variant LIKE '%M340%' THEN '374'
        WHEN v.make = 'Mercedes-Benz' AND v.model = 'C-Class' AND v.variant LIKE '%AMG%' THEN '402'
        WHEN v.make = 'Audi' AND v.model = 'A4' AND v.variant LIKE '%S4%' THEN '349'
        WHEN v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') THEN '255'
        WHEN v.make = 'Toyota' AND v.fuel_type = 'hybrid' THEN '121'
        WHEN v.make = 'Honda' AND v.fuel_type = 'hybrid' THEN '151'
        ELSE '180'
    END,
    'hp',
    10
FROM vehicles v;

-- Расход топлива в городе
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Performance',
    'Fuel Economy City',
    CASE 
        WHEN v.make = 'Toyota' AND v.model = 'Prius' THEN '58'
        WHEN v.make = 'Honda' AND v.model = 'Insight' THEN '55'
        WHEN v.make = 'BMW' AND v.model = '330e' THEN '71'
        WHEN v.make = 'Honda' AND v.body_type = 'SUV' THEN '27'
        WHEN v.make = 'Toyota' AND v.body_type = 'SUV' THEN '27'
        WHEN v.make = 'Nissan' AND v.body_type = 'SUV' THEN '28'
        WHEN v.make = 'BMW' AND v.body_type = 'SUV' THEN '25'
        WHEN v.make = 'Mercedes-Benz' AND v.body_type = 'SUV' THEN '22'
        WHEN v.make = 'Audi' AND v.body_type = 'SUV' THEN '23'
        WHEN v.make = 'Lexus' AND v.body_type = 'SUV' THEN '25'
        WHEN v.fuel_type = 'electric' THEN 'N/A'
        WHEN v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') THEN '26'
        ELSE '30'
    END,
    'mpg',
    11
FROM vehicles v;

-- Расход топлива на шоссе
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Performance',
    'Fuel Economy Highway',
    CASE 
        WHEN v.make = 'Toyota' AND v.model = 'Prius' THEN '53'
        WHEN v.make = 'Honda' AND v.model = 'Insight' THEN '49'
        WHEN v.make = 'BMW' AND v.model = '330e' THEN '68'
        WHEN v.make = 'Honda' AND v.body_type = 'SUV' THEN '32'
        WHEN v.make = 'Toyota' AND v.body_type = 'SUV' THEN '35'
        WHEN v.make = 'Nissan' AND v.body_type = 'SUV' THEN '34'
        WHEN v.make = 'BMW' AND v.body_type = 'SUV' THEN '29'
        WHEN v.make = 'Mercedes-Benz' AND v.body_type = 'SUV' THEN '28'
        WHEN v.make = 'Audi' AND v.body_type = 'SUV' THEN '28'
        WHEN v.make = 'Lexus' AND v.body_type = 'SUV' THEN '33'
        WHEN v.fuel_type = 'electric' THEN 'N/A'
        WHEN v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') THEN '36'
        ELSE '38'
    END,
    'mpg',
    12
FROM vehicles v;

-- Привод
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Drivetrain',
    'Drive Type',
    CASE 
        WHEN v.features::text LIKE '%quattro%' THEN 'All-Wheel Drive'
        WHEN v.features::text LIKE '%4WD%' THEN 'Four-Wheel Drive'
        WHEN v.features::text LIKE '%AWD%' THEN 'All-Wheel Drive'
        ELSE 'Front-Wheel Drive'
    END,
    '',
    20
FROM vehicles v;

-- Длина автомобиля
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Dimensions',
    'Length',
    CASE 
        WHEN v.body_type = 'sedan' AND v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') THEN '185'
        WHEN v.body_type = 'sedan' THEN '182'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%X5%' THEN '193'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%GLE%' THEN '194'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%Q7%' THEN '199'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%GX%' THEN '192'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%X3%' THEN '186'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%GLC%' THEN '183'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%Q5%' THEN '184'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%NX%' THEN '183'
        WHEN v.body_type = 'SUV' THEN '180'
        WHEN v.body_type = 'van' THEN '195'
        WHEN v.body_type = 'pickup' THEN '230'
        WHEN v.body_type = 'convertible' THEN '180'
        WHEN v.body_type = 'coupe' THEN '185'
        ELSE '185'
    END,
    'inches',
    25
FROM vehicles v;

-- Ширина автомобиля
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Dimensions',
    'Width',
    CASE 
        WHEN v.body_type = 'SUV' AND v.make IN ('BMW', 'Mercedes-Benz', 'Audi', 'Lexus') THEN '78'
        WHEN v.body_type = 'SUV' THEN '74'
        WHEN v.body_type = 'van' THEN '72'
        WHEN v.body_type = 'pickup' THEN '80'
        WHEN v.body_type IN ('convertible', 'coupe') THEN '72'
        ELSE '70'
    END,
    'inches',
    26
FROM vehicles v;

-- Высота автомобиля
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Dimensions',
    'Height',
    CASE 
        WHEN v.body_type = 'SUV' THEN '67'
        WHEN v.body_type = 'van' THEN '85'
        WHEN v.body_type = 'pickup' THEN '75'
        WHEN v.body_type = 'convertible' THEN '56'
        WHEN v.body_type = 'coupe' THEN '56'
        ELSE '58'
    END,
    'inches',
    27
FROM vehicles v;

-- Количество мест
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Seating',
    'Seating Capacity',
    CASE 
        WHEN v.body_type = 'convertible' THEN '4'
        WHEN v.body_type = 'coupe' THEN '4'
        WHEN v.body_type = 'sedan' THEN '5'
        WHEN v.body_type = 'hatchback' THEN '5'
        WHEN v.body_type = 'wagon' THEN '5'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%X5%' THEN '7'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%GLE%' THEN '7'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%Q7%' THEN '7'
        WHEN v.body_type = 'SUV' THEN '5'
        WHEN v.body_type = 'van' THEN '8'
        WHEN v.body_type = 'pickup' THEN '5'
        ELSE '5'
    END,
    'seats',
    30
FROM vehicles v;

-- Объем багажника
INSERT INTO vehicle_specifications (vehicle_id, category, spec_key, spec_value, unit, sort_order)
SELECT 
    v.id,
    'Cargo',
    'Cargo Volume',
    CASE 
        WHEN v.body_type = 'sedan' THEN '15'
        WHEN v.body_type = 'hatchback' THEN '25'
        WHEN v.body_type = 'wagon' THEN '35'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%X5%' THEN '76'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%GLE%' THEN '74'
        WHEN v.body_type = 'SUV' AND v.model LIKE '%Q7%' THEN '72'
        WHEN v.body_type = 'SUV' THEN '35'
        WHEN v.body_type = 'convertible' THEN '13'
        WHEN v.body_type = 'coupe' THEN '15'
        ELSE '20'
    END,
    'cu ft',
    35
FROM vehicles v;

-- =====================================================================
-- 4. ДОКУМЕНТЫ НА АВТОМОБИЛИ
-- =====================================================================

-- Регистрационные документы
INSERT INTO application_documents (application_id, document_type, document_category, original_filename, stored_filename, storage_path, mime_type, file_size, checksum, status, verification_data, uploaded_at)
SELECT 
    gen_random_uuid(),
    'vehicle_registration',
    'registration',
    v.make || '_' || v.model || '_' || v.year || '_Registration.pdf',
    'reg_' || v.vin || '.pdf',
    'documents/vehicles/' || v.vin || '/registration.pdf',
    'application/pdf',
    2048576 + (RANDOM() * 1048576)::int,
    MD5(v.vin || 'registration'),
    'verified',
    jsonb_build_object(
        'issuing_authority', 'RTA Dubai',
        'registration_number', 'RTA-' || SUBSTRING(v.vin FROM 1 FOR 8),
        'expiry_date', '2027-12-31',
        'verification_method', 'automated',
        'verified_by', 'System'
    ),
    NOW() - INTERVAL '30 days' + (RANDOM() * INTERVAL '25 days')
FROM vehicles v;

-- Страховые полисы
INSERT INTO application_documents (application_id, document_type, document_category, original_filename, stored_filename, storage_path, mime_type, file_size, checksum, status, verification_data, uploaded_at)
SELECT 
    gen_random_uuid(),
    'insurance_certificate',
    'insurance',
    v.make || '_' || v.model || '_' || v.year || '_Insurance.pdf',
    'ins_' || v.vin || '.pdf',
    'documents/vehicles/' || v.vin || '/insurance.pdf',
    'application/pdf',
    1536000 + (RANDOM() * 512000)::int,
    MD5(v.vin || 'insurance'),
    'verified',
    jsonb_build_object(
        'insurance_provider', CASE 
            WHEN COALESCE(v.mileage, 0) > 80000 THEN 'AXA Insurance UAE'
            WHEN COALESCE(v.mileage, 0) > 30000 THEN 'Emirates Insurance'
            ELSE 'ADNIC Insurance'
        END,
        'policy_number', 'POL-' || SUBSTRING(v.vin FROM 1 FOR 8),
        'coverage_type', 'Full Coverage',
        'valid_until', '2026-06-30',
        'premium_amount', (COALESCE(v.mileage, 0) * 0.85)::numeric(10,2),
        'deductible', '500'
    ),
    NOW() - INTERVAL '45 days' + (RANDOM() * INTERVAL '30 days')
FROM vehicles v;

-- Сертификаты соответствия
INSERT INTO application_documents (application_id, document_type, document_category, original_filename, stored_filename, storage_path, mime_type, file_size, checksum, status, verification_data, uploaded_at)
SELECT 
    gen_random_uuid(),
    'certificate_of_conformity',
    'certification',
    v.make || '_' || v.model || '_' || v.year || '_CoC.pdf',
    'coc_' || v.vin || '.pdf',
    'documents/vehicles/' || v.vin || '/certificate_of_conformity.pdf',
    'application/pdf',
    512000 + (RANDOM() * 256000)::int,
    MD5(v.vin || 'coc'),
    'verified',
    jsonb_build_object(
        'certification_body', 'Gulf Standardization Organization',
        'certificate_number', 'GSO-' || SUBSTRING(v.vin FROM 1 FOR 6),
        'standards_compliance', ['GCC Standard', 'Euro 6', 'Emissions Standard'],
        'valid_from', '2023-01-01',
        'inspection_date', '2023-01-15'
    ),
    NOW() - INTERVAL '60 days' + (RANDOM() * INTERVAL '45 days')
FROM vehicles v;

-- Руководства пользователя
INSERT INTO application_documents (application_id, document_type, document_category, original_filename, stored_filename, storage_path, mime_type, file_size, checksum, status, verification_data, uploaded_at)
SELECT 
    gen_random_uuid(),
    'owners_manual',
    'documentation',
    v.make || '_' || v.model || '_Owners_Manual.pdf',
    'manual_' || v.vin || '.pdf',
    'documents/vehicles/' || v.vin || '/owners_manual.pdf',
    'application/pdf',
    15728640 + (RANDOM() * 5242880)::int,
    MD5(v.vin || 'manual'),
    'verified',
    jsonb_build_object(
        'language', 'English/Arabic',
        'pages', 350 + (RANDOM() * 100)::int,
        'version', '2024.1',
        'digital', true,
        'manufacturer', v.make
    ),
    NOW() - INTERVAL '90 days' + (RANDOM() * INTERVAL '60 days')
FROM vehicles v;

-- =====================================================================
-- 5. ИСТОРИЯ ОБСЛУЖИВАНИЯ
-- =====================================================================

-- Плановое техническое обслуживание
INSERT INTO vehicle_services (vehicle_id, service_type, title, description, due_date, mileage_target, status, completed_at, attachments)
SELECT 
    v.id,
    'maintenance',
    'Регулярное ТО',
    CASE 
        WHEN v.mileage < 5000 THEN 'Первое ТО - проверка систем, замена масла'
        WHEN v.mileage < 15000 THEN 'ТО-1: Замена масла, фильтров, проверка тормозов'
        WHEN v.mileage < 30000 THEN 'ТО-2: Тормозная система, подвеска, кондиционер'
        WHEN v.mileage < 45000 THEN 'ТО-3: Кондиционер, электроника, КПП'
        ELSE 'ТО-4: Капитальное обслуживание, замена расходников'
    END,
    CASE 
        WHEN v.mileage < 5000 THEN CURRENT_DATE + INTERVAL '11 months'
        WHEN v.mileage < 15000 THEN CURRENT_DATE + INTERVAL '10 months'
        WHEN v.mileage < 30000 THEN CURRENT_DATE + INTERVAL '8 months'
        WHEN v.mileage < 45000 THEN CURRENT_DATE + INTERVAL '6 months'
        ELSE CURRENT_DATE + INTERVAL '4 months'
    END,
    CASE 
        WHEN v.mileage < 5000 THEN 7500
        WHEN v.mileage < 15000 THEN 15000
        WHEN v.mileage < 30000 THEN 30000
        WHEN v.mileage < 45000 THEN 45000
        ELSE 60000
    END,
    CASE 
        WHEN RANDOM() < 0.7 THEN 'scheduled'
        WHEN RANDOM() < 0.9 THEN 'in_progress'
        ELSE 'completed'
    END,
    CASE 
        WHEN RANDOM() < 0.3 THEN NOW() - (RANDOM() * INTERVAL '30 days')
        ELSE NULL
    END,
    jsonb_build_array(
        jsonb_build_object(
            'type', 'service_checklist',
            'filename', 'service_checklist_' || v.vin || '.pdf',
            'size', 1024000 + (RANDOM() * 512000)::int
        ),
        CASE 
            WHEN v.mileage > 15000 THEN jsonb_build_object(
                'type', 'parts_receipt',
                'filename', 'parts_receipt_' || v.vin || '.pdf',
                'size', 512000 + (RANDOM() * 256000)::int
            )
            ELSE NULL
        END
    )
FROM vehicles v
WHERE v.mileage > 0;

-- Записи о техосмотрах
INSERT INTO vehicle_services (vehicle_id, service_type, title, description, due_date, mileage_target, status, completed_at, attachments)
SELECT 
    v.id,
    'inspection',
    'Технический осмотр',
    'Обязательный технический осмотр транспортного средства для проверки безопасности и экологических норм',
    CASE 
        WHEN v.year >= 2023 THEN CURRENT_DATE + INTERVAL '18 months'
        WHEN v.year >= 2020 THEN CURRENT_DATE + INTERVAL '12 months'
        ELSE CURRENT_DATE + INTERVAL '6 months'
    END,
    v.mileage + 10000,
    CASE 
        WHEN v.year <= 2020 THEN 'scheduled'
        WHEN v.year <= 2022 AND RANDOM() < 0.5 THEN 'completed'
        ELSE 'scheduled'
    END,
    CASE 
        WHEN v.year <= 2022 AND RANDOM() < 0.5 THEN NOW() - (RANDOM() * INTERVAL '60 days')
        ELSE NULL
    END,
    jsonb_build_array(
        jsonb_build_object(
            'type', 'inspection_report',
            'filename', 'inspection_report_' || v.vin || '.pdf',
            'size', 2048000 + (RANDOM() * 1024000)::int
        ),
        jsonb_build_object(
            'type', 'emissions_certificate',
            'filename', 'emissions_' || v.vin || '.pdf',
            'size', 512000 + (RANDOM() * 256000)::int
        )
    )
FROM vehicles v;

-- =====================================================================
-- 6. СВЯЗЬ С МЕНЕДЖЕРАМИ
-- =====================================================================

-- Создание связей с операционными менеджерами
INSERT INTO vehicle_services (vehicle_id, service_type, title, description, status, metadata)
SELECT 
    v.id,
    'management',
    'Назначен менеджер',
    'Автомобиль закреплен за операционным менеджером для управления лизинговыми операциями',
    'completed',
    jsonb_build_object(
        'assigned_manager_id', 
        (SELECT user_id FROM profiles WHERE full_name = 'Сара Аль-Матрук' LIMIT 1),
        'assigned_manager_name', 'Сара Аль-Матрук',
        'assignment_date', '2025-01-15',
        'responsibility', 'overall_management',
        'department', 'Operations',
        'contact_phone', '+971501234005',
        'email', 'sara.almatruk@fastlease.dev'
    )
FROM vehicles v 
WHERE v.status IN ('available', 'reserved', 'leased')
LIMIT 25;

INSERT INTO vehicle_services (vehicle_id, service_type, title, description, status, metadata)
SELECT 
    v.id,
    'management',
    'Назначен менеджер',
    'Автомобиль закреплен за специалистом по сделкам',
    'completed',
    jsonb_build_object(
        'assigned_manager_id', 
        (SELECT user_id FROM profiles WHERE full_name = 'Халид Аль-Хашими' LIMIT 1),
        'assigned_manager_name', 'Халид Аль-Хашими',
        'assignment_date', '2025-01-20',
        'responsibility', 'deal_management',
        'department', 'Operations',
        'contact_phone', '+971501234006',
        'email', 'khalid.alhashimi@fastlease.dev'
    )
FROM vehicles v 
WHERE v.status IN ('available', 'reserved', 'leased')
LIMIT 25;

INSERT INTO vehicle_services (vehicle_id, service_type, title, description, status, metadata)
SELECT 
    v.id,
    'management',
    'Назначен менеджер',
    'Автомобиль закреплен за менеджером по покупательскому сервису',
    'completed',
    jsonb_build_object(
        'assigned_manager_id', 
        (SELECT user_id FROM profiles WHERE full_name = 'Нур Аль-Фараси' LIMIT 1),
        'assigned_manager_name', 'Нур Аль-Фараси',
        'assignment_date', '2025-01-25',
        'responsibility', 'customer_service',
        'department', 'Customer Service',
        'contact_phone', '+971501234007',
        'email', 'noor.alfarasi@fastlease.dev'
    )
FROM vehicles v 
WHERE v.status IN ('available', 'reserved', 'leased')
LIMIT 25;

INSERT INTO vehicle_services (vehicle_id, service_type, title, description, status, metadata)
SELECT 
    v.id,
    'management',
    'Назначен менеджер',
    'Автомобиль закреплен за координатором процессов',
    'completed',
    jsonb_build_object(
        'assigned_manager_id', 
        (SELECT user_id FROM profiles WHERE full_name = 'Юсуф Аль-Мактум' LIMIT 1),
        'assigned_manager_name', 'Юсуф Аль-Мактум',
        'assignment_date', '2025-02-01',
        'responsibility', 'process_coordination',
        'department', 'Operations',
        'contact_phone', '+971501234008',
        'email', 'youssef.almaktoum@fastlease.dev'
    )
FROM vehicles v 
WHERE v.status IN ('available', 'reserved', 'leased')
LIMIT 25;

INSERT INTO vehicle_services (vehicle_id, service_type, title, description, status, metadata)
SELECT 
    v.id,
    'management',
    'Назначен менеджер',
    'Автомобиль закреплен за аналитиком операций',
    'completed',
    jsonb_build_object(
        'assigned_manager_id', 
        (SELECT user_id FROM profiles WHERE full_name = 'Лейла Аль-Саеedi' LIMIT 1),
        'assigned_manager_name', 'Лейла Аль-Саеedi',
        'assignment_date', '2025-02-05',
        'responsibility', 'data_analysis',
        'department', 'Operations',
        'contact_phone', '+971501234009',
        'email', 'layla.alsaedi@fastlease.dev'
    )
FROM vehicles v 
WHERE v.status IN ('available', 'reserved', 'leased')
LIMIT 10;

-- =====================================================================
-- 7. СТАТИСТИКА И АНАЛИТИКА
-- =====================================================================

-- Сводка по категориям автомобилей
SELECT 'vehicles_by_category' as metric, 
       body_type, 
       COUNT(*) as count,
       ROUND(AVG((50000 + COALESCE(mileage,0) * 2)), 2) as avg_price_aed,
       MIN((50000 + COALESCE(mileage,0) * 2)) as min_price_aed,
       MAX((50000 + COALESCE(mileage,0) * 2)) as max_price_aed,
       SUM((50000 + COALESCE(mileage,0) * 2)) as total_value_aed
FROM vehicles 
GROUP BY body_type 
ORDER BY count DESC;

-- Статистика по типам топлива
SELECT 'vehicles_by_fuel_type' as metric,
       fuel_type,
       COUNT(*) as count,
       ROUND(AVG((50000 + COALESCE(mileage,0) * 2)), 2) as avg_price_aed,
       COUNT(*) * 100.0 / (SELECT COUNT(*) FROM vehicles) as percentage
FROM vehicles 
GROUP BY fuel_type 
ORDER BY fuel_type;

-- Статистика по статусам
SELECT 'vehicles_by_status' as metric,
       status,
       COUNT(*) as count,
       COUNT(*) * 100.0 / (SELECT COUNT(*) FROM vehicles) as percentage,
       SUM(CASE WHEN status = 'available' THEN (50000 + COALESCE(mileage,0) * 2) ELSE 0 END) as available_value_aed
FROM vehicles 
GROUP BY status 
ORDER BY count DESC;

-- Топ марки по количеству
SELECT 'top_makes' as metric,
       make,
       COUNT(*) as count,
       ROUND(AVG((50000 + COALESCE(mileage,0) * 2)), 2) as avg_price_aed,
       ROUND(AVG(mileage), 0) as avg_mileage
FROM vehicles 
GROUP BY make 
ORDER BY count DESC, make;

-- Статистика связанных данных
SELECT 'linked_data_summary' as metric,
       'vehicle_images' as table_name,
       COUNT(*) as count
FROM vehicle_images
UNION ALL
SELECT 'linked_data_summary' as metric,
       'vehicle_specifications' as table_name,
       COUNT(*) as count
FROM vehicle_specifications
UNION ALL
SELECT 'linked_data_summary' as metric,
       'vehicle_documents' as table_name,
       COUNT(*) as count
FROM application_documents WHERE document_type IN ('vehicle_registration', 'insurance_certificate', 'certificate_of_conformity', 'owners_manual')
UNION ALL
SELECT 'linked_data_summary' as metric,
       'vehicle_services' as table_name,
       COUNT(*) as count
FROM vehicle_services;

-- Средние цены по сегментам
SELECT 'price_segments' as metric,
       CASE 
           WHEN (50000 + COALESCE(mileage,0) * 2) < 30000 THEN 'Эконом'
           WHEN (50000 + COALESCE(mileage,0) * 2) < 60000 THEN 'Средний класс'
           WHEN (50000 + COALESCE(mileage,0) * 2) < 100000 THEN 'Премиум'
           ELSE 'Люкс'
       END as segment,
       COUNT(*) as count,
       ROUND(AVG((50000 + COALESCE(mileage,0) * 2)), 2) as avg_price_aed,
       ROUND(AVG(mileage), 0) as avg_mileage
FROM vehicles 
GROUP BY 
    CASE 
        WHEN (50000 + COALESCE(mileage,0) * 2) < 30000 THEN 'Эконом'
        WHEN (50000 + COALESCE(mileage,0) * 2) < 60000 THEN 'Средний класс'
        WHEN (50000 + COALESCE(mileage,0) * 2) < 100000 THEN 'Премиум'
        ELSE 'Люкс'
    END
ORDER BY 
    CASE 
        WHEN (50000 + COALESCE(mileage,0) * 2) < 30000 THEN 1
        WHEN (50000 + COALESCE(mileage,0) * 2) < 60000 THEN 2
        WHEN (50000 + COALESCE(mileage,0) * 2) < 100000 THEN 3
        ELSE 4
    END;

-- =====================================================================
-- КОНЕЦ ФАЙЛА MOCK-VEHICLES-EXTENDED.SQL
-- =====================================================================
