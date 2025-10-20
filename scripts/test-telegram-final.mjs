#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=');
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    }
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

async function testTelegramNotification() {
  console.log('🚀 Финальный тест Telegram уведомлений...');
  
  try {
    // 1. Добавляем уведомление в очередь
    const testMessage = `🎉 Финальный тест Telegram ${new Date().toISOString()}`;
    const { data: notification, error: insertError } = await supabase
      .from('workflow_notification_queue')
      .insert({
        template: 'telegram_test',
        to_roles: ['OP_MANAGER'],
        payload: { message: testMessage },
        action_hash: `test-telegram-${Date.now()}`
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Ошибка добавления уведомления:', insertError);
      return;
    }

    console.log('✅ Уведомление добавлено в очередь:', { id: notification.id });

    // 2. Вызываем Edge Function для обработки очереди
    const { data: result, error: functionError } = await supabase.functions.invoke(
      'process-workflow-queues',
      {
        body: { 
          test: true,
          force_process: true
        }
      }
    );

    if (functionError) {
      console.error('❌ Ошибка вызова Edge Function:', functionError);
      return;
    }

    console.log('📊 Результат обработки Edge Function:', result);

    // 3. Проверяем статус уведомления
    const { data: updatedNotification, error: selectError } = await supabase
      .from('workflow_notification_queue')
      .select('*')
      .eq('id', notification.id)
      .single();

    if (selectError) {
      console.error('❌ Ошибка получения обновленного уведомления:', selectError);
      return;
    }

    const status = String(updatedNotification.status ?? '').toUpperCase();

    console.log('📋 Статус уведомления после обработки:', {
      id: updatedNotification.id,
      status,
      processed_at: updatedNotification.processed_at,
      error: updatedNotification.error,
    });

    if (status === 'SENT') {
      console.log('🎉 УСПЕХ! Уведомление успешно отправлено в Telegram!');
      console.log(`📱 Проверь Telegram группу для сообщения: "${testMessage}"`);
    } else if (status === 'FAILED') {
      console.log('❌ ОШИБКА! Уведомление не было отправлено.');
      console.log('🔍 Ошибка:', updatedNotification.error || updatedNotification.error_message);
    } else {
      console.log('⏳ Уведомление все еще обрабатывается...');
    }

  } catch (error) {
    console.error('💥 Неожиданная ошибка:', error);
  }
}

testTelegramNotification();