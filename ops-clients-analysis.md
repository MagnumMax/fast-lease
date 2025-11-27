# Анализ структуры страниц /ops/clients и /ops/cars в проекте Fast Lease

## Обзор архитектуры маршрутов

Проект использует архитектуру совместно используемых компонентов для разных ролей пользователей. Маршруты `/ops/clients` и `/ops/cars` реализованы через систему реэкспортов.

### Файлы маршрутов

#### `/ops/clients`
- **Основной файл маршрута**: `app/(dashboard)/ops/clients/page.tsx`
- **Реальная реализация**: `app/(shared)/workspace/clients/page.tsx`
- **Компонент таблицы**: `app/(dashboard)/ops/_components/clients-directory.tsx`

#### `/ops/cars`
- **Основной файл маршрута**: `app/(dashboard)/ops/cars/page.tsx`
- **Реальная реализация**: `app/(shared)/workspace/cars/page.tsx`
- **Компонент таблицы**: `app/(dashboard)/ops/_components/cars-catalogue.tsx`

## Анализ страницы покупателей (/ops/clients)

### Структура таблицы покупателей

Компонент `OpsClientsDirectory` реализует таблицу со следующими колонками:

#### Колонки таблицы:
1. **Полное имя** (min-width: 200px)
   - Ссылка на детальную страницу покупателя
   - Бейджи статуса и сегмента
   - Стили: `text-sm font-semibold text-brand-600`

2. **Контакты** (min-width: 200px)
   - Email с иконкой Mail
   - Телефон с иконкой Phone
   - Стили: `text-sm text-muted-foreground`

3. **Скоринг** (min-width: 120px)
   - Отображение кредитного скоринга покупателя
   - Стили: `text-sm font-medium text-foreground`

4. **Просрочки** (min-width: 140px)
   - Бейдж с количеством просрочек или текст "Нет просрочек"
   - Стили бейджа: `Badge variant="danger"` для просрочек

5. **Лизинг** (min-width: 220px)
   - Информация об активном лизинге
   - Автомобиль, сумма, дата начала
   - Иконка CarFront для визуального разделения

### Компоненты для модификации таблицы покупателей

#### Основные файлы:
- **`app/(dashboard)/ops/_components/clients-directory.tsx`** - основной компонент таблицы
- **`app/(shared)/workspace/clients/page.tsx`** - страница-обертка
- **`app/(dashboard)/ops/clients/actions.ts`** - серверные действия

#### Ключевые функции для изменения:
- Фильтрация: `searchQuery`, `statusFilter`, `overdueFilter`
- Пагинация: `page`, `pageSize`, `currentClients`
- Создание покупателей: `handleCreateClient()`

### Стили бейджей статуса покупателей

```tsx
// Статус покупателя
<Badge variant={client.status === "Blocked" ? "danger" : "success"} className="rounded-lg">
  {client.statusLabel}
</Badge>

// Просрочки
{client.overdue > 0 ? (
  <Badge variant="danger" className="rounded-lg">
    {client.metricsSummary?.overdue ?? `${client.overdue} проср.`}
  </Badge>
) : (
  client.metricsSummary?.overdue ?? "Нет просрочек"
)}
```

## Анализ страницы автомобилей (/ops/cars)

### Структура таблицы автомобилей

Компонент `OpsCarsCatalogue` реализует таблицу со следующими колонками:

#### Колонки таблицы:
1. **Автомобиль**
   - Название с ссылкой на детальную страницу
   - VIN, вариант, год в дополнительной строке
   - Стили: `text-sm font-semibold text-foreground`

2. **Статус**
   - Бейдж с кастомными стилями в зависимости от tone
   - Полная ширина с rounded-full дизайном
   - Использует `resolveStatusToneClass()`

3. **Тип**
   - Тип кузова автомобиля
   - Стили: `text-sm text-muted-foreground`

4. **Год**
   - Год выпуска автомобиля
   - Стили: `text-sm text-muted-foreground`

5. **Пробег**
   - Текущий пробег
   - Стили: `text-sm text-foreground`

6. **Стоимость**
   - Стоимость автомобиля
   - Стили: `text-sm text-foreground`

7. **Активная сделка**
   - Номер активной сделки со ссылкой
   - Или текст "Нет активной сделки"

### Стили лейбов статуса автомобилей

#### Определение стилей в `STATUS_TONE_CLASS`:

```tsx
const STATUS_TONE_CLASS: Record<OpsTone, string> = {
  success: "border-emerald-400/80 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-400/80 bg-amber-500/10 text-amber-700",
  info: "border-sky-400/80 bg-sky-500/10 text-sky-700",
  danger: "border-rose-400/80 bg-rose-500/10 text-rose-700",
  muted: "border-border bg-background/60 text-muted-foreground",
};
```

#### Применение стилей:

```tsx
// Функция для получения стилей
function resolveStatusToneClass(tone: OpsTone | undefined | null) {
  if (!tone) {
    return STATUS_TONE_CLASS.muted;
  }
  return STATUS_TONE_CLASS[tone] ?? STATUS_TONE_CLASS.muted;
}

// Использование в таблице
<Badge variant="outline" className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolveStatusToneClass(car.statusTone)}`}>
  {car.statusLabel}
</Badge>
```

### Метаданные статусов автомобилей

Статусы определены в `lib/supabase/queries/operations.ts`:

```tsx
export const OPS_VEHICLE_STATUS_META: Record<string, { label: string; tone: OpsTone }> = {
  draft: { label: "Черновик", tone: "muted" },
  available: { label: "Доступен", tone: "success" },
  reserved: { label: "Зарезервирован", tone: "warning" },
  leased: { label: "В лизинге", tone: "info" },
  maintenance: { label: "На обслуживании", tone: "warning" },
  retired: { label: "Списан", tone: "danger" },
};
```

### Компоненты для модификации таблицы автомобилей

#### Основные файлы:
- **`app/(dashboard)/ops/_components/cars-catalogue.tsx`** - основной компонент таблицы
- **`app/(shared)/workspace/cars/page.tsx`** - страница-обертка
- **`app/(dashboard)/ops/cars/actions.ts`** - серверные действия
- **`lib/supabase/queries/operations.ts`** - типы и константы

#### Ключевые функции для изменения:
- Фильтрация: `searchQuery`, `bodyTypeFilter`, `statusFilter`
- Пагинация: `page`, `pageSize`, `currentCars`
- Создание автомобилей: `handleCreateCar()`
- Стили статусов: `resolveStatusToneClass()`, `STATUS_TONE_CLASS`

## Адаптивность и мобильные версии

### Покупатели
- Использует только десктопную таблицу
- Нет отдельной мобильной версии

### Автомобили
- **Десктоп**: Полная таблица с всеми колонками
- **Мобильная версия**: Карточный дизайн с grid layout
- Мобильная версия скрыта на экранах `md` и больше (`hidden md:block`)

## Рекомендации по модификации

### Для таблицы покупателей:
1. **Добавление колонок**: Модифицировать `TableHeader` и `TableRow` в `clients-directory.tsx`
2. **Изменение стилей**: Обновить Tailwind классы в компонентах Badge
3. **Фильтрация**: Добавить новые фильтры в секцию `CardContent`

### Для таблицы автомобилей:
1. **Изменение стилей статусов**: Модифицировать `STATUS_TONE_CLASS`
2. **Добавление новых статусов**: Обновить `OPS_VEHICLE_STATUS_META`
3. **Колонки таблицы**: Изменить `TableHeader` и соответствующие ячейки
4. **Мобильная версия**: Обновить grid layout в секции `md:hidden`

## Заключение

Архитектура проекта хорошо структурирована с разделением ответственности между страницами-обертками и переиспользуемыми компонентами. Система статусов автомобилей имеет гибкую систему стилей на основе tone-ов, что позволяет легко настраивать визуальное представление различных состояний.