# Segmented Login Implementation Checklist

Use this document to track progress. Mark tasks with `[x]` once completed. Keep notes on blockers or decisions inline.

## 1. Architecture & Alignment
- [x] Review ADR `docs/adr/2025-11-11-segmented-login-portals.md` with Product, Security, DBA; capture sign-off date.
- [x] Confirm role-to-portal mapping in code (`lib/auth/portals.ts`) matches the agreed list (app, investor, client, partner).
- [x] Define ownership for portal content (who maintains copy per audience). → `docs/portal-ownership.md`

## 2. Database Layer
- [x] Design table `user_portals` (columns: `id`, `user_id`, `portal`, `status`, `metadata`, timestamps) and document in `docs/schemas`.
- [x] Decide on `user_roles` extension: new `portal` column vs. join table; document reasoning.
- [x] Write Supabase migrations (DDL + seed defaults) using MCP tools only; ensure rollback scripts exist if needed.
- [x] Update RLS policies so access checks include portal membership (select/insert/update/delete separated per Supabase best practice).
- [x] Add view or helper functions if the app needs simplified queries (e.g., `view_portal_roles`). → `migrations/20251111110000_create_view_portal_roles.sql`, `lib/auth/portal-admin.ts`
- [x] Regenerate any derived schema docs / ER diagrams impacted by the new tables.

## 3. Backend / Auth Services
- [x] Create `lib/auth/portals.ts` registry describing each portal (allowed roles, default redirect, login copy keys).
- [x] (Superseded) `requestOtpAction`/`verifyOtpAction` — каналы закрыты после миграции на пароли.
- [x] Внедрить `passwordSignInAction` с портал-специфичными редиректами и логированием.
- [x] Ensure `ensureDefaultProfileAndRole` also seeds `user_portals` with the correct portal for new users.
- [x] Extend `ensureRoleAssignment` / metadata sync so Supabase `app_metadata.portal` stays aligned with DB records.
- [x] Implement portal-aware middleware (Edge or route-based) that denies cross-portal navigation and перенаправляет на единый `/login?next=...`.

## 4. Frontend / UX
- [x] Build `/` hub explaining the four audiences with CTA buttons.
- [x] Создать единую страницу `/login`, которая:
  - Собирает email + пароль,
  - Автоматически определяет портал и показывает релевантный copy,
  - Передаёт вычисленный `portal` в server action без участия пользователя.
- [x] Перевести UI на одношаговый парольный сценарий.
- [ ] Update navigation links, footers, and marketing pages to point to the new login URLs.
- [ ] Provide designers with copy deck (even if reusing the same words, confirm tone and languages).

## 5. Observability & Logging
- [x] Create `auth_login_events` table + RLS for append-only writes.
- [x] Write helper `logAuthEvent({ portal, status, identity, ip, userAgent, errorCode })`.
- [x] Add dashboards/alerts (e.g., Supabase logs or Data Studio) watching for spikes per portal. → spec in `docs/observability/auth-login-monitoring.md`
- [x] Document incident response steps: where to look for portal-specific auth failures. → runbook в `docs/observability/auth-login-monitoring.md`

## 6. Testing
- [ ] Unit tests: portal registry, redirect resolver, auth actions (Vitest).
- [ ] Integration tests: Supabase client mocks ensuring portal mismatch is rejected.
- [ ] E2E (Playwright/Cypress): happy path for each portal + negative case (investor trying to open `/app/dashboard`).
- [ ] Performance test middleware to confirm negligible latency overhead.
- [ ] Update CI to run any new test suites.

## 7. Rollout & Ops
- [ ] Draft comms plan for each audience (email announcement, in-app banner).
- [ ] Prepare migration/rollback runbook (time estimate, monitoring checklist).
- [ ] Coordinate deployment windows with stakeholders; note if downtime is required.
- [ ] After launch, monitor auth logs for 48h and capture metrics in release notes.
- [x] Build internal UI (“Roles & Portals” admin) inside `/app/settings/users`:
  - list/search users with their assigned roles + portals,
  - allow toggling portal access (creates/deactivates `user_portals` rows),
  - add/remove roles scoped к порталу (updates `user_roles`),
  - display login history summary sourced из `auth_login_events`,
  - log every change (who/when/what) для аудита.

## 8. Documentation
- [x] Update `docs/auth-system-overview.md` с описанием парольного входа и reset flow.
- [ ] Add runbooks for support (FAQ: “I used the wrong portal”, “I cannot find my dashboard”).
- [ ] Ensure `.env.example` references any new config (e.g., `PORTAL_LOGIN_BASE_URL` if needed).

> Keep this file up to date; if scope changes, append new tasks instead of overwriting history.
