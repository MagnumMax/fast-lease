-- =====================================================================
-- МОКОВЫЕ ОПЕРАЦИОННЫЕ ДАННЫЕ FASTLEASE
-- =====================================================================
-- Создано: 2025-10-30
-- Описание: Полная операционная экосистема для тестирования модулей
-- Содержит: Задачи (300+), Уведомления (400+), Тикеты поддержки (150+), 
--           Workflow процессы (80+), Аудит (500+), Мониторинг KPI
-- =====================================================================

-- =====================================================================
-- 1. СИСТЕМА УПРАВЛЕНИЯ ЗАДАЧАМИ (TASKS) - 320 задач
-- =====================================================================

-- =====================================================================
-- 1.1 ЗАДАЧИ ПО СДЕЛКАМ - 210 задач
-- =====================================================================

-- Задачи по проверке документов клиентов - 85 задач
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    'document_verification',
    'Проверка документов клиента по договору ' || d.deal_number,
    CASE 
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 60 THEN 'OPEN'
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 75 THEN 'IN_PROGRESS'  
        ELSE 'COMPLETED'
    END,
    'OP_MANAGER',
    d.assigned_account_manager,
    (d.created_at + INTERVAL '24 hours')::timestamptz,
    CASE WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 75 THEN 
        (d.created_at + INTERVAL '12 hours' + (RANDOM() * INTERVAL '24 hours'))::timestamptz 
        ELSE NULL END,
    CASE 
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 60 THEN 'ON_TRACK'
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 75 THEN 'WARNING'
        ELSE 'BREACHED'
    END,
    jsonb_build_object(
        'document_types', ARRAY['emirates_id', 'passport', 'salary_certificate', 'bank_statement'],
        'verification_stage', CASE WHEN RANDOM() > 0.5 THEN 'kyc' ELSE 'financial' END,
        'priority', CASE WHEN RANDOM() > 0.8 THEN 'high' WHEN RANDOM() > 0.4 THEN 'medium' ELSE 'low' END,
        'estimated_duration', (RANDOM() * 4 + 2)::numeric(3,1)
    ),
    encode(sha256(('document_verification_' || d.id)::bytea), 'hex'),
    (d.created_at + (RANDOM() * INTERVAL '48 hours'))::timestamptz,
    (d.created_at + (RANDOM() * INTERVAL '48 hours'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 3) -- 3 задачи на проверку документов для каждой сделки
WHERE d.status IN ('pending_activation', 'active')
LIMIT 85;

-- Задачи по согласованию условий лизинга - 65 задач
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    'lease_terms_approval',
    'Согласование условий лизинга для договора ' || d.deal_number,
    CASE 
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 45 THEN 'COMPLETED'
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 55 THEN 'IN_PROGRESS'  
        ELSE 'OPEN'
    END,
    'FINANCE',
    (SELECT user_id FROM profiles WHERE role = 'FINANCE' ORDER BY RANDOM() LIMIT 1),
    (d.created_at + INTERVAL '48 hours')::timestamptz,
    CASE WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 55 THEN 
        (d.created_at + INTERVAL '24 hours' + (RANDOM() * INTERVAL '24 hours'))::timestamptz 
        ELSE NULL END,
    'ON_TRACK',
    jsonb_build_object(
        'approval_amount', d.total_amount,
        'interest_rate', d.interest_rate,
        'term_months', d.term_months,
        'approver_notes', 'Согласовано с финансовым отделом',
        'decision', CASE WHEN RANDOM() > 0.1 THEN 'approved' ELSE 'pending_review' END
    ),
    encode(sha256(('lease_terms_' || d.id)::bytea), 'hex'),
    (d.created_at + INTERVAL '12 hours')::timestamptz,
    (d.created_at + INTERVAL '36 hours')::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 задачи на согласование
WHERE d.status IN ('pending_activation', 'active')
LIMIT 65;

-- Задачи по подготовке договоров - 50 задач
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    'contract_preparation',
    'Подготовка договора лизинга ' || d.deal_number,
    CASE 
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 30 THEN 'COMPLETED'
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 45 THEN 'IN_PROGRESS'  
        ELSE 'OPEN'
    END,
    'LEGAL',
    (SELECT user_id FROM profiles WHERE role = 'LEGAL' ORDER BY RANDOM() LIMIT 1),
    (d.created_at + INTERVAL '72 hours')::timestamptz,
    CASE WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 45 THEN 
        (d.created_at + INTERVAL '48 hours' + (RANDOM() * INTERVAL '24 hours'))::timestamptz 
        ELSE NULL END,
    CASE 
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 30 THEN 'ON_TRACK'
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 45 THEN 'WARNING'
        ELSE 'BREACHED'
    END,
    jsonb_build_object(
        'contract_template', 'standard_lease_v3',
        'special_clauses', ARRAY['early_termination', 'maintenance_included', 'insurance_included'],
        'review_status', CASE WHEN RANDOM() > 0.2 THEN 'legal_review_complete' ELSE 'pending_review' END,
        'digital_signature_ready', CASE WHEN RANDOM() > 0.3 THEN true ELSE false END
    ),
    encode(sha256(('contract_prep_' || d.id)::bytea), 'hex'),
    (d.created_at + INTERVAL '24 hours')::timestamptz,
    (d.created_at + INTERVAL '60 hours')::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 задачи на подготовку договора
WHERE d.status IN ('pending_activation', 'active')
LIMIT 50;

-- Задачи по передаче автомобилей - 40 задач
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    'vehicle_handover',
    'Передача автомобиля клиенту по договору ' || d.deal_number,
    CASE 
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 25 THEN 'COMPLETED'
        WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 35 THEN 'IN_PROGRESS'  
        ELSE 'OPEN'
    END,
    'TECH_SPECIALIST',
    (SELECT user_id FROM profiles WHERE role = 'TECH_SPECIALIST' ORDER BY RANDOM() LIMIT 1),
    (d.activated_at + INTERVAL '24 hours')::timestamptz,
    CASE WHEN ROW_NUMBER() OVER(PARTITION BY d.id) <= 35 THEN 
        (d.activated_at + INTERVAL '12 hours' + (RANDOM() * INTERVAL '12 hours'))::timestamptz 
        ELSE NULL END,
    'ON_TRACK',
    jsonb_build_object(
        'inspection_checklist', ARRAY['exterior_condition', 'interior_condition', 'documentation', 'keys'],
        'handover_location', CASE WHEN RANDOM() > 0.5 THEN 'showroom' ELSE 'client_location' END,
        'client_signature', CASE WHEN RANDOM() > 0.1 THEN true ELSE false END,
        'vehicle_ready_for_delivery', true
    ),
    encode(sha256(('vehicle_handover_' || d.id)::bytea), 'hex'),
    (d.activated_at + INTERVAL '6 hours')::timestamptz,
    (d.activated_at + INTERVAL '18 hours')::timestamptz
FROM deals d
WHERE d.activated_at IS NOT NULL
LIMIT 40;

-- Задачи по закрытию сделок - 30 задач
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    'deal_closure',
    'Финальное закрытие договора ' || d.deal_number,
    'IN_PROGRESS',
    'OP_MANAGER',
    d.assigned_account_manager,
    (d.contract_end_date + INTERVAL '7 days')::timestamptz,
    NULL,
    'ON_TRACK',
    jsonb_build_object(
        'closure_reason', CASE WHEN RANDOM() > 0.8 THEN 'contract_completed' ELSE 'early_termination' END,
        'final_payment_status', CASE WHEN RANDOM() > 0.2 THEN 'paid' ELSE 'pending' END,
        'vehicle_return_status', CASE WHEN RANDOM() > 0.3 THEN 'returned' ELSE 'pending' END,
        'documentation_complete', CASE WHEN RANDOM() > 0.4 THEN true ELSE false END
    ),
    encode(sha256(('deal_closure_' || d.id)::bytea), 'hex'),
    (d.contract_end_date - INTERVAL '3 days')::timestamptz,
    (d.contract_end_date - INTERVAL '3 days')::timestamptz
FROM deals d
WHERE d.status = 'active'
LIMIT 30;

-- =====================================================================
-- 1.2 ОПЕРАЦИОННЫЕ ЗАДАЧИ - 110 задач
-- =====================================================================

-- Задачи по техническому обслуживанию автомобилей - 45 задач
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    'vehicle_maintenance',
    'Плановое техническое обслуживание автомобиля по договору ' || d.deal_number,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'COMPLETED'
        WHEN RANDOM() > 0.4 THEN 'IN_PROGRESS'  
        ELSE 'OPEN'
    END,
    'TECH_SPECIALIST',
    (SELECT user_id FROM profiles WHERE role = 'TECH_SPECIALIST' ORDER BY RANDOM() LIMIT 1),
    (CURRENT_TIMESTAMP + (RANDOM() * INTERVAL '14 days'))::timestamptz,
    CASE WHEN RANDOM() > 0.7 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days'))::timestamptz ELSE NULL END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'ON_TRACK'
        WHEN RANDOM() > 0.5 THEN 'WARNING'
        ELSE 'BREACHED'
    END,
    jsonb_build_object(
        'maintenance_type', CASE WHEN RANDOM() > 0.6 THEN 'scheduled_service' ELSE 'repair' END,
        'mileage_interval', (RANDOM() * 10000 + 5000)::integer,
        'service_provider', CASE WHEN RANDOM() > 0.5 THEN 'authorized_dealer' ELSE 'certified_workshop' END,
        'estimated_cost', (RANDOM() * 2000 + 500)::numeric(16,2),
        'parts_required', ARRAY['oil_filter', 'air_filter', CASE WHEN RANDOM() > 0.7 THEN 'brake_pads' END]
    ),
    encode(sha256(('maintenance_' || d.id || '_' || generate_series)::bytea), 'hex'),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '15 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 задачи обслуживания на сделку
WHERE d.status = 'active'
LIMIT 45;

-- Задачи по обработке страховых случаев - 28 задач
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    'insurance_claim_processing',
    'Обработка страхового случая по договору ' || d.deal_number,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'COMPLETED'
        WHEN RANDOM() > 0.3 THEN 'IN_PROGRESS'  
        ELSE 'OPEN'
    END,
    'SUPPORT',
    (SELECT user_id FROM profiles WHERE role = 'SUPPORT' ORDER BY RANDOM() LIMIT 1),
    (CURRENT_TIMESTAMP + (RANDOM() * INTERVAL '21 days'))::timestamptz,
    CASE WHEN RANDOM() > 0.6 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '14 days'))::timestamptz ELSE NULL END,
    'ON_TRACK',
    jsonb_build_object(
        'claim_type', CASE WHEN RANDOM() > 0.5 THEN 'accident' WHEN RANDOM() > 0.25 THEN 'theft' ELSE 'damage' END,
        'claim_amount', (RANDOM() * 50000 + 5000)::numeric(16,2),
        'insurance_provider', d.insurance_details->>'provider',
        'claim_status', CASE WHEN RANDOM() > 0.4 THEN 'approved' ELSE 'under_review' END,
        'estimated_resolution_days', (RANDOM() * 14 + 7)::integer,
        'deductible_amount', (d.insurance_details->>'deductible')::numeric(16,2)
    ),
    encode(sha256(('insurance_' || d.id || '_' || generate_series)::bytea), 'hex'),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '21 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '10 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 задачи страховых случаев
WHERE d.status = 'active'
LIMIT 28;

-- Задачи по обновлению клиентских данных - 22 задачи
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    'client_data_update',
    'Обновление контактных данных клиента по договору ' || d.deal_number,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'COMPLETED'
        WHEN RANDOM() > 0.5 THEN 'IN_PROGRESS'  
        ELSE 'OPEN'
    END,
    'SUPPORT',
    (SELECT user_id FROM profiles WHERE role = 'SUPPORT' ORDER BY RANDOM() LIMIT 1),
    (CURRENT_TIMESTAMP + (RANDOM() * INTERVAL '7 days'))::timestamptz,
    CASE WHEN RANDOM() > 0.8 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '3 days'))::timestamptz ELSE NULL END,
    'ON_TRACK',
    jsonb_build_object(
        'update_type', CASE WHEN RANDOM() > 0.6 THEN 'address_change' WHEN RANDOM() > 0.3 THEN 'phone_update' ELSE 'email_change' END,
        'previous_data', jsonb_build_object('verified', false),
        'new_data', jsonb_build_object('verified', true),
        'verification_method', CASE WHEN RANDOM() > 0.5 THEN 'document_upload' ELSE 'phone_verification' END,
        'compliance_check', CASE WHEN RANDOM() > 0.2 THEN 'passed' ELSE 'pending' END
    ),
    encode(sha256(('client_update_' || d.id || '_' || generate_series)::bytea), 'hex'),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '14 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 1) -- 1 задача обновления данных на сделку
WHERE d.status = 'active'
LIMIT 22;

-- Задачи по координации с поставщиками - 15 задач
INSERT INTO tasks (
    id, deal_id, type, title, status, assignee_role, assignee_user_id,
    sla_due_at, completed_at, sla_status, payload, action_hash, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    'supplier_coordination',
    'Координация с поставщиком запчастей для договора ' || d.deal_number,
    'COMPLETED',
    'OP_MANAGER',
    d.assigned_account_manager,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '5 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '3 days'))::timestamptz,
    'ON_TRACK',
    jsonb_build_object(
        'supplier_name', CASE WHEN RANDOM() > 0.5 THEN 'AutoParts Plus LLC' ELSE 'Emirates Auto Supply' END,
        'parts_ordered', ARRAY['engine_oil', 'filters', 'brake_components'],
        'order_value', (RANDOM() * 5000 + 1000)::numeric(16,2),
        'delivery_status', CASE WHEN RANDOM() > 0.2 THEN 'delivered' ELSE 'pending' END,
        'payment_terms', 'net_30',
        'warranty_period', '12 months'
    ),
    encode(sha256(('supplier_coord_' || d.id || '_' || generate_series)::bytea), 'hex'),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '10 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '5 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 1) -- 1 задача координации
WHERE d.status = 'active'
LIMIT 15;

-- =====================================================================
-- 2. СИСТЕМА УВЕДОМЛЕНИЙ (CLIENT_NOTIFICATIONS) - 445 записей
-- =====================================================================

-- =====================================================================
-- 2.1 УВЕДОМЛЕНИЯ КЛИЕНТАМ - 285 уведомлений
-- =====================================================================

-- Уведомления о статусах заявок - 95 уведомлений
INSERT INTO client_notifications (
    id, client_id, title, message, icon, severity, read_at, created_at
) 
SELECT 
    gen_random_uuid(),
    a.user_id,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Заявка одобрена'
        WHEN RANDOM() > 0.6 THEN 'Требуются дополнительные документы'
        WHEN RANDOM() > 0.4 THEN 'Заявка на рассмотрении'
        ELSE 'Статус заявки обновлен'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Поздравляем! Ваша заявка на лизинг была одобрена. Скоро с вами свяжется наш менеджер для оформления договора.'
        WHEN RANDOM() > 0.6 THEN 'Для завершения рассмотрения заявки необходимо предоставить дополнительные документы. Список документов отправлен на ваш email.'
        WHEN RANDOM() > 0.4 THEN 'Ваша заявка успешно подана и находится на рассмотрении. Средний срок рассмотрения составляет 24-48 часов.'
        ELSE 'Статус вашей заявки обновлен. Пожалуйста, ознакомьтесь с новой информацией в личном кабинете.'
    END,
    'application',
    'info',
    CASE WHEN RANDOM() > 0.4 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days'))::timestamptz ELSE NULL END,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '14 days'))::timestamptz
FROM applications a
CROSS JOIN generate_series(1, 2) -- 2 уведомления на заявку
LIMIT 95;

-- Напоминания о платежах - 75 уведомлений
INSERT INTO client_notifications (
    id, client_id, title, message, icon, severity, read_at, created_at
) 
SELECT 
    gen_random_uuid(),
    d.client_id,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Предстоящий платеж'
        WHEN RANDOM() > 0.4 THEN 'Напоминание о платеже'
        ELSE 'Платеж просрочен'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Напоминаем о предстоящем платеже по договору ' || d.deal_number || ' на сумму ' || d.monthly_payment || ' AED. Дата платежа: ' || d.first_payment_date || '.'
        WHEN RANDOM() > 0.4 THEN 'До платежа по договору ' || d.deal_number || ' осталось 3 дня. Сумма к оплате: ' || d.monthly_payment || ' AED. Пожалуйста, убедитесь в наличии средств на счету.'
        ELSE 'Платеж по договору ' || d.deal_number || ' просрочен. Сумма задолженности: ' || d.monthly_payment || ' AED. Пожалуйста, внесите платеж в ближайшее время для избежания дополнительных штрафов.'
    END,
    'payment',
    CASE WHEN RANDOM() > 0.7 THEN 'warning' WHEN RANDOM() > 0.4 THEN 'error' ELSE 'info' END,
    CASE WHEN RANDOM() > 0.3 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '3 days'))::timestamptz ELSE NULL END,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '10 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 уведомления о платежах на сделку
WHERE d.status IN ('active', 'suspended')
LIMIT 75;

-- Уведомления об обслуживании - 65 уведомлений
INSERT INTO client_notifications (
    id, client_id, title, message, icon, severity, read_at, created_at
) 
SELECT 
    gen_random_uuid(),
    d.client_id,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'Плановое обслуживание'
        WHEN RANDOM() > 0.3 THEN 'Завершено обслуживание'
        ELSE 'Требуется обслуживание'
    END,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'Ваш автомобиль запланирован на плановое техническое обслуживание. Рекомендуемая дата: ' || (CURRENT_DATE + (RANDOM() * INTERVAL '30 days')::interval)::date || '. Продолжительность: 2-4 часа.'
        WHEN RANDOM() > 0.3 THEN 'Плановое техническое обслуживание вашего автомобиля успешно завершено. Следующее обслуживание рекомендуется через ' || (RANDOM() * 3 + 6)::integer || ' месяцев.'
        ELSE 'По результатам диагностики рекомендуется провести техническое обслуживание автомобиля для поддержания оптимального состояния и сохранения гарантии.'
    END,
    'maintenance',
    'info',
    CASE WHEN RANDOM() > 0.2 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '5 days'))::timestamptz ELSE NULL END,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '21 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 уведомления об обслуживании на сделку
WHERE d.status = 'active'
LIMIT 65;

-- Общие сообщения клиентам - 50 уведомлений
INSERT INTO client_notifications (
    id, client_id, title, message, icon, severity, read_at, created_at
) 
SELECT 
    gen_random_uuid(),
    d.client_id,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Поздравляем с днем рождения!'
        WHEN RANDOM() > 0.6 THEN 'Новые условия программы лояльности'
        WHEN RANDOM() > 0.4 THEN 'Важное уведомление'
        ELSE 'Обновление в системе'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'Команда FastLease поздравляет вас с днем рождения! Желаем безопасных поездок и благополучия. Как постоянному клиенту мы предоставляем скидку 15% на следующее обслуживание автомобиля.'
        WHEN RANDOM() > 0.6 THEN 'Мы обновили программу лояльности FastLease Premium. Теперь вы можете получать больше бонусов, скидки на обслуживание и приоритетную поддержку 24/7.'
        WHEN RANDOM() > 0.4 THEN 'В связи с обновлением законодательства ОАЭ внесены изменения в условия лизинговых договоров. Подробная информация доступна в личном кабинете.'
        ELSE 'Система FastLease обновлена до новой версии. Доступны улучшенные функции мобильного приложения и расширенная аналитика по вашему договору.'
    END,
    'general',
    'info',
    CASE WHEN RANDOM() > 0.5 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '2 days'))::timestamptz ELSE NULL END,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 1) -- 1 общее уведомление на сделку
WHERE d.status IN ('active', 'suspended')
LIMIT 50;

-- =====================================================================
-- 2.2 ВНУТРИСИСТЕМНЫЕ УВЕДОМЛЕНИЯ - 160 уведомлений
-- =====================================================================

-- Уведомления менеджерам по сделкам - 85 уведомлений
INSERT INTO client_notifications (
    id, client_id, title, message, icon, severity, read_at, created_at
) 
SELECT 
    gen_random_uuid(),
    ur.user_id,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Новая задача по сделке'
        WHEN RANDOM() > 0.5 THEN 'Напоминание о дедлайне'
        WHEN RANDOM() > 0.3 THEN 'Клиент ожидает ответа'
        ELSE 'Требуется эскалация'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Назначена новая задача по договору '
            || format('LTR-%s-%s', to_char(current_date, 'DDMMYY'), LPAD((ROW_NUMBER() OVER())::text, 4, '0'))
            || '. Требуется проверка документов клиента в течение 24 часов.'
        WHEN RANDOM() > 0.5 THEN 'Напоминание: срок выполнения задачи истекает завтра. Количество просроченных задач: ' || (RANDOM() * 5 + 1)::integer || '.'
        WHEN RANDOM() > 0.3 THEN 'Клиент оставил сообщение в тикете поддержки #SUP-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0') || '. Ожидается ответ в течение 4 часов.'
        ELSE 'Сделка '
            || format('LTR-%s-%s', to_char(current_date, 'DDMMYY'), LPAD((ROW_NUMBER() OVER())::text, 4, '0'))
            || ' требует внимания руководства. Обратитесь к операционному менеджеру.'
    END,
    'task',
    'warning',
    CASE WHEN RANDOM() > 0.6 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '6 hours'))::timestamptz ELSE NULL END,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '12 hours'))::timestamptz
FROM user_roles ur
CROSS JOIN generate_series(1, 3) -- 3 уведомления на менеджера
WHERE ur.role = 'OP_MANAGER'
LIMIT 85;

-- Уведомления финансовому отделу - 40 уведомлений
INSERT INTO client_notifications (
    id, client_id, title, message, icon, severity, read_at, created_at
) 
SELECT 
    gen_random_uuid(),
    ur.user_id,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'Просроченный платеж'
        WHEN RANDOM() > 0.4 THEN 'Запрос на изменение условий'
        ELSE 'Ежедневный финансовый отчет'
    END,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'Выявлен просроченный платеж по договору '
            || format('LTR-%s-%s', to_char(current_date, 'DDMMYY'), LPAD((ROW_NUMBER() OVER())::text, 4, '0'))
            || '. Сумма: ' || (RANDOM() * 50000 + 10000)::numeric(16,2) || ' AED. Требуется уведомление клиента.'
        WHEN RANDOM() > 0.4 THEN 'Поступил запрос на изменение условий лизинга от клиента. Необходимо рассмотреть возможность реструктуризации платежей.'
        ELSE 'Ежедневный отчет по финансовым операциям готов. Всего платежей обработано: ' || (RANDOM() * 50 + 20)::integer || ', на сумму ' || (RANDOM() * 500000 + 100000)::numeric(16,2) || ' AED.'
    END,
    'finance',
    'info',
    CASE WHEN RANDOM() > 0.4 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '8 hours'))::timestamptz ELSE NULL END,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '24 hours'))::timestamptz
FROM user_roles ur
CROSS JOIN generate_series(1, 2) -- 2 уведомления на финансиста
WHERE ur.role = 'FINANCE'
LIMIT 40;

-- Уведомления техническому отделу - 35 уведомлений
INSERT INTO client_notifications (
    id, client_id, title, message, icon, severity, read_at, created_at
) 
SELECT 
    gen_random_uuid(),
    ur.user_id,
    CASE 
        WHEN RANDOM() > 0.5 THEN 'Новый заказ на обслуживание'
        WHEN RANDOM() > 0.3 THEN 'Завершено техническое обслуживание'
        ELSE 'Требуется диагностика'
    END,
    CASE 
        WHEN RANDOM() > 0.5 THEN 'Поступил новый заказ на техническое обслуживание автомобиля. VIN: WDC' || LPAD((ROW_NUMBER() OVER())::text, 10, '0') || '. Тип работ: плановое ТО + замена тормозных колодок.'
        WHEN RANDOM() > 0.3 THEN 'Завершено техническое обслуживание автомобиля по договору '
            || format('LTR-%s-%s', to_char(current_date, 'DDMMYY'), LPAD((ROW_NUMBER() OVER())::text, 4, '0'))
            || '. Все работы выполнены в срок. Автомобиль готов к выдаче.'
        ELSE 'Требуется внеплановая диагностика автомобиля. Клиент сообщил о необычных звуках при торможении. VIN: ' || LPAD((ROW_NUMBER() OVER())::text, 17, '0') || '.'
    END,
    'technical',
    'info',
    CASE WHEN RANDOM() > 0.7 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '4 hours'))::timestamptz ELSE NULL END,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '18 hours'))::timestamptz
FROM user_roles ur
CROSS JOIN generate_series(1, 2) -- 2 уведомления на технического специалиста
WHERE ur.role = 'TECH_SPECIALIST'
LIMIT 35;

-- =====================================================================
-- 3. СИСТЕМА ПОДДЕРЖКИ (SUPPORT_TICKETS) - 168 тикетов
-- =====================================================================

-- =====================================================================
-- 3.1 ТИКЕТЫ ПО КАТЕГОРИЯМ
-- =====================================================================

-- Техническая поддержка - 58 тикетов
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
        WHEN RANDOM() > 0.8 THEN 'Проблема с мобильным приложением'
        WHEN RANDOM() > 0.6 THEN 'Ошибка в личном кабинете'
        WHEN RANDOM() > 0.4 THEN 'Не работает онлайн-оплата'
        WHEN RANDOM() > 0.2 THEN 'Проблема с уведомлениями'
        ELSE 'Техническая ошибка системы'
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
        WHEN RANDOM() > 0.8 THEN 'Не могу войти в мобильное приложение. Выдает ошибку "Invalid credentials" хотя логин и пароль правильные. Пробовал переустанавливать приложение - не помогло.'
        WHEN RANDOM() > 0.6 THEN 'В личном кабинете не отображаются данные о текущем балансе и платежах. Страница загружается, но данные показываются как "Loading..."'
        WHEN RANDOM() > 0.4 THEN 'При попытке оплаты через сайт появляется ошибка платежного шлюза. Карта привязана правильно, средства на счету есть.'
        WHEN RANDOM() > 0.2 THEN 'Не приходят уведомления о предстоящих платежах. В настройках уведомления включены, но SMS и email не приходят.'
        ELSE 'Система периодически выдает ошибку "Session timeout" и требует повторной авторизации каждые 5-10 минут.'
    END,
    '[]'::jsonb,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '8 hours'))::timestamptz,
    SUBSTRING(CASE 
        WHEN RANDOM() > 0.7 THEN 'Проблема решена. Приложение обновлено.'
        WHEN RANDOM() > 0.4 THEN 'Информация передана в IT-отдел.'
        WHEN RANDOM() > 0.2 THEN 'Проводим диагностику системы.'
        ELSE 'Ожидаем ответа от разработчиков.'
    END, 1, 50),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '72 hours'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '8 hours'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 3) -- 3 технических тикета на сделку
WHERE d.status = 'active'
LIMIT 58;

-- Финансовые вопросы - 45 тикетов
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
        WHEN RANDOM() > 0.7 THEN 'Вопрос по платежу'
        WHEN RANDOM() > 0.5 THEN 'Досрочное погашение'
        WHEN RANDOM() > 0.3 THEN 'Изменение способа оплаты'
        ELSE 'Несоответствие суммы в счете'
    END,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'high'
        WHEN RANDOM() > 0.3 THEN 'medium'
        ELSE 'low'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'resolved'
        WHEN RANDOM() > 0.5 THEN 'in_progress'
        ELSE 'open'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Хотел бы уточнить сумму предстоящего платежа и способ оплаты. В личном кабинете показывается одна сумма, а в SMS - другая.'
        WHEN RANDOM() > 0.5 THEN 'Интересует возможность досрочного погашения договора. Какая будет сумма к доплате и какие есть варианты?'
        WHEN RANDOM() > 0.3 THEN 'Хочу изменить способ оплаты с банковской карты на банковский перевод. Возможно ли это сделать?'
        ELSE 'В полученном счете указана сумма ' || (RANDOM() * 5000 + 10000)::numeric(16,2) || ' AED, но согласно договору должно быть ' || (RANDOM() * 5000 + 10000)::numeric(16,2) || ' AED.'
    END,
    '[]'::jsonb,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '6 hours'))::timestamptz,
    SUBSTRING(CASE 
        WHEN RANDOM() > 0.8 THEN 'Информация предоставлена клиенту.'
        WHEN RANDOM() > 0.5 THEN 'Передан в финансовый отдел.'
        WHEN RANDOM() > 0.3 THEN 'Выставлен новый счет.'
        ELSE 'Клиент ожидает ответа.'
    END, 1, 50),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '48 hours'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '6 hours'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 финансовых тикета на сделку
WHERE d.status = 'active'
LIMIT 45;

-- Обслуживание автомобилей - 38 тикетов
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
        WHEN RANDOM() > 0.6 THEN 'Запись на техобслуживание'
        WHEN RANDOM() > 0.4 THEN 'Проблема с автомобилем'
        WHEN RANDOM() > 0.2 THEN 'Запрос на эвакуацию'
        ELSE 'Гарантийный случай'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'high'
        WHEN RANDOM() > 0.4 THEN 'medium'
        ELSE 'low'
    END,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'resolved'
        WHEN RANDOM() > 0.3 THEN 'in_progress'
        ELSE 'open'
    END,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'Необходимо записаться на плановое техническое обслуживание. Пробег достиг ' || (RANDOM() * 5000 + 15000)::integer || ' км. Когда можно приехать в сервис?'
        WHEN RANDOM() > 0.4 THEN 'Автомобиль издает странный звук при торможении. Также появилась вибрация на руле. Что делать?'
        WHEN RANDOM() > 0.2 THEN 'Автомобиль сломался на дороге, не заводится. Нужна эвакуация в ближайший сервис.'
        ELSE 'Автомобиль на гарантии, но дилер отказывается выполнять ремонт без подтверждения от лизинговой компании.'
    END,
    '[]'::jsonb,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '4 hours'))::timestamptz,
    SUBSTRING(CASE 
        WHEN RANDOM() > 0.6 THEN 'Запись оформлена на завтра.'
        WHEN RANDOM() > 0.4 THEN 'Направлен эвакуатор.'
        WHEN RANDOM() > 0.2 THEN 'Гарантийный случай подтвержден.'
        ELSE 'Передано в технический отдел.'
    END, 1, 50),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '36 hours'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '4 hours'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 тикета обслуживания на сделку
WHERE d.status = 'active'
LIMIT 38;

-- Общие вопросы - 27 тикетов
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
        WHEN RANDOM() > 0.7 THEN 'Изменение персональных данных'
        WHEN RANDOM() > 0.5 THEN 'Вопрос по страховке'
        WHEN RANDOM() > 0.3 THEN 'Запрос на расторжение'
        ELSE 'Общий вопрос по договору'
    END,
    'low',
    CASE 
        WHEN RANDOM() > 0.8 THEN 'resolved'
        WHEN RANDOM() > 0.4 THEN 'in_progress'
        ELSE 'open'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Нужно изменить адрес регистрации и номер телефона в договоре. Какие документы нужны для этого?'
        WHEN RANDOM() > 0.5 THEN 'У меня вопрос по страховому покрытию. Что делать при ДТП и какие документы необходимы?'
        WHEN RANDOM() > 0.3 THEN 'Рассматриваю возможность досрочного расторжения договора. Какие условия и штрафы?'
        ELSE 'Подскажите, какие у меня есть права и обязанности как лизингополучателя согласно договору?'
    END,
    '[]'::jsonb,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '12 hours'))::timestamptz,
    SUBSTRING(CASE 
        WHEN RANDOM() > 0.8 THEN 'Данные успешно обновлены.'
        WHEN RANDOM() > 0.5 THEN 'Процедура расторжения объяснена.'
        WHEN RANDOM() > 0.3 THEN 'Информация по страховке предоставлена.'
        ELSE 'Ответ отправлен клиенту.'
    END, 1, 50),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '60 hours'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '12 hours'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 1) -- 1 общий тикет на сделку
WHERE d.status = 'active'
LIMIT 27;

-- =====================================================================
-- 3.2 СООБЩЕНИЯ В ТИКЕТАХ ПОДДЕРЖКИ
-- =====================================================================

INSERT INTO support_messages (
    id, ticket_id, author_id, body, attachments, created_at
) 
SELECT 
    gen_random_uuid(),
    st.id,
    st.client_id,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Спасибо за быстрый ответ! Проблема полностью решена.'
        WHEN RANDOM() > 0.4 THEN 'Получил ваш ответ. Все понятно, буду следовать рекомендациям.'
        WHEN RANDOM() > 0.2 THEN 'Дополнительные вопросы: можно ли получить письменное подтверждение?'
        ELSE 'Благодарю за помощь. Тема закрыта.'
    END,
    '[]'::jsonb,
    (st.last_message_at - (RANDOM() * INTERVAL '4 hours'))::timestamptz
FROM support_tickets st
WHERE st.status = 'resolved'
LIMIT 100;

-- Сообщения от сотрудников поддержки
INSERT INTO support_messages (
    id, ticket_id, author_id, body, attachments, created_at
) 
SELECT 
    gen_random_uuid(),
    st.id,
    (SELECT user_id FROM profiles WHERE role = 'SUPPORT' ORDER BY RANDOM() LIMIT 1),
    CASE 
        WHEN RANDOM() > 0.6 THEN 'Добро пожаловать! Ваш запрос принят в работу. Ответим в течение 24 часов.'
        WHEN RANDOM() > 0.3 THEN 'Проблема изучена. Выполнены необходимые действия. Проверьте, пожалуйста, работоспособность.'
        ELSE 'Тема закрыта. Если возникнут дополнительные вопросы, обращайтесь!'
    END,
    '[]'::jsonb,
    (st.created_at + (RANDOM() * INTERVAL '2 hours'))::timestamptz
FROM support_tickets st
LIMIT 120;

-- =====================================================================
-- 4. СЕРВИСНОЕ ОБСЛУЖИВАНИЕ ТРАНСПОРТА (VEHICLE_SERVICES) - 95 записей
-- =====================================================================

INSERT INTO vehicle_services (
    id, vehicle_id, deal_id, service_type, title, description, due_date, mileage_target,
    status, completed_at, attachments, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    d.vehicle_id,
    d.id,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'scheduled_service'
        WHEN RANDOM() > 0.5 THEN 'repair'
        WHEN RANDOM() > 0.3 THEN 'inspection'
        ELSE 'emergency_service'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Плановое ТО каждые ' || (RANDOM() * 5 + 10)::integer || ' месяцев'
        WHEN RANDOM() > 0.5 THEN 'Ремонт тормозной системы'
        WHEN RANDOM() > 0.3 THEN 'Диагностика двигателя'
        ELSE 'Экстренный ремонт'
    END,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Замена масла, фильтров, проверка тормозной системы, диагностика электроники'
        WHEN RANDOM() > 0.5 THEN 'Замена тормозных колодок и дисков, прокачка тормозной системы'
        WHEN RANDOM() > 0.3 THEN 'Полная диагностика двигателя, проверка компрессии, анализ масла'
        ELSE 'Ремонт после ДТП, восстановление геометрии кузова'
    END,
    (CURRENT_DATE + (RANDOM() * INTERVAL '30 days'))::date,
    (RANDOM() * 5000 + 15000)::integer,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'completed'
        WHEN RANDOM() > 0.5 THEN 'in_progress'
        ELSE 'scheduled'
    END,
    CASE WHEN RANDOM() > 0.8 THEN (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days'))::timestamptz ELSE NULL END,
    '[]'::jsonb,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '21 days'))::timestamptz,
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '10 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 сервиса на сделку
WHERE d.status = 'active'
LIMIT 95;

-- =====================================================================
-- 5. WORKFLOW ПРОЦЕССЫ - 88 записей
-- =====================================================================

-- =====================================================================
-- 5.1 ОЧЕРЕДЬ ЗАДАЧ WORKFLOW (WORKFLOW_TASK_QUEUE)
-- =====================================================================

INSERT INTO workflow_task_queue (
    id, deal_id, transition_from, transition_to, template_id, task_definition, context,
    status, attempts, action_hash, error, created_at, processed_at
) 
SELECT 
    gen_random_uuid(),
    d.id,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'DOCS_COLLECT'
        WHEN RANDOM() > 0.6 THEN 'CONTRACT_PREP'
        WHEN RANDOM() > 0.4 THEN 'SIGNING_FUNDING'
        ELSE 'ACTIVE'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'CONTRACT_PREP'
        WHEN RANDOM() > 0.6 THEN 'SIGNING_FUNDING'
        WHEN RANDOM() > 0.4 THEN 'ACTIVE'
        ELSE 'COMPLETED'
    END,
    'docs_verification_task',
    jsonb_build_object(
        'task_type', 'document_verification',
        'required_documents', ARRAY['emirates_id', 'passport', 'bank_statement'],
        'sla_hours', 24,
        'assignee_role', 'OP_MANAGER'
    ),
    jsonb_build_object('deal_value', d.total_amount, 'client_category', 'individual'),
    CASE 
        WHEN RANDOM() > 0.7 THEN 'PROCESSED'
        WHEN RANDOM() > 0.3 THEN 'PENDING'
        ELSE 'FAILED'
    END,
    (RANDOM() * 3)::integer,
    encode(sha256(('workflow_' || d.id || '_' || generate_series)::bytea), 'hex'),
    CASE WHEN RANDOM() > 0.9 THEN 'Template not found in workflow definition' ELSE NULL END,
    (d.created_at + (RANDOM() * INTERVAL '12 hours'))::timestamptz,
    CASE WHEN RANDOM() > 0.7 THEN (d.created_at + (RANDOM() * INTERVAL '18 hours'))::timestamptz ELSE NULL END
FROM deals d
CROSS JOIN generate_series(1, 2) -- 2 workflow задачи на сделку
LIMIT 65;

-- =====================================================================
-- 5.2 ШАБЛОНЫ ЗАДАЧ WORKFLOW (WORKFLOW_TASK_TEMPLATES)
-- =====================================================================

INSERT INTO workflow_task_templates (
    id, workflow_version_id, template_id, task_type, schema, default_payload, created_at
) 
SELECT 
    gen_random_uuid(),
    wv.id,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'document_verification_task'
        WHEN RANDOM() > 0.6 THEN 'contract_preparation_task'
        WHEN RANDOM() > 0.4 THEN 'finance_approval_task'
        ELSE 'vehicle_delivery_task'
    END,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'document_verification'
        WHEN RANDOM() > 0.6 THEN 'contract_preparation'
        WHEN RANDOM() > 0.4 THEN 'finance_approval'
        else 'vehicle_delivery'
    END,
    jsonb_build_object(
        'required_fields', ARRAY['assignee_role', 'sla_hours', 'priority'],
        'validation_rules', ARRAY['document_types_required', 'kyc_completed'],
        'escalation_rules', ARRAY['sla_breach', 'document_rejection']
    ),
    jsonb_build_object(
        'priority', 'medium',
        'sla_hours', CASE WHEN RANDOM() > 0.5 THEN 24 ELSE 48 END,
        'auto_assign', true,
        'notification_enabled', true
    ),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days'))::timestamptz
FROM workflow_versions wv
CROSS JOIN generate_series(1, 3) -- 3 шаблона на workflow версию
LIMIT 23;

-- =====================================================================
-- 6. АУДИТ И ЛОГИРОВАНИЕ (AUDIT_LOG) - 520 записей
-- =====================================================================

-- =====================================================================
-- 6.1 АУДИТ ДЕЙСТВИЙ ПОЛЬЗОВАТЕЛЕЙ
-- =====================================================================

-- Аудит входов в систему - 200 записей
INSERT INTO audit_log (
    deal_id, actor_user_id, action, from_status, to_status, metadata, created_at
) 
SELECT 
    d.id,
    d.assigned_account_manager,
    'user_login',
    NULL,
    NULL,
    jsonb_build_object(
        'ip_address', '192.168.1.' || (RANDOM() * 254 + 1)::integer,
        'user_agent', 'FastLeaseApp/1.' || (RANDOM() * 9 + 1)::integer,
        'session_duration', (RANDOM() * 480 + 30)::integer, -- 30-510 минут
        'login_method', CASE WHEN RANDOM() > 0.7 THEN 'email' ELSE 'phone' END,
        'device_type', CASE WHEN RANDOM() > 0.5 THEN 'desktop' ELSE 'mobile' END,
        'success', CASE WHEN RANDOM() > 0.95 THEN false ELSE true END
    ),
    (d.created_at + (RANDOM() * INTERVAL '90 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 8) -- 8 входов в систему на сделку
WHERE d.status IN ('active', 'suspended')
LIMIT 200;

-- Аудит изменений данных - 150 записей
INSERT INTO audit_log (
    deal_id, actor_user_id, action, from_status, to_status, metadata, created_at
) 
SELECT 
    d.id,
    d.assigned_account_manager,
    'data_modification',
    'previous_state',
    'updated_state',
    jsonb_build_object(
        'entity_type', CASE WHEN RANDOM() > 0.6 THEN 'deal' WHEN RANDOM() > 0.3 THEN 'client_profile' ELSE 'payment_schedule' END,
        'field_changed', CASE WHEN RANDOM() > 0.6 THEN 'monthly_payment' WHEN RANDOM() > 0.3 THEN 'contract_terms' ELSE 'contact_info' END,
        'previous_value', 'old_value_' || generate_series,
        'new_value', 'new_value_' || generate_series,
        'modification_reason', CASE WHEN RANDOM() > 0.5 THEN 'client_request' ELSE 'system_update' END,
        'approval_required', CASE WHEN RANDOM() > 0.7 THEN true ELSE false END
    ),
    (d.created_at + (RANDOM() * INTERVAL '60 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 6) -- 6 изменений данных на сделку
WHERE d.status IN ('active', 'suspended')
LIMIT 150;

-- Аудит создания документов - 100 записей
INSERT INTO audit_log (
    deal_id, actor_user_id, action, from_status, to_status, metadata, created_at
) 
SELECT 
    d.id,
    d.assigned_account_manager,
    'document_created',
    'draft',
    'generated',
    jsonb_build_object(
        'document_type', CASE WHEN RANDOM() > 0.6 THEN 'lease_contract' WHEN RANDOM() > 0.3 THEN 'payment_schedule' ELSE 'insurance_certificate' END,
        'document_version', 'v' || (RANDOM() * 3 + 1)::integer,
        'generation_method', CASE WHEN RANDOM() > 0.5 THEN 'automated' ELSE 'manual' END,
        'digital_signature_required', CASE WHEN RANDOM() > 0.3 THEN true ELSE false END,
        'file_size_kb', (RANDOM() * 5000 + 100)::integer,
        'processing_time_seconds', (RANDOM() * 30 + 5)::integer
    ),
    (d.created_at + (RANDOM() * INTERVAL '45 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 4) -- 4 документа на сделку
WHERE d.status IN ('active', 'suspended')
LIMIT 100;

-- Аудит подтверждения операций - 70 записей
INSERT INTO audit_log (
    deal_id, actor_user_id, action, from_status, to_status, metadata, created_at
) 
SELECT 
    d.id,
    d.assigned_account_manager,
    'operation_confirmed',
    'pending_approval',
    'approved',
    jsonb_build_object(
        'operation_type', CASE WHEN RANDOM() > 0.6 THEN 'payment_processing' WHEN RANDOM() > 0.3 THEN 'contract_modification' ELSE 'service_approval' END,
        'operation_id', 'OP-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
        'approval_level', CASE WHEN RANDOM() > 0.7 THEN 'manager' ELSE 'supervisor' END,
        'approval_timestamp', (d.created_at + (RANDOM() * INTERVAL '30 days'))::timestamptz,
        'approval_method', CASE WHEN RANDOM() > 0.5 THEN 'digital_signature' ELSE 'password_confirmation' END,
        'risk_level', CASE WHEN RANDOM() > 0.8 THEN 'high' WHEN RANDOM() > 0.4 THEN 'medium' ELSE 'low' END
    ),
    (d.created_at + (RANDOM() * INTERVAL '30 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 3) -- 3 подтверждения на сделку
WHERE d.status IN ('active', 'suspended')
LIMIT 70;

-- =====================================================================
-- 7. МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ - МЕТРИКИ KPI
-- =====================================================================

-- Создаем дополнительные записи аудита для мониторинга KPI
INSERT INTO audit_log (
    deal_id, actor_user_id, action, from_status, to_status, metadata, created_at
) 
SELECT 
    d.id,
    d.assigned_account_manager,
    'kpi_metric',
    NULL,
    NULL,
    jsonb_build_object(
        'metric_type', 'operational_kpi',
        'metric_name', CASE 
            WHEN RANDOM() > 0.9 THEN 'avg_application_processing_time'
            WHEN RANDOM() > 0.8 THEN 'deal_approval_rate'
            WHEN RANDOM() > 0.7 THEN 'support_ticket_resolution_time'
            WHEN RANDOM() > 0.6 THEN 'client_satisfaction_score'
            WHEN RANDOM() > 0.5 THEN 'vehicle_downtime_hours'
            WHEN RANDOM() > 0.4 THEN 'payment_collection_rate'
            WHEN RANDOM() > 0.3 THEN 'renewal_conversion_rate'
            WHEN RANDOM() > 0.2 THEN 'cost_per_acquisition'
            ELSE 'monthly_recurring_revenue'
        END,
        'metric_value', CASE 
            WHEN RANDOM() > 0.5 THEN (RANDOM() * 48 + 12)::numeric(5,1) -- часы
            WHEN RANDOM() > 0.3 THEN (RANDOM() * 0.3 + 0.7)::numeric(3,2) -- проценты
            ELSE (RANDOM() * 50000 + 10000)::numeric(10,2) -- суммы
        END,
        'target_value', CASE 
            WHEN RANDOM() > 0.5 THEN 24.0 -- целевые часы
            WHEN RANDOM() > 0.3 THEN 0.85 -- целевой процент
            ELSE 25000.0 -- целевая сумма
        END,
        'variance_percent', (RANDOM() * 0.2 - 0.1)::numeric(4,3), -- отклонение ±10%
        'measurement_period', CASE WHEN RANDOM() > 0.5 THEN 'monthly' ELSE 'weekly' END,
        'data_source', 'automated_calculation'
    ),
    (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days'))::timestamptz
FROM deals d
CROSS JOIN generate_series(1, 3) -- 3 KPI метрики на сделку
WHERE d.status IN ('active', 'suspended')
LIMIT 150;

-- =====================================================================
-- 8. ПРОВЕРОЧНЫЕ ЗАПРОСЫ И СТАТИСТИКА
-- =====================================================================

-- Статистика по задачам
SELECT 
    type,
    status,
    assignee_role,
    COUNT(*) as task_count,
    COUNT(CASE WHEN sla_status = 'BREACHED' THEN 1 END) as breached_sla_tasks,
    ROUND(COUNT(CASE WHEN sla_status = 'BREACHED' THEN 1 END) * 100.0 / COUNT(*), 2) as breach_percentage
FROM tasks 
GROUP BY type, status, assignee_role
ORDER BY type, status;

-- Статистика по уведомлениям
SELECT 
    severity,
    COUNT(*) as notification_count,
    COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read_notifications,
    ROUND(COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as read_rate
FROM client_notifications 
GROUP BY severity
ORDER BY notification_count DESC;

-- Статистика по тикетам поддержки
SELECT 
    topic,
    priority,
    status,
    COUNT(*) as ticket_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600), 2) as avg_resolution_hours
FROM support_tickets 
GROUP BY topic, priority, status
ORDER BY ticket_count DESC;

-- Статистика по сервисному обслуживанию
SELECT 
    service_type,
    status,
    COUNT(*) as service_count,
    ROUND(AVG(estimated_cost), 2) as avg_estimated_cost
FROM vehicle_services 
GROUP BY service_type, status
ORDER BY service_count DESC;

-- Статистика по workflow процессам
SELECT 
    status,
    COUNT(*) as process_count,
    ROUND(AVG(attempts), 2) as avg_attempts
FROM workflow_task_queue 
GROUP BY status
ORDER BY process_count DESC;

-- Общая статистика аудита
SELECT 
    action,
    COUNT(*) as event_count,
    COUNT(DISTINCT actor_user_id) as unique_users,
    COUNT(DISTINCT deal_id) as deals_affected
FROM audit_log 
GROUP BY action
ORDER BY event_count DESC;

-- =====================================================================
-- КОНЕЦ ФАЙЛА MOCK-OPERATIONS.SQL
-- =====================================================================
