-- Настройка cron job для автоматической проверки workflow алертов
-- Выполняется каждые 10 минут

-- Сначала сохраняем URL проекта и ключ в Vault (если еще не сохранены)
select vault.create_secret('https://sfekjkzuionqapecccwf.supabase.co', 'project_url');
select vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZWtqa3p1aW9ucWFwZWNjY3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODA1OTQsImV4cCI6MjA3NTM1NjU5NH0.a28RCssvl9iKgXtWjDn0e_xzyxCrM7Av_wIMRL4o5cM', 'anon_key');

-- Создаем cron job для вызова Edge Function workflow-alerts каждые 10 минут
select cron.schedule(
    'workflow-alerts-monitor',           -- имя задачи
    '*/10 * * * *',                     -- каждые 10 минут
    $$
    select
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/workflow-alerts',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
            ),
            body := jsonb_build_object(
                'time', now(),
                'source', 'cron'
            ),
            timeout_milliseconds := 30000
        ) as request_id;
    $$
);

-- Проверяем, что задача создана
select jobname, schedule, active from cron.job where jobname = 'workflow-alerts-monitor';