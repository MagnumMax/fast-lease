# Структура данных для импорта реальных данных FastLease

Этот документ описывает целевую структуру данных, которую необходимо заполнить на основании документов из Google Drive. Структура синхронизирована с текущей схемой Supabase (см. `database-schema.md`) и разбита на логические блоки.

## 1. Клиентская информация (`profiles`, `clients`)
- `external_id` — уникальный идентификатор в исходном документе
- `full_name`
- `legal_name` (для юридических лиц)
- `resident_status` — гражданин / резидент / нерезидент
- `nationality`
- `email`
- `phone`
- `address.street`
- `address.city`
- `address.emirate`
- `address.postal_code`
- `company.industry`
- `company.employee_count`
- `company.annual_revenue`
- `company.contact_person`
- `documents` — массив ссылок на оригиналы (паспорта, учредительные, и т.д.)

## 2. Транспортные средства (`vehicles`, `vehicle_specs`)
- `external_id`
- `vin`
- `make`
- `model`
- `variant`
- `year`
- `body_type`
- `mileage`
- `engine.capacity`
- `engine.fuel_type`
- `engine.transmission`
- `colors.exterior`
- `colors.interior`
- `features` — массив строк
- `valuation.purchase_price`
- `valuation.current_value`
- `valuation.residual_value`
- `attachments` — фотографии, сертификаты

## 3. Сделка / контракт (`deals`, `contracts`)
- `external_id`
- `client_external_id`
- `vehicle_external_id`
- `status`
- `contract_number`
- `contract_date`
- `lease_term_months`
- `mileage_allowed`
- `services_included`
- `delivery_date`
- `delivery_location`
- `return_conditions`
- `notes`

## 4. Финансовый блок (`invoices`, `payments`, `pricing_packages`)
- `deal_external_id`
- `initial_payment`
- `monthly_payment`
- `interest_rate`
- `balloon_payment`
- `fees.registration`
- `fees.insurance`
- `fees.maintenance`
- `fees.other`
- `payment_schedule` — массив объектов `{due_date, amount}`
- `bank_details`

## 5. Поддерживающие данные
- `workflow.initial_state`
- `workflow.responsible_role`
- `checklist` — массив проверок/документов

## 6. Формат выходных данных

После запуска `npm run ingest:deals` все результаты складываются в Supabase Storage:

- `deals/documents/<deal_id>/<slug>.pdf` — исходный файл из папки сделки.
- `deals/documents/<deal_id>/<slug>.json` — распознанный ответ Gemini и метаданные по конкретному документу (включая `recognition_error`, если распознать не удалось).
- `deals/documents/<deal_id>/aggregated.json` — сводная информация по сделке (ссылки на файлы, агрегированный ответ Gemini, статусы распознавания).

`deal_id` рассчитывается детерминированно (UUIDv5 от имени локальной папки сделки), поэтому повторный запуск создаёт тот же префикс в Storage.

**Запуск:**

```bash
npm install   # при необходимости обновить зависимости
# полный прогон
npm run ingest:deals -- --root datasets/deals --config configs/drive_ingest.yaml
# только одна сделка (имя папки)
npm run ingest:deals -- --root datasets/deals --only "#1 G800 BRABUS 2022 (6982) 14.04.2025"
```

Перед запуском убедитесь, что подготовлена локальная структура с PDF, заданы переменные окружения `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, а в Supabase Storage существует bucket `deals`.

**Переменные окружения:** для запуска скрипта необходимы `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, а также доступ к bucket `deals` в Supabase Storage.

## 7. Правила парсинга

1. Каждая папка внутри `datasets/deals` (или значения `local_root`) трактуется как отдельная сделка; в обработку попадают только файлы с расширением `.pdf`.
2. При `skip_processed: true` скрипт проверяет наличие `aggregated.json` и пропускает уже обработанные папки.
3. Для каждого PDF Gemini возвращает JSON-структуру (раздел `recognition`), где содержатся тип документа, ключевые поля, суммы, даты и summary.
4. Агрегирующий запрос Gemini строит итоговую структуру по сделке (`client`, `vehicle`, `deal`, `documents`) и фиксирует возможную ошибку в поле `gemini_error`.

## 8. Контроль качества

- После каждого прогона проверяйте `aggregated.json`: список документов, блок `storage` и поле `gemini_error` должны быть заполнены.
- Если у конкретного файла в `<slug>.json` стоит `recognition_error`, документ перепроверяем вручную или перезапускаем скрипт с `skip_processed: false`.
- Минимум 10% сделок берём на ручную верификацию: сверяем PDF → JSON (`recognition`) → агрегированную структуру.

## 9. Обогащение через Gemini (опционально)

- Блок `gemini` в `configs/drive_ingest.yaml` управляет распознаванием: модель вызывается *для каждого PDF* и отдельно для агрегата сделки.
- Документный промпт просит вернуть объект с ключами `document_type`, `title`, `parties`, `amounts`, `dates`, `summary`, `fields` — именно этот JSON сохраняется в `<slug>.json`.
- Агрегирующий промпт формирует сводный ответ формата:
  ```json
  {
    "client": { ... },
    "vehicle": { ... },
    "deal": { ... },
    "documents": [ { "filename": "...", "document_type": "...", "summary": "..." } ]
  }
  ```
- Итог сохраняется в `aggregated.json`; даже если отдельный документ не распознан, он остаётся в Storage с пометкой об ошибке.
- Ошибки LLM не останавливают пайплайн: повторный запуск возможен благодаря детерминированным путям и флагу `skip_processed`.

Эти правила могут уточняться по мере знакомства с форматом исходных документов.
