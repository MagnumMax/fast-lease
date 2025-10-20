import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function main() {
  try {
    // Загружаем переменные окружения из .env.local
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
    });

    const supabase = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🧪 Создаем тестовый алерт...');

    // Сначала получаем реальный deal_id
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id')
      .limit(1);

    if (dealsError || !deals?.length) {
      console.error('❌ Ошибка получения deal_id:', dealsError);
      process.exit(1);
    }

    const dealId = deals[0].id;
    console.log('📋 Используем deal_id:', dealId);

    // Создаем тестовую запись с FAILED статусом
    const { data: insertData, error: insertError } = await supabase
      .from('workflow_notification_queue')
      .insert({
        deal_id: dealId,
        template: 'test_alert',
        to_roles: ['admin'],
        status: 'FAILED',
        action_hash: 'test-alert-' + Date.now(),
        payload: { test: true },
        error: 'Test error for alert testing'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Ошибка создания тестовой записи:', insertError);
      process.exit(1);
    }

    console.log('✅ Тестовая запись создана:', insertData.id);

    // Вызываем Edge Function для проверки алертов
    console.log('\n🔔 Вызываем workflow-alerts...');

    const { data: alertData, error: alertError } = await supabase.functions.invoke('workflow-alerts');

    if (alertError) {
      console.error('❌ Ошибка вызова workflow-alerts:', alertError);
    } else {
      console.log('📊 Результат алертов:', JSON.stringify(alertData, null, 2));
      
      if (alertData.alerts_triggered > 0) {
        console.log('\n🚨 УСПЕХ: Алерт сработал!');
        console.log('📱 Проверь Telegram на наличие уведомления');
      } else {
        console.log('\n❌ Алерт не сработал');
      }
    }

    // Удаляем тестовую запись
    console.log('\n🧹 Удаляем тестовую запись...');

    const { error: deleteError } = await supabase
      .from('workflow_notification_queue')
      .delete()
      .eq('id', insertData.id);

    if (deleteError) {
      console.error('❌ Ошибка удаления тестовой записи:', deleteError);
    } else {
      console.log('✅ Тестовая запись удалена');
    }

    console.log('\n🎯 Тест завершен!');
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

main();