# Portal Auth Test Plan (Outline)

Дата: 2025-11-11  
Владелец: QA Lead

## 1. Scope
- Portal routing/middleware (`middleware.ts`)
- Server actions (`passwordSignInAction`, `autoPortalSignInAction`)
- Портальные эвристики/управление ролями (`lib/auth/portal-resolution.ts`, `lib/auth/portals.ts`, `lib/auth/portal-session.ts`, `lib/auth/role-management.ts`)
- UI flows (единая форма `/login`, auto-portal detection, post-login routing)

## 2. Test Pyramid

### Unit
| Module | Checks | Tool |
| --- | --- | --- |
| `lib/auth/portals` | normalize/resolve functions, fallback paths | Vitest |
| `lib/auth/portal-session` | redirect URLs, detection logic (mock `getSessionUser`) | Vitest + msw |
| `app/(auth)/actions` | portal detection + password sign-in (mock Supabase client) | Vitest (ts-mockito) |

### Integration
- Spin up Supabase test project (local) + run migrations.
- Exercise server actions via Next.js Route Handlers (Supertest) to confirm session cookies, `auth_login_events` inserts, `user_portals` updates.
- Middleware integration test via Next.js `next testmode` or custom fetch that hits dev server with cookies.

### E2E (Playwright)
1. Client portal happy path:
   - Visit `/login`, введите `client@fastlease.ae` + пароль `123456` → ожидать мгновенный вход и переход на `/client/dashboard` (без промежуточных экранов).
2. Investor portal unauthorized:
   - Аутентифицируйтесь как покупатель, попробуйте `/investor/dashboard`, ожидайте redirect на `/login` с сохранением `next=/investor/dashboard`.
3. Middleware cross-portal block:
   - С активной `app`-сессией откройте `/client/...` → ожидать запрос повторного входа/403.
4. Forgot/reset flow:
   - На `/login/forgot` отправьте email `client@fastlease.ae`, перехватите письмо через Supabase CLI / mailhog.
   - Перейдите по ссылке, убедитесь что `/login/reset` доступна и после установки нового пароля можно войти.

## 3. Tooling
- Use `@supabase/supabase-js` mock helpers или локальный Supabase stack.
- Playwright config per portal (отдельные креды, хранить пароли в `.env.testing`).
- GitHub workflow: `pnpm lint`, `pnpm test`, `pnpm test:e2e --project portal-auth`.

## 4. Open Items
- [ ] Implement Vitest suites (unit + integration).
- [ ] Добавить Playwright fixture для тестовых учёток (email + пароль) и защищать секреты.
- [ ] Update CI pipeline to run new suites.
- [ ] Track coverage (target 80% for portal modules).
