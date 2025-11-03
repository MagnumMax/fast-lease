#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfekjkzuionqapecccwf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZWtqa3p1aW9ucWFwZWNjY3dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4MDU5NCwiZXhwIjoyMDc1MzU2NTk0fQ.bnWsGfFB5hGjFpdH-itSYnxVPY_1jhhCujgmlEUOAQ4'
);

async function checkAggregatedFiles() {
  console.log('🔍 Проверка aggregated.json файлов на наличие ошибок...');
  
  // Получаем список всех папок в documents
  const { data: docFiles } = await supabase.storage
    .from('deals')
    .list('documents', { limit: 1000 });
    
  if (!docFiles) {
    console.error('❌ Не удалось получить список файлов');
    return;
  }
  
  const folders = docFiles.filter(f => !f.name.includes('.'));
  console.log(`📁 Найдено ${folders.length} папок с deals`);
  
  let totalFiles = 0;
  let filesWithErrors = 0;
  let filesWithValidData = 0;
  let filesWithoutGeminiAnalysis = 0;
  
  for (const folder of folders) {
    const dealId = folder.name;
    const path = `documents/${dealId}/aggregated.json`;
    
    try {
      const { data, error } = await supabase.storage
        .from('deals')
        .download(path);
        
      if (error) {
        console.log(`❌ ${dealId}: ошибка загрузки - ${error.message}`);
        continue;
      }
      
      const content = await data.text();
      const json = JSON.parse(content);
      totalFiles++;
      
      // Проверяем на наличие ошибок gemini_error
      if (json.gemini_error) {
        filesWithErrors++;
        console.log(`❌ ${dealId}: НАЙДЕНА ОШИБКА gemini_error`);
        console.log(`   Тип ошибки: ${typeof json.gemini_error}`);
        console.log(`   Содержимое: ${json.gemini_error}`);
        
        // Проверяем информацию о документах
        if (json.documents && json.documents.length > 0) {
          const docsWithErrors = json.documents.filter(doc => doc.analysis_error);
          console.log(`   Документы с ошибками: ${docsWithErrors.length}/${json.documents.length}`);
        }
        
      } else {
        console.log(`✅ ${dealId}: файл без gemini_error`);
        
        // Проверяем наличие валидного анализа
        if (json.gemini && json.gemini.client && json.gemini.vehicle) {
          filesWithValidData++;
        } else {
          filesWithoutGeminiAnalysis++;
        }
      }
      
      // Краткая информация о структуре
      console.log(`   Документов: ${json.documents?.length || 0}`);
      console.log(`   Анализ Gemini: ${json.gemini ? 'есть' : 'нет'}`);
      console.log(`   Время регенерации: ${json.regenerated_at || 'неизвестно'}`);
      console.log('');
      
    } catch (err) {
      console.error(`❌ ${dealId}: ошибка обработки файла - ${err.message}`);
    }
  }
  
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ:');
  console.log(`   📁 Всего проверено файлов: ${totalFiles}`);
  console.log(`   ❌ Файлов с ошибками gemini_error: ${filesWithErrors}`);
  console.log(`   ✅ Файлов без ошибок: ${totalFiles - filesWithErrors}`);
  console.log(`   🎯 Файлов с валидным анализом: ${filesWithValidData}`);
  console.log(`   ⚠️  Файлов без полного анализа Gemini: ${filesWithoutGeminiAnalysis}`);
  
  return {
    totalFiles,
    filesWithErrors,
    filesWithValidData,
    filesWithoutGeminiAnalysis
  };
}

checkAggregatedFiles().catch(console.error);