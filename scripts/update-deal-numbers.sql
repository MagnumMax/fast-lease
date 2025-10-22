-- SQL скрипт для обновления номеров сделок на формат FL-100X начиная с 1000
-- Выполнить в Supabase SQL Editor или через psql

-- ШАГ 1: Создать временную таблицу для сопоставления старых и новых номеров
CREATE TEMP TABLE deal_number_mapping AS
SELECT
    id,
    deal_number as old_number,
    ROW_NUMBER() OVER (ORDER BY created_at) + 999 as new_sequential_number
FROM deals
WHERE deal_number IS NOT NULL;

-- ШАГ 2: Обновить номера сделок в таблице deals
UPDATE deals
SET deal_number = 'FL-' || mapping.new_sequential_number,
    updated_at = NOW()
FROM deal_number_mapping mapping
WHERE deals.id = mapping.id;

-- ШАГ 3: Показать статистику обновления (до удаления временной таблицы)
SELECT
    COUNT(*) as total_deals,
    COUNT(CASE WHEN m.old_number != d.deal_number THEN 1 END) as updated_deals,
    COUNT(CASE WHEN m.old_number = d.deal_number THEN 1 END) as unchanged_deals
FROM deal_number_mapping m
JOIN deals d ON d.id = m.id;

-- ШАГ 4: Показать первые 10 обновленных номеров для проверки
SELECT deal_number, created_at
FROM deals
WHERE deal_number LIKE 'FL-1%'
ORDER BY deal_number
LIMIT 10;

-- ШАГ 5: Удалить временную таблицу
DROP TABLE deal_number_mapping;