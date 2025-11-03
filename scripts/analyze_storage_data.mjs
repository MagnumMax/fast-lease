#!/usr/bin/env node

// Данные из Supabase Storage
const STORAGE_DATA = [
  {"name": "documents/.emptyFolderPlaceholder"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/10_Vehicle_Purchase_Agreement_2_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/10_Vehicle_Purchase_Agreement_2_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/11_Sunday_Car_Rental_L_l_c_2_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/11_Sunday_Car_Rental_L_l_c_2_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/12_5386_SUNDAY_RENTAL_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/12_5386_SUNDAY_RENTAL_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/13_Addendum_1_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/13_Addendum_1_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/14_0723_001_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/14_0723_001_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/15_AK7_Tax_invoice_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/15_AK7_Tax_invoice_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/3_Invoice_EST1_1432_NEW_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/3_Invoice_EST1_1432_NEW_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/4_Inspection_Certificate_88_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/4_Inspection_Certificate_88_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/6_Authorization_Letter_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/6_Authorization_Letter_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/7_VEHICLE_PURCHASE_AGREEMENT_1_1_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/7_VEHICLE_PURCHASE_AGREEMENT_1_1_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/9_Amir90khedmati_pdf.json"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/9_Amir90khedmati_pdf.pdf"},
  {"name": "documents/016f4d12-4a35-596e-b5fe-905e22a83219/aggregated.json"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/1_8BA_Motors_TL_25_pdf.json"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/1_8BA_Motors_TL_25_pdf.pdf"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/10_Vehicle_Purchase_Agreement_MB_G63_Black_2022_1508_Signed_Ansar_pdf.json"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/10_Vehicle_Purchase_Agreement_MB_G63_Black_2022_1508_Signed_Ansar_pdf.pdf"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/11_Mercedes_G63_Gold_Black_Insurance_EE38439_Sunday_pdf.json"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/11_Mercedes_G63_Gold_Black_Insurance_EE38439_Sunday_pdf.pdf"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/12_Mercedes_G63_Gold_Black_GPS_EE38439_Sunday_pdf.json"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/12_Mercedes_G63_Gold_Black_GPS_EE38439_Sunday_pdf.pdf"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/4_Inspection_Certificate_7_1_pdf.json"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/4_Inspection_Certificate_7_1_pdf.pdf"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/5_Mulkia_pdf.json"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/5_Mulkia_pdf.pdf"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/6_Authorization_Letter_MB_G63_Black_2022_1508_pdf.json"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/6_Authorization_Letter_MB_G63_Black_2022_1508_pdf.pdf"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/7_Dealer_Vehicle_Purchase_Agreement_MB_G63_Black_2022_1508_pdf.json"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/7_Dealer_Vehicle_Purchase_Agreement_MB_G63_Black_2022_1508_pdf.pdf"},
  {"name": "documents/341ca631-bdcb-5176-a5b5-44e3fdf7e28e/aggregated.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/1_8BA_Motors_TL_25_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/1_8BA_Motors_TL_25_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/10_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/10_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/11_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/11_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/12_B_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/12_B_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/13_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/13_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/14_SUNDAY_CAR_RENTAL_L_L_C_1_Policy_G63_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/14_SUNDAY_CAR_RENTAL_L_L_C_1_Policy_G63_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/15_GPS_certificate_6982_SUNDAY_RENTAL_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/15_GPS_certificate_6982_SUNDAY_RENTAL_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/2_Tax_Group_Registration_Certifiate_8BA_MOTORS_AUCTION_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/2_Tax_Group_Registration_Certifiate_8BA_MOTORS_AUCTION_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/3_Tax_Invoice_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/3_Tax_Invoice_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/4_Inspection_Certificate_brabus_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/4_Inspection_Certificate_brabus_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/5_Vehicle_Information_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/5_Vehicle_Information_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/6_Authorization_Letter_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/6_Authorization_Letter_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/7_Vehicle_sales_agreement_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/7_Vehicle_sales_agreement_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/8_Sale_confirmation_letter_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/8_Sale_confirmation_letter_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/9_Buyer_G800_BRABUS_2022_6982_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/9_Buyer_G800_BRABUS_2022_6982_pdf.pdf"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/aggregated.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/INVESTMENT_AGREEMENT_WITH_PROFIT_SHARING_Altair_Sunday_fully_signed_pdf.json"},
  {"name": "documents/38321982-db01-5eb8-bee2-f2706489e5b9/INVESTMENT_AGREEMENT_WITH_PROFIT_SHARING_Altair_Sunday_fully_signed_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/1_8BA_Motors_TL_25_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/1_8BA_Motors_TL_25_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/10_12_LONG_TERM_RENTAL_VEHICLE_AGREEMENT_MB_G63_Gold_2025_1051_Schedule_A_B_signed_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/10_12_LONG_TERM_RENTAL_VEHICLE_AGREEMENT_MB_G63_Gold_2025_1051_Schedule_A_B_signed_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/13_Preliminary_Vehicle_Purchase_Agreement_MB_G63_Gold_2025_1051_signed_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/13_Preliminary_Vehicle_Purchase_Agreement_MB_G63_Gold_2025_1051_signed_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/14_Mercedes_G63_Gold_Black_Insurance_EE38440_Sunday_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/14_Mercedes_G63_Gold_Black_Insurance_EE38440_Sunday_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/15_Mercedes_G63_Gold_Black_GPS_EE38440_Sunday_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/15_Mercedes_G63_Gold_Black_GPS_EE38440_Sunday_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/3_Tax_Invoice_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/3_Tax_Invoice_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/4_Inspection_Certificate_Passing_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/4_Inspection_Certificate_Passing_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/5_Vehicle_Information_MB_G63_Gold_2025_1051_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/5_Vehicle_Information_MB_G63_Gold_2025_1051_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-905e22a83219/6_Authorization_Letter_MB_G63_Gold_2025_1051_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/6_Authorization_Letter_MB_G63_Gold_2025_1051_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/7_Dealer_Vehicle_Purchase_Agreement_MB_G63_Gold_2025_1051_signed_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/7_Dealer_Vehicle_Purchase_Agreement_MB_G63_Gold_2025_1051_signed_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/9_Buyer_MB_G63_Gold_2025_1051_15_09_25_pdf.json"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/9_Buyer_MB_G63_Gold_2025_1051_15_09_25_pdf.pdf"},
  {"name": "documents/4e1c9646-436d-5cf5-9bfe-5129b3ffb7e4/aggregated.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/1_8BA_Motors_TL_25_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/1_8BA_Motors_TL_25_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/10_Long_term_rental_agreement_GLS_600_5609_with_Schedule_A_B_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/10_Long_term_rental_agreement_GLS_600_5609_with_Schedule_A_B_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/11_Sunday_Car_Rental_L_l_c_22_1_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/11_Sunday_Car_Rental_L_l_c_22_1_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/12_5609_SUNDAY_CAR_RENTAL_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/12_5609_SUNDAY_CAR_RENTAL_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/3_Tax_Invoice_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/3_Tax_Invoice_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/4_Inspection_Certificate_91_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/4_Inspection_Certificate_91_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/5_Vehicle_Information_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/5_Vehicle_Information_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/6_Authorization_Letter_MB_GLS600_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/6_Authorization_Letter_MB_GLS600_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/7_Vehicle_Purchase_agreement_MB_GLS600_8BA_Sunday_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/7_Vehicle_Purchase_agreement_MB_GLS600_8BA_Sunday_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/8_Assign_Letter_MB_GLS600_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/8_Assign_Letter_MB_GLS600_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/9_Buyer_MB_GLS600_pdf.json"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/9_Buyer_MB_GLS600_pdf.pdf"},
  {"name": "documents/656473fe-df3a-580d-9645-2845e59c3a12/aggregated.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/1_8BA_Motors_TL_25_pdf.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/1_8BA_Motors_TL_25_pdf.pdf"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/10_1229_001_merged_pdf.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/10_1229_001_merged_pdf.pdf"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/11_Sunday_Car_Rental_mercedes_2_1_pdf.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/11_Sunday_Car_Rental_mercedes_2_1_pdf.pdf"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/12_4874_SUNDAY_CAR_RENTAL_pdf.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/12_4874_SUNDAY_CAR_RENTAL_pdf.pdf"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/4_Inspection_Certificate_77_pdf.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/4_Inspection_Certificate_77_pdf.pdf"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/6_Authorization_letter_Owner_to_8BA_Motors_S580_1_pdf.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/6_Authorization_letter_Owner_to_8BA_Motors_S580_1_pdf.pdf"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/7_Vehicle_sales_agreement_MB_S580_8BA_Sunday_1_pdf.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/7_Vehicle_sales_agreement_MB_S580_8BA_Sunday_1_pdf.pdf"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/8_Assign_letter_S580_8BA_Motors_8BA_1_pdf.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/8_Assign_letter_S580_8BA_Motors_8BA_1_pdf.pdf"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/9_Buyer_MB_S580_pdf.json"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/9_Buyer_MB_S580_pdf.pdf"},
  {"name": "documents/ead87d6d-f3b7-5fab-beff-48b772eae08c/aggregated.json"}
];

// Функция проверки UUID
function isUUID(name) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(name);
}

// Извлечение UUID из пути
function extractUUIDFromPath(path) {
  // Паттерны для извлечения UUID:
  const patterns = [
    /^documents\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i,
    /^deals\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i,
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i,
    /^deals\/documents\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i
  ];
  
  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Основная функция анализа
function analyzeStorageData() {
  console.log("🔍 АНАЛИЗ ДАННЫХ SUPABASE STORAGE");
  console.log("=".repeat(65));
  
  const deals = new Set();
  const filesByPrefix = {};
  const filesByDeal = {};
  let totalFiles = 0;
  
  console.log(`📄 Всего файлов в данных: ${STORAGE_DATA.length}`);
  console.log();
  
  // Анализируем каждый файл
  STORAGE_DATA.forEach(file => {
    const path = file.name;
    totalFiles++;
    
    // Определяем префикс
    let prefix = "";
    if (path.startsWith("documents/")) {
      prefix = "documents/";
    } else if (path.startsWith("deals/")) {
      prefix = "deals/";
    } else if (path.startsWith("deals/documents/")) {
      prefix = "deals/documents/";
    } else {
      prefix = "(корневой)";
    }
    
    // Подсчитываем файлы по префиксам
    filesByPrefix[prefix] = (filesByPrefix[prefix] || 0) + 1;
    
    // Извлекаем UUID сделки
    const uuid = extractUUIDFromPath(path);
    if (uuid && isUUID(uuid)) {
      deals.add(uuid);
      
      if (!filesByDeal[uuid]) {
        filesByDeal[uuid] = [];
      }
      filesByDeal[uuid].push(path);
    }
  });
  
  // Выводим статистику по префиксам
  console.log("📊 СТАТИСТИКА ПО ПРЕФИКСАМ:");
  Object.entries(filesByPrefix).forEach(([prefix, count]) => {
    console.log(`   ${prefix}: ${count} файлов`);
  });
  console.log();
  
  // Выводим результаты по сделкам
  const dealArray = Array.from(deals).sort();
  console.log("🎯 РЕЗУЛЬТАТЫ АНАЛИЗА:");
  console.log(`   📁 Общее количество сделок: ${dealArray.length}`);
  console.log(`   📄 Общее количество файлов: ${totalFiles}`);
  console.log();
  
  // Подробная информация по каждой сделке
  if (dealArray.length > 0) {
    console.log("📋 ПОДРОБНАЯ ИНФОРМАЦИЯ ПО СДЕЛКАМ:");
    console.log("=".repeat(65));
    
    dealArray.forEach((uuid, index) => {
      const files = filesByDeal[uuid] || [];
      const fileCount = files.length;
      const hasAggregated = files.some(f => f.endsWith('aggregated.json'));
      
      console.log(`${index + 1}. UUID: ${uuid}`);
      console.log(`   📂 Путь: documents/${uuid}/`);
      console.log(`   📄 Файлов: ${fileCount}`);
      console.log(`   ✅ aggregated.json: ${hasAggregated ? 'есть' : 'нет'}`);
      
      // Показываем примеры файлов
      const exampleFiles = files.slice(0, 3);
      exampleFiles.forEach(file => {
        const fileName = file.split('/').pop();
        console.log(`      - ${fileName}`);
      });
      if (files.length > 3) {
        console.log(`      ... и еще ${files.length - 3} файлов`);
      }
      console.log();
    });
  }
  
  // Возвращаем результат
  const result = {
    totalDeals: dealArray.length,
    totalFiles: totalFiles,
    dealsPaths: dealArray.map(uuid => `documents/${uuid}/`),
    uuidList: dealArray,
    filesByPrefix,
    filesByDeal,
    timestamp: new Date().toISOString()
  };
  
  console.log("=".repeat(65));
  console.log("✅ АНАЛИЗ ЗАВЕРШЕН УСПЕШНО!");
  console.log(`🎯 Найдено ${result.totalDeals} папок со сделками`);
  
  return result;
}

// Запуск анализа
function run() {
  try {
    const result = analyzeStorageData();
    
    console.log("\n" + "=".repeat(65));
    console.log("🎉 ИТОГОВЫЙ РЕЗУЛЬТАТ");
    console.log("=".repeat(65));
    console.log(`📊 Общее количество сделок: ${result.totalDeals}`);
    console.log(`📁 Общее количество папок: ${result.totalDeals}`);
    console.log(`📄 Общее количество файлов: ${result.totalFiles}`);
    
    if (result.dealsPaths.length > 0) {
      console.log(`\n📋 Пути к папкам со сделками:`);
      result.dealsPaths.forEach((path, index) => {
        console.log(`   ${index + 1}. ${path}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error("❌ Ошибка при анализе:", error.message);
    process.exitCode = 1;
  }
}

// Экспортируем функцию
export { analyzeStorageData, extractUUIDFromPath };

// Запускаем если выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}