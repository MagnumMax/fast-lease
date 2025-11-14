-- Исправление поля confirmation_token для пользователей Supabase Auth
-- Гарантирует, что GoTrue всегда получает непустую строку и не падает на NULL

BEGIN;

-- Универсальное исправление: заменяем NULL значением ''
UPDATE auth.users 
SET confirmation_token = ''
WHERE confirmation_token IS NULL;

-- Проверяем результат
DO $$
DECLARE
  total_users integer;
  confirmed_with_empty_token integer;
  confirmed_with_null_token integer;
  confirmed_empty_confirmed_count integer;
BEGIN
  -- Общее количество пользователей
  SELECT count(*) INTO total_users 
  FROM auth.users;
  
  -- Подтвержденные пользователи с пустым token
  SELECT count(*) INTO confirmed_with_empty_token 
  FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL 
    AND confirmation_token = '';
  
  -- Подтвержденные пользователи с NULL token
  SELECT count(*) INTO confirmed_with_null_token 
  FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL 
    AND confirmation_token IS NULL;
  
  -- Подтвержденные пользователи с пустым confirmed_at
  SELECT count(*) INTO confirmed_empty_confirmed_count 
  FROM auth.users 
  WHERE email_confirmed_at IS NULL;
  
  RAISE NOTICE '=== СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ ПОСЛЕ ИСПРАВЛЕНИЯ ===';
  RAISE NOTICE 'Общее количество пользователей: %', total_users;
  RAISE NOTICE 'Подтвержденные пользователи (email_confirmed_at IS NOT NULL): %', 
    (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL);
  RAISE NOTICE 'Подтвержденные пользователи с NULL confirmation_token: %', confirmed_with_null_token;
  RAISE NOTICE 'Подтвержденные пользователи с пустым confirmation_token: %', confirmed_with_empty_token;
  RAISE NOTICE 'Неподтвержденные пользователи (email_confirmed_at IS NULL): %', confirmed_empty_confirmed_count;
  
  IF confirmed_with_null_token > 0 THEN
    RAISE NOTICE '⚠️  ВНИМАНИЕ: Остались подтвержденные пользователи с NULL confirmation_token: %', confirmed_with_null_token;
  ELSE
    RAISE NOTICE '✅ УСПЕШНО: Все подтвержденные пользователи имеют строковый confirmation_token (NULL не обнаружен)';
  END IF;
END $$;

COMMIT;
