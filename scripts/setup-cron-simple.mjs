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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

async function setupCronJob() {
  console.log('🔧 Настройка cron job для workflow алертов...');

  try {
    // 1. Проверяем доступность расширений
    console.log('🔍 Проверяем доступные расширения...');
    
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .in('extname', ['pg_cron', 'pg_net', 'vault']);

    if (extError) {
      console.error('❌ Ошибка проверки расширений:', extError);
      return;
    }

    console.log('📋 Доступные расширения:', extensions?.map(e => e.extname) || []);

    // 2. Создаем простую функцию для вызова Edge Function
    console.log('📝 Создаем функцию для вызова Edge Function...');
    
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION call_workflow_alerts()
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- Простой HTTP запрос к Edge Function
        PERFORM net.http_post(
          url := '${supabaseUrl}/functions/v1/workflow-alerts',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${anonKey}'
          ),
          body := jsonb_build_object(
            'time', now(),
            'source', 'cron'
          ),
          timeout_milliseconds := 30000
        );
      END;
      $$;
    `;

    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: createFunctionQuery
    });

    if (funcError) {
      console.log('⚠️ Не удалось создать функцию через rpc, пробуем альтернативный способ...');
      console.log('Ошибка:', funcError);
    } else {
      console.log('✅ Функция создана');
    }

    // 3. Создаем cron job
    console.log('⏰ Создаем cron job...');
    
    const cronQuery = `SELECT cron.schedule('workflow-alerts-monitor', '*/10 * * * *', 'SELECT call_workflow_alerts();');`;

    const { error: cronError } = await supabase.rpc('exec_sql', {
      sql: cronQuery
    });

    if (cronError) {
      console.error('❌ Ошибка создания cron job:', cronError);
      
      // Альтернативный способ - прямой вызов
      console.log('🔄 Пробуем альтернативный способ...');
      
      const directCronQuery = `
        SELECT cron.schedule(
          'workflow-alerts-monitor',
          '*/10 * * * *',
          $$
          SELECT net.http_post(
            url := '${supabaseUrl}/functions/v1/workflow-alerts',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body := '{"time": "' || now() || '", "source": "cron"}'::jsonb,
            timeout_milliseconds := 30000
          );
          $$
        );
      `;

      const { error: directCronError } = await supabase.rpc('exec_sql', {
        sql: directCronQuery
      });

      if (directCronError) {
        console.error('❌ Альтернативный способ тоже не сработал:', directCronError);
        return;
      }
    }

    console.log('✅ Cron job создан');

    // 4. Проверяем созданную задачу
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