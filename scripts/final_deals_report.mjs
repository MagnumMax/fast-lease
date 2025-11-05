#!/usr/bin/env node

// Финальный скрипт для подсчета сделок в Supabase Storage

console.log("📊 СОЗДАНИЕ ОТЧЕТА ПО СДЕЛКАМ В SUPABASE STORAGE");
console.log("=".repeat(60));

// UUID всех сделок из базы данных (получено через MCP сервер Supabase)
const DEALS_FROM_DATABASE = [
  { id: "446de119-123a-4690-a9e0-36c5ef3a7b4f", deal_number: "FL-2024-001", status: "NEW" },
  { id: "dd887697-0a42-49fb-8f08-dd2742692577", deal_number: "FL-2024-002", status: "OFFER_PREP" },
  { id: "79127c5d-da85-4b6d-8837-8f54b402e811", deal_number: "FL-2024-003", status: "NEW" },
  { id: "f5ccfdb4-5323-4cb9-9925-df82833d800a", deal_number: "FL-2024-004", status: "OFFER_PREP" },
  { id: "bdae2195-fbd9-4df2-a953-d2d61dbb341e", deal_number: "FL-2024-005", status: "NEW" },
  { id: "23e10cb4-b94b-40f0-8158-0c9b6b6dcc9b", deal_number: "FL-2024-006", status: "ACTIVE" },
  { id: "14a33021-4b5a-48a0-8ae6-a0a0f300cfa5", deal_number: "FL-2024-007", status: "ACTIVE" },
  { id: "f75c6bd2-4c2e-4f9e-b6ed-c095647fcf37", deal_number: "FL-2024-008", status: "ACTIVE" },
  { id: "cdb181ce-7a3e-44ae-a252-83a0e30a0153", deal_number: "FL-2024-009", status: "ACTIVE" },
  { id: "9580b330-a95c-4798-8858-201320645684", deal_number: "FL-2024-010", status: "ACTIVE" },
  { id: "c6d1438d-93c0-4ce6-a0ca-58f239505993", deal_number: "FL-2024-011", status: "ACTIVE" },
  { id: "63a452cd-6d44-428d-b945-3fc70e40df64", deal_number: "FL-2024-012", status: "ACTIVE" },
  { id: "4018ba96-c94b-441d-b4a1-ad8ec42b7efc", deal_number: "FL-2024-013", status: "ACTIVE" },
  { id: "95c17444-a21f-40d5-8a44-9535fd75b81a", deal_number: "FL-2024-014", status: "ACTIVE" },
  { id: "16f5c804-e879-4f74-ae9f-b77b6869b222", deal_number: "FL-2024-015", status: "ACTIVE" }
];

const totalDeals = DEALS_FROM_DATABASE.length;
const dealUUIDs = DEALS_FROM_DATABASE.map(deal => deal.id);

// Статистика по статусам
const statusStats = {};
DEALS_FROM_DATABASE.forEach(deal => {
  statusStats[deal.status] = (statusStats[deal.status] || 0) + 1;
});

console.log(`\n📈 ОСНОВНАЯ СТАТИСТИКА:`);
console.log(`   📁 Общее количество сделок в базе данных: ${totalDeals}`);

console.log(`\n📊 РАСПРЕДЕЛЕНИЕ ПО СТАТУСАМ:`);
Object.entries(statusStats).forEach(([status, count]) => {
  console.log(`   🔹 ${status}: ${count} сделок`);
});

console.log(`\n📋 ПОЛНЫЙ СПИСОК UUID СДЕЛОК:`);
dealUUIDs.forEach((uuid, index) => {
  const deal = DEALS_FROM_DATABASE.find(d => d.id === uuid);
  console.log(`   ${index + 1}. ${uuid} (${deal.deal_number} - ${deal.status})`);
});

console.log(`\n📂 ПРОВЕРКА В SUPABASE STORAGE:`);
console.log(`   🎯 Бакет: "deal-documents"`);
console.log(`   🔍 Ожидаемые пути для проверки файлов:`);

dealUUIDs.forEach((uuid) => {
  console.log(`      - ${uuid}/deal/`);
  console.log(`      - ${uuid}/client/`);
  console.log(`      - ${uuid}/vehicle/`);
});

console.log("\n" + "=".repeat(60));
console.log("🎉 ИТОГОВЫЙ ОТЧЕТ ПО СДЕЛКАМ");
console.log("=".repeat(60));

console.log(`\n📊 ОБЩАЯ ИНФОРМАЦИЯ:`);
console.log(`   📁 Всего сделок: ${totalDeals}`);
console.log(`   🆕 Новых сделок: ${statusStats.NEW || 0}`);
console.log(`   📋 В подготовке: ${statusStats.OFFER_PREP || 0}`);
console.log(`   ✅ Активных сделок: ${statusStats.ACTIVE || 0}`);

console.log(`\n📋 СПИСОК UUID СДЕЛОК ДЛЯ ПРОВЕРКИ В STORAGE:`);
dealUUIDs.forEach((uuid, index) => {
  const deal = DEALS_FROM_DATABASE.find(d => d.id === uuid);
  console.log(`   ${index + 1}. ${uuid} (${deal.deal_number})`);
});

console.log(`\n✅ ОТЧЕТ ГОТОВ!`);
console.log(`🎯 Найдено ${totalDeals} сделок в базе данных Supabase.`);
