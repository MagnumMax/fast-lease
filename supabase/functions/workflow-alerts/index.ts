// Supabase Edge Function для мониторинга workflow алертов
// @ts-expect-error Deno runtime imports
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-expect-error Deno runtime imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

interface AlertResult {
  alert_type: string
  queue_type: string
  current_value: number
  threshold_value: number
  is_triggered: boolean
  message: string
}

interface AlertResponse {
  success: boolean
  alerts_checked: number
  alerts_triggered: number
  telegram_sent: boolean
  triggered_alerts: AlertResult[]
}

interface QueueCount {
  failed_count: number
  pending_count: number
  old_pending_count: number
}

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

// Функция для получения статистики по очереди уведомлений
async function getNotificationQueueStats(): Promise<QueueCount> {
  try {
    // Получаем количество неудачных уведомлений
    const { data: failedData, error: failedError } = await supabase
      .from('workflow_notification_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'FAILED')

    if (failedError) {
      console.error('Ошибка при получении неудачных уведомлений:', failedError)
      return { failed_count: 0, pending_count: 0, old_pending_count: 0 }
    }

    // Получаем количество ожидающих уведомлений
    const { data: pendingData, error: pendingError } = await supabase
      .from('workflow_notification_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'PENDING')

    if (pendingError) {
      console.error('Ошибка при получении ожидающих уведомлений:', pendingError)
      return { failed_count: failedData?.length || 0, pending_count: 0, old_pending_count: 0 }
    }

    // Получаем количество старых ожидающих уведомлений (старше 1 часа)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: oldPendingData, error: oldPendingError } = await supabase
      .from('workflow_notification_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'PENDING')
      .lt('created_at', oneHourAgo)

    if (oldPendingError) {
      console.error('Ошибка при получении старых ожидающих уведомлений:', oldPendingError)
      return { 
        failed_count: failedData?.length || 0, 
        pending_count: pendingData?.length || 0, 
        old_pending_count: 0 
      }
    }

    return {
      failed_count: failedData?.length || 0,
      pending_count: pendingData?.length || 0,
      old_pending_count: oldPendingData?.length || 0
    }
  } catch (error: unknown) {
    console.error('Общая ошибка при получении статистики уведомлений:', error)
    return { failed_count: 0, pending_count: 0, old_pending_count: 0 }
  }
}

// Функция для получения статистики по очереди вебхуков
async function getWebhookQueueStats(): Promise<QueueCount> {
  try {
    // Получаем количество неудачных вебхуков
    const { data: failedData, error: failedError } = await supabase
      .from('workflow_webhook_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'FAILED')

    if (failedError) {
      console.error('Ошибка при получении неудачных вебхуков:', failedError)
      return { failed_count: 0, pending_count: 0, old_pending_count: 0 }
    }

    // Получаем количество ожидающих вебхуков
    const { data: pendingData, error: pendingError } = await supabase
      .from('workflow_webhook_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'PENDING')

    if (pendingError) {
      console.error('Ошибка при получении ожидающих вебхуков:', pendingError)
      return { failed_count: failedData?.length || 0, pending_count: 0, old_pending_count: 0 }
    }

    // Получаем количество старых ожидающих вебхуков (старше 1 часа)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: oldPendingData, error: oldPendingError } = await supabase
      .from('workflow_webhook_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'PENDING')
      .lt('created_at', oneHourAgo)

    if (oldPendingError) {
      console.error('Ошибка при получении старых ожидающих вебхуков:', oldPendingError)
      return { 
        failed_count: failedData?.length || 0, 
        pending_count: pendingData?.length || 0, 
        old_pending_count: 0 
      }
    }

    return {
      failed_count: failedData?.length || 0,
      pending_count: pendingData?.length || 0,
      old_pending_count: oldPendingData?.length || 0
    }
  } catch (error: unknown) {
    console.error('Общая ошибка при получении статистики вебхуков:', error)
    return { failed_count: 0, pending_count: 0, old_pending_count: 0 }
  }
}

// Функция для получения статистики по очереди расписаний
async function getScheduleQueueStats(): Promise<QueueCount> {
  try {
    // Получаем количество неудачных расписаний
    const { data: failedData, error: failedError } = await supabase
      .from('workflow_schedule_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'FAILED')

    if (failedError) {
      console.error('Ошибка при получении неудачных расписаний:', failedError)
      return { failed_count: 0, pending_count: 0, old_pending_count: 0 }
    }

    // Получаем количество ожидающих расписаний
    const { data: pendingData, error: pendingError } = await supabase
      .from('workflow_schedule_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'PENDING')

    if (pendingError) {
      console.error('Ошибка при получении ожидающих расписаний:', pendingError)
      return { failed_count: failedData?.length || 0, pending_count: 0, old_pending_count: 0 }
    }

    // Получаем количество старых ожидающих расписаний (старше 1 часа)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: oldPendingData, error: oldPendingError } = await supabase
      .from('workflow_schedule_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'PENDING')
      .lt('created_at', oneHourAgo)

    if (oldPendingError) {
      console.error('Ошибка при получении старых ожидающих расписаний:', oldPendingError)
      return { 
        failed_count: failedData?.length || 0, 
        pending_count: pendingData?.length || 0, 
        old_pending_count: 0 
      }
    }

    return {
      failed_count: failedData?.length || 0,
      pending_count: pendingData?.length || 0,
      old_pending_count: oldPendingData?.length || 0
    }
  } catch (error: unknown) {
    console.error('Общая ошибка при получении статистики расписаний:', error)
    return { failed_count: 0, pending_count: 0, old_pending_count: 0 }
  }
}

// Функция для отправки уведомления в Telegram
async function sendTelegramAlert(message: string): Promise<boolean> {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

    if (!botToken || !chatId) {
      console.error('Не настроены переменные окружения для Telegram')
      return false
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!response.ok) {
      console.error('Ошибка при отправке в Telegram:', await response.text())
      return false
    }

    console.log('Уведомление успешно отправлено в Telegram')
    return true
  } catch (error: unknown) {
    console.error('Ошибка при отправке уведомления в Telegram:', error)
    return false
  }
}

// Основная функция проверки алертов
async function checkWorkflowAlerts(): Promise<AlertResponse> {
  const alerts: AlertResult[] = []
  let telegramSent = false

  try {
    // Получаем статистику по всем очередям
    const [notificationStats, webhookStats, scheduleStats] = await Promise.all([
      getNotificationQueueStats(),
      getWebhookQueueStats(),
      getScheduleQueueStats()
    ])

    const queueTypes = [
      { type: 'notifications', stats: notificationStats },
      { type: 'webhooks', stats: webhookStats },
      { type: 'schedules', stats: scheduleStats }
    ]

    // Проверяем алерты для каждой очереди
    for (const queue of queueTypes) {
      const { type, stats } = queue

      // Алерт на неудачные записи (FAILED > 0)
      const failedAlert: AlertResult = {
        alert_type: 'FAILED_COUNT',
        queue_type: type,
        current_value: stats.failed_count,
        threshold_value: 0,
        is_triggered: stats.failed_count > 0,
        message: `АЛЕРТ: Найдено ${stats.failed_count} неудачных ${type === 'notifications' ? 'уведомлений' : type === 'webhooks' ? 'вебхуков' : 'расписаний'}!`
      }
      alerts.push(failedAlert)

      // Алерт на большое количество ожидающих записей (PENDING > 50)
      const pendingAlert: AlertResult = {
        alert_type: 'PENDING_COUNT',
        queue_type: type,
        current_value: stats.pending_count,
        threshold_value: 50,
        is_triggered: stats.pending_count > 50,
        message: `АЛЕРТ: Слишком много ожидающих ${type === 'notifications' ? 'уведомлений' : type === 'webhooks' ? 'вебхуков' : 'расписаний'}: ${stats.pending_count}!`
      }
      alerts.push(pendingAlert)

      // Алерт на старые ожидающие записи (старше 1 часа)
      const oldPendingAlert: AlertResult = {
        alert_type: 'OLD_PENDING_COUNT',
        queue_type: type,
        current_value: stats.old_pending_count,
        threshold_value: 0,
        is_triggered: stats.old_pending_count > 0,
        message: `АЛЕРТ: Найдено ${stats.old_pending_count} старых ожидающих ${type === 'notifications' ? 'уведомлений' : type === 'webhooks' ? 'вебхуков' : 'расписаний'} (старше 1 часа)!`
      }
      alerts.push(oldPendingAlert)
    }

    // Отправляем уведомления в Telegram для сработавших алертов
    const triggeredAlerts = alerts.filter(alert => alert.is_triggered)
    
    if (triggeredAlerts.length > 0) {
      const messages = triggeredAlerts.map(alert => alert.message)
      const fullMessage = `🚨 WORKFLOW АЛЕРТЫ 🚨\n\n${messages.join('\n\n')}`
      
      telegramSent = await sendTelegramAlert(fullMessage)
    }

    return {
      success: true,
      alerts_checked: alerts.length,
      alerts_triggered: triggeredAlerts.length,
      telegram_sent: telegramSent,
      triggered_alerts: triggeredAlerts
    }

  } catch (error: unknown) {
    console.error('Ошибка при проверке алертов:', error)
    return {
      success: false,
      alerts_checked: 0,
      alerts_triggered: 0,
      telegram_sent: false,
      triggered_alerts: []
    }
  }
}

serve(async () => {
  try {
    // Проверяем алерты
    const result = await checkWorkflowAlerts()
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error: unknown) {
    console.error('Ошибка в Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }), 
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
