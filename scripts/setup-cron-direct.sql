-- Настройка cron job для workflow алертов (без Vault)
-- ВАЖНО: Замени значения ниже на свои реальные данные

-- 1. Включаем необходимые расширения
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Удаляем существующий cron job если есть (с проверкой существования)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'workflow-alerts-monitor') THEN
            PERFORM cron.unschedule('workflow-alerts-monitor');
        END IF;
    END IF;
END $$;

-- 3. Создаем функцию для вызова Edge Function
CREATE OR REPLACE FUNCTION call_workflow_alerts()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    response_status integer;
    response_content text;
    project_url text := 'https://sfekjkzuionqapecccwf.supabase.co'; -- ЗАМЕНИ НА СВОЙ URL
    anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZWtqa3p1aW9ucWFwZWNjY3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODA1OTQsImV4cCI6MjA3NTM1NjU5NH0.a28RCssvl9iKgXtWjDn0e_xzyxCrM7Av_wIMRL4o5cM'; -- ЗАМЕНИ НА СВОЙ ANON KEY
BEGIN
    -- Вызываем Edge Function через HTTP POST
    SELECT status, content INTO response_status, response_content
    FROM net.http_post(
        url := project_url || '/functions/v1/workflow-alerts',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || anon_key,
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    );
    
    -- Логируем результат (опционально)
    RAISE NOTICE 'Workflow alerts check completed. Status: %, Response: %', response_status, response_content;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error calling workflow alerts: %', SQLERRM;
END;
$$;

-- 4. Создаем cron job для запуска каждые 10 минут
SELECT cron.schedule(
    'workflow-alerts-monitor',
    '*/10 * * * *',
    'SELECT call_workflow_alerts();'
);

-- 5. Проверяем созданный cron job
SELECT * FROM cron.job WHERE jobname = 'workflow-alerts-monitor';