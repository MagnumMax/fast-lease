#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Читаем переменные окружения из .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    // Убираем кавычки если есть
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupCronJob() {
  console.log('🔧 Настройка cron job для workflow алертов...');

  try {
    // 1. Сохраняем секреты в Vault
    console.log('📝 Сохраняем секреты в Vault...');
    
    const { error: vaultError1 } = await supabase
      .rpc('sql', {
        query: `
          INSERT INTO vault.secrets (name, secret) 
          VALUES ('project_url', $1)
          ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
        `,
        params: [supabaseUrl]
      });
    
    if (vaultError1) {
      console.error('❌ Ошибка сохранения project_url:', vaultError1);
    } else {
      console.log('✅ project_url сохранен');
    }

    const { error: vaultError2 } = await supabase
      .rpc('sql', {
        query: `
          INSERT INTO vault.secrets (name, secret) 
          VALUES ('anon_key', $1)
          ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
        `,
        params: [anonKey]
      });
    
    if (vaultError2) {
      console.error('❌ Ошибка сохранения anon_key:', vaultError2);
    } else {
      console.log('✅ anon_key сохранен');
    }

    // 2. Создаем cron job
    console.log('⏰ Создаем cron job...');
    
    const { data: cronResult, error: cronError } = await supabase
      .rpc('sql', {
        query: `
          SELECT cron.schedule(
            'workflow-alerts-monitor',
            '*/10 * * * *',
            $$
            SELECT
                net.http_post(
                    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/workflow-alerts',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
                    ),
                    body := jsonb_build_object(
                        'time', now(),
                        'source', 'cron'
                    ),
                    timeout_milliseconds := 30000
                ) as request_id;
            $$
          );
        `
      });

    if (cronError) {
      console.error('❌ Ошибка создания cron job:', cronError);
      return;
    }

    console.log('✅ Cron job создан:', cronResult);

    // 3. Проверяем созданную задачу
    console.log('🔍 Проверяем созданную задачу...');
    
    const { data: jobs, error: jobsError } = await supabase
      .rpc('sql', {
        query: `
          SELECT jobname, schedule, active 
          FROM cron.job 
          WHERE jobname = 'workflow-alerts-monitor';
        `
      });

    if (jobsError) {
      console.error('❌ Ошибка проверки задач:', jobsError);
      return;
    }

    if (jobs && jobs.length > 0) {
      console.log('✅ Задача найдена:', jobs);
      console.log('🎉 Cron job успешно настроен! Алерты будут проверяться каждые 10 минут.');
    } else {
      console.log('⚠️ Задача не найдена в списке cron jobs');
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запускаем настройку
setupCronJob();
