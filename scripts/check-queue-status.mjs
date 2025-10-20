import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(".env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const [key, ...rest] = line.split("=");
      if (!key || rest.length === 0) continue;
      const valueRaw = rest.join("=").trim();
      const value = valueRaw.replace(/^"|"$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    console.warn("Unable to read .env.local", error instanceof Error ? error.message : String(error));
  }
}

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
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

  console.log('🔍 Проверяю статус очередей workflow...\n');

  try {
    // Проверяем статусы уведомлений
    const { data: notifications, error: notifError } = await supabase
      .from('workflow_notification_queue')
      .select('status, created_at, template')
      .order('created_at', { ascending: false });

    if (notifError) {
      console.error('❌ Ошибка при получении уведомлений:', notifError);
      return;
    }

    // Подсчитываем статусы
    const notificationStats = notifications.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Статистика очереди уведомлений:');
    console.log(`   PENDING: ${notificationStats.PENDING || 0}`);
    console.log(`   SENT: ${notificationStats.SENT || 0}`);
    console.log(`   FAILED: ${notificationStats.FAILED || 0}`);
    console.log(`   Всего: ${notifications.length}\n`);

    // Проверяем вебхуки
    const { data: webhooks, error: webhookError } = await supabase
      .from('workflow_webhook_queue')
      .select('status')
      .order('created_at', { ascending: false });

    if (!webhookError && webhooks) {
      const webhookStats = webhooks.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {});

      console.log('📊 Статистика очереди вебхуков:');
      console.log(`   PENDING: ${webhookStats.PENDING || 0}`);
      console.log(`   SENT: ${webhookStats.SENT || 0}`);
      console.log(`   FAILED: ${webhookStats.FAILED || 0}`);
      console.log(`   Всего: ${webhooks.length}\n`);
    }

    // Проверяем расписания
    const { data: schedules, error: scheduleError } = await supabase
      .from('workflow_schedule_queue')
      .select('status')
      .order('created_at', { ascending: false });

    if (!scheduleError && schedules) {
      const scheduleStats = schedules.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {});

      console.log('📊 Статистика очереди расписаний:');
      console.log(`   PENDING: ${scheduleStats.PENDING || 0}`);
      console.log(`   SENT: ${scheduleStats.SENT || 0}`);
      console.log(`   FAILED: ${scheduleStats.FAILED || 0}`);
      console.log(`   Всего: ${schedules.length}\n`);
    }

    // Проверяем алерты
    const failedCount = notificationStats.FAILED || 0;
    const pendingCount = notificationStats.PENDING || 0;

    console.log('🚨 Проверка условий алертов:');
    if (failedCount > 0) {
      console.log(`   ⚠️  АЛЕРТ: Найдено ${failedCount} неудачных уведомлений!`);
    } else {
      console.log('   ✅ Нет неудачных уведомлений');
    }

    if (pendingCount > 50) {
      console.log(`   ⚠️  АЛЕРТ: Слишком много ожидающих уведомлений: ${pendingCount}!`);
    } else {
      console.log(`   ✅ Количество ожидающих уведомлений в норме: ${pendingCount}`);
    }

    // Проверяем старые PENDING записи
    const { data: oldPending, error: oldError } = await supabase
      .from('workflow_notification_queue')
      .select('id, created_at, template')
      .eq('status', 'PENDING')
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (!oldError && oldPending && oldPending.length > 0) {
      console.log(`   ⚠️  АЛЕРТ: Найдено ${oldPending.length} старых PENDING записей (>1 часа)!`);
      oldPending.forEach(record => {
        console.log(`      - ${record.template} (${record.created_at})`);
      });
    } else {
      console.log('   ✅ Нет старых PENDING записей');
    }

    // Показываем последние записи
    console.log('\n📋 Последние 5 записей в очереди уведомлений:');
    notifications.slice(0, 5).forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.template} - ${record.status} (${record.created_at})`);
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке статуса очередей:', error);
  }
}

main().catch((error) => {
  console.error("Ошибка выполнения скрипта:", error);
  process.exit(1);
});
