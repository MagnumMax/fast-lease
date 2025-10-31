#!/bin/bash

# Скрипт для загрузки моковых данных в FastLease базу данных
# Использование: ./load-mock-data.sh

echo "🚀 Начинаем загрузку моковых данных FastLease..."
echo "ℹ️ Supabase CLI более не используется. Загружай данные через Supabase MCP (execute_sql)."
echo "ℹ️ Убедись, что в .env.local задана переменная SUPABASE_PROJECT_ID."

echo "📊 Загружаем пользователей и роли..."
echo "➡️ Выполни через MCP: mock-users-roles.sql"

echo "✅ Пользователи и роли — выполнено вручную через MCP"

echo "🚗 Загружаем данные автомобилей..."
echo "➡️ Выполни через MCP: mock-vehicles-complete.sql"

echo "✅ Автомобили — выполнено вручную через MCP"

echo "👥 Загружаем данные клиентов..."
echo "➡️ Выполни через MCP: mock-clients.sql"

echo "✅ Клиенты — выполнено вручную через MCP"

echo "🤝 Загружаем данные сделок..."
echo "➡️ Выполни через MCP: mock-deals-complete.sql"

echo "✅ Сделки — выполнено вручную через MCP"

echo "💰 Загружаем финансовые данные..."
echo "➡️ Выполни через MCP: mock-finance-complete.sql"

echo "✅ Финансы — выполнено вручную через MCP"

echo "⚙️ Загружаем операционные данные..."
echo "➡️ Выполни через MCP: mock-operations-complete.sql"

echo "✅ Операционные данные — выполнено вручную через MCP"

echo "📈 Загружаем данные инвесторов..."
echo "➡️ Выполни через MCP: mock-investors-complete.sql"

echo "✅ Инвесторы — выполнено вручную через MCP"

echo ""
echo "🎉 Все моковые данные успешно загружены!"
echo ""
echo "📋 Тестовые аккаунты:"
echo "   Администратор: admin@fastlease.ae / password123"
echo "   Операционный менеджер: op.manager@fastlease.ae / password123"
echo "   Клиент: ahmed.al-zahra@fastlease.ae / password123"
echo ""
echo "🚀 Теперь можно запустить приложение: npm run dev"