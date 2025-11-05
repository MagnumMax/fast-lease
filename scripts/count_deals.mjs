#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import process from "node:process";

// Получение переменных окружения для Supabase
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Необходимо установить переменные окружения NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET");
  }

  return { supabaseUrl, serviceRoleKey };
}

// Создание Supabase клиента
function createSupabaseClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: {
        "X-Client-Info": "count-deals-script",
      },
    },
  });
}

// Рекурсивное получение всех файлов с пагинацией
async function listAllFilesRecursive(supabase, bucket, prefix = "", limit = 1000) {
  let allFiles = [];
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

    allFiles = allFiles.concat(data);
    offset += limit;

    // Если получили меньше файлов чем запрашивали, значит это последняя страница
    if (data.length < limit) {
      break;
    }
  }

  return allFiles;
}

// Извлечение UUID из путей файлов
function extractDealUUIDs(files) {
  const uuids = new Set();
  
  for (const file of files) {
    const fullPath = file.name;
    
    // Паттерны для извлечения UUID сделок:
    // 1. deals/uuid/filename
    // 2. documents/uuid/filename  
    // 3. uuid/filename (прямо в корне бакета)
    
    const patterns = [
      /^deals\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i,
      /^documents\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i,
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i,
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
    ];
    
    for (const pattern of patterns) {
      const match = fullPath.match(pattern);
      if (match) {
        uuids.add(match[1]);
        break;
      }
    }
  }
  
  return Array.from(uuids).sort();
}

// Основная функция подсчета сделок
async function countDeals() {
  console.log("🚀 Начинаю подсчет сделок в Supabase Storage...");
  
  try {
    const supabase = createSupabaseClient();
    const bucket = "deal-documents";
    
    console.log(`📂 Получаю список всех файлов в бакете "${bucket}"...`);
    
    // Получаем все файлы в бакете
    const files = await listAllFilesRecursive(supabase, bucket);
    
    console.log(`📄 Найдено ${files.length} файлов и папок в бакете`);
    
    // Выводим примеры найденных файлов для отладки
    console.log("🔍 Примеры найденных путей:");
    files.slice(0, 10).forEach(file => {
      console.log(`   - ${file.name}`);
    });
    if (files.length > 10) {
      console.log(`   ... и еще ${files.length - 10} файлов`);
    }
    
    // Извлекаем UUID сделок
    console.log("\n🔍 Извлекаю UUID сделок...");
    const dealUUIDs = extractDealUUIDs(files);
    
    console.log(`\n📊 Результаты подсчета сделок:`);
    console.log(`   📁 Общее количество сделок: ${dealUUIDs.length}`);
    
    if (dealUUIDs.length > 0) {
      console.log(`   📋 Список UUID сделок:`);
      dealUUIDs.forEach((uuid, index) => {
        console.log(`      ${index + 1}. ${uuid}`);
      });
    } else {
      console.log(`   ⚠️ Сделки не найдены в бакете "${bucket}"`);
    }
    
    // Дополнительная статистика
    console.log(`\n📈 Дополнительная статистика:`);
    console.log(`   📄 Всего файлов/папок: ${files.length}`);
    
    // Подсчет файлов по типам
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf')).length;
    const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json')).length;
    const aggregatedFiles = files.filter(f => f.name === 'aggregated.json').length;
    
    console.log(`   📄 PDF файлы: ${pdfFiles}`);
    console.log(`   📄 JSON файлы: ${jsonFiles}`);
    console.log(`   📄 aggregated.json файлы: ${aggregatedFiles}`);
    
    return {
      totalDeals: dealUUIDs.length,
      dealUUIDs,
      totalFiles: files.length,
      pdfFiles,
      jsonFiles,
      aggregatedFiles
    };
    
  } catch (error) {
    console.error("❌ Ошибка при подсчете сделок:", error.message);
    throw error;
  }
}

// Запуск скрипта
async function run() {
  try {
    const result = await countDeals();
    
    console.log(`\n✅ Подсчет завершен успешно!`);
    
    // Возвращаем результат для использования в других скриптах
    return result;
    
  } catch (error) {
    console.error("💥 Скрипт завершился с ошибкой:", error.message);
    process.exitCode = 1;
  }
}

// Экспортируем функции для использования в других модулях
export { countDeals, createSupabaseClient, extractDealUUIDs };

// Запускаем скрипт если он выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
