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
    
    const { error: urlError } = await supabase.rpc('vault_create_secret', {
      secret_name: 'project_url',
      secret_value: supabaseUrl
    });
    
    if (urlError && !urlError.message.includes('already exists')) {
      console.error('❌ Ошибка сохранения project_url:', urlError);
    } else {
      console.log('✅ project_url сохранен');
    }

    const { error: keyError } = await supabase.rpc('vault_create_secret', {
      secret_name: 'anon_key',
      secret_value: anonKey
    });
    
    if (keyError && !keyError.message.includes('already exists')) {
      console.error('❌ Ошибка сохранения anon_key:', keyError);
    } else {
      console.log('✅ anon_key сохранен');
    }

    // 2. Создаем cron job
    console.log('⏰ Создаем cron job...');
    
    const cronCommand = `
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
    `;

    const { data: cronResult, error: cronError } = await supabase.rpc('cron_schedule', {
      job_name: 'workflow-alerts-monitor',
      schedule: '*/10 * * * *',
      command: cronCommand
    });

    if (cronError) {
      console.error('❌ Ошибка создания cron job:', cronError);
      return;
    }

    console.log('✅ Cron job создан:', cronResult);

    // 3. Проверяем созданную задачу
    console.log('🔍 Проверяем созданную задачу...');
    
    const { data: jobs, error: jobsError } = await supabase
      .from('cron.job')
      .select('jobname, schedule, active')
      .eq('jobname', 'workflow-alerts-monitor');

    if (jobsError) {
      console.error('❌ Ошибка проверки задач:', jobsError);
      return;
    }

    if (jobs && jobs.length > 0) {
      console.log('✅ Задача найдена:', jobs[0]);
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