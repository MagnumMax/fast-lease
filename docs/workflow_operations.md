# Workflow Module Operations Guide

## Состав

- `docs/workflow_template.yaml` — эталонный YAML бизнес-процесса
- REST API (`app/api/...`) — сделки, задачи, вебхуки, метрики
- Workflow сервисы (`lib/workflow/`) — парсер, версии, state machine, очереди
- CLI/HTTP воркеры очередей

## Настройка окружения

1. Применить миграции Supabase (`supabase/migrations/**/*.sql`), ключевые из них:
   - `20250212193000_workflow_versions.sql`
   - `20250212194500_workflow_action_queues.sql`
2. Убедиться, что `NEXT_PUBLIC_SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` присутствуют в окружении.
3. Для локальных запусков установить зависимости (`npm install`) и прогнать тесты (`npm run test -- --run`).

## Запуск очередей

- **HTTP**: `POST /api/workflow/queues/run` — прогоняет уведомления, вебхуки и расписания (stub, пишет в консоль).
- **CLI**: `ts-node scripts/process-workflow-queues.ts` — аналогичный запуск из терминала.
- Рекомендуемый план: cron/task runner раз в N минут вызывает CLI/HTTP обработчик. Для продакшена заменить stub'ы реальными отправителями и логированием.
- Настройка окружения для Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- Edge Function: `supabase/functions/process-workflow-queues` (расписание `*/5 * * * *` через `supabase/config.toml`).
- Локальная проверка Telegram: `ts-node scripts/test-telegram.ts` (поставит сообщение в очередь и вызовет edge-функцию).

## Мониторинг и алерты

- Базовая метрика: количество `PENDING`/`FAILED` в таблицах `workflow_notification_queue`, `workflow_webhook_queue`, `workflow_schedule_queue`. Пример SQL:

  ```sql
  select status, count(*)
  from workflow_notification_queue
  group by status;
  ```

- Логи edge-функции доступны через `supabase functions logs process-workflow-queues` — подключить алерты на ошибки (например, через Supabase Alerts / внешнюю систему).
- Рекомендуется собирать дашборд (Supabase Studio → SQL saved query + graph) и настроить уведомления при превышении порогов (например, >10 записей в `FAILED` или задержка > 15 минут).
- Для автоматических оповещений можно использовать Supabase Alerts или внешний мониторинг (PagerDuty, Grafana, Telegram бот) на основе SQL из `docs/workflow_monitoring.sql`.

## Автоматические переходы

- `/api/webhooks/esign` — обновляет payload и при `COMPLETED` пытается переход `SIGNING_FUNDING → VEHICLE_DELIVERY`.
- `/api/webhooks/bank` — фиксирует платежи, синхронизирует guard-флаги, инициирует `SIGNING_FUNDING → VEHICLE_DELIVERY`.
- `/api/webhooks/aecb` — сохраняет отчёт и при approve переводит `RISK_REVIEW → FINANCE_REVIEW`.
- Все обработчики безопасно логируют guard-failure и продолжают приём вебхука.

## Тестирование

- Юнит/интеграционные: `npm run test -- --run` — покрытие парсера, state machine, сервисов, API и очередей (включая вебхуки).
- Типы: `npm run typecheck` (`tsc --noEmit`) — проверка типизации UI и backend.
- E2E: `node scripts/test-telegram-final.mjs` — прогоняет цикл REST → webhook → queue → Telegram, результат видно в чате.
- Мониторинг очередей: `node scripts/check-queue-status.mjs` или SQL из `docs/workflow_monitoring.sql`.

## TODO / Next Steps

- Подключить реальные каналы уведомлений (email, WhatsApp, Telegram) и обработку `workflow_notification_queue`.
- Реализовать отправку внешних вебхуков и расписаний (retry/backoff, structured logging).
- Дополнить e2e-сценарии, метрики и мониторинг очередей (dashboards/alerts).
