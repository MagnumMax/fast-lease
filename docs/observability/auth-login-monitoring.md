# Auth Login Monitoring & Alerting

Дата: 2025-11-11  
Владелец: Platform Engineering  

## 1. Дашборд (Supabase / BI)

**Цель:** видеть динамику успешных/неуспешных входов по порталам и быстро локализовать всплески ошибок.

### Источники
- `public.auth_login_events`
- `view_portal_roles` (для обогащения ролями, если нужно сегментировать)

### Рекомендуемые виджеты
1. **Time-series (line):** count(*) by `status` per 5 минут (stacked), фильтр по `portal`.
2. **Conversion funnel:** `success / (success + failure)` за сутки.
3. **Top error codes:** таблица (`error_code`, `portal`, count`), сортировка по убыванию.
4. **Geo/IP heatmap (optional):** взять `ip` → GeoIP для обнаружения подозрительной активности.

### SQL-шаблоны
```sql
-- 5m buckets for line chart
select
  date_trunc('minute', occurred_at) + make_interval(mins => (extract(minute from occurred_at)::int % 5) * -1) as bucket,
  portal,
  status,
  count(*) as events
from auth_login_events
where occurred_at >= now() - interval '24 hours'
group by 1,2,3
order by bucket;

-- error leaderboard
select portal, error_code, count(*) as errors
from auth_login_events
where status = 'failure'
  and occurred_at >= now() - interval '1 day'
group by 1,2
order by errors desc;
```

## 2. Алерты

| Алерт | Условие | Действия | Канал |
| --- | --- | --- | --- |
| SurgeFailures | `status = 'failure'` > 30% событий за 5 минут или > 50 ошибок/5мин для одного портала | Auto-запуск runbook (см. ниже), уведомить on-call | `#auth-alerts` |
| PortalDown | Нет `success` событий > 10 минут для портала (при наличии входящего трафика) | Проверить Supabase Auth, SMTP/почтовый канал, middleware | `#auth-alerts` |
| SuspiciousIPs | > 20 ошибок подряд с одного IP за 2 минуты | Заблокировать IP в WAF, уведомить security | `#security-incidents` |

**Инструменты:** Supabase Insights + DataDog (log drain) или Grafana/Looker c Postgres OLAP-коннектором.

## 3. Runbook (Incident Response)

1. **Подтвердить сигнал:**
   - Открыть дашборд `Auth Login Monitoring`.
   - Сравнить уровни `success`/`failure`, убедиться, что spike не связан с плановым тестом.
2. **Идентифицировать портал/роль:**
   - Выполнить SQL для `auth_login_events` за последние 15 минут с фильтрами по `portal`, `error_code`.
   - Проверить наличие изменений деплоя (посмотреть `DeploymentMeta` на `/` или `vercel deploy` лог).
3. **Проверить внешние зависимости:**
   - Email-канал (SMTP): статус почтового провайдера.
   - Supabase Auth: https://status.supabase.com.
4. **Митигировать:**
   - При проблеме на нашей стороне откатить последний релиз (см. release runbook).
   - Если подозрительные IP — добавить правило в WAF/Cloudflare.
5. **Коммьюникация:**
   - Сообщить в `#auth-alerts` шаблонным сообщением (timestamp, портал, error_code, статус).
   - Если затрагивает клиентов/инвесторов — уведомить CX/Investor team.
6. **Пост-мортем:**
   - В течение 24 часов заполнить карточку в Jira (`AUTH-INC`), приложить графики и SQL.

## 4. Автоматизация

- **Log drain → DataDog:** использовать Supabase log export в DataDog (см. docs) и завести монитор на KQL по `auth_login_events`.
- **Scheduled check:** Cloud Scheduler (каждые 5 минут) вызывает Edge Function, которая:
  - считает долю ошибок за окно;
  - пишет результат в `observation_logs`;
  - триггерит Slack webhook при превышении порога (использовать secrets manager для токенов).

## 5. To-do

- [ ] Создать дашборд “Auth Login Monitoring” в выбранном BI и прикрепить ссылку сюда.
- [ ] Настроить три SLA-алерта (см. таблицу) и протестировать уведомления.
- [ ] Автоматизировать Scheduled check (Edge Function) + добавить в репо.
- [ ] Включить runbook в общий Incident Response playbook.
