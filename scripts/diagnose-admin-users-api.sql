-- Диагностика проблем с API endpoint /auth/v1/admin/users
-- Анализ влияния скрипта fix-confirmation-token-nulls.sql

-- 1. Проверим пользователей с противоречивыми состояниями
SELECT 
  'Пользователи с NULL email_confirmed_at, но НЕпустым confirmation_token' as issue_type,
  COUNT(*) as count,
  string_agg(DISTINCT confirmation_token, ', ' ORDER BY confirmation_token) as token_values
FROM auth.users 
WHERE email_confirmed_at IS NULL 
  AND confirmation_token IS NOT NULL 
  AND confirmation_token != '';

-- 2. Проверим пользователей с пустым confirmation_token и NULL email_confirmed_at
SELECT 
  'Пользователи с NULL email_confirmed_at и пустым confirmation_token' as issue_type,
  COUNT(*) as count
FROM auth.users 
WHERE email_confirmed_at IS NULL 
  AND confirmation_token = '';

-- 3. Проверим пользователей с NULL confirmation_token, но NULL email_confirmed_at
SELECT 
  'Пользователи с NULL email_confirmed_at и NULL confirmation_token' as issue_type,
  COUNT(*) as count
FROM auth.users 
WHERE email_confirmed_at IS NULL 
  AND confirmation_token IS NULL;

-- 4. Проверим общее состояние данных
SELECT 
  'Общая статистика' as report_type,
  COUNT(*) as total_users,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as unconfirmed_users,
  COUNT(CASE WHEN confirmation_token IS NULL THEN 1 END) as null_tokens,
  COUNT(CASE WHEN confirmation_token = '' THEN 1 END) as empty_tokens,
  COUNT(CASE WHEN confirmation_token IS NOT NULL AND confirmation_token != '' THEN 1 END) as non_empty_tokens
FROM auth.users;

-- 5. Проверим конкретных проблемных пользователей
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmation_token,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NULL AND confirmation_token = '' THEN 'PROBLEMATIC: Неподтвержденный с пустым токеном'
    WHEN email_confirmed_at IS NULL AND confirmation_token IS NULL THEN 'PROBLEMATIC: Неподтвержденный с NULL токеном'
    WHEN email_confirmed_at IS NOT NULL AND confirmation_token IS NOT NULL AND confirmation_token != '' THEN 'PROBLEMATIC: Подтвержденный с непустым токеном'
    ELSE 'OK'
  END as status_check
FROM auth.users 
WHERE (email_confirmed_at IS NULL AND confirmation_token = '')
   OR (email_confirmed_at IS NULL AND confirmation_token IS NULL)
   OR (email_confirmed_at IS NOT NULL AND confirmation_token IS NOT NULL AND confirmation_token != '')
ORDER BY created_at DESC
LIMIT 10;