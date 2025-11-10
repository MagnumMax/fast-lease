# Unit & Component Test Pipeline

## Goals
- Keep regressions out of `main` by failing fast on lint, type, and test violations.
- Guarantee at least 80 % line/function coverage across the repo and 90 %+ for critical workflow/service modules.
- Provide deterministic local runs that mirror CI (identical reporters, coverage outputs, and env setup).

## Tooling & Layout
- Environment: Node.js ≥ 20.9.0 (Next 16 hard requirement). Если локальный `node` отстаёт, скачайте архив `node-v20.11.1-darwin-arm64.tar.xz` в `.tools/` и добавляйте `$(pwd)/.tools/node-v20.11.1-darwin-arm64/bin` в `PATH` перед запуском `npm`/`pnpm` (`PATH="$(pwd)/.tools/node-v20.11.1-darwin-arm64/bin:$PATH" npm run build`).
- Framework: Vitest (`pnpm test`) with globals enabled.
- File structure: colocated `*.test.ts` under `app/` and `lib/`, shared helpers in `tests/setup.ts`.
- Setup file responsibilities:
  - Freeze timezone to UTC for deterministic date assertions.
  - Register global hooks (`afterEach`) to clear mocks and close open handles.
  - Configure utility globals (e.g., `mockFetch`, feature flag toggles).

## Coverage Policy
- Enable Vitest coverage (`--coverage`) in both local CI-equivalent runs and GitHub Actions.
- Configuration:
  - `reportsDirectory`: `coverage/unit`.
  - Reporters: `text`, `lcov`.
  - Thresholds (Phase 1): lines/statements 40 %, functions 35 %, branches 25 % по целевым модулям (`lib/workflow/**`, очередь/вебхуки/transition API). Исключаем `scripts/**`, `supabase/**`, `__tests__/**`. После стабилизации покрытия >60 % повышаем пороги и включаем дополнительные директории.

## Local Developer Loop
1. `pnpm test` (watch) during development.
2. `pnpm test:ci` (runs, coverage, reporter=dot) before opening a PR.
3. Git `pre-push` hook runs `pnpm lint`, `pnpm typecheck`, `pnpm test:ci`; push is rejected on first failure.

## CI Workflow
- GitHub Actions job `tests-unit` runs on push/PR.
- Matrix sharding (4 ways) keeps runtime under ~5 minutes.
- Each shard uploads `.vitest-reports/blob-*` artifacts; a `merge-reports` job downloads and merges coverage for publishing + status checks.

## Rollout Notes
- Add Husky dev dependency + `prepare` script for hook installation.
- Document hook bootstrap (`pnpm dlx husky install`) in onboarding notes.
- Update `.gitignore` to exclude `coverage/` artefacts.
- Verify `pnpm lint`, `pnpm typecheck`, `pnpm test:ci` locally before merging changes touching this pipeline.
