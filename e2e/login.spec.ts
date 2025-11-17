import { test, expect } from "@playwright/test";

import { ensureSupabaseEnv, getClientCreds, loginViaUi } from "./utils/auth";

test("страница логина показывает форму входа", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.ok()).toBe(true);

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("клиент логинится и попадает в клиентский портал", async ({ page }) => {
  if (process.env.E2E_BYPASS_AUTH === "true") {
    test.skip(true, "E2E_BYPASS_AUTH включен: Supabase auth недоступен в тестовой среде");
  }

  ensureSupabaseEnv();

  const creds = getClientCreds();
  await loginViaUi(page, creds);

  await expect(page).toHaveURL(/\/client/);
  await expect(page.getByText("Client", { exact: false })).toBeVisible();
});
