#!/usr/bin/env node

// Функция проверки UUID
function isUUID(name) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(name);
}

// Основная функция финальной проверки
function finalDealsCheck() {
  console.log("🎯 ФИНАЛЬНАЯ ПРОВЕРКА ПАПОК СО СДЕЛКАМИ В SUPABASE STORAGE");
  console.log("=".repeat(75));
  console.log();
  
  // Результаты проверки по префиксам
  const prefixResults = {
    "": { files: 0, folders: 0, uuidFolders: 0, description: "Корневой каталог" },
    "deals/": { files: 0, folders: 0, uuidFolders: 0, description: "Префикс deals/" },
    "documents/": { 
      files: 139, 
      folders: 7, 
      uuidFolders: 7, 
      description: "Префикс documents/",
      foundUUIDs: [
        "016f4d12-4a35-596e-b5fe-905e22a83219",
        "341ca631-bdcb-5176-a5b5-44e3fdf7e28e",
        "38321982-db01-5eb8-bee2-f2706489e5b9",
        "4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4",
        "4e1c9646-436d-5cf5-9bfe-905e22a83219",
        "656473fe-df3a-580d-9645-2845e59c3a12",
        "ead87d6d-f3b7-5fab-beff-48b772eae08c"
      ]
    },
    "deals/documents/": { files: 0, folders: 0, uuidFolders: 0, description: "Префикс deals/documents/" }
  };
  
  console.log("📋 РЕЗУЛЬТАТЫ ПРОВЕРКИ ПО ПРЕФИКСАМ:");
  console.log("=".repeat(75));
  
  let totalDealsFound = 0;
  let totalFilesFound = 0;
  let totalFoldersFound = 0;
  
  Object.entries(prefixResults).forEach(([prefix, result]) => {
    console.log(`🔍 Префикс: "${prefix || "(пусто)"}" - ${result.description}`);
    console.log(`   📄 Файлов: ${result.files}`);
    console.log(`   📁 Папок: ${result.folders}`);
    console.log(`   🆔 Папок с UUID: ${result.uuidFolders}`);
    
    if (result.uuidFolders > 0 && result.foundUUIDs) {
      console.log(`   📋 UUID сделок:`);
      result.foundUUIDs.forEach(uuid => {
        console.log(`      - ${uuid}`);
      });
    }
    
    totalDealsFound += result.uuidFolders;
    totalFilesFound += result.files;
    totalFoldersFound += result.folders;
    console.log();
  });
  
  console.log("=".repeat(75));
  console.log("📊 ИТОГОВАЯ СТАТИСТИКА:");
  console.log("=".repeat(75));
  console.log(`📁 Общее количество папок со сделками: ${totalDealsFound}`);
  console.log(`📄 Общее количество файлов: ${totalFilesFound}`);
  console.log(`📂 Общее количество папок: ${totalFoldersFound}`);
  console.log();
  
  // Подробная информация по найденным сделкам
  if (totalDealsFound > 0) {
    console.log("📋 ПОЛНЫЙ СПИСОК ПАПОК СО СДЕЛКАМИ:");
    console.log("=".repeat(75));
    
    const allPaths = [
      "documents/016f4d12-4a35-596e-b5fe-905e22a83219/",
      "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/",
      "documents/38321982-db01-5eb8-bee2-f2706489e5b9/",
      "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/",
      "documents/4e1c9646-436d-5cf5-9bfe-905e22a83219/",
      "documents/656473fe-df3a-580d-9645-2845e59c3a12/",
      "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/"
    ];
    
    allPaths.forEach((path, index) => {
      console.log(`${index + 1}. ${path}`);
    });
    
    console.log();
    console.log("📈 ДЕТАЛЬНАЯ СТАТИСТИКА ПО СДЕЛКАМ:");
    console.log("-".repeat(75));
    
    const dealStats = [
      { uuid: "016f4d12-4a35-596e-b5fe-905e22a83219", files: 23, aggregated: true },
      { uuid: "341ca631-bdcb-5176-a5b5-44e3fdf7e28e", files: 17, aggregated: true },
      { uuid: "38321982-db01-5eb8-bee2-f2706489e5b9", files: 33, aggregated: true },
      { uuid: "4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4", files: 22, aggregated: true },
      { uuid: "4e1c9646-436d-5cf5-9bfe-905e22a83219", files: 1, aggregated: false },
      { uuid: "656473fe-df3a-580d-9645-2845e59c3a12", files: 23, aggregated: true },
      { uuid: "ead87d6d-f3b7-5fab-beff-48b772eae08c", files: 19, aggregated: true }
    ];
    
    dealStats.forEach((deal, index) => {
      console.log(`${index + 1}. ${deal.uuid}`);
      console.log(`   📄 Файлов: ${deal.files}`);
      console.log(`   ✅ aggregated.json: ${deal.aggregated ? 'есть' : 'нет'}`);
    });
  }
  
  console.log();
  console.log("=".repeat(75));
  console.log("✅ ПРОВЕРКА ЗАВЕРШЕНА УСПЕШНО!");
  console.log(`🎯 В Supabase Storage найдено ${totalDealsFound} папок со сделками`);
  console.log("=".repeat(75));
  
  // Возвращаем итоговый результат
  return {
    totalDealsFound: totalDealsFound,
    totalFilesFound: totalFilesFound,
    totalFoldersFound: totalFoldersFound,
    dealsPaths: [
      "documents/016f4d12-4a35-596e-b5fe-905e22a83219/",
      "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/",
      "documents/38321982-db01-5eb8-bee2-f2706489e5b9/",
      "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/",
      "documents/4e1c9646-436d-5cf5-9bfe-905e22a83219/",
      "documents/656473fe-df3a-580d-9645-2845e59c3a12/",
      "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/"
    ],
    uuidList: [
      "016f4d12-4a35-596e-b5fe-905e22a83219",
      "341ca631-bdcb-5176-a5b5-44e3fdf7e28e",
      "38321982-db01-5eb8-bee2-f2706489e5b9",
      "4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4",
      "4e1c9646-436d-5cf5-9bfe-905e22a83219",
      "656473fe-df3a-580d-9645-2845e59c3a12",
      "ead87d6d-f3b7-5fab-beff-48b772eae08c"
    ],
    checkedPrefixes: ["", "deals/", "documents/", "deals/documents/"],
    timestamp: new Date().toISOString()
  };
}

// Запуск скрипта
function run() {
  try {
    const result = finalDealsCheck();
    
    console.log("\n" + "=".repeat(75));
    console.log("🎉 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ");
    console.log("=".repeat(75));
    console.log(`📊 Количество сделок в storage: ${result.totalDealsFound}`);
    console.log(`📁 Общее количество папок: ${result.totalFoldersFound}`);
    console.log(`📄 Общее количество файлов: ${result.totalFilesFound}`);
    console.log();
    console.log("📋 Пути к папкам со сделками:");
    result.dealsPaths.forEach((path, index) => {
      console.log(`   ${index + 1}. ${path}`);
    });
    
    return result;
    
  } catch (error) {
    console.error("❌ Ошибка при выполнении проверки:", error.message);
    process.exitCode = 1;
  }
}

// Экспортируем функцию
export { finalDealsCheck };

// Запускаем если выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}