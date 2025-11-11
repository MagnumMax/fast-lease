# Auth Portals Schema Plan

Дата: 2025-11-11  
Контакт: Auth Platform Team  
Статус: Accepted (миграции применены 2025-11-11)

Документ описывает будущие изменения схемы `public` для поддержки раздельных порталов (`app`, `investor`, `client`, `partner`), аудита аутентификаций и расширенного маппинга ролей.

## 1. Общее

- **Portal code enum**: логическое множество значений `('app','investor','client','partner')`. В Postgres можно реализовать через `portal_code text check (portal in (...))` либо создать enum `portal_code`. Рекомендуем enum, чтобы избежать расхождений.  
- Все таблицы используют `uuid` первичные ключи с `gen_random_uuid()`.  
- Поля `metadata` — `jsonb` с дефолтом `'{}'::jsonb` для гибкости.  
- Таймстемпы — `timestamptz` с `now()` по умолчанию.

## 2. Таблица `user_portals`

Назначение: хранит факт доступа пользователя к конкретному порталу (может быть несколько порталов на одного юзера).

```sql
create table public.user_portals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portal portal_code not null,
  status text not null default 'active', -- варианты: active, suspended, pending
  metadata jsonb not null default '{}',
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, portal)
);

create index idx_user_portals_user_id on public.user_portals(user_id);
create index idx_user_portals_portal on public.user_portals(portal);
```

### RLS

- Enable RLS (default deny).  
- Policies:
  1. **service_access** (`authenticated` + check `auth.role() = 'service_role'`) для полнофункциональных операций.  
  2. **self_read** — пользователи могут читать только свои записи (`user_id = auth.uid()`).  
  3. **self_update_last_access** — разрешить обновлять `last_access_at` через RPC при успешном логине (optional).  
  4. Delete/insert разрешены только сервисным функциям.

## 3. Изменение `user_roles`

### Вариант (решение)

Добавляем колонку `portal portal_code not null default 'app'` в существующую таблицу `public.user_roles`. Это позволит:

- Быстро проверять, соответствует ли роль порталу.  
- Сохранить уникальный индекс `unique(user_id, role, portal)` (модификация нынешнего).  
- Использовать view `user_roles_portal_view` для обратной совместимости (если где-то ожидалась пара `user_id + role`).

SQL:
```sql
alter table public.user_roles
  add column portal portal_code not null default 'app';

alter table public.user_roles
  drop constraint user_roles_user_id_role_key,
  add constraint user_roles_user_id_role_portal_key unique (user_id, role, portal);

create index idx_user_roles_portal on public.user_roles(portal);
```

> Миграция должна проставить портал для существующих записей:
> - роли из набора (`ADMIN`, `OP_MANAGER`, `SUPPORT`, `FINANCE`, `TECH_SPECIALIST`, `RISK_MANAGER`, `LEGAL`, `ACCOUNTING`) → `app`;
> - `INVESTOR` → `investor`;  
> - `CLIENT` → `client`.  
> Роли партнёров пока не созданы; когда появятся, используем `partner`.

### RLS

Политики обновляем так, чтобы `portal` сравнивался с требуемым порталом (через claim `request.jwt.claims ->> 'portal'` или join с `user_portals`).

## 4. Таблица `auth_login_events`

Назначение: аудит логинов/ошибок.

```sql
create table public.auth_login_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid,
  portal portal_code not null,
  identity text not null, -- email
  status text not null check (status in ('success','failure')),
  error_code text,
  ip inet,
  user_agent text,
  role_snapshot jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'
);

create index idx_auth_login_events_portal on public.auth_login_events(portal);
create index idx_auth_login_events_occurred_at on public.auth_login_events(occurred_at desc);
create index idx_auth_login_events_user_id on public.auth_login_events(user_id);
```

### RLS

- Только сервис/observability роли имеют INSERT/SELECT.  
- Рассмотрите отдельную роль `analytics` с read-only доступом.  
- Пользователи не читают эти записи напрямую.

## 5. Миграционный план (Supabase MCP)

1. **Enum**: создать тип `portal_code` и seed значений.  
2. **user_portals**: DDL + RLS + индексы.  
3. **user_roles**: добавить колонку `portal`, обновить данные, перестроить уникальный индекс, обновить RLS.  
4. **auth_login_events**: DDL + RLS + индексы.  
5. **Seeds**: скрипт, который находит всех текущих пользователей и добавляет запись в `user_portals` с порталом, соответствующим их основной роли (используйте `ensureDefaultProfileAndRole` в batch-моде или чистое SQL).  
6. **Functions**: при необходимости создать RPC, например `log_auth_event()` и `touch_user_portal_last_access()`.  
7. **Docs**: обновить `database-schema.md` и экспорт схемы.

Каждый шаг оформляется отдельной миграцией в `/migrations` с понятным названием (например, `20251111_create_portal_code_enum.sql`). Все миграции прогоняются через MCP-инструменты Supabase, чтобы соответствовать требованиям безопасности.

## 6. Проверка и последующие действия

- После наката миграций прогнать smoke-тесты RLS (ручные запросы под `authenticated`/`anon`).  
- Обновить серверные функции (`ensureDefaultProfileAndRole`, `ensureRoleAssignment`) чтобы они писали в `user_portals`.  
- Настроить CI-проверку, которая валидирует наличие записей в `user_portals` при создании пользователей (можно через unit-тесты с mock Supabase).

## 7. Helper View

Для админки введён `view_portal_roles`, объединяющий `user_roles` и `user_portals`:

```sql
create or replace view public.view_portal_roles as
select
  ur.user_id,
  ur.role,
  ur.portal,
  ur.assigned_at,
  ur.assigned_by,
  ur.metadata as role_metadata,
  up.status as portal_status,
  up.last_access_at,
  up.metadata as portal_metadata
from public.user_roles ur
left join public.user_portals up
  on up.user_id = ur.user_id
 and up.portal = ur.portal;
```

Используется UI `/app/settings/users` и API для управления ролями/порталами.
