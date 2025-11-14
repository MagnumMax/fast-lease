-- Исправленный скрипт для исправления поля confirmation_token
-- Версия 2: Более осторожный подход с обработкой всех edge cases

BEGIN;

-- 1. Сначала исправим подтвержденных пользователей: установим confirmation_token = NULL
-- для пользователей у которых email_confirmed_at IS NOT NULL и confirmation_token = ''
UPDATE auth.users
SET confirmation_token = NULL
WHERE email_confirmed_at IS NOT NULL
  AND confirmation_token = '';

-- 2. Для неподтвержденных пользователей с пустым confirmation_token установим NULL
-- Это исправляет проблематичного пользователя
UPDATE auth.users
SET confirmation_token = NULL
WHERE email_confirmed_at IS NULL
  AND confirmation_token = '';

-- 3. Проверяем результат
DO $$
DECLARE
  total_users integer;
  confirmed_users integer;
  unconfirmed_users integer;
  null_tokens integer;
  empty_tokens integer;
  non_empty_tokens integer;
  problematic_unconfirmed integer;
BEGIN
  -- Общая статистика
  SELECT count(*) INTO total_users FROM auth.users;

  SELECT count(*) INTO confirmed_users
  FROM auth.users WHERE email_confirmed_at IS NOT NULL;

  SELECT count(*) INTO unconfirmed_users
  FROM auth.users WHERE email_confirmed_at IS NULL;

  SELECT count(*) INTO null_tokens
  FROM auth.users WHERE confirmation_token IS NULL;

  SELECT count(*) INTO empty_tokens
  FROM auth.users WHERE confirmation_token = '';

  SELECT count(*) INTO non_empty_tokens
  FROM auth.users WHERE confirmation_token IS NOT NULL AND confirmation_token != '';

  SELECT count(*) INTO problematic_unconfirmed
  FROM auth.users
  WHERE email_confirmed_at IS NULL
    AND (confirmation_token = '' OR confirmation_token IS NULL);

  RAISE NOTICE '=== СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ ПОСЛЕ ИСПРАВЛЕНИЯ V2 ===';
  RAISE NOTICE 'Общее количество пользователей: %', total_users;
  RAISE NOTICE 'Подтвержденные пользователи: %', confirmed_users;
  RAISE NOTICE 'Неподтвержденные пользователи: %', unconfirmed_users;
  RAISE NOTICE 'Пользователи с NULL confirmation_token: %', null_tokens;
  RAISE NOTICE 'Пользователи с пустым confirmation_token: %', empty_tokens;
  RAISE NOTICE 'Пользователи с непустым confirmation_token: %', non_empty_tokens;
  RAISE NOTICE 'Неподтвержденные пользователи с проблемными токенами: %', problematic_unconfirmed;

  IF empty_tokens > 0 THEN
    RAISE NOTICE '⚠️  ВНИМАНИЕ: Все еще есть пользователи с пустым confirmation_token: %', empty_tokens;
  ELSE
    RAISE NOTICE '✅ УСПЕШНО: Все confirmation_token теперь либо NULL, либо содержат значение';
  END IF;

  IF problematic_unconfirmed > 0 THEN
    RAISE NOTICE '⚠️  ВНИМАНИЕ: Все еще есть неподтвержденные пользователи с проблемными токенами: %', problematic_unconfirmed;
  ELSE
    RAISE NOTICE '✅ УСПЕШНО: Все неподтвержденные пользователи имеют корректные токены';
  END IF;
END $$;

COMMIT;