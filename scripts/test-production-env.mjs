import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key] = value.replace(/"/g, '');
      }
    });
  } catch (error) {
    console.error('Error loading .env.local:', error.message);
  }
}

// Load environment variables
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProductionEnv() {
  try {
    console.log('🔍 Проверяю переменные окружения в продакшен Edge Function...');
    console.log('📡 URL:', supabaseUrl);
    
    // Call the production edge function to check env vars
    const { data, error } = await supabase.functions.invoke('process-workflow-queues', {
      body: { 
        check_env: true 
      }
    });

    if (error) {
      console.error('❌ Ошибка вызова Edge Function:', error);
      return;
    }

    console.log('✅ Ответ от продакшен Edge Function:', data);
    
    if (data && data.env_check) {
      console.log('\n📊 Статус переменных окружения в продакшене:');
      console.log(`  🔑 TELEGRAM_BOT_TOKEN: ${data.telegram_token_set ? '✅ Установлен' : '❌ Не установлен'} (длина: ${data.telegram_token_length})`);
      console.log(`  💬 TELEGRAM_CHAT_ID: ${data.telegram_chat_id_set ? '✅ Установлен' : '❌ Не установлен'} (значение: ${data.telegram_chat_id})`);
      
      if (!data.telegram_token_set || !data.telegram_chat_id_set) {
        console.log('\n⚠️  ПРОБЛЕМА: Переменные окружения не настроены в продакшене!');
        console.log('📝 Необходимо добавить переменные в Supabase Dashboard:');
        console.log('   - Перейди в Supabase Dashboard');
        console.log('   - Выбери проект');
        console.log('   - Перейди в Settings > Edge Functions');
        console.log('   - Добавь переменные окружения:');
        console.log('     * TELEGRAM_BOT_TOKEN');
        console.log('     * TELEGRAM_CHAT_ID');
      } else {
        console.log('\n🎉 Все переменные настроены правильно!');
      }
    } else {
      console.log('\n⚠️  Edge Function не поддерживает проверку переменных окружения');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testProductionEnv();