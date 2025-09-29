# Fast Lease - Автоматизированная платформа лизинга

## 🚀 Быстрый запуск

### Локальный сервер (рекомендуется)

Для корректной работы ES6 модулей используйте локальный HTTP сервер:

```bash
# Python 3
python3 server.py

# Альтернативно, если Python 3 не установлен:
python -m http.server 8000

# Или Node.js (если установлен)
npx http-server -p 8000 -c-1
```

Затем откройте http://localhost:8000 в браузере.

### Доступные разделы

- **Главная страница**: http://localhost:8000/index.html
- **Операционный дашборд**: http://localhost:8000/ops/dashboard/index.html
- **Клиентский дашборд**: http://localhost:8000/client/dashboard/index.html
- **Инвесторский дашборд**: http://localhost:8000/investor/dashboard/index.html
- **Админ панель**: http://localhost:8000/admin/bpm/index.html

## 📁 Структура проекта

```
assets/
├── shared.js      # Единый ES6 модуль с утилитами и навигацией
└── style.css      # Глобальные стили

admin/             # Административные страницы
client/            # Клиентские страницы
investor/          # Инвесторские страницы
ops/              # Операционные страницы
cars/             # Каталог автомобилей
```

## 🔧 Архитектура

### Упрощенная модульная система

Проект использует современный ES6 модульный подход:

```javascript
// Импорт утилит
import { formatCurrency, mountSidebar, clientNav } from '../assets/shared.js';

// Использование
const shared = await import('../assets/shared.js');
const { mountHeader, applyIcons } = shared;
```

### Преимущества новой архитектуры

- ✅ Упрощенная структура (1 файл вместо 3)
- ✅ Уменьшенный размер бандла
- ✅ Легче сопровождать
- ✅ Современный ES6 подход
- ✅ Убрана избыточность fallback кода

## 🛠 Разработка

### Добавление новых утилит

Добавляйте функции в `assets/shared.js`:

```javascript
export function newUtility() {
  // Ваша функция
}
```

### Добавление навигации

Навигационные конфигурации определены в `assets/shared.js`:

```javascript
export const newRoleNav = [
  { label: 'Новая страница', href: '/new/index.html', icon: 'icon-name' }
];
```

## 📦 Production сборка

Для production рекомендуется настроить bundler (webpack/rollup) для:

- Минификации кода
- Tree shaking (удаление неиспользуемых функций)
- Code splitting
- Source maps

## 🔒 Безопасность

- CORS настроен для локальной разработки
- В production рекомендуется HTTPS
- Проверяйте зависимости на уязвимости