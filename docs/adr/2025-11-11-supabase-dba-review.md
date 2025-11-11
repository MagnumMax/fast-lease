# Supabase DBA Review Pack — Segmented Login

- **Date:** 2025-11-11
- **Author:** Auth Platform
- **Purpose:** Подготовить входные данные для DBA перед реализацией миграций по порталам.

## 1. Краткое резюме изменений

| Блок | Описание | Примечания |
| --- | --- | --- |
| `portal_code` enum | Новый тип значений `('app','investor','client','partner')`. | Используется в нескольких таблицах, чтобы избежать расхождений. |
| `user_portals` | Новая таблица (user_id, portal, status, metadata, last_access_at, timestamps). | Ведение факта принадлежности пользователя к порталам, `unique(user_id, portal)`. |
| `user_roles` | Новый столбец `portal portal_code not null default 'app'`, уникальный индекс `(user_id, role, portal)`. | Требуется бэкфилл текущих данных на основании роли. |
| `auth_login_events` | Таблица аудита логинов (portal, identity, status, ip, user_agent, role_snapshot, metadata). | Только сервисные роли имеют доступ. |
| RLS/Policies | Обновление политик для `user_roles` + новые политики для `user_portals` и `auth_login_events`. | Нужно удостовериться, что индексы поддерживают фильтры по `portal`. |
| Seeds | Скрипт, который создаёт записи в `user_portals` на основе текущих пользователей. | Можно реализовать SQL `insert ... select ... on conflict do nothing`. |

## 2. Детали по каждой таблице

### 2.1 Enum `portal_code`
- **DDL:** `create type portal_code as enum ('app','investor','client','partner');`
- **Использование:** столбцы `user_portals.portal`, `user_roles.portal`, `auth_login_events.portal`.
- **Вопросы:** допускается ли enum в текущей политике версионирования? Если нет, используем `text check`.

### 2.2 Таблица `user_portals`
- Обновлённое описание в `docs/schemas/auth_portals.md`.
- Необходимые триггеры: `updated_at` (можем добавить `set updated_at = now()` при update).
- **RLS предложения:**  
  1. `service_manage` (role = service_role) — full CRUD.  
  2. `self_read` — `select` where `user_id = auth.uid()`.  
  3. `self_touch` — `update` ограниченный на `last_access_at`.  
- **Индексы:** `(user_id)`, `(portal)`, `(user_id, portal)` (unique).
- **DBA-input:** нужно ли дополнительное покрытие для частых запросов (например, комбинированный индекс `(portal, status)`)?

### 2.3 Таблица `user_roles`
- После добавления `portal` придётся перестроить уникальный индекс (Downtime?).
- **Бэкфилл план:**  
  ```sql
  update public.user_roles
  set portal = case
    when role in ('ADMIN','OP_MANAGER','SUPPORT','FINANCE','TECH_SPECIALIST','RISK_MANAGER','LEGAL','ACCOUNTING') then 'app'
    when role = 'INVESTOR' then 'investor'
    when role = 'CLIENT' then 'client'
    else 'app'
  end;
  ```
- **RLS:** политики должны проверять `portal = current_setting('request.jwt.claims.portal')` либо через join с `user_portals`.
- **DBA-input:** ок ли использование enum по умолчанию, и нет ли опасений за существующие запросы/индексы?

### 2.4 Таблица `auth_login_events`
- Insert-only таблица (отсутствие updates/deletes).
- Необходим ли партиционированный подход? сейчас объём трафика небольшой (< 10k событий/сутки).
- **Индексы:** `(portal)`, `(occurred_at desc)`, `(user_id)`.
- **Retention:** предполагаем 1 год (политика пока не определена) — спросить DBA о предпочтениях.

## 3. Миграционный порядок (предложение)

1. Создать enum `portal_code`.
2. Добавить таблицу `user_portals` + RLS.
3. Добавить столбец `portal` в `user_roles`, выполнить бэкфилл, пересоздать уникальный индекс.
4. Создать `auth_login_events` + RLS.
5. Seed `user_portals` для текущих пользователей.
6. (Опционально) создать вспомогательные функции `log_auth_event()` и `touch_user_portal_last_access()`.

Каждый шаг отдельной миграцией в `/migrations`. Выполняем через Supabase MCP-инструменты.

## 4. Открытые вопросы к DBA

1. **Enum vs check:** предпочитаете ли enum-тип для `portal_code`, или нужно ограничиться `text check`? Как это скажется на будущих миграциях?
2. **Индексация:** достаточно ли предложенных индексов, или нужно добавить составные (например, `(portal, status)` в `user_portals`)?
3. **RLS перфоманс:** ок ли использовать `request.jwt.claims ->> 'portal'` в политиках, или лучше полагаться на join c `user_portals`?
4. **Бэкфилл `user_roles`:** приемлем ли план обновления без downtime (single transaction), или требуется staged approach?
5. **Retention логов:** какую стратегию хранения/архивации `auth_login_events` предпочесть (partitioning, periodic vacuum, TTL)?
6. **Seed/Backfill:** есть ли ограничения на использование service key для массового заполнения `user_portals`? Нужно ли делать батчи?
7. **Monitoring:** какие метрики/аллерты нужны на новые таблицы (bloat, growth)? Нужно ли заранее планировать партиционирование?

## 5. Материалы для ознакомления
- ADR: `docs/adr/2025-11-11-segmented-login-portals.md`
- Схема: `docs/schemas/auth_portals.md`
- Чеклист задач: `docs/tasks/segmented-login-checklist.md`

Ответы от DBA просим зафиксировать прямо в этом файле или через комментарии в PR.
