# Functional Coverage Matrix — Fast Lease Migration

Матрица отображает покрытие функциональности между прототипом `/beta/` и текущей реализацией на Next.js. Используйте таблицы как контрольный список при миграции: каждая строка фиксирует исходный артефакт, ключевые сценарии и соответствующий маршрут или компонент в приложении.

**Легенда статусов:** `✅` — реализовано и соответствует прототипу · `🟡` — частичная реализация/в разработке · `⬜️` — не реализовано, требуется миграция.

---

## Public & Application Funnel

| Beta artifact | Beta path | Scenario highlights | Next.js route / module | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Лендинг и каталог | `beta/index.html` | Hero, фильтры, витрина авто, CTA | `app/(public)/page.tsx` | ✅ | Покрывает задачи 5.1, использует `CatalogPage`. |
| Карточки автомобилей | `beta/cars/<slug>/index.html` | Галерея, калькулятор лизинга, спецификация | `app/(public)/cars/[id]/page.tsx` | ✅ | Реализованы динамические маршруты, Stage 5.2. |
| Тарифы | `beta/index.html#pricing` | Тарифные планы, сравнение условий | `app/(public)/pricing/page.tsx` | ✅ | Отдельные компоненты в `pricing/_components`. |
| Поддержка / Контакты | `beta/index.html#support` | Каналы связи, SLA, форма обращения | `app/(public)/support/page.tsx` | ✅ | Объединяет контактные сценарии, Stage 5.3. |
| FAQ | `beta/index.html#faq` | Частые вопросы, свёрнутые блоки | `app/(public)/faq/page.tsx` | ✅ | Контент перенесен в `lib/data/faq`. |
| Правовые документы | `beta/legal/index.html` | Политики, оферта, загрузка PDF | `app/(public)/legal` *(нет маршрута)* | ⬜️ | Требуется создать публичный маршрут и подтянуть Storage. |
| Запуск заявки | `beta/application/new/index.html` | Шаг 1 — выбор авто и условий | `app/offer/page.tsx` | ✅ | Конфигуратор вне `/apply`, генерирует ссылку с `auto`/`ref`. |
| Личные данные | `beta/application/new/index.html#profile` | Шаг 2 — данные клиента и компании | `app/(public)/apply/start/page.tsx` | ✅ | Шаг выведен первым для лидов из внешних каналов. |
| Документы | `beta/application/new/index.html#documents` | Загрузка файлов, чек-лист | `app/(public)/apply/documents/page.tsx` | ✅ | Интеграция с Supabase Storage (`application_documents`). |
| Итог и отправка | `beta/application/new/index.html#summary` | Подтверждение, согласия, отправка | `app/(public)/apply/summary/page.tsx` | ✅ | Финальный шаг заявки, Stage 5.4. |
| Статус заявки | `beta/application/submitted/index.html` | Трекер статуса, документы, CTA | `app/(public)/apply/status/page.tsx` | ✅ | Использует данные из таблицы `applications`, Stage 5.5. |

---

## Authentication & Profile

| Beta artifact | Beta path | Scenario highlights | Next.js route / module | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Регистрация | `beta/register/index.html` | Создание аккаунта, согласия | `app/(auth)/register/page.tsx` | ✅ | Использует Supabase Auth, Stage 4.2. |
| Логин | `beta/login/index.html` | Email/пароль, MFA, соц. вход | `app/(auth)/login/page.tsx` | ✅ | Supabase Auth + поддержка MFA, Stage 4.1. |
| Профиль пользователя | `beta/profile/index.html` | Контактные данные, уведомления | `app/(dashboard)/client/profile/page.tsx` | ✅ | Синхронизация с таблицей `profiles`, Stage 4.4. |
| Восстановление доступа | `beta/login/password-reset.html` | Сброс пароля, подтверждение кода | `app/(auth)/password-reset` *(нет маршрута)* | ⬜️ | Требуется вынести flow из Supabase Auth UI. |

---

## Client Portal

| Beta artifact | Beta path | Scenario highlights | Next.js route / module | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Клиентский дашборд | `beta/client/dashboard/index.html` | Таймлайн заявки, KPI карточки | `app/(dashboard)/client/dashboard/page.tsx` | ✅ | Таймлайн, KPI и уведомления на Supabase данных (`deals`, `applications`, `notifications`). |
| Статусы сделок | `beta/client/deals/index.html` | Таблица сделок, прогресс стадий | `app/(dashboard)/client/deals/page.tsx` | ⬜️ | Нужны компоненты канбана стадий и интеграция с `deals`. |
| Платежи и счета | `beta/client/invoices/index.html` | Таблица платежей, фильтры | `app/(dashboard)/client/invoices/page.tsx` | ✅ | Schedule + history на Supabase; кнопка SOA (PDF скачивание в доработке). |
| Детали счета | `beta/client/invoices/invoice-2024-001/index.html` | Расшифровка платежей, квитанции | `app/(dashboard)/client/invoices/[id]/page.tsx` | ✅ | Динамическая страница: line items, payments, баланс. |
| Мой автомобиль | `beta/client/my-vehicle/index.html` | Телематика, сервисные напоминания | `app/(dashboard)/client/vehicle/page.tsx` | ✅ | Телематика, сервисный график и документы на Supabase. |
| Документы клиента | `beta/client/documents/index.html` | Хранилище, статусы подписей | `app/(dashboard)/client/documents/page.tsx` | ✅ | Отдельный раздел соглашений и KYC файлов. |
| Поддержка | `beta/client/support/index.html` | Тикеты, SLA, чат | `app/(dashboard)/client/support/page.tsx` | 🟡 | Форма + список тикетов на Supabase; чат/приложения файлов TBD. |
| Реферальная программа | `beta/client/referrals/index.html` | Отслеживание приглашений | `app/(dashboard)/client/referrals/page.tsx` | ✅ | Метрические карточки, список сделок и наград, копирование ссылки. |

---

## Operations Portal

| Beta artifact | Beta path | Scenario highlights | Next.js route / module | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Ops дашборд | `beta/ops/dashboard/index.html` | KPI, напоминания, инциденты | `app/(dashboard)/ops/dashboard/page.tsx` | ⬜️ | `RouteScaffold`; требуется подключить `operations_metrics`. |
| Kanban задач | `beta/ops/tasks/index.html` | Drag & drop, чек-листы | `app/(dashboard)/ops/tasks/page.tsx` | ⬜️ | Интеграция с `tasks` и SortableJS. |
| Реестр заявок/клиентов | `beta/ops/clients/index.html` | Таблица, фильтры, статусы | `app/(dashboard)/ops/clients/page.tsx` | ⬜️ | Необходимо реализовать таблицу + фильтры Supabase. |
| Карточка клиента | `beta/ops/clients/client-104/index.html` | История взаимодействий, документы | `app/(dashboard)/ops/clients/[id]/page.tsx` | ⬜️ | Динамическая страница, пока заглушка. |
| Сделки | `beta/ops/deals/index.html` | Воронка, финпоказатели | `app/(dashboard)/ops/deals/page.tsx` | ⬜️ | Требуется аналитика по `deals`, графики. |
| Карточка сделки | `beta/ops/deals/deal-7801/index.html` | Таймлайн, документы, скоринг | `app/(dashboard)/ops/deals/[id]/page.tsx` | ⬜️ | В динамическом маршруте стоит `RouteScaffold`. |
| Каталог автопарка | `beta/ops/cars/index.html` | Таблица автопарка, статусы ТО | `app/(dashboard)/ops/cars/page.tsx` | ⬜️ | Нужны таблицы и фильтры по данным `vehicles`. |
| Карточка авто (ops) | `beta/ops/cars/rolls-royce-cullinan/index.html` | История, сервис, телематика | `app/(dashboard)/ops/cars/[id]/page.tsx` | ⬜️ | Требуется детализация с вкладками. |

---

## Investor Module

| Beta artifact | Beta path | Scenario highlights | Next.js route / module | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Инвесторский дашборд | `beta/investor/dashboard/index.html` | Доходность, выплаты, уведомления | `app/(dashboard)/investor/dashboard/page.tsx` | ⬜️ | Пока `RouteScaffold`; добавить графики и KPI. |
| Портфель активов | `beta/investor/portfolio/index.html` | Таблица активов, фильтры | `app/(dashboard)/investor/portfolio/page.tsx` | ⬜️ | Требуется связка с `investor_positions`. |
| Актив (детально) | `beta/investor/assets/asset-001/index.html` | Кэшфлоу, статусы договоров | `app/(dashboard)/investor/assets/[id]/page.tsx` | ⬜️ | Нужна динамическая страница. |
| Отчеты и выгрузки | `beta/investor/reports/index.html` | PDF/XLS отчеты, фильтрация | `app/(dashboard)/investor/reports/page.tsx` | ⬜️ | Реализовать генерацию и ссылки на Storage. |

---

## Admin & Settings

| Beta artifact | Beta path | Scenario highlights | Next.js route / module | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Управление пользователями | `beta/admin/users/index.html` | Роли, статусы, аудит | `app/(dashboard)/admin/users/page.tsx` | ✅ | Supabase directory + RBAC UI, аудит-лог (демо, без записи в prod). |
| BPM / процессы | `beta/admin/bpm/index.html` | Визуализация процессов, статусы | `app/(dashboard)/admin/bpm/page.tsx` | ✅ | Таблица процессов, версия, промо в `active` (canvas в демо-режиме). |
| Интеграции | `beta/admin/integrations/index.html` | Ключи, health-check, webhooks | `app/(dashboard)/admin/integrations/page.tsx` | ✅ | Карточки статусов + API-логи (данные из демо-источника). |
| Настройки уведомлений | `beta/admin/settings/notifications.html` | Каналы, шаблоны | *(нет маршрута)* | ⬜️ | Создать подмаршрут `/admin/settings/notifications`. |

---

## Shared Components & Data Modules

| Beta artifact | Beta path | Scenario highlights | Next.js module | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Deal summary widget | `beta/components/deal-component.js` | Карточка сделки, KPI | *(ожидает React-порта)* | ⬜️ | Следует перенести в `components/dashboard/deal-card`. |
| Vehicle specs panel | `beta/components/vehicle-component.js` | Спецификация авто, галерея | `app/(public)/cars/[id]/_components` | ✅ | Маппинг реализован в Stage 5.2. |
| Invoice table | `beta/components/invoices-component.js` | Табличный список платежей | *(ожидает React-порта)* | ⬜️ | Необходимо интегрировать в `/client/invoices`. |
| Documents manager | `beta/components/documents-component.js` | Хранилище файлов, статусы e-sign | *(ожидает React-порта)* | ⬜️ | Перенести в клиентский и операционный кабинеты. |
| Payment schedule | `beta/components/payment-schedule-component.js` | График платежей, статусы | *(ожидает React-порта)* | ⬜️ | Требуется для `/client/deals` и `/ops/deals/[id]`. |
| Service schedule | `beta/components/service-schedule-component.js` | ТО, напоминания | *(ожидает React-порта)* | ⬜️ | Использовать в `/client/vehicle` и `/ops/cars/[id]`. |
| Key information band | `beta/components/key-information-component.js` | Глобальные уведомления | `components/layout/dashboard-layout.tsx` | 🟡 | Частично реализовано (баннеры TODO). |

---

## Coverage Summary

- Реализовано: публичный лендинг, каталог, тарифы, поддержка, FAQ, весь поток заявки (этап 5) и админ-модуль (users, BPM, integrations).
- В работе / требуется миграция: кабинеты (клиент, опер, инвестор), бизнес-компоненты и админ-настройки (notifications).
- Критичные пробелы: отсутствуют публичные правовые страницы, восстановление пароля и документы/уведомления в админке.

Обновляйте матрицу при реализации новых экранов: добавляйте строки для новых сценариев или обновляйте статус строки с `⬜️` → `✅` после релиза.
