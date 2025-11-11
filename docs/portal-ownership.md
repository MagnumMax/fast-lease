# Portal Content Ownership Matrix

Дата: 2025-11-11  
Ответственный за документ: Product Ops

| Портал | Основные разделы | Владелец контента | Канал согласования | Примечания |
| --- | --- | --- | --- | --- |
| `app` (внутренний) | /ops, /admin, /support, /finance, /legal, /risk, /tech, /workspace | Head of Operations (все тексты), совместно с HR для onboarding | #operations-product в Slack | Все изменения копирайта или onboarding-баннеров требуют ревью security если затронуты политики. |
| `client` | /client, /apply | Customer Experience Lead | #cx-product | Копирайт должен быть двуязычным (EN/RU) для маркетинговых страниц; технический UI — Canadian English. |
| `investor` | /investor | Capital Markets Lead | #investor-updates | Все обновления сопровождаются legal-review (канал #legal-review) перед релизом. |
| `partner` | /partner | Vendor Success Manager | #partners-hub | Пока портал в разработке; тексты и FAQ релизятся через partners-notion. |

## Обязанности
1. **Сбор контента:** владелец портала отвечает за copy deck, локализацию, иллюстрации и списки ссылок.  
2. **Источники правды:** copy хранится в Notion базе `Portal Copy DB`, синхронизация с репозиторием — через PR.  
3. **Срок SLA:** максимум 2 рабочих дня на ревью копирайта после запроса разработчика.  
4. **Триггеры обновления:** любое изменение навигации, CTA или ссылок на `/login` (единый вход) требует уведомить владельца и отметить в чеклисте PR.  
5. **Контакты:** см. Slack-каналы выше + дублирование в Jira компоненте `AUTH-PORTAL`.

> При отсутствии владельца (например, отпуск) Product Ops назначает временного заместителя и обновляет таблицу.
