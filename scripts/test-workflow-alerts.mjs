import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Загружаем переменные окружения из .env.local
function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error('❌ Ошибка загрузки .env.local:', error.message);
    process.exit(1);
  }
}

function getEnv(key) {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Переменная окружения ${key} не найдена`);
    process.exit(1);
  }
  return value;
}

async function main() {
  loadEnv();

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  console.log('🚨 Тестирую Edge Function workflow-alerts...\n');

  try {
    // Вызываем Edge Function
    const { data, error } = await supabase.functions.invoke('workflow-alerts', {
      body: {}
    });

    if (error) {
      console.error('❌ Ошибка вызова Edge Function:', error);
      return;
    }

    console.log('✅ Edge Function выполнена успешно!');
    console.log('📊 Результат:');
    console.log(JSON.stringify(data, null, 2));

    if (data.alerts_triggered > 0) {
      console.log('\n🚨 ВНИМАНИЕ: Обнаружены активные алерты!');
      console.log('📱 Проверь Telegram на наличие уведомлений');
      
      if (data.triggered_alerts) {
        console.log('\n📋 Детали алертов:');
        data.triggered_alerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.queue_type}: ${alert.message}`);
        });
      }
    } else {
      console.log('\n✅ Все очереди в норме, алертов нет');
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании алертов:', error);
  }
}

main().catch(console.error);