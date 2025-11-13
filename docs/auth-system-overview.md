# Обзор системы аутентификации Fast Lease

## Архитектура аутентификации

Система аутентификации построена на Supabase Auth с использованием ролевой модели доступа (RBAC).

### Основные компоненты

#### 1. Роли пользователей
```typescript
type AppRole =
  | "CLIENT"        // Клиент
  | "INVESTOR"      // Инвестор
  | "OP_MANAGER"    // Операционный менеджер
  | "TECH_SPECIALIST" // Технический специалист
  | "FINANCE"       // Финансовый специалист
  | "SUPPORT"       // Специалист поддержки
  | "RISK_MANAGER"  // Менеджер по управлению рисками
  | "LEGAL"         // Юридический отдел
  | "ACCOUNTING"    // Бухгалтерия
  | "ADMIN"         // Администратор
```

#### 2. Иерархия ролей по приоритету
```
ADMIN > OP_MANAGER > FINANCE > SUPPORT > TECH_SPECIALIST > RISK_MANAGER > LEGAL > ACCOUNTING > INVESTOR > CLIENT
```

> **Роль по умолчанию:** новые пользователи получают `OP_MANAGER` (назначается через `ensureDefaultProfileAndRole()`).

#### 3. Порталы и аудитории
| Портал | Роли | URL входа | Домашний экран |
| --- | --- | --- | --- |
| `app` | ADMIN, OP_MANAGER, SUPPORT, FINANCE, TECH_SPECIALIST, RISK_MANAGER, LEGAL, ACCOUNTING | `/login` | `/app/dashboard` (редирект в `/ops/dashboard`) |
| `client` | CLIENT | `/login` | `/client/dashboard` |
| `investor` | INVESTOR | `/login` | `/investor/dashboard` |
| `partner` | (будущие роли партнёров) | `/login` | `/partner/dashboard` (плейсхолдер) |

Главная страница `/` и страница `/login` показывают один и тот же единый вход: пользователь вводит email/пароль, система определяет портал и сразу завершает вход без дополнительных страниц.

Все порталы используют единый канал входа — email + пароль через Supabase Auth. После успешной аутентификации:
- назначается дефолтная роль портала (CLIENT/INVESTOR/OP_MANAGER) если она отсутствует,
- создаётся запись в `user_portals` со статусом `active`,
- выполняется редирект на порталовый `/dashboard` или `next`-путь из query.

#### 4. Домашние пути по ролям
- `ADMIN` → `/admin/bpm`
- `OP_MANAGER` → `/ops/dashboard`
- `FINANCE` → `/ops/deals`
- `SUPPORT` → `/ops/tasks`
- `TECH_SPECIALIST` → `/ops/tasks`
- `RISK_MANAGER` → `/ops/deals`
- `LEGAL` → `/ops/deals`
- `ACCOUNTING` → `/ops/deals`
- `INVESTOR` → `/investor/dashboard`
- `CLIENT` → `/client/dashboard`

## Процесс аутентификации

### Различия между средами

#### Development среда
- **Селектор ролей видим** для быстрого тестирования.
- **Предустановленные email** для каждой роли:
  - `client@fastlease.ae`
  - `investor@fastlease.ae`
  - `opsmanager@fastlease.ae`
  - `techspecialist@fastlease.ae`
  - `admin@fastlease.ae`
- **Пароли фиксированы** (`123456`) и могут вводиться вручную либо проксироваться через dev-инструменты.

#### Production среда
- **Селектор ролей скрыт** — пользователь вводит только email и пароль.
- **Пароли управляются через Supabase Auth**: политика сложности/смены хранится на стороне Supabase.
- **Сброс пароля** выполняется через `/login/forgot` → письмо Supabase → `/login/reset`.

### Процесс входа (`passwordSignInAction`)
1. Пользователь попадает на `/login`, вводит email + пароль. `autoPortalSignInAction` сразу делегирует в `passwordSignInAction`, где портал определяется автоматически по ролям в Supabase (через `resolvePortalFromAuthUser`) с резервной эвристикой по домену email.
2. `passwordSignInAction` выполняет `supabase.auth.signInWithPassword`, назначает роли, обновляет `user_portals` и `profiles.last_login_at`.
3. После успешного входа выполняется редирект на домашний маршрут портала или `next`.
4. Все события фиксируются в `auth_login_events` (см. Observability).

### Создание внутренних пользователей (`/settings/users`)
- Экран админки вызывает `POST /api/admin/users/create` (доступен только роли `ADMIN`).
- Маршрут пользуется Supabase Admin API `auth.admin.createUser`, затем upsert'ит профиль (`profiles.user_id`, `full_name`, `status`) и назначает выбранную роль через `ensureRoleAssignment` (что создаёт записи в `user_roles` и `user_portals`).
- Если включено «Send invitation email», генерируется Supabase invite-link (`auth.admin.generateLink(type='invite')`). Пока почта не подключена, ссылку можно взять из ответа API/логов; статус в `profiles` остаётся `pending`.
- Если приглашение выключено, email подтверждается сразу (`email_confirm = true`), а API возвращает временный пароль, который администратор должен передать пользователю.
- Любое создание фиксируется в `admin_portal_audit` с action `create_user`, что обеспечивает полный соответствующий аудит.

### Восстановление пароля
1. Пользователь открывает `/login/forgot` и вводит email.
2. `requestPasswordResetAction` вызывает `supabase.auth.resetPasswordForEmail` с `redirectTo = /auth/callback?next=/login/reset`.
3. После перехода по ссылке Supabase устанавливает временную сессию и перенаправляет на `/login/reset`.
4. `completePasswordResetAction` обновляет пароль (минимум 6 символов) и логирует событие.
5. Пользователь возвращается на `/login` и входит с новым паролем.

## Защита роутов

### Proxy контроль доступа

#### Защищенные префиксы:
- `/client` - только для клиентов
- `/ops` - для операционных ролей (OP_MANAGER, SUPPORT, FINANCE, TECH_SPECIALIST)
- `/admin` - только для администраторов
- `/investor` - для инвесторов и администраторов

#### Логика proxy:
1. Проверяет наличие сессии пользователя
2. Загружает роли из базы данных
3. Контролирует доступ на основе правил ролей
4. Перенаправляет в соответствующий дашборд при нарушении прав

## Структура базы данных

### Таблицы:
- `profiles` - профили пользователей
- `user_roles` - роли пользователей (многие-ко-многим)
- Supabase Auth tables - сессии и аутентификация

### Поля профиля:
```typescript
interface ProfileRecord {
  id: string;
  user_id: string;
  status: string;
  full_name: string | null;
  phone: string | null;
  // ... другие поля
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}
```

## Безопасность

### Механизмы защиты:
1. **Row Level Security (RLS)** политики в Supabase
2. **Proxy контроль** доступа к роутам
3. **Маскировка данных** в интерфейсе (email/телефон)
4. **Автоматический logout** при истечении сессии

### Разделение ответственности:
- **Supabase Auth** - управление сессиями и email/password
- **Proxy** - контроль доступа к роутам
- **Компоненты** - UI и пользовательский опыт
- **Server Actions** - бизнес-логика аутентификации

## Разработка и тестирование

### Быстрое тестирование ролей:
1. Выбрать роль из селектора в DEV среде.
2. Ввести соответствующий email и пароль `123456`.
3. Убедиться, что редирект ведёт в нужный портал.

### Отладка:
- Проверить консоль браузера на ошибки аутентификации.
- Изучить логи Supabase (`auth_login_events`, GoTrue logs) на предмет неудачных входов/блоков.
- Тестировать разные роли для проверки прав доступа.

## Расширение системы

### Добавление новой роли:
1. Добавить роль в `AppRole` тип
2. Добавить в `APP_ROLE_PRIORITY` массив
3. Определить домашний путь в `APP_ROLE_HOME_PATH`
4. Настроить правила доступа в `accessRules`
5. Создать соответствующий дашборд

Эта система обеспечивает надежную и гибкую аутентификацию с четким разделением прав доступа между разными типами пользователей платформы.
