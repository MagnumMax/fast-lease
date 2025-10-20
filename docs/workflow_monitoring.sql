-- Очередь уведомлений по статусам
select status, count(*)
from workflow_notification_queue
group by status
order by status;

-- Очередь вебхуков по статусам
select status, count(*)
from workflow_webhook_queue
group by status
order by status;

-- Записи, ожидающие обработки более 15 минут
select id, template, status, created_at, processed_at
from workflow_notification_queue
where status = 'PENDING'
  and created_at < now() - interval '15 minutes'
order by created_at asc;

-- История ошибок за последние 24 часа
select id, template, status, error,
       created_at, processed_at
from workflow_notification_queue
where status = 'FAILED'
  and processed_at > now() - interval '24 hours'
order by processed_at desc;

-- ========================================
-- ЗАПРОСЫ ДЛЯ SUPABASE ALERTS
-- ========================================

-- Алерт 1: Проверка количества FAILED уведомлений
-- Использовать для создания алерта: если результат > 0, отправлять уведомление
select 
  'notification_queue_failed' as alert_type,
  count(*) as failed_count,
  now() as check_time
from workflow_notification_queue
where status = 'FAILED';

-- Алерт 2: Проверка количества PENDING уведомлений
-- Использовать для создания алерта: если результат > 50, отправлять уведомление
select 
  'notification_queue_pending' as alert_type,
  count(*) as pending_count,
  now() as check_time
from workflow_notification_queue
where status = 'PENDING';

-- Алерт 3: Комбинированный запрос для всех очередей
-- Универсальный запрос для мониторинга всех типов очередей
select 
  'workflow_queues_status' as alert_type,
  (select count(*) from workflow_notification_queue where status = 'FAILED') as notifications_failed,
  (select count(*) from workflow_notification_queue where status = 'PENDING') as notifications_pending,
  (select count(*) from workflow_webhook_queue where status = 'FAILED') as webhooks_failed,
  (select count(*) from workflow_webhook_queue where status = 'PENDING') as webhooks_pending,
  (select count(*) from workflow_schedule_queue where status = 'FAILED') as schedules_failed,
  (select count(*) from workflow_schedule_queue where status = 'PENDING') as schedules_pending,
  now() as check_time;

-- Алерт 4: Старые PENDING записи (более 1 часа)
-- Использовать для создания алерта: если результат > 0, отправлять уведомление
select 
  'old_pending_notifications' as alert_type,
  count(*) as old_pending_count,
  now() as check_time
from workflow_notification_queue
where status = 'PENDING'
  and created_at < now() - interval '1 hour';
