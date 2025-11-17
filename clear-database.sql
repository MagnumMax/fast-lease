-- Очистка базы данных FastLease в правильном порядке (с учетом foreign key зависимостей)
-- ВНИМАНИЕ: Этот скрипт удалит ВСЕ данные из базы данных!

-- Отключаем временно foreign key constraints для ускорения очистки
SET session_replication_role = 'replica';

-- Очищаем таблицы в обратном порядке зависимостей

-- Специализированные модули
TRUNCATE TABLE investor_reports CASCADE;
TRUNCATE TABLE portfolio_activity_events CASCADE;
TRUNCATE TABLE portfolio_performance_snapshots CASCADE;
TRUNCATE TABLE portfolio_assets CASCADE;
TRUNCATE TABLE investment_portfolios CASCADE;
TRUNCATE TABLE investors CASCADE;

-- Финансовые данные
TRUNCATE TABLE payment_transactions CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE payment_schedules CASCADE;
TRUNCATE TABLE invoices CASCADE;

-- Операционные данные
TRUNCATE TABLE support_messages CASCADE;
TRUNCATE TABLE support_tickets CASCADE;
TRUNCATE TABLE client_notifications CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE workflow_task_queue CASCADE;
TRUNCATE TABLE workflow_task_templates CASCADE;
TRUNCATE TABLE workflow_notification_queue CASCADE;
TRUNCATE TABLE workflow_webhook_queue CASCADE;
TRUNCATE TABLE workflow_schedule_queue CASCADE;

-- Сделки и заявки
TRUNCATE TABLE deal_events CASCADE;
TRUNCATE TABLE deal_documents CASCADE;
TRUNCATE TABLE vehicle_services CASCADE;
TRUNCATE TABLE audit_log CASCADE;
TRUNCATE TABLE referral_rewards CASCADE;
TRUNCATE TABLE referral_deals CASCADE;
TRUNCATE TABLE referral_events CASCADE;
TRUNCATE TABLE referral_codes CASCADE;
TRUNCATE TABLE deals CASCADE;
TRUNCATE TABLE application_documents CASCADE;
TRUNCATE TABLE applications CASCADE;

-- Автомобили
TRUNCATE TABLE vehicle_specifications CASCADE;
TRUNCATE TABLE vehicle_images CASCADE;
TRUNCATE TABLE vehicles CASCADE;

-- Пользователи и роли
TRUNCATE TABLE user_roles CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Workflow данные
-- workflow_contacts удалена; пропускаем
TRUNCATE TABLE workflow_assets CASCADE;
TRUNCATE TABLE workflow_versions CASCADE;

-- Системные таблицы
TRUNCATE TABLE role_access_rules CASCADE;

-- Включаем обратно foreign key constraints
SET session_replication_role = 'origin';

-- Проверяем, что все таблицы пустые
SELECT
    schemaname,
    tablename,
    n_tup_ins - n_tup_del as rowcount
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Сообщение об успешной очистке
SELECT 'База данных FastLease успешно очищена!' as status;
