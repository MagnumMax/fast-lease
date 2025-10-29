#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Загружаем переменные окружения из .env.local
function loadEnvFile() {
  try {
    const envContent = readFileSync('.env.local', 'utf8')
    const envVars = {}
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim()
          // Убираем кавычки если есть
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          envVars[key.trim()] = value
        }
      }
    })
    
    return envVars
  } catch (error) {
    console.error('❌ Не удалось загрузить .env.local:', error.message)
    return {}
  }
}

const env = loadEnvFile()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCronJob() {
  console.log('🔍 Проверяем статус cron job...\n')

  try {
    // 1. Проверяем существование cron job через SQL запрос
    const { data: cronJobs, error: cronError } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT * FROM cron.job WHERE jobname = 'workflow-alerts-monitor'" 
      })

    if (cronError) {
      console.log('ℹ️  Прямой доступ к cron.job недоступен через API')
      console.log('   Это нормально - системные таблицы pg_cron защищены')
    } else if (cronJobs && cronJobs.length > 0) {
      const cronJob = cronJobs[0]
      console.log('✅ Cron job найден:')
      console.log(`   📋 Название: ${cronJob.jobname}`)
      console.log(`   ⏰ Расписание: ${cronJob.schedule}`)
      console.log(`   🟢 Активен: ${cronJob.active ? 'Да' : 'Нет'}`)
      console.log('')
    }

    // 2. Проверяем функцию call_workflow_alerts
    console.log('🔧 Тестируем функцию call_workflow_alerts...')
    
    const { error: functionError } = await supabase
      .rpc('call_workflow_alerts')

    if (functionError) {
      console.error('❌ Ошибка при вызове функции:', functionError.message)
    } else {
      console.log('✅ Функция call_workflow_alerts выполнена успешно')
    }

    console.log('\n🎉 Тестирование завершено!')
    console.log('💡 Если cron job создан успешно, он будет автоматически')
    console.log('   вызывать workflow-alerts каждые 10 минут')
    console.log('\n📝 Для проверки работы cron job:')
    console.log('   1. Зайди в Supabase Dashboard → SQL Editor')
    console.log('   2. Выполни: SELECT * FROM cron.job WHERE jobname = \'workflow-alerts-monitor\'')
    console.log('   3. Проверь логи в разделе Logs → Edge Functions')

  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error.message)
  }
}

// Запускаем тест
testCronJob()
