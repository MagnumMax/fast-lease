-- Полная очистка базы данных Fast Lease
-- Выполняется в правильном порядке с учетом внешних ключей

BEGIN;

-- Отключаем проверки внешних ключей для быстрой очистки
SET session_replication_role = 'replica';

-- Очищаем таблицы в порядке обратном зависимостям

-- 1. Удаляем данные из таблиц workflow и операций
TRUNCATE TABLE public.investor_reports RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.portfolio_activity_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.portfolio_performance_snapshots RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.portfolio_assets RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.investment_portfolios RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.investors RESTART IDENTITY CASCADE;

-- 2. Удаляем коммуникации и уведомления
TRUNCATE TABLE public.support_messages RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.support_tickets RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.client_notifications RESTART IDENTITY CASCADE;

-- 3. Удаляем финансовые данные
TRUNCATE TABLE public.payment_transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.payments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.payment_schedules RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.invoices RESTART IDENTITY CASCADE;

-- 4. Удаляем документы и медиа
TRUNCATE TABLE public.deal_documents RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.application_documents RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.vehicle_images RESTART IDENTITY CASCADE;

-- 5. Удаляем реферальную систему
TRUNCATE TABLE public.referral_rewards RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.referral_deals RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.referral_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.referral_codes RESTART IDENTITY CASCADE;

-- 6. Удаляем сервисные данные
TRUNCATE TABLE public.vehicle_services RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.vehicle_specifications RESTART IDENTITY CASCADE;

-- 7. Удаляем основные бизнес-сущности
TRUNCATE TABLE public.deal_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.deals RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.applications RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.vehicles RESTART IDENTITY CASCADE;

-- 8. Удаляем workflow данные
TRUNCATE TABLE public.workflow_deal_audit_log RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.workflow_action_queue RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.workflow_notification_queue RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.workflow_assets RESTART IDENTITY CASCADE;

-- 9. Удаляем пользовательские данные
TRUNCATE TABLE public.user_roles RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.profiles RESTART IDENTITY CASCADE;

-- 10. Очищаем таблицы аутентификации
TRUNCATE TABLE auth.mfa_amr_claims CASCADE;
TRUNCATE TABLE auth.mfa_challenges CASCADE;
TRUNCATE TABLE auth.one_time_tokens CASCADE;
TRUNCATE TABLE auth.sessions CASCADE;
TRUNCATE TABLE auth.identities CASCADE;
TRUNCATE TABLE auth.refresh_tokens CASCADE;
TRUNCATE TABLE auth.mfa_factors CASCADE;

-- Включаем обратно проверки внешних ключей
SET session_replication_role = 'origin';

COMMIT;

-- Выводим сообщение об успешной очистке
SELECT 'База данных успешно очищена' as status;
