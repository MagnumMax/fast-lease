#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import process from "node:process";

// Прямые ключи для подключения к Supabase
const SUPABASE_URL = "https://sfekjkzuionqapecccwf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZWtqa3p1aW9ucWFwZWNjd2YiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzM0MjQyNzYzLCJleHAiOjIwNDk4MTg3NjN9.7sUhJGqO5ZjeUDJJLfOKyDpP8qXqKl_t3vZ4LAZQAGc";

// Создание Supabase клиента
function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: {
        "X-Client-Info": "check-deals-folders",
      },
    },
  });
}

// Проверка является ли имя папкой
function isFolder(item) {
  return item.metadata && item.metadata.size === 0 && !item.name.endsWith('.') && !item.name.endsWith('..');
}

// Проверка является ли имя UUID
function isUUID(name) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(name);
}

// Рекурсивное получение всех файлов и папок с пагинацией
async function listAllItemsRecursive(supabase, bucket, prefix = "", limit = 1000) {
  let allItems = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allItems = allItems.concat(data);
    offset += limit;

    // Если получили меньше элементов чем запрашивали, значит это последняя страница
    if (data.length < limit) {
      break;
    }
  }

  return allItems;
}

// Получение папок с UUID названиями
function findUUIDFolders(items, prefix = "") {
  const uuidFolders = [];
  
  for (const item of items) {
    if (isFolder(item) && isUUID(item.name)) {
      uuidFolders.push({
        name: item.name,
        fullPath: prefix ? `${prefix}/${item.name}` : item.name,
        size: item.metadata?.size || 0,
        lastModified: item.updated_at || item.created_at
      });
    }
  }
  
  return uuidFolders;
}

// Основная функция проверки папок со сделками
async function checkDealsFolders() {
  console.log("🔍 ПРОВЕРКА ПАПОК СО СДЕЛКАМИ В SUPABASE STORAGE");
  console.log("=".repeat(65));
  
  try {
    const supabase = createSupabaseClient();
    const bucket = "deals";
    
    // Префиксы для проверки
    const prefixes = [
      "", 
      "deals/", 
      "documents/", 
      "deals/documents/"
    ];
    
    const allUUIDFolders = [];
    const stats = {
      totalFolders: 0,
      filesByPrefix: {},
      foldersByPrefix: {},
      totalFiles: 0
    };
    
    console.log(`📂 Бакет: "${bucket}"`);
    console.log(`🔍 Проверяемые префиксы: ${prefixes.join(", ")}`);
    console.log();
    
    for (const prefix of prefixes) {
      console.log(`📋 Проверяю префикс: "${prefix || "(корневой каталог)"}"`);
      
      try {
        // Получаем все элементы для данного префикса
        const items = await listAllItemsRecursive(supabase, bucket, prefix);
        
        const folders = items.filter(isFolder);
        const files = items.filter(item => !isFolder(item));
        
        // Ищем папки с UUID
        const uuidFolders = findUUIDFolders(items, prefix);
        
        // Добавляем в общий список
        allUUIDFolders.push(...uuidFolders);
        
        // Обновляем статистику
        stats.totalFolders += folders.length;
        stats.totalFiles += files.length;
        stats.filesByPrefix[prefix || "(корневой)"] = files.length;
        stats.foldersByPrefix[prefix || "(корневой)"] = folders.length;
        
        console.log(`   📁 Папок найдено: ${folders.length}`);
        console.log(`   📄 Файлов найдено: ${files.length}`);
        console.log(`   🆔 Папок с UUID: ${uuidFolders.length}`);
        
        if (uuidFolders.length > 0) {
          console.log(`   📂 Примеры UUID папок:`);
          uuidFolders.slice(0, 3).forEach(folder => {
            console.log(`      - ${folder.fullPath}`);
          });
          if (uuidFolders.length > 3) {
            console.log(`      ... и еще ${uuidFolders.length - 3} папок`);
          }
        }
        
        console.log();
        
      } catch (error) {
        console.log(`   ❌ Ошибка при обработке префикса "${prefix}": ${error.message}`);
        console.log();
        continue;
      }
    }
    
    // Удаляем дубликаты если они есть
    const uniqueUUIDFolders = [];
    const seenPaths = new Set();
    
    for (const folder of allUUIDFolders) {
      if (!seenPaths.has(folder.fullPath)) {
        seenPaths.add(folder.fullPath);
        uniqueUUIDFolders.push(folder);
      }
    }
    
    // Сортируем по пути
    uniqueUUIDFolders.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
    
    // Выводим итоговую статистику
    console.log("📊 ИТОГОВАЯ СТАТИСТИКА");
    console.log("=".repeat(65));
    console.log(`📁 Общее количество папок: ${stats.totalFolders}`);
    console.log(`📄 Общее количество файлов: ${stats.totalFiles}`);
    console.log(`🆔 Уникальных папок с UUID: ${uniqueUUIDFolders.length}`);
    console.log();
    
    console.log("📈 СТАТИСТИКА ПО ПРЕФИКСАМ:");
    prefixes.forEach(prefix => {
      const prefixKey = prefix || "(корневой)";
      const folders = stats.foldersByPrefix[prefixKey] || 0;
      const files = stats.filesByPrefix[prefixKey] || 0;
      console.log(`   ${prefixKey}: ${folders} папок, ${files} файлов`);
    });
    console.log();
    
    // Выводим полный список папок с UUID
    if (uniqueUUIDFolders.length > 0) {
      console.log("📋 ПОЛНЫЙ СПИСОК ПАПОК С UUID:");
      console.log("=".repeat(65));
      uniqueUUIDFolders.forEach((folder, index) => {
        const lastModified = folder.lastModified 
          ? new Date(folder.lastModified).toLocaleString('ru-RU')
          : "Неизвестно";
        console.log(`${index + 1}. ${folder.fullPath}`);
        console.log(`   🆔 UUID: ${folder.name}`);
        console.log(`   📅 Изменено: ${lastModified}`);
        console.log();
      });
    } else {
      console.log("⚠️ ПАПОК С UUID НЕ НАЙДЕНО");
    }
    
    // Возвращаем результат
    const result = {
      totalDealsFound: uniqueUUIDFolders.length,
      totalFolders: stats.totalFolders,
      totalFiles: stats.totalFiles,
      dealsPaths: uniqueUUIDFolders.map(folder => folder.fullPath),
      uuidList: uniqueUUIDFolders.map(folder => folder.name),
      statistics: stats,
      timestamp: new Date().toISOString()
    };
    
    console.log("✅ ПРОВЕРКА ЗАВЕРШЕНА УСПЕШНО!");
    console.log(`🎯 Найдено ${uniqueUUIDFolders.length} папок со сделками`);
    
    return result;
    
  } catch (error) {
    console.error("❌ Ошибка при проверке папок со сделками:", error.message);
    throw error;
  }
}

// Запуск скрипта
async function run() {
  try {
    const result = await checkDealsFolders();
    
    // Выводим краткий результат
    console.log("\n" + "=".repeat(65));
    console.log("🎉 КРАТКИЙ РЕЗУЛЬТАТ");
    console.log("=".repeat(65));
    console.log(`📊 Всего папок со сделками: ${result.totalDealsFound}`);
    console.log(`📁 Всего папок: ${result.totalFolders}`);
    console.log(`📄 Всего файлов: ${result.totalFiles}`);
    
    if (result.dealsPaths.length > 0) {
      console.log(`\n📋 Пути к папкам со сделками:`);
      result.dealsPaths.forEach((path, index) => {
        console.log(`   ${index + 1}. ${path}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error("💥 Скрипт завершился с ошибкой:", error.message);
    process.exitCode = 1;
  }
}

// Экспортируем функции для использования в других модулях
export { checkDealsFolders, createSupabaseClient };

// Запускаем скрипт если он выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}