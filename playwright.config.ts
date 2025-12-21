import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Прогружаем переменные из .env.local для e2e, чтобы ensureSupabaseEnv не скипал тесты
dotenv.config({ path: ".env.local" });
process.env.E2E_BYPASS_AUTH = process.env.E2E_BYPASS_AUTH ?? "false";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report" }]],
  workers: process.env.CI ? 4 : undefined,
  use: {
    baseURL: BASE_URL,
    trace: "on",
    screenshot: "only-on-failure",
    video: "on",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
