#!/usr/bin/env node

/**
 * Диагностический скрипт для анализа проблемы с Deal-48
 * Проверяет данные сделки, задачи и workflow template
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Загружаем переменные окружения
config({ path: '.env.local' });

// Создаем Supabase клиент
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Не найдены переменные окружения NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnoseDeal48() {
  console.log('🔍 Начинаем диагностику проблемы с workflow переходом...\n');

  try {
    // Сначала найдем все сделки для диагностики
    console.log('1️⃣ Ищем сделки в системе...');
    const { data: allDeals, error: allDealsError } = await supabase
      .from('deals')
      .select('id, workflow_id, workflow_version_id, status, payload, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allDealsError) {
      console.error('❌ Ошибка при получении списка сделок:', allDealsError);
      return;
    }

    console.log(`✅ Найдено ${allDeals.length} последних сделок:`);
    allDeals.forEach((deal, index) => {
      console.log(`   ${index + 1}. ${deal.id} - ${deal.status} (workflow: ${deal.workflow_id})`);
    });
    console.log('');

    // Проверяем workflow template для понимания правильных статусов
    console.log('2️⃣ Анализируем workflow template...');
    const { data: workflowVersions, error: workflowError } = await supabase
      .from('workflow_versions')
      .select('id, template, version, title')
      .eq('workflow_id', 'fast-lease-v1')
      .eq('is_active', true)
      .maybeSingle();

    if (workflowError || !workflowVersions) {
      console.error('❌ Ошибка при получении workflow template:', workflowError);
      return;
    }

    const workflowTemplate = workflowVersions.template;
    console.log(`✅ Workflow template получен: ${workflowVersions.title} (v${workflowVersions.version})`);

    // Отладочная информация о структуре template
    console.log('📋 Структура workflow template:');
    console.log(`   Тип: ${typeof workflowTemplate}`);
    console.log(`   Ключи: ${workflowTemplate ? Object.keys(workflowTemplate) : 'null/undefined'}`);

    if (workflowTemplate && workflowTemplate.stages) {
      console.log('📋 Доступные этапы (stages):');
      Object.entries(workflowTemplate.stages).forEach(([key, stage]) => {
        console.log(`   ${key} - ${stage.title || key}`);
        if (stage.description) {
          console.log(`     Описание: ${stage.description}`);
        }
      });
    } else {
      console.log('❌ Этапы не найдены в workflow template');
      console.log('📋 Доступные ключи:', workflowTemplate ? Object.keys(workflowTemplate) : 'template is null');
      console.log('📋 Полная структура template:', JSON.stringify(workflowTemplate, null, 2));
    }
    console.log('');

    // Ищем сделки в ранних статусах workflow
    const earlyStatuses = ['NEW_APPLICATION', 'APPLICATION_REVIEW'];
    const earlyDeals = allDeals.filter(deal => earlyStatuses.includes(deal.status));

    if (earlyDeals.length === 0) {
      console.log('❌ Не найдено сделок в ранних статусах workflow');
      console.log('📋 Используем самую раннюю найденную сделку для диагностики...');
    } else {
      console.log(`✅ Найдено ${earlyDeals.length} сделок в ранних статусах:`);
      earlyDeals.forEach((deal, index) => {
        console.log(`   ${index + 1}. ${deal.id} - ${deal.status}`);
      });
      console.log('');
    }

    // Берем самую раннюю сделку для диагностики
    const deal = earlyDeals.length > 0 ? earlyDeals[0] : allDeals[allDeals.length - 1];
    console.log(`📋 Анализируем сделку: ${deal.id}`);

    console.log('✅ Данные сделки:');
    console.log(`   ID: ${deal.id}`);
    console.log(`   Workflow ID: ${deal.workflow_id}`);
    console.log(`   Workflow Version ID: ${deal.workflow_version_id}`);
    console.log(`   Статус: ${deal.status}`);
    console.log(`   Payload:`, JSON.stringify(deal.payload, null, 2));
    console.log('');

    // 2. Получаем активную workflow версию
    console.log('2️⃣ Проверяем workflow template...');
    let workflowVersionId = deal.workflow_version_id;

    if (!workflowVersionId) {
      console.log('   Используем активную версию workflow...');
      const { data: activeVersion, error: versionError } = await supabase
        .from('workflow_versions')
        .select('id, template, version, title')
        .eq('workflow_id', deal.workflow_id)
        .eq('is_active', true)
        .maybeSingle();

      if (versionError || !activeVersion) {
        console.error('❌ Ошибка при получении активной версии workflow:', versionError);
        return;
      }

      workflowVersionId = activeVersion.id;
      console.log(`   Активная версия: ${activeVersion.version} - ${activeVersion.title}`);
    }

    const { data: version, error: versionDataError } = await supabase
      .from('workflow_versions')
      .select('template')
      .eq('id', workflowVersionId)
      .maybeSingle();

    if (versionDataError || !version) {
      console.error('❌ Ошибка при получении template workflow версии:', versionDataError);
      return;
    }

    const template = version.template;
    console.log('✅ Workflow template получен');
    console.log('');

    // 3. Анализируем текущий этап
    console.log('3️⃣ Анализируем текущий этап...');
    const currentStage = workflowTemplate.stages ? workflowTemplate.stages[deal.status] : null;

    if (!currentStage) {
      console.error(`❌ Этап "${deal.status}" не найден в workflow template`);
      console.log('📋 Доступные этапы:', workflowTemplate.stages ? Object.keys(workflowTemplate.stages) : 'stages не найден');
      return;
    }

    console.log(`   Название этапа: ${currentStage.title || deal.status}`);
    console.log(`   Описание: ${currentStage.description || 'Нет описания'}`);

    if (currentStage.exitRequirements) {
      console.log('   Exit Requirements (guards для выхода):');
      currentStage.exitRequirements.forEach((req, index) => {
        console.log(`     ${index + 1}. Key: "${req.key}", Rule: "${req.rule}"`);
      });
    } else {
      console.log('   Exit Requirements: отсутствуют');
    }
    console.log('');

    // 4. Ищем переходы из текущего этапа
    console.log('4️⃣ Ищем переходы из текущего этапа...');
    const transitions = workflowTemplate.transitions ? workflowTemplate.transitions.filter(t => t.from === deal.status) : [];

    if (transitions.length === 0) {
      console.error(`❌ Нет доступных переходов из этапа "${deal.status}"`);
      return;
    }

    console.log(`   Найдено ${transitions.length} переход(ов):`);
    transitions.forEach((transition, index) => {
      console.log(`   ${index + 1}. Из "${transition.from}" в "${transition.to}"`);
      console.log(`      Разрешенные роли: [${transition.byRoles ? transition.byRoles.join(', ') : 'не указаны'}]`);

      if (transition.guards && transition.guards.length > 0) {
        console.log('      Guards:');
        transition.guards.forEach((guard, guardIndex) => {
          console.log(`        ${guardIndex + 1}. Key: "${guard.key}", Rule: "${guard.rule}"`);
        });
      } else {
        console.log('      Guards: отсутствуют');
      }
      console.log('');
    });

    // 5. Ищем задачу "Авто подтверждено у дилера/брокера"
    console.log('5️⃣ Ищем задачу "Авто подтверждено у дилера/брокера"...');
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, deal_id, type, status, payload, assignee_role, assignee_user_id, created_at, updated_at')
      .eq('deal_id', deal.id)
      .eq('type', 'CONFIRM_CAR')
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('❌ Ошибка при получении задач:', tasksError);
      return;
    }

    if (!tasks || tasks.length === 0) {
      console.log('❌ Задача типа CONFIRM_CAR не найдена для Deal-48');
      return;
    }

    const confirmCarTask = tasks[0]; // Берем самую свежую задачу
    console.log('✅ Найдена задача:');
    console.log(`   ID: ${confirmCarTask.id}`);
    console.log(`   Тип: ${confirmCarTask.type}`);
    console.log(`   Статус: ${confirmCarTask.status}`);
    console.log(`   Assignee Role: ${confirmCarTask.assignee_role}`);
    console.log(`   Payload:`, JSON.stringify(confirmCarTask.payload, null, 2));
    console.log('');

    // 6. Анализируем guard key для задачи
    console.log('6️⃣ Анализируем guard key для задачи...');
    const taskPayload = confirmCarTask.payload || {};
    const guardKeyFromPayload = taskPayload.guard_key;
    const statusKeyFromPayload = taskPayload.status_key;

    console.log(`   Guard Key из payload: ${guardKeyFromPayload || 'не указан'}`);
    console.log(`   Status Key из payload: ${statusKeyFromPayload || 'не указан'}`);

    // Определяем guard key по fallback логике
    const TASK_GUARD_FALLBACK = {
      'CONFIRM_CAR': 'tasks.confirmCar.completed',
      'PREPARE_QUOTE': 'quotationPrepared',
      'VERIFY_VEHICLE': 'vehicle.verified',
      'COLLECT_DOCS': 'docs.required.allUploaded',
      'AECB_CHECK': 'risk.approved',
      'FIN_CALC': 'finance.approved',
      'INVESTOR_APPROVAL': 'investor.approved',
      'PREPARE_CONTRACT': 'legal.contractReady',
      'RECEIVE_ADVANCE': 'payments.advanceReceived',
      'PAY_SUPPLIER': 'payments.supplierPaid',
      'ARRANGE_DELIVERY': 'delivery.confirmed',
    };

    const fallbackGuardKey = TASK_GUARD_FALLBACK[confirmCarTask.type];
    const resolvedGuardKey = guardKeyFromPayload || fallbackGuardKey;

    console.log(`   Итоговый Guard Key: ${resolvedGuardKey}`);
    console.log('');

    // 7. Проверяем соответствие guard key и guards в переходах
    console.log('7️⃣ Проверяем соответствие guard key и guards в переходах...');
    let matchingTransition = null;

    for (const transition of transitions) {
      if (transition.guards && transition.guards.length > 0) {
        const guardMatches = transition.guards.some(guard => guard.key === resolvedGuardKey);
        if (guardMatches) {
          matchingTransition = transition;
          console.log(`   ✅ Найден подходящий переход:`);
          console.log(`      Из "${transition.from}" в "${transition.to}"`);
          console.log(`      Guard Key совпадает: ${resolvedGuardKey}`);
          break;
        }
      } else {
        // Если у перехода нет guards, он может быть выполнен без дополнительных условий
        console.log(`   ⚠️  Переход без guards: из "${transition.from}" в "${transition.to}"`);
      }
    }

    if (!matchingTransition) {
      console.log('   ❌ Нет переходов с подходящими guards');
      console.log('   Возможные причины:');
      console.log('   - Несоответствие guard key в задаче и workflow template');
      console.log('   - Задача завершилась, но guard не обновился в payload сделки');
      console.log('   - Неправильная версия workflow template');
    }

    // 8. Проверяем payload сделки на наличие guard флагов
    console.log('\n8️⃣ Проверяем guard флаги в payload сделки...');
    const dealPayload = deal.payload || {};

    if (resolvedGuardKey) {
      const guardPath = resolvedGuardKey.split('.');
      let currentObj = dealPayload;

      for (let i = 0; i < guardPath.length; i++) {
        const key = guardPath[i];
        console.log(`   Проверяем: ${guardPath.slice(0, i + 1).join('.')}`);

        if (i === guardPath.length - 1) {
          // Последний ключ - проверяем значение
          const value = currentObj[key];
          console.log(`   Значение: ${value}`);
          if (value === true) {
            console.log('   ✅ Guard флаг установлен');
          } else {
            console.log('   ❌ Guard флаг НЕ установлен');
          }
        } else {
          // Промежуточный ключ - переходим глубже
          if (currentObj[key] && typeof currentObj[key] === 'object') {
            currentObj = currentObj[key];
            console.log('   ✅ Промежуточный объект найден');
          } else {
            console.log('   ❌ Промежуточный объект НЕ найден');
            break;
          }
        }
      }
    }

    console.log('\n📋 SUMMARY:');
    console.log(`Deal ID: ${deal.id}`);
    console.log(`Current Status: ${deal.status}`);
    console.log(`Resolved Guard Key: ${resolvedGuardKey}`);
    console.log(`Task Status: ${confirmCarTask.status}`);
    console.log(`Matching Transition: ${matchingTransition ? 'найден' : 'НЕ найден'}`);

  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
  }
}

// Запускаем диагностику
diagnoseDeal48();