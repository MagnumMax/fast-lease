# ADR: Segmented Login Portals

- **Date:** 2025-11-11
- **Status:** Superseded (2025-11-11) — email OTP channel replaced с email+password входом из-за устойчивых ограничений по rate limit.
- **Context owner:** Auth Platform
- **Reviewers:** Product, Security, DBA

## Context

Fast Lease needs to support four distinct user audiences (internal app users, investors, clients, partners) via a single Supabase project. Today the login UI and server actions are unified, which causes:

- Insufficient least-privilege separation (any authenticated role can hit any dashboard unless additional checks run perfectly).
- Ambiguous UX copy; users cannot easily understand which email to use or why they land on a specific dashboard.
- Difficulty adding new portals (partner, applicant) or new auth channels (SSO/SMS) later.
- No structured audit log that captures the portal context for each authentication event.

## Decision

1. **Portals and role mapping**
   - `app`: ADMIN, OP_MANAGER, SUPPORT, FINANCE, TECH_SPECIALIST, RISK_MANAGER, LEGAL, ACCOUNTING.
   - `investor`: INVESTOR.
   - `client`: CLIENT.
   - `partner`: future partner roles (placeholder until the role lands in the schema).
   - A helper registry (`lib/auth/portals.ts`) will map each portal to its allowed roles, default redirect, and UX strings.

2. **Authentication channel**
   - _(Original decision)_ Single channel: email OTP powered by Supabase Auth (`signInWithOtp` / `verifyOtp`).
   - _(Update 2025-11-11)_ Канал переключён на email + пароль (`signInWithPassword`) для внутреннего пользования; OTP оставлен как fallback, но не используется в UI.
   - Порталы по-прежнему должны прокидывать `portal` в `redirect_to`, чтобы `/auth/callback` мог применить нужный роутинг.

3. **Redirects**
   - Every portal redirects to `/dashboard` within its namespace (`/app/dashboard`, `/client/dashboard`, `/investor/dashboard`, `/partner/dashboard`). The resolver will fall back to this path if no `next` query is provided or if the caller requested an unauthorized area.

4. **Database representation**
   - Add table `user_portals` (`user_id`, `portal`, `status`, `metadata`, timestamps) to track which portals a user can access.
   - Extend `user_roles` (either via `audience_portal` column or a bridging table) so each role assignment references the allowed portal(s). This keeps RLS policies simple (“role must belong to the portal you are hitting”).
   - Keep schemas documented in `/docs/schemas` and implement migrations under `/migrations`.

5. **Audit logging**
   - Introduce `auth_login_events` table capturing `portal`, `identity`, `status`, `ip`, `user_agent`, `role_snapshot`, `error_code`, and timestamps.
   - Server actions (`requestOtpAction`, `verifyOtpAction`) will insert log rows via Supabase RPC or direct writes (service client).

6. **Middleware and guards**
- Edge middleware validates that a user hitting `/client/**` owns the `client` portal (based on cache of `user_portals` and JWT metadata). Any mismatch triggers redirect на единый `/login` (с `next`), где портал определяется автоматически.
   - Server helpers reuse the portal registry to resolve allowed roles and fallback redirects.

## Consequences

- **Pros**
  - Clear separation of concerns per audience, easier to reason about least privilege.
  - Unified email-first channel (OTP → password) keeps implementation light while всё ещё позволяет позже добавить SSO/SMS.
  - Portal-aware audit logs improve incident response.
  - Frontend teams can customise copy/layout per portal without branching logic everywhere.

- **Cons / Risks**
  - Extra tables and policies add complexity to the schema; requires close DBA review.
  - Need to keep portal registry and DB data in sync (seed scripts + admin tooling).
  - Middleware must stay lightweight to avoid latency on every request.

## Open Questions

1. Final shape of the `user_roles` extension: new column vs. join table?
2. Whether applicant/onboarding portal should be added now or later.
3. Retention policy for `auth_login_events`.

## Follow-up Tasks

Tracked separately in `docs/tasks/segmented-login-checklist.md`.
