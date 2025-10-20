# Workflow API Implementation Notes

## Endpoint Mapping

| OpenAPI Path | Method | Responsibility | Key Dependencies |
| --- | --- | --- | --- |
| `/deals` | `POST` | Создание сделки и установка активной версии workflow | `workflow_versions`, `deals`, `WorkflowService` (entry actions TODO) |
| `/deals` | `GET` | Пагинация сделок по статусу/менеджеру/источнику | `deals` (order by `created_at`), `listDealsQuerySchema` |
| `/deals/{id}` | `GET` | Карточка сделки + связанные сущности | `deals`, `tasks`, `documents`, `payments`, `risk_reports` |
| `/deals/{id}/transition` | `POST` | Транзакция статуса через state machine | `WorkflowService.transitionDeal`, `audit_log` |
| `/deals/{id}/tasks` | `GET` | Задания по сделке с фильтром статуса | `tasks` |
| `/tasks/{id}/start` | `POST` | Обновление статуса задачи → `IN_PROGRESS` | `tasks` |
| `/tasks/{id}/complete` | `POST` | Обновление статуса задачи + payload | `tasks` |
| `/webhooks/esign` | `POST` | Обработка e-sign событий → переход или обновление платежей | `documents`, `deals`, `WorkflowService` |
| `/webhooks/bank` | `POST` | Обновление платежей и guard-context | `payments`, `deals` |
| `/webhooks/aecb` | `POST` | Сохранение отчёта и guard-значений | `risk_reports`, `deals` |
| `/metrics/process` | `GET` | Агрегация метрик по статусам/SLA | `deals`, `tasks`, `metrics` view (TODO) |

## DTO Schemas

Zod-схемы для основной валидации: `lib/workflow/http/schemas.ts`

- `createDealRequestSchema` – тело `POST /deals`
- `listDealsQuerySchema` – query `GET /deals`
- `transitionRequestSchema` – тело `POST /deals/{id}/transition`
- `listDealTasksQuerySchema` – query `GET /deals/{id}/tasks`

## Required Supabase Operations

- `workflow_versions`: поиск активной версии, выбор по ID
- `deals`: insert/select/update (версионирование через `workflow_version_id`)
- `tasks`: select/update by deal/task id
- `documents`, `payments`, `risk_reports`: связки для `GET /deals/{id}`
- `audit_log`: вставка события `STATUS_CHANGED`
- Future: агрегаты для `/metrics/process`, очереди для entry actions (стаб)

## Очереди и фоновые задачи

- entry-actions пишут события в очереди: `workflow_notification_queue`, `workflow_webhook_queue`, `workflow_schedule_queue`
- идемпотентность обеспечивается полем `action_hash`; дубликаты игнорируются `upsert`-ом
- ручной обработчик очередей: `POST /api/workflow/queues/run` — прогоняет все категории очередей (stub-логика, пишет в консоль)
- для продакшена требуется вынести процессы в фоновые воркеры/cron (отправка e-mail/WhatsApp, вызов внешних вебхуков, расписание счетов)

### CLI и автоматизация

- локальный запуск обработчика: `ts-node scripts/process-workflow-queues.ts`
- cron/edge функция: раз в N минут вызывает `POST /api/workflow/queues/run` или запускает CLI
- логи: переходы и действия пишутся в `audit_log`, очереди — в консоль, расширить до structured-logging при интеграции
