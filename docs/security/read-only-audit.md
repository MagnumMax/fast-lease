# Read-only Access Audit (2025-11-12)

## Goal
Предотвратить любые операции записи от пользователей, чьи роли помечены как *read-only*, по всем внутренним порталам. После внедрения флага read-only он покрывает только административные сценарии; остальные разделы (OPS, Finance, Tech и т.д.) всё ещё допускают изменения.

## Control Model
| Слой | Что нужно | Состояние |
| --- | --- | --- |
| **Session guard** | `canMutateSessionUser(sessionUser)` вызывается сразу после `requirePortalSession`, результат передаётся в дочерние компоненты. | Есть только на `/settings/users`. |
| **UI guard** | Все кнопки/формы, ведущие к записью, дизейблятся для read-only + подсказка. | Реализовано только в `AdminUsersDirectory`. |
| **Server guard** | Любой server action / route handler / API перед записью проверяет `canMutateSessionUser`. | Добавлено для `/api/admin/users/*` и `/api/admin/roles/permissions`. |
| **DB / RLS** | Политики Supabase по claim `read_only` (следующий этап). | TODO. |

## Inventory by Area
Каждая строка фиксирует портал/фичу с действиями записи.

| Area | Key Routes / Components | Mutation Sources (UI + Server) | Guard status | Action Items |
| --- | --- | --- | --- | --- |
| **Admin / Settings** | `/settings/users`, `/admin/{roles,integrations,bpm}` | UI: `AdminUsersDirectory`, `app/(dashboard)/admin/{roles,integrations,users}`, server actions внутри `admin/*`; API: `/api/admin/**`. | *Partial* (покрыты только users/roles/permissions). | 1) Прокинуть `actorCanMutate` через `admin/layout.tsx`; 2) добавить guards в остальные admin API/actions; 3) отключить UI-кнопки вне users. |
| **Operations** | `app/(dashboard)/ops/{clients,cars,deals,tasks}` | UI: карточки клиентов/машин/сделок; server actions: `ops/clients/actions.ts`, `ops/cars/actions.ts`, `ops/deals/actions.ts`, `ops/deals/[id]/actions.ts`, `ops/tasks/[id]/actions.ts`; API: `/api/deals/*`, `/api/tasks/*`, `/api/workflow/queues/*`. | *None* | - Guard в `ops/layout.tsx` + context. - Добавить `canMutateSessionUser` во все перечисленные actions и API. - Отключить UI (form submit, кнопки edit, upload). |
| **Finance** | `/finance/{deals,receivables,disbursements,tasks,reports}` | UI: approvals, отчёты; API: `/api/deals`, `/api/metrics/process/*`. | *None* | Guard layout → UI; добавить server guard в `/api/metrics/process` и любые actions (нет отдельных файлов, но есть fetch). |
| **Support** | `/support/{queues,clients,cars,deals}` | UI: тикеты, эскалации; server action `client/support/actions.ts`; API: `/api/tasks`, `/api/workflow`. | *None* | Guard layout; `canMutateSessionUser` внутри `client/support/actions.ts`; disable UI action buttons. |
| **Tech** | `/tech/{inspections,service-orders,cars}` | UI: инспекции/ордера; API: `/api/deals`, `/api/webhooks/*`; server actions отсутствуют, но есть fetch. | *None* | Guard layout, disable UI, добавить проверку в API/handlers которые вызываются из Tech. |
| **Risk** | `/risk/{pipeline,reports,cars}` | UI + fetch к `/api/deals`, `/api/tasks`. | *None* | Guard layout, UI, API. |
| **Legal** | `/legal/{contracts,requests,deals}` | UI для контрактов, fetch → `/api/deals`. | *None* | Аналогично: guard layout + API. |
| **Accounting** | `/accounting/{ledgers,closings}` | UI approvals, fetch → `/api/deals`, `/api/tasks`. | *None* | Guard layout, disable UI, add server guard. |
| **Finance/Support/Risk Shared Tasks** | `/workspace/tasks`, `/shared/profile` | UI: shared taskboard; server action `app/(dashboard)/shared/profile/actions.ts`. | *None* | Guard layout + server action. |
| **Investor / Client / Partner portals** | `/investor/*`, `/client/*`, `/partner/*`, `/app/(public)/apply` | Server actions: `investor/reports/actions.ts`, `client/support/actions.ts`, `app/(public)/apply/actions.ts`; UI формочки профиля, отчёты. | *None* | Guard соответствующие layouts + серверные действия, решить UX (можно ли клиенту read-only?). |
| **Public/Auth flows** | `app/(auth)/actions.ts` | Создание внутренних пользователей/заявок; важно не допустить записи от read-only операторов. | *None* | Добавить guard, если action вызывается из порталов. |

## Rollout Plan
1. **Access context**: создать провайдер (например, `AccessControlProvider`) с `actorCanMutate` и `readOnlyRoles`, подключить во всех `app/(dashboard)/*/layout.tsx`. Хук `useAccessControl()` даст методы `assertCanMutate()` и флаги.
2. **UI sweep**: по порядку (Ops → Finance → Support → Tech → остальные) пройтись по кнопкам/form actions и показывать предупреждение вместо сабмита.
3. **Server/API sweep**: добавить `canMutateSessionUser` в каждую функцию записи (server actions + `/api/*`).
4. **Tests**: интеграционные тесты, эмулирующие read-only роль, для основных API.
5. **RLS** (следующий этап): обновить схемы, добавить политики Supabase, чтобы метаданные нельзя обойти.

## Next Steps
- Подтвердить приоритеты (предлагаю начать с OPS, где зафиксирован инцидент). После этого можно приступать к реализации: провайдер доступа, обновление ops layout и конкретных форм.
