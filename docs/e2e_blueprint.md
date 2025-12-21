# E2E Infrastructure Blueprint: A Detailed Guide

This document provides a comprehensive, step-by-step roadmap for implementing a robust, isolated E2E testing ecosystem with visual reporting and performance monitoring.

---

## Stage 1: Core Testing Strategy & Tagging
Focus on testing what matters most to ensure high value with low maintenance overhead.

1.  **Smoke Test Definition**: Identify critical business paths (e.g., deal creation, payment, core dashboard).
2.  **Tagging**: Use Playwright tags like `@smoke` to filter these critical tests.
    *   `npx playwright test --grep "@smoke"`
3.  **Trace & Video Configuration**: Enable full observability in `playwright.config.ts`.
    ```typescript
    {
      use: {
        trace: "on",         // Trace everything for deep debugging
        video: "on",         // Record every test run
        screenshot: "only-on-failure",
      }
    }
    ```

---

## Stage 2: Database Isolation (Supabase Branching)
Ensure tests never touch production data and run in a clean environment.

1.  **CLI Integration**: Use Supabase CLI to create temporary branches.
2.  **Auto-Migrations**: Automatically apply SQL migrations to the new branch.
    ```bash
    supabase branches create e2e-tests-$(date +%s)
    supabase db push --branch [BRANCH_NAME]
    ```
3.  **URL Mapping**: Pass the branch URL to Playwright as `BASE_URL`.

---

## Stage 3: Deployment-Triggered Workflows
Run tests exactly when they are needed: after a successful code deployment.

1.  **Vercel Integration**: Trigger GitHub Actions on `deployment_status`.
2.  **Environment Sync**: Wait for the `target_url` to be active before starting tests.
3.  **Dependency Caching**: Use tools like `pnpm` with action-setup for fast, reliable builds.

---

## Stage 4: Visual Reporting (Telegram & Media)
Get immediate results with visual proof delivered directly to your chat.

1.  **Rich Media Delivery**:
    *   **Screenshots**: Method `sendPhoto` for failure capture.
    *   **Full Videos**: Method `sendVideo` (MP4/WebM) for the entire run.
2.  **Contextual Links**: Include links to GitHub Action logs and the specific Deployment URL.
3.  **Trace Linking**: Mention that deep-debug traces are available in GitHub artifacts.

---

## Stage 5: Quality Dashboard & Monitoring
Transform raw test results into actionable metrics.

1.  **Test Logging**: Post every run's status to a `test_runs` table.
2.  **Dashboard UI**: Create an admin page showing:
    *   **Stability (%)**: Success rate over the last 50-100 runs.
    *   **Execution History**: Detailed log with deployment links.
3.  **Security (RLS)**: Enforce Row Level Security so only administrators can view the quality metrics.

---

## Stage 6: API Integration Layer
Add a faster, more reliable testing layer for server-side logic.

1.  **Direct API Calls**: Use `playwright.request` to test endpoints with the `Service Role` key.
2.  **Schema Validation**: Ensure API responses match expected contracts.
3.  **Bypass UI**: Test backend processes (like deal creation or document parsing) in milliseconds.

---

## Stage 7: Automated Maintenance
Keep the infrastructure clean and cost-efficient.

1.  **Branch Cleanup**: Schedule a nightly CRON to delete any orphaned Supabase branches.
2.  **Storage Optimization**: 
    *   Reduce GitHub artifact retention (e.g., 3 days).
    *   Automatically delete `test_runs` logs older than 30 days.

---

## Summary Checklist for New Projects:
- [ ] Tag critical tests with `@smoke`.
- [ ] Configure `trace: "on"` and `video: "on"`.
- [ ] Set up GitHub Secrets: `TELEGRAM_BOT_TOKEN`, `SUPABASE_ACCESS_TOKEN`.
- [ ] Create `test_runs` table with RLS for the Admin Dashboard.
- [ ] Implement the `cleanup_branches.yml` CRON job.
